package main

import (
	"bytes"
	"crypto/sha256"
	"crypto/subtle"
	"embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"io"
	"io/fs"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"gopkg.in/yaml.v3"
)

//go:embed web/*
var assets embed.FS

const maxSize = 2 << 20

var files = []string{"settings.yaml", "services.yaml", "bookmarks.yaml", "widgets.yaml", "docker.yaml", "kubernetes.yaml", "proxmox.yaml", "custom.css", "custom.js"}

type server struct {
	dir, password        string
	mu                   sync.Mutex
	imagesDir, imagesURL string
	iconsDir, iconsURL   string
	imageMu              sync.Mutex
	imageClient          *http.Client
}

type document struct {
	Name     string     `json:"name"`
	Raw      string     `json:"raw"`
	Revision string     `json:"revision"`
	Exists   bool       `json:"exists"`
	Tree     *yaml.Node `json:"tree,omitempty"`
	Error    string     `json:"error,omitempty"`
}

type change struct {
	Name     string     `json:"name"`
	Raw      string     `json:"raw"`
	Revision string     `json:"revision"`
	Tree     *yaml.Node `json:"tree"`
}

func main() {
	cfg, err := settingsFromArgs(os.Args[1:])
	if errors.Is(err, flag.ErrHelp) {
		return
	}
	if err != nil {
		log.Fatal(err)
	}
	if err := cfg.applyProxyEnvironment(); err != nil {
		log.Fatal(err)
	}
	if err := os.MkdirAll(cfg.ConfigDir, 0700); err != nil {
		log.Fatal(err)
	}
	abs, err := filepath.EvalSymlinks(cfg.ConfigDir)
	if err != nil {
		log.Fatal(err)
	}
	s := &server{dir: abs, password: cfg.Password, imagesDir: cfg.ImagesDir, imagesURL: strings.TrimRight(cfg.ImagesURL, "/"), iconsDir: cfg.IconsDir, iconsURL: strings.TrimRight(cfg.IconsURL, "/")}
	log.Printf("Home Pager: http://%s | config: %s", cfg.Listen, abs)
	log.Fatal((&http.Server{Addr: cfg.Listen, Handler: s.handler(), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 15 * time.Second, WriteTimeout: imageDownloadTimeout + 45*time.Second, IdleTimeout: 60 * time.Second}).ListenAndServe())
}

func (s *server) handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/files", s.list)
	mux.HandleFunc("GET /api/file", s.get)
	mux.HandleFunc("POST /api/convert", s.convert)
	mux.HandleFunc("PUT /api/file", s.save)
	mux.HandleFunc("PUT /api/appearance", s.saveAppearance)
	mux.HandleFunc("GET /api/history", s.history)
	mux.HandleFunc("GET /api/backup", s.backup)
	mux.HandleFunc("GET /api/images", s.imageSettings)
	mux.HandleFunc("POST /api/images/import", s.importImage)
	mux.HandleFunc("POST /api/images/upload", s.uploadImage)
	mux.HandleFunc("GET /api/images/{name}", s.previewImage)
	mux.HandleFunc("GET /api/icons", s.iconSettings)
	mux.HandleFunc("GET /api/icons/library", s.listStoredIcons)
	mux.HandleFunc("GET /api/icons/{name}", s.previewIcon)
	web, _ := fs.Sub(assets, "web")
	mux.Handle("GET /", http.FileServer(http.FS(web)))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https: http:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
		w.Header().Set("Cache-Control", "no-store")
		if s.password != "" {
			_, pass, ok := r.BasicAuth()
			a, b := sha256.Sum256([]byte(pass)), sha256.Sum256([]byte(s.password))
			if !ok || subtle.ConstantTimeCompare(a[:], b[:]) != 1 {
				w.Header().Set("WWW-Authenticate", `Basic realm="Home Pager", charset="UTF-8"`)
				http.Error(w, "Authentication required", http.StatusUnauthorized)
				return
			}
		}
		if r.Method != "GET" && r.Method != "HEAD" {
			origin := r.Header.Get("Origin")
			u, err := url.Parse(origin)
			if r.Header.Get("X-Home-Pager") != "1" || r.Header.Get("Sec-Fetch-Site") == "cross-site" || (origin != "" && (err != nil || u.Host != r.Host || (u.Scheme != "http" && u.Scheme != "https"))) {
				fail(w, 403, "Cross-origin request denied")
				return
			}
		}
		mux.ServeHTTP(w, r)
	})
}

func respond(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
func fail(w http.ResponseWriter, status int, message string) {
	respond(w, status, map[string]string{"error": message})
}
func revision(b []byte, exists bool) string {
	if !exists {
		return "missing"
	}
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:])
}

func (s *server) path(name string) (string, error) {
	allowed := false
	for _, f := range files {
		if f == name {
			allowed = true
		}
	}
	// Additional Homepage YAML files (e.g. Kubernetes ConfigMap includes).
	if filepath.Base(name) == name && !strings.ContainsAny(name, `/\:`) && !strings.HasPrefix(name, ".") && (strings.HasSuffix(name, ".yaml") || strings.HasSuffix(name, ".yml")) {
		allowed = true
	}
	if !allowed {
		return "", errors.New("Unsupported configuration filename")
	}
	p := filepath.Join(s.dir, name)
	info, err := os.Lstat(p)
	if err == nil && (!info.Mode().IsRegular() || info.Mode()&os.ModeSymlink != 0) {
		return "", errors.New("Configuration must be a regular file, not a symlink")
	}
	if err != nil && !os.IsNotExist(err) {
		return "", err
	}
	return p, nil
}

func (s *server) read(name string) (document, error) {
	d := document{Name: name}
	p, err := s.path(name)
	if err != nil {
		return d, err
	}
	b, err := readLimited(p)
	if err != nil && !os.IsNotExist(err) {
		return d, err
	}
	d.Exists = err == nil
	d.Raw = string(b)
	d.Revision = revision(b, d.Exists)
	if strings.HasSuffix(name, ".yaml") || strings.HasSuffix(name, ".yml") {
		d.Tree, err = parse(b, name)
		if err != nil {
			d.Error = err.Error()
		}
	}
	return d, nil
}

func readLimited(path string) ([]byte, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	b, err := io.ReadAll(io.LimitReader(f, maxSize+1))
	if err != nil {
		return nil, err
	}
	if len(b) > maxSize {
		return nil, errors.New("File exceeds 2 MiB")
	}
	return b, nil
}

func parse(b []byte, name string) (*yaml.Node, error) {
	if len(b) > maxSize {
		return nil, errors.New("File exceeds 2 MiB")
	}
	dec := yaml.NewDecoder(bytes.NewReader(b))
	var root yaml.Node
	if err := dec.Decode(&root); err != nil && err != io.EOF {
		return nil, err
	}
	var extra yaml.Node
	if err := dec.Decode(&extra); err != io.EOF {
		return nil, errors.New("Only one YAML document is supported")
	}
	if len(root.Content) == 0 {
		kind, tag := yaml.MappingNode, "!!map"
		if name == "services.yaml" || name == "bookmarks.yaml" || name == "widgets.yaml" {
			kind, tag = yaml.SequenceNode, "!!seq"
		}
		root = yaml.Node{Kind: yaml.DocumentNode, Content: []*yaml.Node{{Kind: kind, Tag: tag}}}
	}
	// Decode checks duplicate keys and invalid alias references as well as syntax.
	var value any
	if err := root.Decode(&value); err != nil {
		return nil, err
	}
	if root.Content[0].Kind != yaml.MappingNode && root.Content[0].Kind != yaml.SequenceNode {
		return nil, errors.New("Configuration root must be a mapping or list")
	}
	want := yaml.MappingNode
	switch name {
	case "services.yaml", "bookmarks.yaml", "widgets.yaml":
		want = yaml.SequenceNode
	default:
		want = 0
	}
	if want != 0 && root.Content[0].Kind != want {
		return nil, errors.New("This Homepage file must contain a list of groups or widgets")
	}
	switch name {
	case "settings.yaml", "docker.yaml", "kubernetes.yaml", "proxmox.yaml":
		if root.Content[0].Kind != yaml.MappingNode {
			return nil, errors.New("This Homepage file must contain a mapping of settings")
		}
	}
	return &root, nil
}

func validateTree(n *yaml.Node, depth int, count *int) error {
	(*count)++
	if n == nil || depth > 64 || *count > 20000 {
		return errors.New("Invalid YAML tree or too much nesting")
	}
	switch n.Kind {
	case yaml.DocumentNode:
		if depth != 0 || len(n.Content) != 1 {
			return errors.New("Expected one YAML document")
		}
	case yaml.MappingNode:
		if len(n.Content)%2 != 0 {
			return errors.New("Mapping has an unmatched key")
		}
	case yaml.SequenceNode:
	case yaml.ScalarNode, yaml.AliasNode:
		if len(n.Content) != 0 {
			return errors.New("Scalar or alias cannot contain children")
		}
	default:
		return errors.New("Invalid YAML node kind")
	}
	for _, child := range n.Content {
		if err := validateTree(child, depth+1, count); err != nil {
			return err
		}
	}
	return nil
}

func decode(w http.ResponseWriter, r *http.Request, v any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 8*maxSize)
	d := json.NewDecoder(r.Body)
	d.DisallowUnknownFields()
	if err := d.Decode(v); err != nil {
		fail(w, 400, err.Error())
		return false
	}
	if err := d.Decode(new(any)); err != io.EOF {
		fail(w, 400, "Expected one JSON object")
		return false
	}
	return true
}

func (s *server) materialize(c change) (string, *yaml.Node, error) {
	if _, err := s.path(c.Name); err != nil {
		return "", nil, err
	}
	if c.Name == "custom.css" || c.Name == "custom.js" {
		if len(c.Raw) > maxSize {
			return "", nil, errors.New("File exceeds 2 MiB")
		}
		return c.Raw, nil, nil
	}
	raw := c.Raw
	if c.Tree != nil {
		count := 0
		if c.Tree.Kind != yaml.DocumentNode {
			return "", nil, errors.New("Expected a YAML document tree")
		}
		if err := validateTree(c.Tree, 0, &count); err != nil {
			return "", nil, err
		}
		var buf bytes.Buffer
		enc := yaml.NewEncoder(&buf)
		enc.SetIndent(2)
		if err := enc.Encode(c.Tree); err != nil {
			return "", nil, err
		}
		_ = enc.Close()
		raw = buf.String()
	}
	tree, err := parse([]byte(raw), c.Name)
	return raw, tree, err
}

func (s *server) list(w http.ResponseWriter, r *http.Request) {
	names := append([]string{}, files...)
	entries, err := os.ReadDir(s.dir)
	if err != nil {
		fail(w, 500, err.Error())
		return
	}
	for _, e := range entries {
		found := false
		for _, n := range names {
			if n == e.Name() {
				found = true
			}
		}
		if !found {
			if _, err := s.path(e.Name()); err == nil {
				names = append(names, e.Name())
			}
		}
	}
	respond(w, 200, map[string]any{"files": names, "directory": s.dir})
}
func (s *server) get(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	defer s.mu.Unlock()
	d, err := s.read(r.URL.Query().Get("name"))
	if err != nil {
		fail(w, 400, err.Error())
		return
	}
	respond(w, 200, d)
}
func (s *server) convert(w http.ResponseWriter, r *http.Request) {
	var c change
	if !decode(w, r, &c) {
		return
	}
	raw, tree, err := s.materialize(c)
	if err != nil {
		fail(w, 422, err.Error())
		return
	}
	respond(w, 200, document{Name: c.Name, Raw: raw, Tree: tree})
}

func (s *server) historyDir() (string, error) {
	p := filepath.Join(s.dir, ".home-pager-history")
	if err := os.Mkdir(p, 0700); err != nil && !os.IsExist(err) {
		return "", err
	}
	info, err := os.Lstat(p)
	if err != nil {
		return "", err
	}
	if !info.IsDir() || info.Mode()&os.ModeSymlink != 0 {
		return "", errors.New("Invalid history directory")
	}
	return p, nil
}

func (s *server) save(w http.ResponseWriter, r *http.Request) {
	var c change
	if !decode(w, r, &c) {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	raw, _, err := s.materialize(c)
	if err != nil {
		fail(w, 422, err.Error())
		return
	}
	old, err := s.read(c.Name)
	if err != nil {
		fail(w, 400, err.Error())
		return
	}
	if old.Revision != c.Revision {
		fail(w, 409, "Файл изменён другим пользователем. Загрузите актуальную версию перед сохранением.")
		return
	}
	if old.Exists && raw == old.Raw {
		respond(w, 200, old)
		return
	}
	if old.Exists {
		dir, err := s.historyDir()
		if err != nil {
			fail(w, 500, err.Error())
			return
		}
		id := c.Name + "." + time.Now().UTC().Format("20060102T150405.000000000") + ".bak"
		if err := os.WriteFile(filepath.Join(dir, id), []byte(old.Raw), 0600); err != nil {
			fail(w, 500, err.Error())
			return
		}
	}
	p, _ := s.path(c.Name)
	mode := fs.FileMode(0600)
	if st, err := os.Stat(p); err == nil {
		mode = st.Mode().Perm()
	}
	if err := atomicWrite(p, []byte(raw), mode); err != nil {
		fail(w, 500, err.Error())
		return
	}
	d, err := s.read(c.Name)
	if err != nil {
		fail(w, 500, err.Error())
		return
	}
	respond(w, 200, d)
}

func atomicWrite(p string, b []byte, mode fs.FileMode) error {
	f, err := os.CreateTemp(filepath.Dir(p), ".home-pager-*")
	if err != nil {
		return err
	}
	defer os.Remove(f.Name())
	if err = f.Chmod(mode); err == nil {
		_, err = f.Write(b)
	}
	if err == nil {
		err = f.Sync()
	}
	closeErr := f.Close()
	if err != nil {
		return err
	}
	if closeErr != nil {
		return closeErr
	}
	return os.Rename(f.Name(), p)
}

func (s *server) history(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if _, err := s.path(name); err != nil {
		fail(w, 400, err.Error())
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	dir, err := s.historyDir()
	if err != nil {
		fail(w, 500, err.Error())
		return
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		fail(w, 500, err.Error())
		return
	}
	items := []map[string]any{}
	for i := len(entries) - 1; i >= 0; i-- {
		e := entries[i]
		if strings.HasPrefix(e.Name(), name+".") && strings.HasSuffix(e.Name(), ".bak") && e.Type().IsRegular() {
			st, err := e.Info()
			if err == nil {
				items = append(items, map[string]any{"id": e.Name(), "time": st.ModTime().UTC().Format(time.RFC3339), "size": st.Size()})
			}
		}
	}
	respond(w, 200, items)
}
func (s *server) backup(w http.ResponseWriter, r *http.Request) {
	name, id := r.URL.Query().Get("name"), r.URL.Query().Get("id")
	if _, err := s.path(name); err != nil {
		fail(w, 400, err.Error())
		return
	}
	if filepath.Base(id) != id || strings.ContainsAny(id, `/\:`) || !strings.HasPrefix(id, name+".") || !strings.HasSuffix(id, ".bak") {
		fail(w, 400, "Invalid backup")
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	dir, err := s.historyDir()
	if err != nil {
		fail(w, 500, err.Error())
		return
	}
	p := filepath.Join(dir, id)
	info, err := os.Lstat(p)
	if err != nil || !info.Mode().IsRegular() {
		fail(w, 404, "Backup not found")
		return
	}
	b, err := readLimited(p)
	if err != nil {
		fail(w, 500, err.Error())
		return
	}
	respond(w, 200, map[string]string{"raw": string(b)})
}
