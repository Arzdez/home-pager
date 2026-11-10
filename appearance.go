package main

import (
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

// Validate all revisions and back up all files before changing any of them.
// Filesystem rename is per-file; restore earlier writes if a later write fails.
func (s *server) saveAppearance(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Settings  *change `json:"settings"`
		Bookmarks *change `json:"bookmarks"`
		CSS       change  `json:"css"`
		Script    *change `json:"script"`
	}
	if !decode(w, r, &payload) {
		return
	}
	if (payload.Settings == nil) == (payload.Bookmarks == nil) ||
		(payload.Settings != nil && payload.Settings.Name != "settings.yaml") ||
		(payload.Bookmarks != nil && payload.Bookmarks.Name != "bookmarks.yaml") ||
		payload.CSS.Name != "custom.css" || (payload.Script != nil && payload.Script.Name != "custom.js") {
		fail(w, 400, "Недопустимый набор файлов оформления")
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	var primary change
	if payload.Settings != nil {
		primary = *payload.Settings
	} else {
		primary = *payload.Bookmarks
	}
	changes := []change{primary, payload.CSS}
	if payload.Script != nil {
		changes = append(changes, *payload.Script)
	}
	old := make([]document, len(changes))
	raw := make([]string, len(changes))
	modes := make([]fs.FileMode, len(changes))
	paths := make([]string, len(changes))
	for i, c := range changes {
		modes[i] = 0600
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
	result := map[string]any{}
	for _, c := range changes {
		doc, err := s.read(c.Name)
		if err != nil {
			fail(w, 500, err.Error())
			return
		}
		key := map[string]string{"settings.yaml": "settings", "bookmarks.yaml": "bookmarks", "custom.css": "css", "custom.js": "script"}[c.Name]
		result[key] = doc
	}
	respond(w, 200, result)
}
