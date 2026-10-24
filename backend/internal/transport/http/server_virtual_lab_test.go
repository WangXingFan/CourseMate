package httpx

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
)

func TestVirtualLabFramingExceptionIsLimitedToTrustedEngine(t *testing.T) {
	root := t.TempDir()
	for _, name := range []string{"vendor/signal-lab/index.html", "vendor/signal-lab/experiment1.html", "chat.html"} {
		target := filepath.Join(root, filepath.FromSlash(name))
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(target, []byte("<html></html>"), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	router := gin.New()
	router.Use(middleware.SecurityHeaders())
	registerFrontendStatic(router, root, nil)
	for path, want := range map[string]string{"/vendor/signal-lab/index.html": "SAMEORIGIN", "/vendor/signal-lab/experiment1.html": "DENY", "/chat": "DENY", "/missing": "DENY"} {
		res := httptest.NewRecorder()
		router.ServeHTTP(res, httptest.NewRequest(http.MethodGet, path, nil))
		if res.Header().Get("X-Frame-Options") != want {
			t.Fatalf("%s framing policy: %s", path, res.Header().Get("X-Frame-Options"))
		}
		if want == "SAMEORIGIN" && res.Header().Get("Content-Security-Policy") != "frame-ancestors 'self'" {
			t.Fatal("lab must only allow same-origin ancestors")
		}
	}
}
