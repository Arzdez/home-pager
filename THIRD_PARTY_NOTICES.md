# Homepage documentation examples

`web/catalog.json` contains configuration examples derived from the Homepage documentation:

- Source: https://github.com/gethomepage/homepage, branch `dev`, downloaded 2026-11-02.
- Documentation: https://gethomepage.dev/
- Copyright: Homepage contributors.
- License: GNU General Public License v3.0; full text in `LICENSE`.

The examples are bundled for offline use. `cmd/catalog` regenerates the catalog from a local Homepage source checkout. The management application is an independent project and is not an official Homepage component.

Local adjustment: the Grafana example uses `alerts: grafana`, matching the widget's built-in default, rather than selecting an external Alertmanager data source.

# Image conversion dependencies

The filename indexes in `web/icon-index.json` are generated from
[Dashboard Icons](https://github.com/homarr-labs/dashboard-icons) (Apache-2.0)
and [selfh.st Icons](https://github.com/selfhst/icons) (CC-BY-4.0).
Icons are fetched from the upstream CDN for previews or on explicit import;
the application does not bundle image assets. Source links are shown in the gallery.
Brand names and logos remain the property of their respective owners.

Additional filename indexes reference Simple Icons (CC0-1.0), Material Design
Icons (Apache-2.0), Lucide (ISC), Tabler (MIT), Bootstrap Icons (MIT), Heroicons
(MIT), and Font Awesome Free SVG icons (CC-BY-4.0). Official repository links,
license identifiers and tree revisions are included per source in
`web/icon-index.json` and exposed through the gallery. These SVG image assets
are loaded from their upstream CDN; no SVG code is injected into the page.

- `github.com/HugoSmits86/nativewebp` v1.3.0 — Copyright (c) 2024 Hugo Smits, MIT License. https://github.com/HugoSmits86/nativewebp
- `golang.org/x/image` v0.24.0 — Copyright The Go Authors, BSD 3-Clause License. https://go.googlesource.com/image
- `gopkg.in/yaml.v3` v3.0.1 — Copyright Canonical Ltd., Apache-2.0 and MIT notices as distributed by the package. https://github.com/go-yaml/yaml

Full dependency license texts are bundled in `web/THIRD_PARTY_LICENSES.txt`, also available from the embedded web interface at `/THIRD_PARTY_LICENSES.txt`.
