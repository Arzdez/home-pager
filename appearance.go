package main

import (
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

// Validate both revisions and back up both files before changing either one.
// Filesystem rename is per-file; restore earlier writes if a later write fails.
func (s *server) saveAppearance(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Settings change `json:"settings"`
		CSS      change `json:"css"`
	}
	if !decode(w, r, &payload) {
		return
	}
	if payload.Settings.Name != "settings.yaml" || payload.CSS.Name != "custom.css" {
		fail(w, 400, "Оформление может изменять только settings.yaml и custom.css")
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	changes := []change{payload.Settings, payload.CSS}
	old := make([]document, 2)
	raw := make([]string, 2)
	modes := []fs.FileMode{0600, 0600}
	paths := make([]string, 2)
	for i, c := range changes {
		var err error
		raw[i], _, err = s.materialize(c)
		if err != nil {
			fail(w, 422, err.Error())
			return
		}
		old[i], err = s.read(c.Name)
		if err != nil {
			fail(w, 400, err.Error())
			return
		}
		if old[i].Revision != c.Revision {
			fail(w, 409, c.Name+" изменён извне. Загрузите актуальные файлы перед сохранением оформления.")
			return
		}
		paths[i], err = s.path(c.Name)
		if err != nil {
			fail(w, 400, err.Error())
			return
		}
		if st, err := os.Stat(paths[i]); err == nil {
			modes[i] = st.Mode().Perm()
		}
	}
	for i, c := range changes {
		if old[i].Exists && old[i].Raw != raw[i] {
			dir, err := s.historyDir()
			if err != nil {
				fail(w, 500, err.Error())
				return
			}
			id := c.Name + "." + time.Now().UTC().Format("20060102T150405.000000000") + ".bak"
			if err := os.WriteFile(filepath.Join(dir, id), []byte(old[i].Raw), 0600); err != nil {
				fail(w, 500, err.Error())
				return
			}
		}
	}
	written := []int{}
	for i := range changes {
		if old[i].Exists && old[i].Raw == raw[i] {
			continue
		}
		if err := atomicWrite(paths[i], []byte(raw[i]), modes[i]); err != nil {
			message := err.Error()
			for _, j := range written {
				var rollback error
				if old[j].Exists {
					rollback = atomicWrite(paths[j], []byte(old[j].Raw), modes[j])
				} else {
					rollback = os.Remove(paths[j])
				}
				if rollback != nil {
					message += fmt.Sprintf("; rollback %s: %v (предыдущая версия в истории)", changes[j].Name, rollback)
				}
			}
			fail(w, 500, message)
			return
		}
		written = append(written, i)
	}
	settings, err := s.read("settings.yaml")
	if err != nil {
		fail(w, 500, err.Error())
		return
	}
	css, err := s.read("custom.css")
	if err != nil {
		fail(w, 500, err.Error())
		return
	}
	respond(w, 200, map[string]any{"settings": settings, "css": css})
}
