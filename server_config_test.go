package main

import (
	"encoding/json"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestServerConfigEditing(t *testing.T) {
	raw := "# startup settings\nlisten: 127.0.0.1:8090\nconfig_dir: ./config\nicons_dir: ./icons # directory note\npassword: secret-not-for-browser\nhttp_proxy: http://old.example.com:3128\n"
	path := panelConfig(t, raw)
	cfg, err := settingsFromArgs([]string{"-conf", path, "-listen", "127.0.0.1:8091"})
	if err != nil {
		t.Fatal(err)
	}
	s := &server{dir: t.TempDir(), startup: &cfg}
	w := request(t, s, "GET", "/api/server-config", nil)
	if w.Code != 200 || strings.Contains(w.Body.String(), "secret-not-for-browser") {
		t.Fatalf("Unsafe response: %d", w.Code)
	}
	var data struct {
		Revision  string
		Path      string
		Settings  map[string]any
		Active    map[string]any
		Overrides []string
	}
	if err := json.Unmarshal(w.Body.Bytes(), &data); err != nil {
		t.Fatal(err)
	}
	if data.Path != path || data.Settings["listen"] != "127.0.0.1:8090" || data.Active["listen"] != "127.0.0.1:8091" || len(data.Overrides) != 1 {
		t.Fatal("Saved/active values or override metadata lost")
	}
	w = request(t, s, "PUT", "/api/server-config", map[string]any{
		"revision": data.Revision, "settings": map[string]any{"icons_dir": "./new-icons", "http_proxy": nil},
	})
	if w.Code != 200 {
		t.Fatalf("Save: %d %s", w.Code, w.Body.String())
	}
	var result struct {
		Revision, Backup string
		RestartRequired  bool
	}
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	backup, err := os.ReadFile(result.Backup)
	if err != nil || string(backup) != raw || !result.RestartRequired {
		t.Fatal("Original backup or restart information missing")
	}
	saved, _ := os.ReadFile(path)
	for _, value := range []string{"# startup settings", "# directory note", "secret-not-for-browser", "./new-icons"} {
		if !strings.Contains(string(saved), value) {
			t.Fatalf("Lost %s", value)
		}
	}
	if cfg.HTTPProxy == nil || *cfg.HTTPProxy != "http://old.example.com:3128" {
		t.Fatal("Mutated running settings")
	}
	w = request(t, s, "PUT", "/api/server-config", map[string]any{"revision": data.Revision, "settings": map[string]any{"icons_dir": "wrong"}})
	if w.Code != 409 {
		t.Fatalf("Expected conflict: %d", w.Code)
	}
	for _, settings := range []map[string]any{
		{"listen": "127.0.0.1:bad"}, {"icons_url": "https://remote.example.com"}, {"config_dir": ""},
		{"https_proxy": "not-a-url"}, {"configPath": "somewhere-else"}, {"icons_dir": nil},
	} {
		w = request(t, s, "PUT", "/api/server-config", map[string]any{"revision": result.Revision, "settings": settings})
		if w.Code != 400 {
			t.Fatalf("Invalid settings accepted: %v, status %d", settings, w.Code)
		}
	}
	unchanged, _ := os.ReadFile(path)
	if string(unchanged) != string(saved) {
		t.Fatal("Invalid request modified configuration")
	}
	w = request(t, s, "PUT", "/api/server-config", map[string]any{"revision": result.Revision, "password": "", "settings": map[string]any{}})
	if w.Code != 200 {
		t.Fatal(w.Body.String())
	}
	updated, err := settingsFromArgs([]string{"-conf", path})
	if err != nil || updated.Password != "" || updated.IconsDir != filepath.Join(filepath.Dir(path), "new-icons") || updated.HTTPProxy != nil {
		t.Fatal("Saved settings do not round trip")
	}
}

func TestServerConfigCreationAndAuthentication(t *testing.T) {
	dir := t.TempDir()
	cfg := appSettings{configPath: filepath.Join(dir, "home-pager.yaml"), Listen: "127.0.0.1:8090", ConfigDir: filepath.Join(dir, "config"), ImagesURL: "/images", IconsURL: "/icons"}
	s := &server{startup: &cfg, password: "protected"}
	if w := request(t, s, "GET", "/api/server-config", nil); w.Code != 401 {
		t.Fatalf("Unauthenticated access: %d", w.Code)
	}
	s.password = ""
	w := request(t, s, "GET", "/api/server-config", nil)
	var data struct {
		Revision string
		Exists   bool
	}
	if err := json.Unmarshal(w.Body.Bytes(), &data); err != nil {
		t.Fatal(err)
	}
	if data.Exists {
		t.Fatal("Missing config reported as existing")
	}
	w = request(t, s, "PUT", "/api/server-config", map[string]any{"revision": data.Revision, "settings": map[string]any{"icons_dir": "./icons"}})
	if w.Code != 200 {
		t.Fatal(w.Body.String())
	}
	if _, err := settingsFromArgs([]string{"-conf", cfg.configPath}); err != nil {
		t.Fatal(err)
	}
	r := httptest.NewRequest("PUT", "/api/server-config", strings.NewReader(`{}`))
	r.Header.Set("Origin", "https://other.example.com")
	rr := httptest.NewRecorder()
	s.handler().ServeHTTP(rr, r)
	if rr.Code != 403 {
		t.Fatalf("Cross origin write accepted: %d", rr.Code)
	}
}
