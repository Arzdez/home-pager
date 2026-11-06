FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
COPY vendor ./vendor
COPY main.go images.go app_config.go appearance.go server_config.go ./
COPY web ./web
RUN CGO_ENABLED=0 GOPROXY=off GOTOOLCHAIN=local go build -mod=vendor -buildvcs=false -trimpath -ldflags="-s -w" -o /home-pager .

FROM alpine:3.23
RUN apk add --no-cache ca-certificates && addgroup -g 1000 pager && adduser -D -u 1000 -G pager pager
COPY --from=build /home-pager /usr/local/bin/home-pager
COPY home-pager.docker.yaml /etc/home-pager.yaml
COPY home-pager.docker.yaml /usr/share/home-pager/default.yaml
RUN mkdir -p /etc/home-pager && chown pager:pager /etc/home-pager
USER pager
EXPOSE 8090
ENTRYPOINT ["home-pager", "-init-conf", "/usr/share/home-pager/default.yaml"]
CMD ["-conf", "/etc/home-pager/home-pager.yaml"]
