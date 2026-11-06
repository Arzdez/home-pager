package main

import (
	"bytes"
	"errors"
	"flag"
	"fmt"
	"io"
	"net"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

type appSettings struct {
	configPath string
	overrides  []string
	Listen     string  `yaml:"listen"`
	ConfigDir  string  `yaml:"config_dir"`
	ImagesDir  string  `yaml:"images_dir"`
	ImagesURL  string  `yaml:"images_url"`
	IconsDir   string  `yaml:"icons_dir"`
	IconsURL   string  `yaml:"icons_url"`
	Password   string  `yaml:"password"`
	HTTPProxy  *string `yaml:"http_proxy"`
	HTTPSProxy *string `yaml:"https_proxy"`
	NoProxy    *string `yaml:"no_proxy"`
}

func settingsFromArgs(args []string) (appSettings, error) {
	cfg := appSettings{Listen: "127.0.0.1:8090", ConfigDir: "./config", ImagesURL: "/images", IconsURL: "/icons", Password: os.Getenv("HOMEPAGER_PASSWORD")}
	flags := flag.NewFlagSet("home-pager", flag.ContinueOnError)
	conf := flags.String("conf", "", "Path to panel YAML configuration (default: ./home-pager.yaml, if present)")
	// Keep older launch scripts working; the configuration file is the primary interface.
	listen := flags.String("listen", cfg.Listen, "Override listen address")
	dir := flags.String("config", cfg.ConfigDir, "Override Homepage configuration directory")
	images := flags.String("images", "", "Override image directory")
	imagesURL := flags.String("images-url", cfg.ImagesURL, "Override Homepage image URL path")
	icons := flags.String("icons", "", "Override icon directory")
	iconsURL := flags.String("icons-url", cfg.IconsURL, "Override Homepage icon URL path")
	if err := flags.Parse(args); err != nil {
		return cfg, err
	}
	if flags.NArg() != 0 {
		return cfg, errors.New("Unexpected argument; use -conf /path/to/home-pager.yaml")
	}
	visited := map[string]bool{}
	flags.Visit(func(f *flag.Flag) { visited[f.Name] = true })
	path := *conf
	if path == "" {
		path = "home-pager.yaml"
	}
	configPath, pathErr := filepath.Abs(path)
	if pathErr != nil {
		return cfg, pathErr
	}
	cfg.configPath = configPath
	for name := range visited {
		if name != "conf" {
			cfg.overrides = append(cfg.overrides, name)
		}
	}
	f, err := os.Open(path)
	if err != nil {
		if visited["conf"] || !os.IsNotExist(err) {
			return cfg, fmt.Errorf("Open panel configuration: %w", err)
		}
	} else {
		defer f.Close()
		data, err := io.ReadAll(io.LimitReader(f, (1<<20)+1))
		if err != nil {
			return cfg, err
		}
		if len(data) > 1<<20 {
			return cfg, errors.New("Panel configuration exceeds 1 MiB")
		}
		decoder := yaml.NewDecoder(bytes.NewReader(data))
		decoder.KnownFields(true)
		if err := decoder.Decode(&cfg); err != nil && err != io.EOF {
			return cfg, fmt.Errorf("Invalid panel configuration: %w", err)
		}
		if err := decoder.Decode(new(any)); err != io.EOF {
			return cfg, errors.New("Panel configuration must contain one YAML document")
		}
		abs, err := filepath.Abs(path)
		if err != nil {
			return cfg, err
		}
		base := filepath.Dir(abs)
		for _, p := range []*string{&cfg.ConfigDir, &cfg.ImagesDir, &cfg.IconsDir} {
			if *p != "" && !filepath.IsAbs(*p) {
				*p = filepath.Join(base, *p)
			}
		}
	}
	if visited["listen"] {
		cfg.Listen = *listen
	}
	if visited["config"] {
		cfg.ConfigDir = *dir
	}
	if visited["images"] {
		cfg.ImagesDir = *images
	}
	if visited["images-url"] {
		cfg.ImagesURL = *imagesURL
	}
	if visited["icons"] {
		cfg.IconsDir = *icons
	}
	if visited["icons-url"] {
		cfg.IconsURL = *iconsURL
	}
	if cfg.ConfigDir == "" {
		return cfg, errors.New("config_dir must not be empty")
	}
	if _, _, err := net.SplitHostPort(cfg.Listen); err != nil {
		return cfg, fmt.Errorf("Invalid listen address: %w", err)
	}
	if err := validateImagesURL(cfg.ImagesURL); err != nil {
		return cfg, err
	}
	if err := validateImagesURL(cfg.IconsURL); err != nil {
		return cfg, err
	}
	cfg.ConfigDir, err = filepath.Abs(cfg.ConfigDir)
	if err != nil {
		return cfg, err
	}
	if cfg.ImagesDir == "" {
		cfg.ImagesDir = filepath.Join(cfg.ConfigDir, "images")
	}
	if cfg.IconsDir == "" {
		cfg.IconsDir = filepath.Join(cfg.ConfigDir, "icons")
	}
	cfg.ImagesDir, err = filepath.Abs(cfg.ImagesDir)
	if err != nil {
		return cfg, err
	}
	cfg.IconsDir, err = filepath.Abs(cfg.IconsDir)
	if err != nil {
		return cfg, err
	}
	return cfg, nil
}

func (cfg appSettings) applyProxyEnvironment() error {
	for name, value := range map[string]*string{"HTTP_PROXY": cfg.HTTPProxy, "HTTPS_PROXY": cfg.HTTPSProxy, "NO_PROXY": cfg.NoProxy} {
		if value == nil {
			continue
		}
		if err := os.Setenv(name, *value); err != nil {
			return err
		}
		// An explicit empty value must also disable the lowercase fallback.
		lower := map[string]string{"HTTP_PROXY": "http_proxy", "HTTPS_PROXY": "https_proxy", "NO_PROXY": "no_proxy"}[name]
		if err := os.Setenv(lower, *value); err != nil {
			return err
		}
	}
	return nil
}
