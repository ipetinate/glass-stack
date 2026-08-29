package httpserver

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/ipetinate/glass-stack/backend/internal/auth"
	"github.com/ipetinate/glass-stack/backend/internal/containers"
	"github.com/ipetinate/glass-stack/backend/internal/events"
	"github.com/ipetinate/glass-stack/backend/internal/host"
	"github.com/ipetinate/glass-stack/backend/internal/http/handlers"
	"github.com/ipetinate/glass-stack/backend/internal/settings"
	"github.com/ipetinate/glass-stack/backend/internal/store"
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
	Store          *store.Service
	Containers     handlers.ContainerOperations
	Apps           handlers.AppsService
	Database       ControlPlaneDatabase
	Address        string
	AllowedOrigins []string
}

type MetricsRunner interface {
	Run(context.Context, events.Publisher, time.Duration) error
}

type ControlPlaneDatabase interface {
	QuickCheck(context.Context) error
	DropAllTables(context.Context) error
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
	unlockLimit := RateLimit(10, time.Minute)
	router.Route("/api/v1", func(api chi.Router) {
		api.Get("/setup/status", authHandler.SetupStatus)
		api.With(publicAuthLimit).Post("/setup/token/validate", authHandler.ValidateSetupToken)
		api.With(passwordCheckLimit).Post(
			"/auth/password/check",
			authHandler.CheckPassword,
		)
		api.With(publicAuthLimit).Post("/setup/totp", authHandler.BeginSetupTOTP)
		api.With(publicAuthLimit).Post("/setup/complete", authHandler.CompleteSetup)
		api.With(publicAuthLimit).Post("/auth/login", authHandler.Login)
		api.With(publicAuthLimit).Post("/auth/totp", authHandler.CompleteMFA)
		api.Get("/auth/session", authHandler.Session)
		api.With(publicAuthLimit).Get("/auth/identities", authHandler.Identities)
		api.With(publicAuthLimit).Get("/invitations/status", authHandler.InvitationStatus)
		api.With(publicAuthLimit).Post("/invitations/totp", authHandler.BeginInvitationTOTP)
		api.With(publicAuthLimit).Post("/invitations/accept", authHandler.AcceptInvitation)

		if runtime.Store != nil {
			storeHandler := handlers.NewStoreHandler(runtime.Store, runtime.Logger, func(ctx context.Context) string {
				sessionUser, ok := AuthenticatedSession(ctx)
				if !ok {
					return ""
				}
				return sessionUser.User.Username
			})
			api.Post("/store/reviews/session", storeHandler.StartReviewLogin)
			api.Get("/store/reviews/session", storeHandler.ReviewSession)
			api.Delete("/store/reviews/session", storeHandler.CancelReviewLogin)
		}

		api.Group(func(protected chi.Router) {
			protected.Use(RequireAuthentication(runtime.Auth))
			protected.Use(RequireCSRF(runtime.Auth, allowedOrigins(runtime)...))

			protected.Post("/auth/logout", authHandler.Logout)
			protected.With(unlockLimit).Post("/auth/unlock", func(response http.ResponseWriter, request *http.Request) {
				session, _ := AuthenticatedSession(request.Context())
				authHandler.Unlock(response, request, session)
			})
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

			if runtime.Store != nil {
				storeHandler := handlers.NewStoreHandler(runtime.Store, runtime.Logger, func(ctx context.Context) string {
					sessionUser, ok := AuthenticatedSession(ctx)
					if !ok {
						return ""
					}
					return sessionUser.User.Username
				})
				protected.Get("/catalog/apps", storeHandler.Catalog)
				protected.Get("/catalog/apps/{appID}", storeHandler.Application)
				protected.Post("/catalog/apps/{appID}/reviews", storeHandler.CreateReview)
				protected.Put("/catalog/apps/{appID}/reviews", storeHandler.EditReview)
				protected.Post("/store/sync", storeHandler.Sync)
				protected.Get(
					"/store/apps/{appID}/assets/{file}",
					storeHandler.Asset,
				)
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
			protected.With(RequireRole(auth.RoleAdmin)).Post(
				"/users/totp",
				func(response http.ResponseWriter, request *http.Request) {
					session, _ := AuthenticatedSession(request.Context())
					authHandler.BeginUserTOTP(response, request, session.User)
				},
			)
			protected.With(RequireRole(auth.RoleAdmin)).Post(
				"/users",
				func(response http.ResponseWriter, request *http.Request) {
					session, _ := AuthenticatedSession(request.Context())
					authHandler.CreateUser(response, request, session.User)
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
			protected.With(RequireRole(auth.RoleAdmin)).Delete(
				"/users/{userID}",
				func(response http.ResponseWriter, request *http.Request) {
					session, _ := AuthenticatedSession(request.Context())
					authHandler.DeleteUser(
						response,
						request,
						session.User,
						chi.URLParam(request, "userID"),
					)
				},
			)

			if runtime.Containers != nil {
				protected.Get("/docker/status", handlers.DockerStatus(runtime.Containers))
				protected.Get("/docker/events", handlers.DockerEvents(runtime.Containers))
				protected.Get("/containers", handlers.ContainersList(runtime.Containers))
				protected.Get("/containers/{id}", handlers.ContainerDetail(runtime.Containers))
				protected.Post("/containers/{id}/start", handlers.ContainerLifecycle(runtime.Containers, containers.LifecycleStart))
				protected.Post("/containers/{id}/stop", handlers.ContainerLifecycle(runtime.Containers, containers.LifecycleStop))
				protected.Post("/containers/{id}/restart", handlers.ContainerLifecycle(runtime.Containers, containers.LifecycleRestart))
				protected.Get("/containers/{id}/logs", handlers.ContainerLogs(runtime.Containers))
				protected.Get("/containers/{id}/stats", handlers.ContainerStats(runtime.Containers))
			}

			if runtime.Apps != nil {
				protected.Get("/apps", handlers.AppsList(runtime.Apps))
				protected.Get("/apps/{appId}", handlers.AppDetail(runtime.Apps))
				protected.Post("/apps/install", handlers.InstallApp(runtime.Apps))
				protected.Get("/apps/install/{operationId}", handlers.InstallOperationStatus(runtime.Apps))
				protected.Get("/apps/events", handlers.OperationEventStream(runtime.Broker))
				protected.Post("/apps/{appId}/update", handlers.UpdateApp(runtime.Apps))
				protected.Patch("/apps/{appId}", handlers.EditApp(runtime.Apps))
				protected.Post("/apps/{appId}/remove", handlers.RemoveApp(runtime.Apps))
			}

			adminHandler := handlers.NewAdminHandler(runtime.Database)
			protected.With(RequireRole(auth.RoleAdmin)).Post(
				"/admin/reset",
				func(response http.ResponseWriter, request *http.Request) {
					adminHandler.ResetSystem(response, request)
					clearAuthCookies(response, request)
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
	return []string{"http://localhost:8080", "http://127.0.0.1:8080"}
}
