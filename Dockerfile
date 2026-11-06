# Build stage: compile the Go app with the web UI embedded in the executable.
FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
# Vendored dependencies avoid downloading Go modules during compilation.
COPY vendor ./vendor
COPY main.go images.go app_config.go appearance.go server_config.go ./
COPY web ./web
RUN CGO_ENABLED=0 GOPROXY=off GOTOOLCHAIN=local go build -mod=vendor -buildvcs=false -trimpath -ldflags="-s -w" -o /home-pager .

# Runtime stage: small Linux image; Go and Node.js are not required at runtime.
FROM alpine:3.23
LABEL org.opencontainers.image.licenses="GPL-3.0-only"
COPY LICENSE THIRD_PARTY_NOTICES.md /usr/share/licenses/home-pager/
COPY web/THIRD_PARTY_LICENSES.txt /usr/share/licenses/home-pager/
COPY vendor/github.com/HugoSmits86/nativewebp/LICENSE /usr/share/licenses/home-pager/nativewebp/LICENSE
COPY vendor/golang.org/x/image/LICENSE /usr/share/licenses/home-pager/golang-x-image/LICENSE
COPY vendor/gopkg.in/yaml.v3/LICENSE /usr/share/licenses/home-pager/yaml-v3/LICENSE
# CA certificates are used for HTTPS image downloads. Default UID/GID: 1000.
RUN apk add --no-cache ca-certificates && addgroup -g 1000 pager && adduser -D -u 1000 -G pager pager
COPY --from=build /home-pager /usr/local/bin/home-pager
# Keep the legacy config path and a separate template for initializing a volume.
COPY home-pager.docker.yaml /etc/home-pager.yaml
COPY home-pager.docker.yaml /usr/share/home-pager/default.yaml
RUN mkdir -p /etc/home-pager && chown pager:pager /etc/home-pager
# Run without root. A Compose `user` value can override the UID/GID.
USER pager
# Metadata only: publish the port using Compose `ports` or docker run -p.
EXPOSE 8090
# Initialize a missing config; persisted user settings are never replaced.
ENTRYPOINT ["home-pager", "-init-conf", "/usr/share/home-pager/default.yaml"]
# Default arguments; can be replaced using Compose `command`.
CMD ["-conf", "/etc/home-pager/home-pager.yaml"]
