package app

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/ipetinate/glass-stack/backend/internal/apps"
	"github.com/ipetinate/glass-stack/backend/internal/auth"
	"github.com/ipetinate/glass-stack/backend/internal/containers"
	dockeradapter "github.com/ipetinate/glass-stack/backend/internal/docker"
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
	"github.com/ipetinate/glass-stack/backend/internal/store"
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
	logger := logging.New(environment())
	authService, err := auth.NewService(
		database.NewAuthStore(db),
		masterKey,
		passwordChecker,
		logger,
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
	storeDataDir := filepath.Join(configuration.DataDir, "store")
	storeService := store.NewService(
		database.NewCatalogStore(db),
		store.NewSourceClient(
			nil,
			"https://api.github.com",
			"https://github.com",
			"https://codeload.github.com",
			configuration.GitHubToken,
		),
		nil,
		storeDataDir,
		store.Config{
			Repository:         configuration.StoreRepository,
			Branch:             configuration.StoreBranch,
			PollIntervalHours:  configuration.StorePollHours,
			GitHubClientID:     configuration.GitHubClientID,
			GoogleClientID:     configuration.GoogleClientID,
			GoogleClientSecret: configuration.GoogleClientSecret,
		},
		logger,
	)
	temperatureCollector := systeminfo.NewTemperatureCollector()
	ioCollector := systeminfo.NewIOCollector()
	cpuCollector := systeminfo.NewCPUCollector()
	gpuCollector := systeminfo.NewGPUCollector()

	dockerCandidates := dockeradapter.Candidates(configuration.DockerHost)
	dockerDial := func() (containers.Engine, error) {
		return dockeradapter.Dial(dockerCandidates, dockeradapter.DialTimeout)
	}
	containersService := containers.New(dockerDial, dockeradapter.ComposeAvailable())

	appsStore := database.NewAppsStore(db)
	appsService := apps.NewInstaller(
		appsStore,
		storeService,
		apps.NewCommandRunner(),
		filepath.Join(configuration.DataDir, "apps"),
		nil,
		logger,
	)
	appsService.SetHostResolver(accessHost(configuration.PublicURL))
	appsService.SetPortResolver(accessPort(containersService, storeService))

	go apps.NewReconciler(appsStore, &reconcilerEngine{containers: containersService}, logger).Run(
		context.Background(),
	)

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
		Logger:         logger,
		Auth:           authService,
		Settings:       settingsService,
		Store:          storeService,
		Containers:     containersService,
		Apps:           appsService,
		Database:       db,
		Address:        configuration.Address,
		AllowedOrigins: configuration.AllowedOrigins,
	}
	previousBootstrapToken, err := readBootstrapToken(configuration.BootstrapTokenPath)
	if err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("read bootstrap token: %w", err)
	}
	bootstrapToken, err := authService.EnsureBootstrap(
		context.Background(),
		previousBootstrapToken,
	)
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
		runtime.Logger.Warn("🔐 Glass Stack — configuração inicial necessária")
		runtime.Logger.Info(
			"🔒 Token de bootstrap disponível",
			"arquivo", configuration.BootstrapTokenPath,
		)
		runtime.Logger.Info(
			"🌐 Onboarding disponível",
			"url", strings.TrimSuffix(configuration.PublicURL, "/")+"/onboarding",
		)
		runtime.Logger.Info("⏳ Token válido por 24 horas")
		runtime.Logger.Warn("⚠️ Não compartilhe o conteúdo do token")
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

func readBootstrapToken(path string) (string, error) {
	content, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(content)), nil
}
