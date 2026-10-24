package httpx

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	appuicomponent "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/uicomponent"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/config"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	uicomponentrepo "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/postgres/uicomponent"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/schema"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/pkg/token"
	uicomponenthttp "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/uicomponent"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestUIComponentRoutesUseExistingAuthenticationAndSeededCatalog(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	conn, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	conn.SetMaxOpenConns(1)
	t.Cleanup(func() { _ = conn.Close() })
	if err := db.AutoMigrate(&models.UIComponent{}); err != nil {
		t.Fatal(err)
	}
	if err := schema.SeedUIComponents(db); err != nil {
		t.Fatal(err)
	}
	service := appuicomponent.NewService(uicomponentrepo.NewRepo(db))
	const secret = "ui-component-test-secret-value"
	engine, err := NewEngine(config.NewRuntime(config.Config{JWTSecret: secret}), nil, Modules{
		UIComponent: uicomponenthttp.NewModule(uicomponenthttp.NewHandler(service)),
	}, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	request := func(role, method, path, body string) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		if role != "" {
			access, err := token.GenerateWithClaims(token.GenerateClaimsInput{Secret: secret, UserID: 7, Username: "student7", Role: role, TokenType: "access", TTL: time.Hour})
			if err != nil {
				t.Fatal(err)
			}
			req.Header.Set("Authorization", "Bearer "+access)
		}
		res := httptest.NewRecorder()
		engine.ServeHTTP(res, req)
		return res
	}
	const path = "/api/v1/ui-components"
	if res := request("", http.MethodGet, path, ""); res.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous catalog: %d", res.Code)
	}
	res := request("user", http.MethodGet, path, "")
	var page struct {
		Data struct {
			Results []struct {
				ID   uint   `json:"id"`
				Name string `json:"name"`
			} `json:"results"`
		} `json:"data"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &page); err != nil || res.Code != 200 || len(page.Data.Results) != 10 {
		t.Fatalf("student catalog: %d %s (%v)", res.Code, res.Body, err)
	}
	if res := request("user", http.MethodGet, "/api/v1/admin/ui-components", ""); res.Code != http.StatusForbidden {
		t.Fatalf("student admin access: %d", res.Code)
	}
	if res := request("admin", http.MethodGet, "/api/v1/admin/ui-components", ""); res.Code != 200 {
		t.Fatalf("admin route missing when only UI component module is registered: %d", res.Code)
	}
	service.SetFeatureEnabled(func() bool { return false })
	res = request("user", http.MethodGet, path, "")
	if err := json.Unmarshal(res.Body.Bytes(), &page); err != nil || len(page.Data.Results) != 0 {
		t.Fatalf("disabled catalog: %s (%v)", res.Body, err)
	}
}
