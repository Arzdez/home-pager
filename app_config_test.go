package main

import (
	"os"
	"path/filepath"
	"testing"
)

func panelConfig(t *testing.T, raw string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "panel.yaml")
	if err := os.WriteFile(path, []byte(raw), 0600); err != nil {
		t.Fatal(err)
	}
	return path
}

func TestContainerConfigInitialization(t *testing.T) {
	path := filepath.Join(t.TempDir(), "panel-config", "home-pager.yaml")
	cfg, err := settingsFromArgs([]string{"-init-conf", "home-pager.docker.yaml", "-conf", path})
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Listen != "0.0.0.0:8090" {
		t.Fatal("Incorrect listen default")
	}
	for got, want := range map[string]string{cfg.ConfigDir: "/config", cfg.ImagesDir: "/images", cfg.IconsDir: "/icons"} {
		if !filepath.IsAbs(want) {
			want = filepath.Join(filepath.Dir(path), want)
		}
		want, _ = filepath.Abs(want)
		if got != want {
			t.Fatalf("Incorrect path: %s, expected %s", got, want)
		}
	}
	if len(cfg.overrides) != 0 {
		t.Fatal("Initialization must not be reported as a runtime override")
	}
	original, err := os.ReadFile("home-pager.docker.yaml")
	if err != nil {
		t.Fatal(err)
	}
	created, err := os.ReadFile(path)
	if err != nil || string(created) != string(original) {
		t.Fatal("Default configuration was not copied")
	}
	custom := "listen: 127.0.0.1:9999\nconfig_dir: ./custom\npassword: keep-this\n"
	if err := os.WriteFile(path, []byte(custom), 0600); err != nil {
		t.Fatal(err)
	}
	cfg, err = settingsFromArgs([]string{"-init-conf", "missing-template.yaml", "-conf", path})
	if err != nil || cfg.Listen != "127.0.0.1:9999" || cfg.Password != "keep-this" {
		t.Fatal("Persisted configuration was overwritten")
	}
	unchanged, _ := os.ReadFile(path)
	if string(unchanged) != custom {
		t.Fatal("Existing file changed")
	}
}

func TestConfigInitializationFailure(t *testing.T) {
	path := filepath.Join(t.TempDir(), "new", "home-pager.yaml")
	bad := panelConfig(t, "unknown_parameter: value\n")
	if _, err := settingsFromArgs([]string{"-init-conf", bad, "-conf", path}); err == nil {
		t.Fatal("Invalid template accepted")
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatal("Invalid template created a configuration file")
	}
	if _, err := settingsFromArgs([]string{"-init-conf", "nonexistent-template", "-conf", path}); err == nil {
		t.Fatal("Missing template accepted")
	}
}

func TestPanelConfigPathsAndOptionalPassword(t *testing.T) {
	t.Setenv("HOMEPAGER_PASSWORD", "old-environment-password")
	path := panelConfig(t, "listen: '0.0.0.0:8090'\nconfig_dir: ./homepage\nimages_dir: ./public/images\nicons_dir: ./public/icons\npassword: ''\n")
	cfg, err := settingsFromArgs([]string{"-conf", path})
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Password != "" || cfg.Listen != "0.0.0.0:8090" {
		t.Fatal("Empty password must allow listening on all interfaces")
	}
	base := filepath.Dir(path)
	if cfg.ConfigDir != filepath.Join(base, "homepage") || cfg.ImagesDir != filepath.Join(base, "public", "images") || cfg.IconsDir != filepath.Join(base, "public", "icons") {
		t.Fatal("Paths were not resolved relative to configuration file")
	}
	if cfg.ImagesURL != "/images" || cfg.IconsURL != "/icons" {
		t.Fatal("Lost URL defaults")
	}
}

func TestPanelConfigDefaultsAndLegacyFlags(t *testing.T) {
	t.Setenv("HOMEPAGER_PASSWORD", "")
	path := panelConfig(t, "config_dir: ./data\n")
	cfg, err := settingsFromArgs([]string{"-conf", path})
	if err != nil {
		t.Fatal(err)
	}
	if cfg.ImagesDir != filepath.Join(cfg.ConfigDir, "images") || cfg.IconsDir != filepath.Join(cfg.ConfigDir, "icons") {
		t.Fatal("Incorrect derived directories")
	}
	dir := t.TempDir()
	cfg, err = settingsFromArgs([]string{"-conf", path, "-config", dir, "-listen", ":9090", "-icons-url", "/custom-icons"})
	if err != nil {
		t.Fatal(err)
	}
	if cfg.ConfigDir != dir || cfg.IconsURL != "/custom-icons" || cfg.Listen != ":9090" || cfg.IconsDir != filepath.Join(dir, "icons") {
		t.Fatal("Legacy overrides not applied")
	}
}

func TestPanelConfigRejectsMistakes(t *testing.T) {
	for _, raw := range []string{"listenn: ':8090'", "listen: bad-address", "config_dir: ''", "images_url: 'https://example.com/images'", "icons_url: '//example.com/icons'", "password: one\npassword: two", "listen: ':8090'\n---\nlisten: ':9090'"} {
		if _, err := settingsFromArgs([]string{"-conf", panelConfig(t, raw)}); err == nil {
			t.Errorf("Accepted invalid configuration %q", raw)
		}
	}
	if _, err := settingsFromArgs([]string{"-conf", filepath.Join(t.TempDir(), "missing.yaml")}); err == nil {
		t.Fatal("Ignored explicit missing configuration")
	}
}

func TestPanelConfigAutoDiscovery(t *testing.T) {
	previous, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	dir := t.TempDir()
	if err := os.Chdir(dir); err != nil {
		t.Fatal(err)
	}
	defer os.Chdir(previous)
	t.Setenv("HOMEPAGER_PASSWORD", "")
	cfg, err := settingsFromArgs(nil)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Listen != "127.0.0.1:8090" {
		t.Fatal("Wrong fallback listen address")
	}
	if err := os.WriteFile("home-pager.yaml", []byte("listen: ':9999'\npassword: optional-secret\n"), 0600); err != nil {
		t.Fatal(err)
	}
	cfg, err = settingsFromArgs(nil)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Listen != ":9999" || cfg.Password != "optional-secret" {
		t.Fatal("Default configuration file not loaded")
	}
}

func TestPanelProxyConfigOverridesEnvironment(t *testing.T) {
	t.Setenv("HTTPS_PROXY", "http://old.example.com:3128")
	t.Setenv("https_proxy", "http://old.example.com:3128")
	cfg, err := settingsFromArgs([]string{"-conf", panelConfig(t, "https_proxy: ''\n")})
	if err != nil {
		t.Fatal(err)
	}
	if err := cfg.applyProxyEnvironment(); err != nil {
		t.Fatal(err)
	}
	if os.Getenv("HTTPS_PROXY") != "" || os.Getenv("https_proxy") != "" {
		t.Fatal("Explicit empty proxy did not disable environment proxy")
	}
}
