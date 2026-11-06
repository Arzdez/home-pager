# Home Pager with Docker Compose

Home Pager is a web GUI for editing an existing Homepage dashboard's configuration.
Homepage itself is installed separately. The panel does not need the Docker socket.

## Start an image from Docker Hub

Download [compose.dockerhub.yaml](compose.dockerhub.yaml), replace
`your-dockerhub-user/home-pager:latest` with your published image, and run:

```sh
docker compose -f compose.dockerhub.yaml up -d
docker compose -f compose.dockerhub.yaml logs --tail=50 home-pager
```

Open `http://SERVER_IP:8090`. The example publishes the panel on all host interfaces.
To bind only to localhost, use `127.0.0.1:8090:8090` under `ports`.

To build from this repository instead:

```sh
docker compose up -d --build
```

The source-build `compose.yaml` binds to localhost by default. Choose either the
source-build file or the Docker Hub file for a deployment.

## Parameters

| Parameter                 | Meaning                                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `image`                   | Docker Hub namespace, repository and tag to download. Use a version tag to pin a release.                                                |
| `build: .`                | Alternative to a published image: build the Dockerfile in the current directory. Used in `compose.yaml`.                                 |
| `restart: unless-stopped` | Restart after failures or host reboots unless manually stopped.                                                                          |
| `ports`                   | Host port followed by container port. Changing the host port does not require changing `listen` in the app.                              |
| `user`                    | Numeric UID:GID for the process. Defaults to `1000:1000`.                                                                                |
| `command`                 | Arguments passed to Home Pager. `-conf` selects the startup config inside the container.                                                 |
| `volumes`                 | Persistent files shared with the host or stored in a Docker volume. Left side is the host path/volume; right side is the container path. |
| `read_only`               | Protects the image filesystem. Explicit data volumes remain writable.                                                                    |
| `tmpfs: /tmp`             | Provides temporary writable storage in memory.                                                                                           |
| `no-new-privileges`       | Prevents the process from gaining additional privileges.                                                                                 |
| `cap_drop: ALL`           | Removes Linux capabilities the application does not need.                                                                                |

`PUID` and `PGID` are Compose substitutions, not application settings. For example,
put this in `.env` beside the Compose file:

```dotenv
PUID=1000
PGID=1000
```

They do not run `chown`. Bind directories must already be writable by that UID/GID.
New named volumes use the image directory ownership, UID/GID 1000. If you use
different IDs, adjust the volume ownership as well.

## Persistent paths

| Host path or volume         | Container path    | Contents                                                       |
| --------------------------- | ----------------- | -------------------------------------------------------------- |
| `panel-config` named volume | `/etc/home-pager` | Panel startup config and its backups.                          |
| `./config`                  | `/config`         | Existing Homepage YAML/CSS/JS files and configuration history. |
| `./icons`                   | `/icons`          | Uploaded and downloaded icons.                                 |
| `./images`                  | `/images`         | Uploaded and downloaded backgrounds.                           |

Relative bind paths are resolved from the Compose file's directory. If using
Portainer or a separate Compose project for Homepage, use absolute host paths
to make sure both containers see the same files.

The image supplies a default configuration. On first launch it creates
`/etc/home-pager/home-pager.yaml` if missing. Container recreation and image
updates preserve an existing file in the volume. You do not need to create it
manually. You can use a writable bind directory instead of the named volume:

```yaml
volumes:
  - ./panel-config:/etc/home-pager
```

Mount the directory rather than one config file: GUI saves use atomic replacement
and create backups beside the file.

## Startup configuration

The defaults and their comments are in [home-pager.docker.yaml](home-pager.docker.yaml):

| Key                         | Meaning                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `listen`                    | Container-side listening address, normally `0.0.0.0:8090`.                                 |
| `config_dir`                | Homepage configuration directory inside the container, `/config`.                          |
| `password`                  | Optional HTTP Basic password. Empty disables authentication.                               |
| `icons_dir`                 | Container-side icon storage, `/icons`.                                                     |
| `icons_url`                 | Public URL prefix on Homepage, normally `/icons`.                                          |
| `images_dir`                | Container-side background storage, `/images`.                                              |
| `images_url`                | Public URL prefix on Homepage, normally `/images`.                                         |
| `http_proxy`, `https_proxy` | Optional proxies for image downloads. Missing inherits the environment; empty disables it. |
| `no_proxy`                  | Addresses/domains that bypass the proxy, separated by commas.                              |

Edit these in **Panel settings → Server configuration** (the current interface is
in Russian: **Настройки панели → Конфигурация сервера**). Restart the panel to
apply startup changes. Use paths inside the container, not host paths. Moving a
path does not move files or alter Docker mounts.

## Connect Homepage

Add these mounts to your existing Homepage service, using the same host paths:

```yaml
volumes:
  - ./config:/app/config
  - ./icons:/app/public/icons:ro
  - ./images:/app/public/images:ro
```

Both processes need access to the shared files: Home Pager needs write access,
Homepage needs read access. Homepage may need a restart to discover newly added
public files; serving `/icons/` and `/images/` directly through a reverse proxy
avoids this limitation.

## Update or restart

For a published image:

```sh
docker compose -f compose.dockerhub.yaml pull home-pager
docker compose -f compose.dockerhub.yaml up -d --force-recreate home-pager
```

To apply startup configuration changes without updating the image:

```sh
docker compose -f compose.dockerhub.yaml restart home-pager
```

Recreating the container preserves its mounted data. `docker compose down -v`
deletes named volumes, including the panel's startup configuration.
