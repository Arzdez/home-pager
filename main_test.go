package main

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"gopkg.in/yaml.v3"
)

func request(t *testing.T, s *server, method, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var b bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&b).Encode(body); err != nil {
			t.Fatal(err)
		}
	}
	r := httptest.NewRequest(method, path, &b)
	r.Header.Set("X-Home-Pager", "1")
	w := httptest.NewRecorder()
	s.handler().ServeHTTP(w, r)
	return w
}
func readDoc(t *testing.T, w *httptest.ResponseRecorder) document {
	t.Helper()
	if w.Code != 200 {
		t.Fatalf("status %d: %s", w.Code, w.Body.String())
	}
	var d document
	if err := json.Unmarshal(w.Body.Bytes(), &d); err != nil {
		t.Fatal(err)
	}
	return d
}

func TestSaveHistoryAndConflict(t *testing.T) {
	s := &server{dir: t.TempDir()}
	d := readDoc(t, request(t, s, "GET", "/api/file?name=settings.yaml", nil))
	if d.Exists || d.Revision != "missing" {
		t.Fatal("Missing file should not be created by read")
	}
	w := request(t, s, "PUT", "/api/file", change{Name: d.Name, Raw: "# keep me\ntitle: Home\ncustomFutureOption: true\n", Revision: d.Revision})
	d = readDoc(t, w)
	if !d.Exists {
		t.Fatal("Save did not create file")
	}
	d.Tree.Content[0].Content[1].Value = "New Home"
	d2 := readDoc(t, request(t, s, "PUT", "/api/file", change{Name: d.Name, Tree: d.Tree, Revision: d.Revision}))
	if !strings.Contains(d2.Raw, "# keep me") || !strings.Contains(d2.Raw, "customFutureOption: true") {
		t.Fatal("Visual editing lost comments or unknown fields")
	}
	if w := request(t, s, "PUT", "/api/file", change{Name: d.Name, Raw: "title: stale", Revision: d.Revision}); w.Code != 409 {
		t.Fatalf("Expected conflict, got %d", w.Code)
	}
	h := request(t, s, "GET", "/api/history?name=settings.yaml", nil)
	var items []map[string]any
	if err := json.Unmarshal(h.Body.Bytes(), &items); err != nil {
		t.Fatal(err)
	}
	if len(items) != 1 {
		t.Fatalf("Expected one backup: %s", h.Body.String())
	}
	b := request(t, s, "GET", "/api/backup?name=settings.yaml&id="+items[0]["id"].(string), nil)
	if !strings.Contains(b.Body.String(), "title: Home") {
		t.Fatal("Backup has wrong content")
	}
	if w := request(t, s, "PUT", "/api/file", change{Name: d.Name, Raw: d2.Raw, Revision: d2.Revision}); w.Code != 200 {
		t.Fatal(w.Body.String())
	}
}

func TestInvalidYAML(t *testing.T) {
	s := &server{dir: t.TempDir()}
	for _, raw := range []string{"title: [", "title: first\ntitle: second", "---\ntitle: a\n---\ntitle: b", "just text", "title: *missing", "- title: wrong-root"} {
		w := request(t, s, "PUT", "/api/file", change{Name: "settings.yaml", Raw: raw, Revision: "missing"})
		if w.Code != 422 {
			t.Errorf("Accepted invalid YAML %q: %d %s", raw, w.Code, w.Body.String())
		}
	}
	if _, err := os.Stat(filepath.Join(s.dir, "settings.yaml")); !os.IsNotExist(err) {
		t.Fatal("Invalid save created file")
	}
}

func TestRawRoundTripAndAliases(t *testing.T) {
	s := &server{dir: t.TempDir()}
	raw := "# settings\nbase: &base\n  key: '{{HOMEPAGE_VAR_KEY}}'\ncopy: *base\nfuture: {nested: [one, two]}\n"
	d := readDoc(t, request(t, s, "PUT", "/api/file", change{Name: "settings.yaml", Raw: raw, Revision: "missing"}))
	if d.Raw != raw {
		t.Fatal("Raw save changed formatting")
	}
	// JSON is how the browser round-trips the AST, including aliases.
	w := request(t, s, "POST", "/api/convert", change{Name: d.Name, Tree: d.Tree})
	d = readDoc(t, w)
	if !strings.Contains(d.Raw, "*base") || !strings.Contains(d.Raw, "{{HOMEPAGE_VAR_KEY}}") || !strings.Contains(d.Raw, "# settings") {
		t.Fatal("AST round trip lost content")
	}
}

func TestBadTreesAndTypes(t *testing.T) {
	s := &server{dir: t.TempDir()}
	for _, tree := range []*yaml.Node{
		{Kind: yaml.DocumentNode, Content: []*yaml.Node{nil}},
		{Kind: yaml.DocumentNode, Content: []*yaml.Node{{Kind: yaml.MappingNode, Content: []*yaml.Node{{Kind: yaml.ScalarNode, Value: "key"}}}}},
		{Kind: yaml.ScalarNode, Value: "bad"},
	} {
		w := request(t, s, "POST", "/api/convert", change{Name: "settings.yaml", Tree: tree})
		if w.Code != 422 {
			t.Fatalf("Bad tree accepted: %s", w.Body.String())
		}
	}
	if w := request(t, s, "POST", "/api/convert", change{Name: "settings.yaml", Raw: "title: !!int nope"}); w.Code != 422 {
		t.Fatal("Invalid typed scalar accepted")
	}
}

func TestFileAccessAndCSRF(t *testing.T) {
	s := &server{dir: t.TempDir()}
	for _, name := range []string{"../secret.yaml", "..%2Fsecret.yaml", "compose.json", ".env", "C:secret.yaml", "/etc/passwd", "..\\secret.yaml", ""} {
		if w := request(t, s, "GET", "/api/file?name="+name, nil); w.Code != 400 {
			t.Errorf("Allowed path %q", name)
		}
	}
	for _, origin := range []string{"https://evil.example", "null"} {
		r := httptest.NewRequest("PUT", "/api/file", strings.NewReader(`{}`))
		r.Header.Set("X-Home-Pager", "1")
		r.Header.Set("Origin", origin)
		w := httptest.NewRecorder()
		s.handler().ServeHTTP(w, r)
		if w.Code != 403 {
			t.Fatal("Cross-origin write allowed")
		}
	}
	r := httptest.NewRequest("PUT", "/api/file", strings.NewReader(`{}`))
	w := httptest.NewRecorder()
	s.handler().ServeHTTP(w, r)
	if w.Code != 403 {
		t.Fatal("Missing CSRF header allowed")
	}
	if w := request(t, s, "GET", "/api/backup?name=settings.yaml&id=../settings.yaml.bak", nil); w.Code != 400 {
		t.Fatal("Backup traversal allowed")
	}
}

func TestPasswordAndAssets(t *testing.T) {
	s := &server{dir: t.TempDir(), password: "test-password"}
	if w := request(t, s, "GET", "/api/files", nil); w.Code != 401 {
		t.Fatal("API readable without password")
	}
	r := httptest.NewRequest("GET", "/", nil)
	r.SetBasicAuth("admin", "test-password")
	w := httptest.NewRecorder()
	s.handler().ServeHTTP(w, r)
	if w.Code != 200 || !strings.Contains(w.Body.String(), "Home Pager") {
		t.Fatal("Embedded UI unavailable")
	}
	if w.Header().Get("Content-Security-Policy") == "" {
		t.Fatal("Missing CSP")
	}
}

func TestCSSAndExternalChange(t *testing.T) {
	s := &server{dir: t.TempDir()}
	d := readDoc(t, request(t, s, "PUT", "/api/file", change{Name: "custom.css", Raw: "body { color: red; }", Revision: "missing"}))
	if d.Tree != nil || d.Raw != "body { color: red; }" {
		t.Fatal("CSS altered")
	}
	if err := os.WriteFile(filepath.Join(s.dir, "custom.css"), []byte("external"), 0600); err != nil {
		t.Fatal(err)
	}
	w := request(t, s, "PUT", "/api/file", change{Name: d.Name, Raw: "changed", Revision: d.Revision})
	if w.Code != 409 {
		t.Fatal("External change overwritten")
	}
}

func TestSymlinkDenied(t *testing.T) {
	s := &server{dir: t.TempDir()}
	outside := filepath.Join(t.TempDir(), "outside.yaml")
	if err := os.WriteFile(outside, []byte("title: secret"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(outside, filepath.Join(s.dir, "settings.yaml")); err != nil {
		t.Skip("Symlink creation not available:", err)
	}
	if w := request(t, s, "GET", "/api/file?name=settings.yaml", nil); w.Code != 400 {
		t.Fatal("Read symlink")
	}
}

func TestReadMalformedFile(t *testing.T) {
	s := &server{dir: t.TempDir()}
	raw := "title: [broken"
	if err := os.WriteFile(filepath.Join(s.dir, "settings.yaml"), []byte(raw), 0600); err != nil {
		t.Fatal(err)
	}
	d := readDoc(t, request(t, s, "GET", "/api/file?name=settings.yaml", nil))
	if d.Error == "" || d.Raw != raw {
		t.Fatal("Malformed YAML not available for repair")
	}
}

func TestBundledCatalog(t *testing.T) {
	b, err := assets.ReadFile("web/catalog.json")
	if err != nil {
		t.Fatal(err)
	}
	var catalog struct {
		Services []struct {
			Title string     `json:"title"`
			Tree  *yaml.Node `json:"tree"`
		} `json:"services"`
		Info []struct {
			Title string     `json:"title"`
			Tree  *yaml.Node `json:"tree"`
		} `json:"info"`
		Settings []struct {
			Title string     `json:"title"`
			Tree  *yaml.Node `json:"tree"`
		} `json:"settings"`
	}
	if err := json.Unmarshal(b, &catalog); err != nil {
		t.Fatal(err)
	}
	if len(catalog.Services) < 160 || len(catalog.Info) < 10 || len(catalog.Settings) < 40 {
		t.Fatal("Catalog is incomplete")
	}
	s := &server{dir: t.TempDir()}
	for _, entry := range catalog.Services {
		if entry.Title == "Grafana" {
			widget := entry.Tree.Content[0].Content[1]
			for i := 0; i < len(widget.Content)-1; i += 2 {
				if widget.Content[i].Value == "alerts" && widget.Content[i+1].Value != "grafana" {
					t.Fatal("Grafana template must use its built-in Alertmanager by default")
				}
			}
		}
		group := &yaml.Node{Kind: yaml.MappingNode, Tag: "!!map", Content: []*yaml.Node{{Kind: yaml.ScalarNode, Tag: "!!str", Value: "Group"}, {Kind: yaml.SequenceNode, Tag: "!!seq", Content: []*yaml.Node{{Kind: yaml.MappingNode, Tag: "!!map", Content: []*yaml.Node{{Kind: yaml.ScalarNode, Tag: "!!str", Value: entry.Title}, entry.Tree.Content[0]}}}}}}
		tree := &yaml.Node{Kind: yaml.DocumentNode, Content: []*yaml.Node{{Kind: yaml.SequenceNode, Tag: "!!seq", Content: []*yaml.Node{group}}}}
		if _, _, err := s.materialize(change{Name: "services.yaml", Tree: tree}); err != nil {
			t.Errorf("Service %s: %v", entry.Title, err)
		}
	}
	for _, entry := range catalog.Info {
		if _, _, err := s.materialize(change{Name: "widgets.yaml", Tree: entry.Tree}); err != nil {
			t.Errorf("Info %s: %v", entry.Title, err)
		}
	}
	for _, entry := range catalog.Settings {
		if _, _, err := s.materialize(change{Name: "settings.yaml", Tree: entry.Tree}); err != nil {
			t.Errorf("Setting %s: %v", entry.Title, err)
		}
	}
}

func TestOversizedFile(t *testing.T) {
	s := &server{dir: t.TempDir()}
	if err := os.WriteFile(filepath.Join(s.dir, "custom.css"), bytes.Repeat([]byte("x"), maxSize+1), 0600); err != nil {
		t.Fatal(err)
	}
	if w := request(t, s, "GET", "/api/file?name=custom.css", nil); w.Code != 400 {
		t.Fatal("Oversized file accepted")
	}
}
