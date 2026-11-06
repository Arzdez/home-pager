package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestAppearanceSaveAndConflict(t *testing.T) {
	s := &server{dir: t.TempDir()}
	if err := os.WriteFile(filepath.Join(s.dir, "settings.yaml"), []byte("# original\ntitle: Before\n"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(s.dir, "custom.css"), []byte("/* personal */\nbody { color: red; }\n"), 0600); err != nil {
		t.Fatal(err)
	}
	settings, err := s.read("settings.yaml")
	if err != nil {
		t.Fatal(err)
	}
	css, err := s.read("custom.css")
	if err != nil {
		t.Fatal(err)
	}
	payload := map[string]change{"settings": {Name: settings.Name, Raw: "# original\ntitle: After\nlayout:\n  Media:\n    style: row\n    columns: 3\n    header: false\n", Revision: settings.Revision}, "css": {Name: css.Name, Raw: css.Raw + ".service-card { opacity: .5; }\n", Revision: "stale"}}
	if w := request(t, s, "PUT", "/api/appearance", payload); w.Code != 409 {
		t.Fatal(w.Body.String())
	}
	unchanged, _ := s.read("settings.yaml")
	if unchanged.Raw != settings.Raw {
		t.Fatal("Conflict partially updated settings")
	}
	change := payload["css"]
	change.Revision = css.Revision
	payload["css"] = change
	if w := request(t, s, "PUT", "/api/appearance", payload); w.Code != 200 {
		t.Fatal(w.Body.String())
	}
	updated, _ := s.read("settings.yaml")
	updatedCSS, _ := s.read("custom.css")
	if !strings.Contains(updated.Raw, "columns: 3") || !strings.Contains(updatedCSS.Raw, "/* personal */") || !strings.Contains(updatedCSS.Raw, "opacity: .5") {
		t.Fatal("Appearance not persisted")
	}
	entries, err := os.ReadDir(filepath.Join(s.dir, ".home-pager-history"))
	if err != nil || len(entries) != 2 {
		t.Fatal("Expected backups for both files")
	}
}

func TestAppearanceRejectsInvalidChanges(t *testing.T) {
	s := &server{dir: t.TempDir()}
	payload := map[string]change{"settings": {Name: "settings.yaml", Raw: "title: [invalid", Revision: "missing"}, "css": {Name: "custom.css", Raw: "body {}", Revision: "missing"}}
	if w := request(t, s, "PUT", "/api/appearance", payload); w.Code != 422 {
		t.Fatal(w.Body.String())
	}
	if _, err := os.Stat(filepath.Join(s.dir, "custom.css")); !os.IsNotExist(err) {
		t.Fatal("Invalid YAML partially saved CSS")
	}
	payload["settings"] = change{Name: "services.yaml", Raw: "[]", Revision: "missing"}
	if w := request(t, s, "PUT", "/api/appearance", payload); w.Code != 400 {
		t.Fatal("Allowed non-appearance file")
	}
}
