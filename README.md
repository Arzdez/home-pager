# Home Pager

Standalone Go web UI for [Homepage](https://gethomepage.dev/) configuration. Edits files directly; no database, Docker socket, or frontend build pipeline. Assets and the template catalog are embedded in the executable.

## Scope

- Visual and raw YAML editors; CSS/JS editing; comments and unknown fields retained.
- Service, widget, bookmark, and layout templates with typed controls; reorder, move, and duplicate blocks.
- Explicit saves, revision conflict detection, and local backups.
- Layout preview, image conversion, icon galleries, and local asset management.
- Server configuration editor; Russian/English UI and browser-local display preferences.

Homepage runs separately. The panel manages its configuration, not the service lifecycle.

## Deployment

Published image: `arzdez/home-pager:latest` (`linux/amd64`).

```sh
docker compose pull home-pager
docker compose up -d --no-deps home-pager
```

[compose.yaml](compose.yaml) publishes port `8090`. Configure bind mounts and `PUID`/`PGID` for the existing Homepage installation. Mount directories, not individual files: writes use temporary files and rename.

| Container path    | Purpose                                                    |
| ----------------- | ---------------------------------------------------------- |
| `/etc/home-pager` | Persistent panel configuration; initialized on first start |
| `/config`         | Homepage YAML, CSS, JS, and revision history               |
| `/icons`          | Imported icons                                             |
| `/images`         | Imported backgrounds                                       |

Homepage must serve the same asset directories under the configured URL prefixes. Adding public files can require a Homepage restart unless a separate web server serves them.

Details: [Docker deployment](README.docker.md).

## Configuration

```sh
./home-pager -conf /etc/home-pager/home-pager.yaml
```

```yaml
listen: "127.0.0.1:8090"
config_dir: "/srv/homepage/config"
icons_dir: "/srv/homepage/icons"
icons_url: "/icons"
images_dir: "/srv/homepage/images"
images_url: "/images"
password: ""
```

Relative paths resolve against the configuration directory. Empty asset directories default to `<config_dir>/icons` and `<config_dir>/images`. CLI overrides take precedence. Startup configuration changes require a panel restart; the GUI does not relocate files or modify container mounts.

A nonempty `password` enables HTTP Basic authentication; an empty value disables it. Optional `http_proxy`, `https_proxy`, and `no_proxy` override process environment values. See [home-pager.example.yaml](home-pager.example.yaml).

## Build and verification

Go 1.23+; dependencies are vendored. Node.js 20+ is required only for DOM integration tests and catalog tooling.

```sh
go build -mod=vendor -trimpath -o home-pager .
go test -mod=vendor ./...
go vet -mod=vendor ./...
npm ci
npm test
```

UI tests use JSDOM against the Go HTTP API. They do not provide browser rendering coverage.

```sh
# Linux cross-build
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -mod=vendor -trimpath -o home-pager-linux-amd64 .

# Rebuild embedded catalogs
go run -mod=vendor ./cmd/catalog -source /path/to/homepage -out web/catalog.json
node cmd/update-icons.cjs
```

## Storage semantics

One YAML document per file, maximum 2 MiB. Additional YAML files must reside directly in `config_dir`; symlinks are rejected. Backups retain prior contents, including secrets, without automatic pruning. Revision checks detect external edits but do not lock external writers. Appearance saves spanning `settings.yaml` and `custom.css` are not a crash-atomic transaction.

Templates are documentation snapshots, not a complete schema. Raw editing remains available for unsupported or newer parameters. Preview rendering is approximate and does not execute service widgets or custom JavaScript.

## License

[GPL-3.0-only](LICENSE). Third-party components retain their respective licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Independent project, not an official Homepage component.
