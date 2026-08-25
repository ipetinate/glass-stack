package config

import (
	"bufio"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const (
	development = "development"
	production  = "production"
)

type Config struct {
	Environment            string
	Address                string
	PublicURL              string
	DataDir                string
	DatabasePath           string
	MediaDir               string
	BackupDir              string
	MasterKeyPath          string
	BootstrapTokenPath     string
	PasswordCompromiseMode string
	AllowedOrigins         []string
	UnsplashAccessKey      string
	UnsplashSelfHost       bool
	StoreRepository        string
	StoreBranch            string
	StorePollHours         int
}

func Load() (Config, error) {
	fileEnvironment := map[string]string{}
	if valueOrDefault("GLASS_ENV", development) == development {
		var err error
		fileEnvironment, err = readEnvironmentFile(
			valueOrDefault("GLASS_ENV_FILE", ".env"),
		)
		if err != nil {
			return Config{}, err
		}
	}
	environment := configuredValue(fileEnvironment, "GLASS_ENV", development)
	dataDir, err := defaultDataDir(environment)
	if err != nil {
		return Config{}, err
	}
	dataDir = configuredValue(fileEnvironment, "GLASS_DATA_DIR", dataDir)
	address := configuredValue(fileEnvironment, "GLASS_ADDRESS", "127.0.0.1:8080")
	publicURL := "http://" + address
	if environment == development {
		publicURL = "http://localhost:5173"
	}

	passwordCompromiseMode := strings.ToLower(
		configuredValue(
			fileEnvironment,
			"GLASS_PASSWORD_COMPROMISE_MODE",
			"hybrid",
		),
	)
	if passwordCompromiseMode != "hybrid" && passwordCompromiseMode != "local" {
		return Config{}, fmt.Errorf(
			"GLASS_PASSWORD_COMPROMISE_MODE must be hybrid or local",
		)
	}

	config := Config{
		Environment:            environment,
		Address:                address,
		PublicURL:              configuredValue(fileEnvironment, "GLASS_PUBLIC_URL", publicURL),
		DataDir:                dataDir,
		DatabasePath:           filepath.Join(dataDir, "glass-stack.db"),
		MediaDir:               filepath.Join(dataDir, "media"),
		BackupDir:              filepath.Join(dataDir, "backups"),
		MasterKeyPath:          filepath.Join(dataDir, "secrets", "master.key"),
		BootstrapTokenPath:     filepath.Join(dataDir, "secrets", "bootstrap-token"),
		PasswordCompromiseMode: passwordCompromiseMode,
		AllowedOrigins: csvOrDefault(
			fileEnvironment,
			"GLASS_ALLOWED_ORIGINS",
			[]string{"http://localhost:5173", "http://127.0.0.1:5173"},
		),
		UnsplashAccessKey: configuredValue(
			fileEnvironment,
			"GLASS_UNSPLASH_ACCESS_KEY",
			"",
		),
		UnsplashSelfHost: strings.EqualFold(
			configuredValue(fileEnvironment, "GLASS_UNSPLASH_SELF_HOST", "false"),
			"true",
		),
		StoreRepository: configuredValue(
			fileEnvironment,
			"GLASS_STORE_REPOSITORY",
			"ipetinate/glass-store",
		),
		StoreBranch: configuredValue(
			fileEnvironment,
			"GLASS_STORE_BRANCH",
			"main",
		),
	}

	config.StorePollHours = 6
	if raw := strings.TrimSpace(configuredValue(
		fileEnvironment,
		"GLASS_STORE_POLL_HOURS",
		"",
	)); raw != "" {
		parsed := 0
		if _, err := fmt.Sscanf(raw, "%d", &parsed); err != nil || parsed < 1 || parsed > 168 {
			return Config{}, fmt.Errorf(
				"GLASS_STORE_POLL_HOURS must be an integer between 1 and 168",
			)
		}
		config.StorePollHours = parsed
	}
	if !strings.Contains(config.StoreRepository, "/") ||
		strings.ContainsAny(config.StoreRepository, " \t\n") {
		return Config{}, fmt.Errorf("GLASS_STORE_REPOSITORY must be in owner/name form")
	}
	if config.StoreBranch == "" {
		return Config{}, fmt.Errorf("GLASS_STORE_BRANCH must not be empty")
	}

	for _, directory := range []string{
		config.DataDir,
		config.MediaDir,
		config.BackupDir,
		filepath.Dir(config.MasterKeyPath),
	} {
		if err := os.MkdirAll(directory, 0o700); err != nil {
			return Config{}, fmt.Errorf("create data directory %q: %w", directory, err)
		}
	}

	return config, nil
}

func defaultDataDir(environment string) (string, error) {
	if environment == production {
		return "/var/lib/glass-stack", nil
	}
	base, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("resolve user data directory: %w", err)
	}
	return filepath.Join(base, "GlassStack"), nil
}

func valueOrDefault(name, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(name)); value != "" {
		return value
	}
	return fallback
}

func configuredValue(
	fileEnvironment map[string]string,
	name string,
	fallback string,
) string {
	if value := strings.TrimSpace(os.Getenv(name)); value != "" {
		return value
	}
	if value := strings.TrimSpace(fileEnvironment[name]); value != "" {
		return value
	}
	return fallback
}

func csvOrDefault(
	fileEnvironment map[string]string,
	name string,
	fallback []string,
) []string {
	raw := configuredValue(fileEnvironment, name, "")
	if raw == "" {
		return fallback
	}
	values := strings.Split(raw, ",")
	result := make([]string, 0, len(values))
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

func readEnvironmentFile(path string) (map[string]string, error) {
	file, err := os.Open(path)
	if errors.Is(err, os.ErrNotExist) {
		return map[string]string{}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("open development environment file: %w", err)
	}
	defer file.Close()

	values := make(map[string]string)
	scanner := bufio.NewScanner(file)
	for lineNumber := 1; scanner.Scan(); lineNumber++ {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		line = strings.TrimSpace(strings.TrimPrefix(line, "export "))
		name, value, found := strings.Cut(line, "=")
		name = strings.TrimSpace(name)
		if !found || !validEnvironmentName(name) {
			return nil, fmt.Errorf(
				"invalid development environment entry at line %d",
				lineNumber,
			)
		}
		values[name] = unquoteEnvironmentValue(strings.TrimSpace(value))
	}
	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("read development environment file: %w", err)
	}
	return values, nil
}

func validEnvironmentName(name string) bool {
	if name == "" {
		return false
	}
	for index, character := range name {
		if (character >= 'A' && character <= 'Z') ||
			(character >= 'a' && character <= 'z') ||
			character == '_' ||
			(index > 0 && character >= '0' && character <= '9') {
			continue
		}
		return false
	}
	return true
}

func unquoteEnvironmentValue(value string) string {
	if len(value) < 2 {
		return value
	}
	first, last := value[0], value[len(value)-1]
	if (first == '"' && last == '"') || (first == '\'' && last == '\'') {
		return value[1 : len(value)-1]
	}
	return value
}
