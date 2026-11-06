package main

import (
	"bytes"
	"context"
	"encoding/json"
	"image"
	"image/color"
	"image/png"
	"io"
	"mime/multipart"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func testPNG(t *testing.T) []byte {
	t.Helper()
	img := image.NewNRGBA(image.Rect(0, 0, 40, 20))
	img.SetNRGBA(0, 0, color.NRGBA{R: 255, A: 128})
	var b bytes.Buffer
	if err := png.Encode(&b, img); err != nil {
		t.Fatal(err)
	}
	return b.Bytes()
}

func TestStoredIconLibrary(t *testing.T) {
	dir := t.TempDir()
	s := &server{dir: dir, iconsDir: filepath.Join(dir, "icons"), iconsURL: "/custom-icons"}
	get := func(path string) *httptest.ResponseRecorder {
		rr := httptest.NewRecorder()
		s.handler().ServeHTTP(rr, httptest.NewRequest("GET", path, nil))
		return rr
	}
	if rr := get("/api/icons/library"); rr.Code != 200 || strings.TrimSpace(rr.Body.String()) != "[]" {
		t.Fatalf("Missing directory: %d %s", rr.Code, rr.Body.String())
	}
	if err := os.Mkdir(s.iconsDir, 0755); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"grafana logo.png", "notes.txt", ".hidden.png"} {
		if err := os.WriteFile(filepath.Join(s.iconsDir, name), testPNG(t), 0644); err != nil {
			t.Fatal(err)
		}
	}
	if err := os.Mkdir(filepath.Join(s.iconsDir, "folder.png"), 0755); err != nil {
		t.Fatal(err)
	}
	// Symlinks must not expose files outside the configured icon directory.
	_ = os.Symlink(filepath.Join(s.iconsDir, "grafana logo.png"), filepath.Join(s.iconsDir, "linked.png"))
	rr := get("/api/icons/library")
	var entries []struct {
		Name, Path, Preview string
		Size                int64
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &entries); err != nil {
		t.Fatal(err)
	}
	if rr.Code != 200 || len(entries) != 1 || entries[0].Path != "/custom-icons/grafana logo.png" || entries[0].Size == 0 {
		t.Fatalf("Unexpected library: %d %s", rr.Code, rr.Body.String())
	}
	if rr := get(entries[0].Preview); rr.Code != 200 || !bytes.Equal(rr.Body.Bytes(), testPNG(t)) {
		t.Fatalf("Preview failed: %d", rr.Code)
	}
	if rr := get("/api/icons/notes.txt"); rr.Code != 404 {
		t.Fatalf("Unexpected nonimage status: %d", rr.Code)
	}
}

func TestImageConversion(t *testing.T) {
	b := testPNG(t)
	for _, format := range []string{"png", "jpeg", "webp"} {
		out, result, err := convertImage(b, imageImport{Format: format, Quality: 80, MaxWidth: 20, MaxHeight: 20})
		if err != nil {
			t.Fatal(err)
		}
		img, got, err := image.Decode(bytes.NewReader(out))
		if err != nil {
			t.Fatal(err)
		}
		if got != format || img.Bounds().Dx() != 20 || img.Bounds().Dy() != 10 || result.Width != 20 || result.Height != 10 || !imageName.MatchString(result.Name) {
			t.Fatalf("Bad conversion: %+v, %s", result, got)
		}
		if format == "jpeg" {
			r, g, b, _ := img.At(19, 9).RGBA()
			if r < 60000 || g < 60000 || b < 60000 {
				t.Fatal("Transparency was not flattened onto white")
			}
		}
		// Each output must also work as the next import's input.
		if _, _, err := convertImage(out, imageImport{Format: "png"}); err != nil {
			t.Fatal(err)
		}
	}
	_, result, err := convertImage(b, imageImport{Format: "png", MaxWidth: 100})
	if err != nil || result.Width != 40 {
		t.Fatal("Image was upscaled")
	}
}

func TestImageImportAndPreview(t *testing.T) {
	b := testPNG(t)
	source := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		_, _ = w.Write(b)
	}))
	defer source.Close()
	s := &server{dir: t.TempDir(), imageClient: source.Client()}
	w := request(t, s, "POST", "/api/images/import", imageImport{URL: source.URL, Format: "webp", MaxHeight: 10})
	if w.Code != 200 {
		t.Fatal(w.Body.String())
	}
	var result importedImage
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	if result.Path != "/images/"+result.Name || result.Width != 20 || result.Height != 10 {
		t.Fatalf("Bad result: %+v", result)
	}
	if _, err := os.Stat(filepath.Join(s.dir, "images", result.Name)); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(s.dir, "settings.yaml")); !os.IsNotExist(err) {
		t.Fatal("Import changed settings before explicit save")
	}
	preview := request(t, s, "GET", result.Preview, nil)
	if preview.Code != 200 || preview.Header().Get("Content-Type") != "image/webp" || !bytes.HasPrefix(preview.Body.Bytes(), []byte("RIFF")) {
		t.Fatal("Preview failed")
	}
	// A different configured public directory and URL prefix must be honored.
	s.imagesDir = filepath.Join(t.TempDir(), "assets")
	s.imagesURL = "/wallpapers"
	w = request(t, s, "POST", "/api/images/import", imageImport{URL: source.URL, Format: "jpeg"})
	if w.Code != 200 {
		t.Fatal(w.Body.String())
	}
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	if result.Path != "/wallpapers/"+result.Name {
		t.Fatal("Ignored URL prefix")
	}
	if _, err := os.Stat(filepath.Join(s.imagesDir, result.Name)); err != nil {
		t.Fatal(err)
	}
}

func TestImageValidationAndSSRF(t *testing.T) {
	for _, raw := range []string{"file:///etc/passwd", "ftp://example.com/image", "https://user:pass@example.com/image", "//example.com/image", "javascript:alert(1)", ""} {
		if _, err := validateImageSource(raw); err == nil {
			t.Errorf("Accepted source %q", raw)
		}
	}
	for _, ip := range []string{"127.0.0.1", "::1", "10.0.0.1", "192.168.1.1", "169.254.169.254", "100.100.100.200", "::ffff:127.0.0.1", "0.0.0.0", "198.18.0.1"} {
		if publicImageIP(net.ParseIP(ip)) {
			t.Errorf("Allowed private IP %s", ip)
		}
	}
	if !publicImageIP(net.ParseIP("8.8.8.8")) {
		t.Fatal("Public IP blocked")
	}
	if _, err := downloadImage(context.Background(), imageHTTPClient(), "http://127.0.0.1:1/image"); err == nil {
		t.Fatal("Private image download allowed")
	}
	for _, prefix := range []string{"https://example.com/images", "//evil/images", "/../images", "/images?x=y", "/images#fragment"} {
		if validateImagesURL(prefix) == nil {
			t.Errorf("Invalid prefix accepted: %s", prefix)
		}
	}
	b := testPNG(t)
	for _, options := range []imageImport{{Format: "svg"}, {Format: "jpeg", Quality: 101}, {Format: "png", MaxWidth: -1}, {Format: "webp", MaxHeight: 8193}} {
		if _, _, err := convertImage(b, options); err == nil {
			t.Fatal("Accepted bad output options")
		}
	}
	if _, _, err := convertImage([]byte("<html>not an image</html>"), imageImport{Format: "png"}); err == nil {
		t.Fatal("Accepted HTML")
	}
	var oversized bytes.Buffer
	// Encode only a PNG header with excessive dimensions; rejection must occur before full decode.
	large := image.NewGray(image.Rect(0, 0, 8193, 1))
	if err := png.Encode(&oversized, large); err != nil {
		t.Fatal(err)
	}
	if _, _, err := convertImage(oversized.Bytes(), imageImport{Format: "png"}); err == nil {
		t.Fatal("Oversized dimension accepted")
	}
}

func TestImageDownloadFailures(t *testing.T) {
	source := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/large":
			w.Header().Set("Content-Length", "99999999")
		case "/redirect":
			http.Redirect(w, r, "/missing", 302)
		case "/bad":
			_, _ = w.Write([]byte("not an image"))
		default:
			w.WriteHeader(404)
		}
	}))
	defer source.Close()
	s := &server{dir: t.TempDir(), imageClient: source.Client()}
	for _, path := range []string{"/large", "/redirect", "/bad"} {
		w := request(t, s, "POST", "/api/images/import", imageImport{URL: source.URL + path, Format: "png"})
		if w.Code != 422 {
			t.Fatalf("Accepted bad source %s: %s", path, w.Body.String())
		}
	}
	s.imageMu.Lock()
	w := request(t, s, "POST", "/api/images/import", imageImport{URL: source.URL, Format: "png"})
	s.imageMu.Unlock()
	if w.Code != 429 {
		t.Fatal("Concurrent conversion allowed")
	}
	if w := request(t, s, "GET", "/api/images/background-bad.png", nil); w.Code != 404 {
		t.Fatal("Unknown image served")
	}
	if w := request(t, s, "GET", "/api/images/settings.yaml", nil); w.Code != 404 {
		t.Fatal("Non-image served")
	}
}

func TestImagesDoNotAppearAsConfigFiles(t *testing.T) {
	s := &server{dir: t.TempDir()}
	if err := os.Mkdir(filepath.Join(s.dir, "images"), 0755); err != nil {
		t.Fatal(err)
	}
	w := request(t, s, "GET", "/api/files", nil)
	if strings.Contains(w.Body.String(), `"images"`) {
		t.Fatal("Image directory exposed as a YAML file")
	}
}

type imageRoundTripFunc func(*http.Request) (*http.Response, error)

func (f imageRoundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

type imageTestTimeout struct{}

func (imageTestTimeout) Error() string   { return "net/http: TLS handshake timeout" }
func (imageTestTimeout) Timeout() bool   { return true }
func (imageTestTimeout) Temporary() bool { return true }

func TestImageDownloadRetriesTimeout(t *testing.T) {
	for _, alwaysFail := range []bool{false, true} {
		attempts := 0
		client := &http.Client{Transport: imageRoundTripFunc(func(r *http.Request) (*http.Response, error) {
			attempts++
			if attempts == 1 || alwaysFail {
				return nil, imageTestTimeout{}
			}
			return &http.Response{StatusCode: 200, Body: io.NopCloser(bytes.NewReader(testPNG(t))), Header: make(http.Header)}, nil
		})}
		b, err := downloadImage(context.Background(), client, "https://example.com/image.png")
		if attempts != 2 {
			t.Fatalf("Expected one retry, got %d attempts", attempts)
		}
		if alwaysFail {
			if err == nil || !strings.Contains(err.Error(), "HTTPS_PROXY") {
				t.Fatalf("Missing actionable timeout: %v", err)
			}
		} else if err != nil || len(b) == 0 {
			t.Fatalf("Retry did not recover: %v", err)
		}
	}
	attempts := 0
	client := &http.Client{Transport: imageRoundTripFunc(func(r *http.Request) (*http.Response, error) {
		attempts++
		return &http.Response{StatusCode: 403, Body: io.NopCloser(strings.NewReader("Forbidden")), Header: make(http.Header)}, nil
	})}
	if _, err := downloadImage(context.Background(), client, "https://example.com/image.png"); err == nil || attempts != 1 {
		t.Fatal("HTTP errors should not be retried")
	}
}

func TestImageProxyAndRedirectValidation(t *testing.T) {
	b := testPNG(t)
	requests := 0
	proxy := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
		if r.URL.Path == "/redirect" {
			http.Redirect(w, r, "http://127.0.0.1/private.png", 302)
			return
		}
		if r.URL.Host != "93.184.216.34" {
			t.Errorf("Unexpected destination: %s", r.URL.Host)
		}
		_, _ = w.Write(b)
	}))
	defer proxy.Close()
	proxyURL, err := url.Parse(proxy.URL)
	if err != nil {
		t.Fatal(err)
	}
	client := imageHTTPClient()
	client.Transport = imageTransport{proxyFor: func(*http.Request) (*url.URL, error) { return proxyURL, nil }}
	if _, err := downloadImage(context.Background(), client, "http://93.184.216.34/image.png"); err != nil {
		t.Fatal("Configured private proxy was rejected:", err)
	}
	if requests != 1 {
		t.Fatal("Configured proxy was not used")
	}
	requests = 0
	if _, err := downloadImage(context.Background(), client, "http://127.0.0.1/image.png"); err == nil || requests != 0 {
		t.Fatal("Private image destination reached proxy")
	}
	if _, err := downloadImage(context.Background(), client, "http://93.184.216.34/redirect"); err == nil || requests != 1 {
		t.Fatalf("Redirect to private address reached proxy: calls=%d, err=%v", requests, err)
	}
}

func TestRemoteImageURL(t *testing.T) {
	url := os.Getenv("HOMEPAGER_TEST_IMAGE_URL")
	if url == "" {
		t.Skip("Set HOMEPAGER_TEST_IMAGE_URL to run the optional real network check")
	}
	b, err := downloadImage(context.Background(), imageHTTPClient(), url)
	if err != nil {
		t.Fatal(err)
	}
	_, result, err := convertImage(b, imageImport{Format: "jpeg", MaxWidth: 320})
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("Downloaded %d bytes; converted to %dx%d JPEG", len(b), result.Width, result.Height)
}

func uploadIcon(t *testing.T, s *server, data []byte, options string) *httptest.ResponseRecorder {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", "../../original-icon.png")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = part.Write(data); err != nil {
		t.Fatal(err)
	}
	if err = writer.WriteField("options", options); err != nil {
		t.Fatal(err)
	}
	if err = writer.Close(); err != nil {
		t.Fatal(err)
	}
	r := httptest.NewRequest("POST", "/api/images/upload", &body)
	r.Header.Set("Content-Type", writer.FormDataContentType())
	r.Header.Set("X-Home-Pager", "1")
	w := httptest.NewRecorder()
	s.handler().ServeHTTP(w, r)
	return w
}

func TestIconUploadAndURLImport(t *testing.T) {
	b := testPNG(t)
	s := &server{dir: t.TempDir()}
	w := uploadIcon(t, s, b, `{"purpose":"icon","format":"png","maxWidth":20,"maxHeight":20}`)
	if w.Code != 200 {
		t.Fatal(w.Body.String())
	}
	var result importedImage
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	if !iconName.MatchString(result.Name) || result.Path != "/icons/"+result.Name || result.Width != 20 || result.Height != 10 {
		t.Fatalf("Bad icon metadata: %+v", result)
	}
	stored, err := os.ReadFile(filepath.Join(s.dir, "icons", result.Name))
	if err != nil {
		t.Fatal(err)
	}
	img, _, err := image.Decode(bytes.NewReader(stored))
	if err != nil {
		t.Fatal(err)
	}
	if _, _, _, alpha := img.At(19, 9).RGBA(); alpha != 0 {
		t.Fatal("Icon transparency was lost")
	}
	if p := request(t, s, "GET", result.Preview, nil); p.Code != 200 || p.Header().Get("Content-Type") != "image/png" {
		t.Fatal("Icon preview failed")
	}
	if _, err := os.Stat(filepath.Join(s.dir, "services.yaml")); !os.IsNotExist(err) {
		t.Fatal("Icon upload changed service config")
	}
	source := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write(b) }))
	defer source.Close()
	s.imageClient = source.Client()
	s.iconsDir = filepath.Join(t.TempDir(), "public-icons")
	s.iconsURL = "/custom-icons"
	w = request(t, s, "POST", "/api/images/import", imageImport{URL: source.URL, Format: "webp", Purpose: "icon"})
	if w.Code != 200 {
		t.Fatal(w.Body.String())
	}
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	if result.Path != "/custom-icons/"+result.Name {
		t.Fatal("Custom icon prefix ignored")
	}
	if _, err := os.Stat(filepath.Join(s.iconsDir, result.Name)); err != nil {
		t.Fatal(err)
	}
}

func TestIconUploadRejectsInvalidFilesAndOptions(t *testing.T) {
	s := &server{dir: t.TempDir()}
	for _, options := range []string{`{"purpose":"../../icons","format":"png"}`, `{"purpose":"icon","format":"svg"}`, `{"purpose":"icon","format":"png"} {}`, `not json`} {
		w := uploadIcon(t, s, testPNG(t), options)
		if w.Code < 400 {
			t.Fatalf("Accepted invalid options %s", options)
		}
	}
	if w := uploadIcon(t, s, []byte(`<svg><script>bad</script></svg>`), `{"purpose":"icon","format":"png"}`); w.Code != 422 {
		t.Fatal("Accepted unsupported SVG")
	}
	if w := uploadIcon(t, s, []byte{}, `{"purpose":"icon","format":"png"}`); w.Code != 422 {
		t.Fatal("Accepted empty file")
	}
	if w := request(t, s, "GET", "/api/icons/background-0123456789abcdef0123456789abcdef.png", nil); w.Code != 404 {
		t.Fatal("Icon preview allowed background name")
	}
}
