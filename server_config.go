package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

func publicServerSettings(cfg appSettings) map[string]any {
	return map[string]any{
		"listen": cfg.Listen, "config_dir": cfg.ConfigDir,
		"images_dir": cfg.ImagesDir, "images_url": cfg.ImagesURL,
		"icons_dir": cfg.IconsDir, "icons_url": cfg.IconsURL,
		"http_proxy": cfg.HTTPProxy, "https_proxy": cfg.HTTPSProxy, "no_proxy": cfg.NoProxy,
	}
}

func copyServerSettings(cfg appSettings) appSettings {
	for _, p := range []**string{&cfg.HTTPProxy, &cfg.HTTPSProxy, &cfg.NoProxy} {
		if *p != nil {
			value := **p
			*p = &value
		}
	}
	return cfg
}

func (s *server) readServerConfig() ([]byte, bool, os.FileMode, error) {
	if s.startup == nil || s.startup.configPath == "" {
		return nil, false, 0, errors.New("Путь стартового конфига не задан")
	}
	st, err := os.Lstat(s.startup.configPath)
	if os.IsNotExist(err) {
		return nil, false, 0600, nil
	}
	if err != nil {
		return nil, false, 0, err
	}
	if !st.Mode().IsRegular() || st.Size() > 1<<20 {
		return nil, false, 0, errors.New("Нужен обычный конфиг-файл размером до 1 MiB; символьные ссылки не поддерживаются")
	}
	b, err := os.ReadFile(s.startup.configPath)
	return b, true, st.Mode().Perm(), err
}

func decodeServerSettings(raw []byte, cfg *appSettings) error {
	d := yaml.NewDecoder(bytes.NewReader(raw))
	d.KnownFields(true)
	if err := d.Decode(cfg); err != nil && err != io.EOF {
		return errors.New("Некорректный YAML стартового конфига или неизвестные параметры")
	}
	if err := d.Decode(new(any)); err != io.EOF {
		return errors.New("В конфиге должен быть один YAML-документ")
	}
	return nil
}

func validateServerSettings(cfg appSettings) error {
	_, port, err := net.SplitHostPort(cfg.Listen)
	if err != nil {
		return errors.New("Адрес прослушивания: укажите IP:порт, например 0.0.0.0:8090")
	}
	n, err := strconv.Atoi(port)
	if err != nil || n < 1 || n > 65535 {
		return errors.New("Порт должен быть числом от 1 до 65535")
	}
	if strings.TrimSpace(cfg.ConfigDir) == "" {
		return errors.New("Укажите каталог конфигурации Homepage")
	}
	for _, p := range []string{cfg.ConfigDir, cfg.ImagesDir, cfg.IconsDir} {
		if strings.ContainsRune(p, 0) {
			return errors.New("Путь содержит недопустимый символ")
		}
	}
	for _, prefix := range []string{cfg.ImagesURL, cfg.IconsURL} {
		if err := validateImagesURL(prefix); err != nil {
			return err
		}
	}
	for _, proxy := range []*string{cfg.HTTPProxy, cfg.HTTPSProxy} {
		if proxy == nil || *proxy == "" {
			continue
		}
		u, err := url.Parse(*proxy)
		if err != nil || u.Hostname() == "" || (u.Scheme != "http" && u.Scheme != "https" && u.Scheme != "socks5" && u.Scheme != "socks5h") {
			return errors.New("Прокси: нужна ссылка http://, https://, socks5:// или socks5h:// с адресом сервера")
		}
	}
	return nil
}

func (s *server) getServerConfig(w http.ResponseWriter, r *http.Request) {
	s.configMu.Lock()
	defer s.configMu.Unlock()
	b, exists, _, err := s.readServerConfig()
	if err != nil {
		fail(w, 500, err.Error())
		return
	}
	cfg := copyServerSettings(*s.startup)
	if exists {
		if err := decodeServerSettings(b, &cfg); err != nil {
			fail(w, 400, err.Error())
			return
		}
	}
	respond(w, 200, map[string]any{
		"path": s.startup.configPath, "base": filepath.Dir(s.startup.configPath),
		"revision": revision(b, exists), "exists": exists,
		"settings": publicServerSettings(cfg), "active": publicServerSettings(*s.startup),
		"hasPassword": cfg.Password != "", "overrides": s.startup.overrides,
	})
}

func (s *server) saveServerConfig(w http.ResponseWriter, r *http.Request) {
	s.configMu.Lock()
	defer s.configMu.Unlock()
	var input struct {
		Revision string                     `json:"revision"`
		Settings map[string]json.RawMessage `json:"settings"`
		Password *string                    `json:"password"`
	}
	d := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	d.DisallowUnknownFields()
	if err := d.Decode(&input); err != nil {
		fail(w, 400, "Некорректные параметры конфигурации")
		return
	}
	if err := d.Decode(new(any)); err != io.EOF {
		fail(w, 400, "Ожидался один JSON-объект")
		return
	}
	b, exists, mode, err := s.readServerConfig()
	if err != nil {
		fail(w, 500, err.Error())
		return
	}
	if input.Revision != revision(b, exists) {
		fail(w, 409, "Конфиг изменён извне. Откройте настройки заново")
		return
	}
	if exists {
		previous := copyServerSettings(*s.startup)
		if err := decodeServerSettings(b, &previous); err != nil {
			fail(w, 400, err.Error())
			return
		}
	}
	var tree yaml.Node
	if exists && len(bytes.TrimSpace(b)) > 0 {
		if err := yaml.Unmarshal(b, &tree); err != nil {
			fail(w, 400, "Некорректный YAML конфигурации")
			return
		}
	}
	if len(tree.Content) == 0 || tree.Content[0].Tag == "!!null" {
		tree = yaml.Node{Kind: yaml.DocumentNode, Content: []*yaml.Node{{Kind: yaml.MappingNode, Tag: "!!map"}}}
	}
	root := tree.Content[0]
	if root.Kind != yaml.MappingNode {
		fail(w, 400, "Стартовый конфиг должен быть объектом YAML")
		return
	}
	allowed := publicServerSettings(*s.startup)
	set := func(key string, value any) error {
		var node yaml.Node
		if err := node.Encode(value); err != nil {
			return err
		}
		for i := 0; i < len(root.Content); i += 2 {
			if root.Content[i].Value == key {
				old := root.Content[i+1]
				node.HeadComment, node.LineComment, node.FootComment = old.HeadComment, old.LineComment, old.FootComment
				root.Content[i+1] = &node
				return nil
			}
		}
		root.Content = append(root.Content, &yaml.Node{Kind: yaml.ScalarNode, Tag: "!!str", Value: key}, &node)
		return nil
	}
	if !exists {
		for key, value := range allowed {
			_ = set(key, value)
		}
	}
	for key, raw := range input.Settings {
		if _, ok := allowed[key]; !ok {
			fail(w, 400, "Неизвестный параметр конфигурации")
			return
		}
		var value any
		if string(raw) == "null" {
			if key != "http_proxy" && key != "https_proxy" && key != "no_proxy" {
				fail(w, 400, "Для этого параметра нужно текстовое значение")
				return
			}
		} else {
			var text string
			if err := json.Unmarshal(raw, &text); err != nil {
				fail(w, 400, "Параметры должны быть текстовыми")
				return
			}
			value = text
		}
		if err := set(key, value); err != nil {
			fail(w, 400, err.Error())
			return
		}
	}
	if input.Password != nil {
		_ = set("password", *input.Password)
	}
	out, err := yaml.Marshal(&tree)
	if err != nil {
		fail(w, 400, "Не удалось сформировать YAML")
		return
	}
	cfg := copyServerSettings(*s.startup)
	if err := decodeServerSettings(out, &cfg); err != nil {
		fail(w, 400, err.Error())
		return
	}
	if err := validateServerSettings(cfg); err != nil {
		fail(w, 400, err.Error())
		return
	}
	backup := ""
	if exists {
		backup = s.startup.configPath + ".bak-" + time.Now().UTC().Format("20060102-150405.000000000")
		if err := atomicWrite(backup, b, 0600); err != nil {
			fail(w, 500, fmt.Sprintf("Не удалось сохранить резервную копию: %v", err))
			return
		}
	}
	if err := atomicWrite(s.startup.configPath, out, mode); err != nil {
		fail(w, 500, err.Error())
		return
	}
	respond(w, 200, map[string]any{"revision": revision(out, true), "backup": backup, "restartRequired": true})
}
