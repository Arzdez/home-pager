# Docker deployment

Image: `arzdez/home-pager:latest`, platform: `linux/amd64`, default UID:GID: `1000:1000`.

```sh
docker compose pull home-pager
docker compose up -d --no-deps home-pager

# Local build
docker build -t home-pager:local .
```

## Filesystem contract

| Mount             | Purpose                                            |
| ----------------- | -------------------------------------------------- |
| `/etc/home-pager` | Writable startup configuration and backups         |
| `/config`         | Shared Homepage configuration                      |
| `/icons`          | Icon storage; serve as `/icons` in Homepage        |
| `/images`         | Background storage; serve as `/images` in Homepage |

The entrypoint initializes `/etc/home-pager/home-pager.yaml` from the bundled template only when absent. Existing configuration survives image updates. Startup changes require `docker compose restart home-pager`.

Mount whole directories: saves use temporary files and rename. `PUID`/`PGID` select the process identity; they do not change ownership. Bind mounts and the configuration volume must be writable by that identity. New files use mode `0600`; align ownership with Homepage.

Corresponding mounts in the separate Homepage deployment:

```yaml
volumes:
  - ./config:/app/config
  - ./icons:/app/public/icons:ro
  - ./images:/app/public/images:ro
```

Use identical absolute host paths across separate Compose projects. Homepage may require a restart to discover new public assets; direct reverse-proxy serving avoids this cache limitation.

## Runtime

`compose.yaml` publishes `8090:8090`, uses a read-only root filesystem, writable `/tmp`, no Linux capabilities, and `no-new-privileges`. No Docker socket is required. Authentication is disabled in the default template.

Configuration keys: [home-pager.docker.yaml](home-pager.docker.yaml). Path and proxy semantics: [README](README.md#configuration). `compose.dockerhub.yaml` is an equivalent deployment template with a placeholder image namespace.

GPL-3.0-only. License texts and dependency notices: `/usr/share/licenses/home-pager/`.
