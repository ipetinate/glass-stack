package app

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/ipetinate/glass-stack/backend/internal/auth"
	"github.com/ipetinate/glass-stack/backend/internal/events"
	"github.com/ipetinate/glass-stack/backend/internal/host"
	httpserver "github.com/ipetinate/glass-stack/backend/internal/http"
	"github.com/ipetinate/glass-stack/backend/internal/logging"
	"github.com/ipetinate/glass-stack/backend/internal/platform/config"
	"github.com/ipetinate/glass-stack/backend/internal/platform/database"
	platformpasswords "github.com/ipetinate/glass-stack/backend/internal/platform/passwords"
	"github.com/ipetinate/glass-stack/backend/internal/platform/secrets"
	platformwallpaper "github.com/ipetinate/glass-stack/backend/internal/platform/wallpaper"
	"github.com/ipetinate/glass-stack/backend/internal/settings"
	systeminfo "github.com/ipetinate/glass-stack/backend/internal/system"
)

// newRuntime is the composition root for concrete host adapters and the
// in-process event infrastructure. HTTP receives the assembled runtime and
// does not construct domain dependencies.
func newRuntime() (*httpserver.Runtime, error) {
	configuration, err := config.Load()
	if err != nil {
		return nil, fmt.Errorf("load configuration: %w", err)
	}
	db, err := database.Open(context.Background(), configuration.DatabasePath)
	if err != nil {
		return nil, fmt.Errorf("open control-plane database: %w", err)
	}
	masterKey, err := secrets.LoadOrCreateMasterKey(configuration.MasterKeyPath)
	if err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("load authentication master key: %w", err)
	}
	passwordChecker, err := platformpasswords.New(
		configuration.PasswordCompromiseMode,
	)
	if err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("initialize password compromise checker: %w", err)
	}
	authService, err := auth.NewService(
		database.NewAuthStore(db),
		masterKey,
		passwordChecker,
	)
	if err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("initialize authentication: %w", err)
	}
	settingsService := settings.NewService(
		database.NewSettingsStore(db),
		platformwallpaper.NewAssetStorage(configuration.MediaDir),
		platformwallpaper.NewUnsplash(configuration.UnsplashAccessKey),
		configuration.UnsplashSelfHost,
	)
	temperatureCollector := systeminfo.NewTemperatureCollector()
	ioCollector := systeminfo.NewIOCollector()
	cpuCollector := systeminfo.NewCPUCollector()
	gpuCollector := systeminfo.NewGPUCollector()

	runtime := &httpserver.Runtime{
		Broker: events.NewBroker(64, 8),
		Metrics: host.NewMetricsService(
			temperatureCollector,
			ioCollector,
			cpuCollector,
			gpuCollector,
		),
		Host:           systeminfo.NewHostCollector(),
		Storage:        host.StorageCollector{},
		MetricPeriod:   time.Second,
		Logger:         logging.New(environment()),
		Auth:           authService,
		Settings:       settingsService,
		Database:       db,
		Address:        configuration.Address,
		AllowedOrigins: configuration.AllowedOrigins,
	}
	bootstrapToken, err := authService.EnsureBootstrap(context.Background())
	if err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("prepare bootstrap: %w", err)
	}
	if bootstrapToken != "" {
		if err := os.WriteFile(
			configuration.BootstrapTokenPath,
			[]byte(bootstrapToken+"\n"),
			0o600,
		); err != nil {
			_ = db.Close()
			return nil, fmt.Errorf("write bootstrap token: %w", err)
		}
		runtime.Logger.Warn(
			"initial administrator setup is required",
			"bootstrap_token_file", configuration.BootstrapTokenPath,
			"setup_url", strings.TrimSuffix(configuration.PublicURL, "/")+"/onboarding",
		)
	} else if err := os.Remove(configuration.BootstrapTokenPath); err != nil &&
		!os.IsNotExist(err) {
		_ = db.Close()
		return nil, fmt.Errorf("remove consumed bootstrap token: %w", err)
	}
	return runtime, nil
}

func environment() string {
	if value := os.Getenv("GLASS_ENV"); value != "" {
		return value
	}
	return logging.Development
}
