%define _unpackaged_files_terminate_build 1
%define _enable_debug_packages 0

Name: home-pager
Version: 0.1.0
Release: alt1

Summary: Web configuration editor for Homepage dashboards
Summary(ru_RU.UTF-8): Веб-редактор конфигурации панели Homepage
License: GPL-3.0-only AND MIT AND BSD-3-Clause AND Apache-2.0
Group: Networking/WWW

Source: %name-%version.tar

BuildRequires(pre): rpm-macros-systemd
BuildRequires: golang >= 1.23.0
Requires: ca-certificates
Requires(pre): shadow-utils

%description
Home Pager is an independent web editor for Homepage configuration files.
It provides a visual YAML editor, widget templates, image and icon import,
layout settings, revision checks and local configuration backups.
The web interface is embedded in a single Go binary.

%description -l ru_RU.UTF-8
Независимая веб-панель для настройки Homepage: визуальное редактирование YAML,
шаблоны виджетов, загрузка фонов и иконок, настройка оформления, проверка
конфликтов и резервные копии. Homepage устанавливается отдельно.

%prep
%setup

%build
export CGO_ENABLED=0
export GOTOOLCHAIN=local
export GOPROXY=off
export GOSUMDB=off
export GOCACHE="$PWD/.gocache"
export GOMODCACHE="$PWD/.gomodcache"
go build -mod=vendor -buildvcs=false -trimpath -ldflags='-s -w' -o %name .

%check
export CGO_ENABLED=0
export GOTOOLCHAIN=local
export GOPROXY=off
export GOSUMDB=off
export GOCACHE="$PWD/.gocache"
export GOMODCACHE="$PWD/.gomodcache"
go test -mod=vendor ./...

%install
install -Dm755 %name %buildroot%_bindir/%name
install -Dm644 packaging/altlinux/%name.service %buildroot%_unitdir/%name.service
install -Dm640 packaging/altlinux/%name.yaml %buildroot%_sysconfdir/%name/%name.yaml
install -dm750 %buildroot/var/lib/%name
install -dm750 %buildroot/var/lib/%name/config
install -dm750 %buildroot/var/lib/%name/images
install -dm750 %buildroot/var/lib/%name/icons

%pre
%_sbindir/groupadd -r -f %name
if ! id -u %name >/dev/null 2>&1; then
    %_sbindir/useradd -r -g %name -d /var/lib/%name -s /sbin/nologin \
        -c 'Homepage configuration editor' %name
fi

%post
%post_service %name

%preun
%preun_service %name

%files
%doc LICENSE README.md THIRD_PARTY_NOTICES.md
%doc web/THIRD_PARTY_LICENSES.txt packaging/altlinux/README.alt.md
%_bindir/%name
%_unitdir/%name.service
%dir %attr(0750,root,%name) %_sysconfdir/%name
%config(noreplace) %attr(0640,root,%name) %_sysconfdir/%name/%name.yaml
%dir %attr(0750,%name,%name) /var/lib/%name
%dir %attr(0750,%name,%name) /var/lib/%name/config
%dir %attr(0750,%name,%name) /var/lib/%name/images
%dir %attr(0750,%name,%name) /var/lib/%name/icons

%changelog
* Fri Nov 06 2026 Evgenii Sozonov <infagot@gmail.com> 0.1.0-alt1
- Initial ALT Linux package with vendored dependencies and systemd service.
