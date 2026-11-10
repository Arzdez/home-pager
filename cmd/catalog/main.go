// Command catalog builds the offline template library from a Homepage checkout.
// Usage: go run ./cmd/catalog -source /path/to/homepage -out web/catalog.json
package main

import (
	"embed"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"gopkg.in/yaml.v3"
)

type entry struct {
	Title   string     `json:"title"`
	Slug    string     `json:"slug"`
	URL     string     `json:"url"`
	Example string     `json:"example"`
	Tree    *yaml.Node `json:"tree"`
}

var blocks = regexp.MustCompile("(?ms)^```ya?ml[^\n]*\n(.*?)^```")
var title = regexp.MustCompile(`(?m)^title:\s*(.+)$`)

//go:embed templates/*.yaml
var customTemplates embed.FS

func main() {
	source := flag.String("source", "", "Homepage source checkout")
	out := flag.String("out", "web/catalog.json", "Output file")
	flag.Parse()
	if *source == "" {
		log.Fatal("-source is required")
	}
	catalog := map[string]any{"source": "https://github.com/gethomepage/homepage", "branch": "dev", "snapshot": "2026-11-02"}
	for _, kind := range []string{"services", "info"} {
		paths, err := filepath.Glob(filepath.Join(*source, "docs", "widgets", kind, "*.md"))
		if err != nil {
			log.Fatal(err)
		}
		items := []entry{}
		for _, path := range paths {
			b, err := os.ReadFile(path)
			if err != nil {
				log.Fatal(err)
			}
			name := strings.TrimSuffix(filepath.Base(path), ".md")
			label := name
			if match := title.FindSubmatch(b); match != nil {
				label = strings.Trim(string(match[1]), `"' `)
			}
			for _, block := range blocks.FindAllSubmatch(b, -1) {
				var n yaml.Node
				if yaml.Unmarshal(block[1], &n) != nil || len(n.Content) == 0 {
					continue
				}
				r := n.Content[0]
				if kind == "services" {
					if r.Kind != yaml.MappingNode {
						continue
					}
					found := false
					for i := 0; i < len(r.Content)-1; i += 2 {
						if r.Content[i].Value == "widget" && r.Content[i+1].Kind == yaml.MappingNode {
							found = true
						}
					}
					if !found {
						continue
					}
				} else if r.Kind != yaml.SequenceNode {
					continue
				}
				example := string(block[1])
				// The upstream example selects an external Alertmanager. Use the
				// widget's built-in Grafana default for newly created configurations.
				if kind == "services" && name == "grafana" {
					for i := 0; i < len(r.Content)-1; i += 2 {
						if r.Content[i].Value == "widget" {
							widget := r.Content[i+1]
							for j := 0; j < len(widget.Content)-1; j += 2 {
								if widget.Content[j].Value == "alerts" {
									widget.Content[j+1].Value = "grafana"
								}
							}
						}
					}
					example = strings.Replace(example, "alerts: alertmanager", "alerts: grafana", 1)
				}
				items = append(items, entry{label, name, "https://gethomepage.dev/widgets/" + kind + "/" + name + "/", example, &n})
				break
			}
		}
		catalog[kind] = items
		fmt.Printf("%s: %d templates\n", kind, len(items))
	}
	b, err := os.ReadFile(filepath.Join(*source, "docs", "configs", "settings.md"))
	if err != nil {
		log.Fatal(err)
	}
	settings := []entry{}
	for _, block := range blocks.FindAllSubmatchIndex(b, -1) {
		raw := b[block[2]:block[3]]
		var n yaml.Node
		if yaml.Unmarshal(raw, &n) != nil || len(n.Content) == 0 || n.Content[0].Kind != yaml.MappingNode {
			continue
		}
		// The settings guide includes a Docker Compose mount example, not a Homepage setting.
		if len(n.Content[0].Content) == 2 && n.Content[0].Content[0].Value == "volumes" {
			continue
		}
		keys := []string{}
		for i, k := range n.Content[0].Content {
			if i%2 == 0 {
				keys = append(keys, k.Value)
			}
		}
		label := strings.Join(keys, ", ")
		settings = append(settings, entry{label, label, "https://gethomepage.dev/configs/settings/", string(raw), &n})
	}
	for _, template := range []struct{ File, Title, Slug string }{
		{"unifi-system.yaml", "UniFi Gateway · Custom API", "unifi-customapi"},
		{"unifi-traffic.yaml", "UniFi Gateway · Custom API", "unifi-customapi"},
		{"unifi-wan-health.yaml", "UniFi WAN Health · Custom API", "unifi-wan-health"},
		{"unifi-uplink-errors.yaml", "UniFi Uplink Errors · Custom API", "unifi-uplink-errors"},
		{"unifi-device-system.yaml", "UniFi Device · Custom API", "unifi-device-customapi"},
		{"unifi-device-overview.yaml", "UniFi Device · Custom API", "unifi-device-customapi"},
		{"unifi-device-diagnostics.yaml", "UniFi Device · Custom API", "unifi-device-customapi"},
		{"unifi-wifi-24.yaml", "UniFi Wi-Fi · Custom API", "unifi-wifi-customapi"},
		{"unifi-wifi-5.yaml", "UniFi Wi-Fi · Custom API", "unifi-wifi-customapi"},
		{"unifi-port.yaml", "UniFi Ports · Custom API", "unifi-ports-customapi"},
		{"unifi-port-map.yaml", "UniFi · Схема портов", "unifi-port-map"},
	} {
		raw, err := customTemplates.ReadFile("templates/" + template.File)
		if err != nil {
			log.Fatal(err)
		}
		var tree yaml.Node
		if err := yaml.Unmarshal(raw, &tree); err != nil {
			log.Fatal(err)
		}
		catalog["services"] = append(catalog["services"].([]entry), entry{template.Title, template.Slug, "/unifi-customapi.html", string(raw), &tree})
	}
	catalog["settings"] = settings
	data, err := json.Marshal(catalog)
	if err != nil {
		log.Fatal(err)
	}
	if err = os.WriteFile(*out, append(data, '\n'), 0644); err != nil {
		log.Fatal(err)
	}
	fmt.Printf("settings: %d examples\n", len(settings))
}
