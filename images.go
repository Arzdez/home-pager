package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	_ "image/gif"
	"image/jpeg"
	"image/png"
	"io"
	"math"
	"net"
	"net/http"
	"net/netip"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/HugoSmits86/nativewebp"
	xdraw "golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
)

const maxImageBytes = 20 << 20
const maxImagePixels = 16_000_000

type imageImport struct {
	URL       string `json:"url"`
	Format    string `json:"format"`
	Quality   int    `json:"quality"`
	MaxWidth  int    `json:"maxWidth"`
	MaxHeight int    `json:"maxHeight"`
	Purpose   string `json:"purpose,omitempty"`
}

type importedImage struct {
	Name         string `json:"name"`
	Path         string `json:"path"`
	Preview      string `json:"preview"`
	Width        int    `json:"width"`
	Height       int    `json:"height"`
	Size         int    `json:"size"`
	Format       string `json:"format"`
	SourceFormat string `json:"sourceFormat"`
}

func validateImagesURL(prefix string) error {
	u, err := url.Parse(prefix)
	if err != nil || !strings.HasPrefix(prefix, "/") || strings.HasPrefix(prefix, "//") || strings.ContainsAny(prefix, `\?#`) || strings.Contains(prefix, "..") || u.Host != "" {
		return errors.New("-images-url must be a local URL path, e.g. /images")
	}
	return nil
}

func (s *server) imagePaths() (string, string) {
	dir, prefix := s.imagesDir, s.imagesURL
	if dir == "" {
		dir = filepath.Join(s.dir, "images")
	}
	if prefix == "" {
		prefix = "/images"
	}
	return dir, strings.TrimRight(prefix, "/")
}

func (s *server) iconPaths() (string, string) {
	dir, prefix := s.iconsDir, s.iconsURL
	if dir == "" {
		dir = filepath.Join(s.dir, "icons")
	}
	if prefix == "" {
		prefix = "/icons"
	}
	return dir, strings.TrimRight(prefix, "/")
}

func (s *server) iconSettings(w http.ResponseWriter, r *http.Request) {
	dir, prefix := s.iconPaths()
	respond(w, 200, map[string]any{"directory": dir, "urlPrefix": prefix, "formats": []string{"webp", "jpeg", "png"}, "maxBytes": maxImageBytes, "maxPixels": maxImagePixels})
}

func validateImageOptions(options imageImport) error {
	if options.Purpose != "" && options.Purpose != "background" && options.Purpose != "icon" {
		return errors.New("Неизвестное назначение изображения")
	}
	if options.Format != "jpg" && options.Format != "jpeg" && options.Format != "png" && options.Format != "webp" || options.MaxWidth < 0 || options.MaxHeight < 0 || options.MaxWidth > 8192 || options.MaxHeight > 8192 || options.Quality < 0 || options.Quality > 100 {
		return errors.New("Некорректный формат, качество или размер")
	}
	return nil
}

func (s *server) imageSettings(w http.ResponseWriter, r *http.Request) {
	dir, prefix := s.imagePaths()
	respond(w, 200, map[string]any{"directory": dir, "urlPrefix": prefix, "formats": []string{"webp", "jpeg", "png"}, "maxBytes": maxImageBytes, "maxPixels": maxImagePixels})
}

func validateImageSource(raw string) (*url.URL, error) {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || len(raw) > 4096 || u == nil || (u.Scheme != "https" && u.Scheme != "http") || u.Hostname() == "" || u.User != nil || u.Opaque != "" {
		return nil, errors.New("Укажите HTTP/HTTPS-ссылку на изображение без логина и пароля")
	}
	u.Fragment = ""
	return u, nil
}

// Validate at dial time, and connect to the validated IP, to avoid DNS rebinding.
func publicImageIP(ip net.IP) bool {
	a, ok := netip.AddrFromSlice(ip)
	if !ok {
		return false
	}
	a = a.Unmap()
	if !a.IsGlobalUnicast() || a.IsPrivate() || a.IsLoopback() || a.IsLinkLocalUnicast() {
		return false
	}
	for _, cidr := range []string{"100.64.0.0/10", "192.0.0.0/24", "192.0.2.0/24", "198.18.0.0/15", "198.51.100.0/24", "203.0.113.0/24", "240.0.0.0/4", "2001:db8::/32"} {
		if netip.MustParsePrefix(cidr).Contains(a) {
			return false
		}
	}
	return true
}

const imageDownloadTimeout = 90 * time.Second

// A transport is selected per request because proxy settings may differ after
// a redirect. Only the administrator-configured proxy may use private IPs;
// image destinations are still checked on every hop.
type imageTransport struct {
	proxyFor func(*http.Request) (*url.URL, error)
}

func publicImageAddresses(ctx context.Context, host string) ([]net.IP, error) {
	ips, err := net.DefaultResolver.LookupIP(ctx, "ip", host)
	if err != nil {
		return nil, err
	}
	if len(ips) == 0 {
		return nil, errors.New("Не удалось разрешить имя сервера")
	}
	for _, ip := range ips {
		if !publicImageIP(ip) {
			return nil, errors.New("Загрузка разрешена только с публичных адресов интернета")
		}
	}
	return ips, nil
}

func (t imageTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	if _, err := validateImageSource(req.URL.String()); err != nil {
		return nil, err
	}
	if _, err := publicImageAddresses(req.Context(), req.URL.Hostname()); err != nil {
		return nil, err
	}
	proxyFor := t.proxyFor
	if proxyFor == nil {
		proxyFor = http.ProxyFromEnvironment
	}
	proxy, err := proxyFor(req)
	if err != nil {
		return nil, errors.New("Некорректные настройки HTTP_PROXY/HTTPS_PROXY")
	}
	dialer := &net.Dialer{Timeout: 15 * time.Second}
	transport := &http.Transport{
		Proxy: http.ProxyURL(proxy), TLSHandshakeTimeout: 20 * time.Second,
		ResponseHeaderTimeout: 30 * time.Second, DisableKeepAlives: true,
		MaxResponseHeaderBytes: 32 << 10, ForceAttemptHTTP2: true,
	}
	transport.DialContext = func(ctx context.Context, network, address string) (net.Conn, error) {
		if proxy != nil {
			return dialer.DialContext(ctx, network, address)
		}
		host, port, err := net.SplitHostPort(address)
		if err != nil {
			return nil, err
		}
		ips, err := publicImageAddresses(ctx, host)
		if err != nil {
			return nil, err
		}
		var last error
		for _, ip := range ips {
			conn, err := dialer.DialContext(ctx, network, net.JoinHostPort(ip.String(), port))
			if err == nil {
				return conn, nil
			}
			last = err
		}
		return nil, last
	}
	return transport.RoundTrip(req)
}

func imageHTTPClient() *http.Client {
	return &http.Client{Transport: imageTransport{}, Timeout: 60 * time.Second, CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) >= 5 {
			return errors.New("Слишком много перенаправлений")
		}
		_, err := validateImageSource(req.URL.String())
		return err
	}}
}

func downloadImage(ctx context.Context, client *http.Client, raw string) ([]byte, error) {
	u, err := validateImageSource(raw)
	if err != nil {
		return nil, err
	}
	ctx, cancel := context.WithTimeout(ctx, imageDownloadTimeout)
	defer cancel()
	for attempt := 0; attempt < 2; attempt++ {
		req, err := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Accept", "image/png,image/jpeg,image/webp,image/gif")
		req.Header.Set("User-Agent", "Home-Pager/1.0")
		resp, err := client.Do(req)
		if err == nil {
			if resp.StatusCode != http.StatusOK {
				resp.Body.Close()
				return nil, fmt.Errorf("Сервер изображения вернул HTTP %d", resp.StatusCode)
			}
			if resp.ContentLength > maxImageBytes {
				resp.Body.Close()
				return nil, errors.New("Изображение превышает 20 MiB")
			}
			var b []byte
			b, err = io.ReadAll(io.LimitReader(resp.Body, maxImageBytes+1))
			resp.Body.Close()
			if err == nil {
				if len(b) > maxImageBytes {
					return nil, errors.New("Изображение превышает 20 MiB")
				}
				return b, nil
			}
		}
		var timeout net.Error
		if errors.As(err, &timeout) && timeout.Timeout() {
			if attempt == 0 && ctx.Err() == nil {
				continue
			}
			return nil, fmt.Errorf("Истекло время загрузки изображения. Проверьте доступ к сайту с сервера Home Pager; если нужен прокси, задайте HTTPS_PROXY/HTTP_PROXY и перезапустите панель. Причина: %w", err)
		}
		return nil, fmt.Errorf("Не удалось загрузить изображение: %w", err)
	}
	return nil, errors.New("Не удалось загрузить изображение")
}

func convertImage(b []byte, options imageImport) ([]byte, importedImage, error) {
	var result importedImage
	if err := validateImageOptions(options); err != nil {
		return nil, result, err
	}
	if options.Format == "jpg" {
		options.Format = "jpeg"
	}
	if options.Format != "jpeg" && options.Format != "png" && options.Format != "webp" {
		return nil, result, errors.New("Выберите формат JPEG, PNG или WebP")
	}
	if options.Quality == 0 {
		options.Quality = 85
	}
	if options.Quality < 1 || options.Quality > 100 || options.MaxWidth < 0 || options.MaxHeight < 0 || options.MaxWidth > 8192 || options.MaxHeight > 8192 {
		return nil, result, errors.New("Качество: 1–100; размеры: 0–8192 (0 — без ограничения)")
	}
	cfg, source, err := image.DecodeConfig(bytes.NewReader(b))
	if err != nil {
		return nil, result, errors.New("Файл не является поддерживаемым изображением (JPEG, PNG, GIF, WebP)")
	}
	if cfg.Width < 1 || cfg.Height < 1 || cfg.Width > 8192 || cfg.Height > 8192 || int64(cfg.Width)*int64(cfg.Height) > maxImagePixels {
		return nil, result, errors.New("Слишком большое изображение: максимум 16 мегапикселей и 8192 пикселя по стороне")
	}
	img, _, err := image.Decode(bytes.NewReader(b))
	if err != nil {
		return nil, result, errors.New("Не удалось декодировать изображение")
	}
	ratio := 1.0
	if options.MaxWidth > 0 {
		ratio = math.Min(ratio, float64(options.MaxWidth)/float64(cfg.Width))
	}
	if options.MaxHeight > 0 {
		ratio = math.Min(ratio, float64(options.MaxHeight)/float64(cfg.Height))
	}
	if ratio < 1 {
		dst := image.NewNRGBA(image.Rect(0, 0, max(1, int(math.Round(float64(cfg.Width)*ratio))), max(1, int(math.Round(float64(cfg.Height)*ratio)))))
		xdraw.CatmullRom.Scale(dst, dst.Bounds(), img, img.Bounds(), draw.Src, nil)
		img = dst
	}
	var out bytes.Buffer
	switch options.Format {
	case "jpeg":
		// JPEG has no alpha: composite transparency onto white explicitly.
		dst := image.NewRGBA(img.Bounds())
		draw.Draw(dst, dst.Bounds(), &image.Uniform{C: color.White}, image.Point{}, draw.Src)
		draw.Draw(dst, dst.Bounds(), img, img.Bounds().Min, draw.Over)
		err = jpeg.Encode(&out, dst, &jpeg.Options{Quality: options.Quality})
	case "png":
		err = png.Encode(&out, img)
	case "webp":
		err = nativewebp.Encode(&out, img, &nativewebp.Options{CompressionLevel: nativewebp.BestSpeed})
	}
	if err != nil {
		return nil, result, err
	}
	if out.Len() > maxImageBytes {
		return nil, result, errors.New("Результат превышает 20 MiB; уменьшите разрешение")
	}
	ext := options.Format
	if ext == "jpeg" {
		ext = "jpg"
	}
	hash := sha256.Sum256(out.Bytes())
	namePrefix := "background-"
	if options.Purpose == "icon" {
		namePrefix = "icon-"
	}
	result = importedImage{Name: namePrefix + hex.EncodeToString(hash[:16]) + "." + ext, Width: img.Bounds().Dx(), Height: img.Bounds().Dy(), Size: out.Len(), Format: options.Format, SourceFormat: source}
	return out.Bytes(), result, nil
}

func imageDirectory(dir string) error {
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	st, err := os.Lstat(dir)
	if err != nil {
		return err
	}
	if !st.IsDir() || st.Mode()&os.ModeSymlink != 0 {
		return errors.New("Каталог изображений не должен быть символьной ссылкой")
	}
	return nil
}

func (s *server) importImage(w http.ResponseWriter, r *http.Request) {
	var options imageImport
	if !decode(w, r, &options) {
		return
	}
	if _, err := validateImageSource(options.URL); err != nil {
		fail(w, 422, err.Error())
		return
	}
	// Validate output options before making a request to an external server.
	if err := validateImageOptions(options); err != nil {
		fail(w, 422, err.Error())
		return
	}
	if !s.imageMu.TryLock() {
		fail(w, 429, "Другое изображение уже обрабатывается. Повторите позже.")
		return
	}
	defer s.imageMu.Unlock()
	client := s.imageClient
	if client == nil {
		client = imageHTTPClient()
	}
	b, err := downloadImage(r.Context(), client, options.URL)
	if err != nil {
		fail(w, 422, err.Error())
		return
	}
	s.storeImportedImage(w, r, b, options)
}

func (s *server) uploadImage(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxImageBytes+(64<<10))
	err := r.ParseMultipartForm(1 << 20)
	if r.MultipartForm != nil {
		defer r.MultipartForm.RemoveAll()
	}
	if err != nil {
		fail(w, 400, "Не удалось прочитать файл: максимум 20 MiB")
		return
	}
	if len(r.MultipartForm.File) != 1 || len(r.MultipartForm.File["file"]) != 1 {
		fail(w, 400, "Выберите один файл изображения")
		return
	}
	var options imageImport
	dec := json.NewDecoder(strings.NewReader(r.FormValue("options")))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&options); err != nil {
		fail(w, 400, "Некорректные параметры изображения")
		return
	}
	if err := dec.Decode(new(any)); err != io.EOF {
		fail(w, 400, "Ожидается один объект параметров изображения")
		return
	}
	if err := validateImageOptions(options); err != nil {
		fail(w, 422, err.Error())
		return
	}
	if !s.imageMu.TryLock() {
		fail(w, 429, "Другое изображение уже обрабатывается. Повторите позже.")
		return
	}
	defer s.imageMu.Unlock()
	f, header, err := r.FormFile("file")
	if err != nil {
		fail(w, 400, "Файл не найден")
		return
	}
	defer f.Close()
	if header.Size > maxImageBytes {
		fail(w, 422, "Изображение превышает 20 MiB")
		return
	}
	b, err := io.ReadAll(io.LimitReader(f, maxImageBytes+1))
	if err != nil || len(b) > maxImageBytes {
		fail(w, 422, "Не удалось прочитать изображение или файл превышает 20 MiB")
		return
	}
	s.storeImportedImage(w, r, b, options)
}

func (s *server) storeImportedImage(w http.ResponseWriter, r *http.Request, b []byte, options imageImport) {
	out, result, err := convertImage(b, options)
	if err != nil {
		fail(w, 422, err.Error())
		return
	}
	if r.Context().Err() != nil {
		return
	}
	dir, prefix := s.imagePaths()
	previewPrefix := "/api/images/"
	if options.Purpose == "icon" {
		dir, prefix = s.iconPaths()
		previewPrefix = "/api/icons/"
	}
	if err := imageDirectory(dir); err != nil {
		fail(w, 500, err.Error())
		return
	}
	p := filepath.Join(dir, result.Name)
	if st, err := os.Lstat(p); err == nil && !st.Mode().IsRegular() {
		fail(w, 400, "Некорректный путь изображения")
		return
	} else if err != nil && !os.IsNotExist(err) {
		fail(w, 500, err.Error())
		return
	}
	if err := atomicWrite(p, out, 0644); err != nil {
		fail(w, 500, err.Error())
		return
	}
	result.Path = prefix + "/" + result.Name
	result.Preview = previewPrefix + result.Name
	respond(w, 200, result)
}

var imageName = regexp.MustCompile(`^background-[a-f0-9]{32}\.(jpg|png|webp)$`)
var iconName = regexp.MustCompile(`^icon-[a-f0-9]{32}\.(jpg|png|webp)$`)
var localIconName = regexp.MustCompile(`(?i)^[^./\\\x00][^/\\\x00]*\.(png|jpe?g|webp|gif)$`)

func (s *server) listStoredIcons(w http.ResponseWriter, r *http.Request) {
	dir, prefix := s.iconPaths()
	type entry struct {
		Name    string `json:"name"`
		Path    string `json:"path"`
		Preview string `json:"preview"`
		Size    int64  `json:"size"`
	}
	items := []entry{}
	st, err := os.Lstat(dir)
	if os.IsNotExist(err) {
		respond(w, 200, items)
		return
	}
	if err != nil || !st.IsDir() || st.Mode()&os.ModeSymlink != 0 {
		fail(w, 400, "Каталог иконок недоступен")
		return
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		fail(w, 500, "Не удалось прочитать каталог иконок")
		return
	}
	for _, file := range entries {
		if !localIconName.MatchString(file.Name()) {
			continue
		}
		info, err := file.Info()
		if err != nil || !info.Mode().IsRegular() {
			continue
		}
		name := file.Name()
		items = append(items, entry{name, prefix + "/" + name, "/api/icons/" + url.PathEscape(name), info.Size()})
	}
	respond(w, 200, items)
}

func (s *server) previewImage(w http.ResponseWriter, r *http.Request) {
	dir, _ := s.imagePaths()
	s.previewStoredImage(w, r, dir, imageName)
}

func (s *server) previewIcon(w http.ResponseWriter, r *http.Request) {
	dir, _ := s.iconPaths()
	s.previewStoredImage(w, r, dir, localIconName)
}

func (s *server) previewStoredImage(w http.ResponseWriter, r *http.Request, dir string, pattern *regexp.Regexp) {
	name := r.PathValue("name")
	if !pattern.MatchString(name) {
		fail(w, 404, "Изображение не найдено")
		return
	}
	st, err := os.Lstat(dir)
	if err != nil || !st.IsDir() || st.Mode()&os.ModeSymlink != 0 {
		fail(w, 404, "Изображение не найдено")
		return
	}
	p := filepath.Join(dir, name)
	st, err = os.Lstat(p)
	if err != nil || !st.Mode().IsRegular() {
		fail(w, 404, "Изображение не найдено")
		return
	}
	http.ServeFile(w, r, p)
}
