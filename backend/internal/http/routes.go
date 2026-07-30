package httpserver

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/ipetinate/glass-stack/backend/internal/auth"
	"github.com/ipetinate/glass-stack/backend/internal/events"
	"github.com/ipetinate/glass-stack/backend/internal/host"
	"github.com/ipetinate/glass-stack/backend/internal/http/handlers"
	"github.com/ipetinate/glass-stack/backend/internal/settings"
	systeminfo "github.com/ipetinate/glass-stack/backend/internal/system"
)

type Runtime struct {
	Broker         *events.Broker
	Metrics        MetricsRunner
	Host           handlers.HostReader
	Storage        handlers.StorageReader
	MetricPeriod   time.Duration
	Logger         *slog.Logger
	Auth           *auth.Service
	Settings       *settings.Service
	Database       ControlPlaneDatabase
	Address        string
	AllowedOrigins []string
}

type MetricsRunner interface {
	Run(context.Context, events.Publisher, time.Duration) error
}

type ControlPlaneDatabase interface {
	QuickCheck(context.Context) error
	Close() error
}

func NewRuntime() *Runtime {
	temperatureCollector := systeminfo.NewTemperatureCollector()
	ioCollector := systeminfo.NewIOCollector()
	cpuCollector := systeminfo.NewCPUCollector()
	gpuCollector := systeminfo.NewGPUCollector()

	return &Runtime{
		Broker: events.NewBroker(64, 8),
		Metrics: host.NewMetricsService(
			temperatureCollector,
			ioCollector,
			cpuCollector,
			gpuCollector,
		),
		Host:         systeminfo.NewHostCollector(),
		Storage:      host.StorageCollector{},
		MetricPeriod: time.Second,
	}
}

func NewRouter() http.Handler {
	return NewRouterWithRuntime(NewRuntime())
}

func NewRouterWithRuntime(runtime *Runtime) http.Handler {
	router := chi.NewRouter()
	router.Use(RequestID)
	if runtime.Logger != nil {
		router.Use(RequestLogger(runtime.Logger))
	}

	router.Use(CORS(
		allowedOrigins(runtime)...,
	))

	router.Get("/api/health", handlers.Health)
	router.Get("/api/ready", func(response http.ResponseWriter, request *http.Request) {
		if runtime.Database != nil {
			if err := runtime.Database.QuickCheck(request.Context()); err != nil {
				writeHTTPError(response, request, http.StatusServiceUnavailable, "not_ready", "The control-plane database is not ready.")
				return
			}
		}
		handlers.Health(response, request)
	})

	if runtime.Auth == nil {
		registerLegacyProductRoutes(router, runtime)
		return router
	}

	authHandler := handlers.NewAuthHandler(runtime.Auth, setAuthCookies, clearAuthCookies)
	publicAuthLimit := RateLimit(10, time.Minute)
	passwordCheckLimit := RateLimit(20, time.Minute)
	router.Route("/api/v1", func(api chi.Router) {
		api.Get("/setup/status", authHandler.SetupStatus)
		api.With(passwordCheckLimit).Post(
			"/auth/password/check",
			authHandler.CheckPassword,
		)
		api.With(publicAuthLimit).Post("/setup/totp", authHandler.BeginSetupTOTP)
		api.With(publicAuthLimit).Post("/setup/complete", authHandler.CompleteSetup)
		api.With(publicAuthLimit).Post("/auth/login", authHandler.Login)
		api.With(publicAuthLimit).Post("/auth/totp", authHandler.CompleteMFA)
		api.Get("/auth/session", authHandler.Session)
		api.With(publicAuthLimit).Get("/invitations/status", authHandler.InvitationStatus)
		api.With(publicAuthLimit).Post("/invitations/totp", authHandler.BeginInvitationTOTP)
		api.With(publicAuthLimit).Post("/invitations/accept", authHandler.AcceptInvitation)

		api.Group(func(protected chi.Router) {
			protected.Use(RequireAuthentication(runtime.Auth))
			protected.Use(RequireCSRF(runtime.Auth, allowedOrigins(runtime)...))

			protected.Post("/auth/logout", authHandler.Logout)
			protected.Put("/auth/password", func(response http.ResponseWriter, request *http.Request) {
				session, _ := AuthenticatedSession(request.Context())
				authHandler.ChangePassword(response, request, session.User)
			})
			protected.Get("/events", handlers.EventStream(runtime.Broker))
			protected.Get("/host", handlers.Host(runtime.Host))
			protected.Get("/storage", handlers.Storage(runtime.Storage))

			if runtime.Settings != nil {
				settingsHandler := handlers.NewSettingsHandler(runtime.Settings)
				protected.Get("/users/me/preferences", func(response http.ResponseWriter, request *http.Request) {
					session, _ := AuthenticatedSession(request.Context())
					settingsHandler.GetPreferences(response, request, session.User.ID)
				})
				protected.Patch("/users/me/preferences", func(response http.ResponseWriter, request *http.Request) {
					session, _ := AuthenticatedSession(request.Context())
					settingsHandler.UpdatePreferences(response, request, session.User.ID)
				})
				protected.Get(
					"/wallpapers/capabilities",
					settingsHandler.WallpaperCapabilities,
				)
				protected.Get("/wallpapers/search", settingsHandler.SearchWallpapers)
				protected.Post("/wallpapers/unsplash", func(response http.ResponseWriter, request *http.Request) {
					session, _ := AuthenticatedSession(request.Context())
					settingsHandler.SaveUnsplash(response, request, session.User.ID)
				})
				protected.Post("/wallpapers/uploads", func(response http.ResponseWriter, request *http.Request) {
					session, _ := AuthenticatedSession(request.Context())
					settingsHandler.UploadWallpaper(response, request, session.User.ID)
				})
				protected.Get("/wallpapers/{wallpaperID}", func(response http.ResponseWriter, request *http.Request) {
					session, _ := AuthenticatedSession(request.Context())
					settingsHandler.GetWallpaper(
						response,
						request,
						session.User.ID,
						chi.URLParam(request, "wallpaperID"),
					)
				})
				protected.Get("/wallpapers/{wallpaperID}/media", func(response http.ResponseWriter, request *http.Request) {
					session, _ := AuthenticatedSession(request.Context())
					settingsHandler.WallpaperMedia(
						response,
						request,
						session.User.ID,
						chi.URLParam(request, "wallpaperID"),
					)
				})
			}

			protected.With(RequireRole(auth.RoleAdmin)).Post(
				"/invitations",
				func(response http.ResponseWriter, request *http.Request) {
					session, _ := AuthenticatedSession(request.Context())
					authHandler.CreateInvitation(response, request, session.User)
				},
			)
			protected.With(RequireRole(auth.RoleAdmin)).Get(
				"/users",
				func(response http.ResponseWriter, request *http.Request) {
					session, _ := AuthenticatedSession(request.Context())
					authHandler.ListUsers(response, request, session.User)
				},
			)
			protected.With(RequireRole(auth.RoleAdmin)).Patch(
				"/users/{userID}/role",
				func(response http.ResponseWriter, request *http.Request) {
					session, _ := AuthenticatedSession(request.Context())
					authHandler.ChangeUserRole(
						response,
						request,
						session.User,
						chi.URLParam(request, "userID"),
					)
				},
			)
		})
	})

	// Compatibility aliases remain authenticated while the frontend migrates
	// its existing dashboard calls to /api/v1.
	router.Group(func(protected chi.Router) {
		protected.Use(RequireAuthentication(runtime.Auth))
		protected.Get("/api/events", handlers.EventStream(runtime.Broker))
		protected.Get("/api/host", handlers.Host(runtime.Host))
		protected.Get("/api/storage", handlers.Storage(runtime.Storage))
	})

	return router
}

func registerLegacyProductRoutes(router chi.Router, runtime *Runtime) {
	router.Get("/api/events", handlers.EventStream(runtime.Broker))
	router.Get("/api/host", handlers.Host(runtime.Host))
	router.Get("/api/storage", handlers.Storage(runtime.Storage))
}

func allowedOrigins(runtime *Runtime) []string {
	if len(runtime.AllowedOrigins) > 0 {
		return runtime.AllowedOrigins
	}
	return []string{"http://localhost:5173", "http://127.0.0.1:5173"}
}
