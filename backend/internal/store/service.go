package store

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

const assetsSubdirectory = "assets"

type CatalogRecord struct {
	App         ApplicationDetailDTO
	Summary     ApplicationSummaryDTO
	Version     string
	ContentHash string
	SyncedAt    string
}

type CatalogRepository interface {
	List(ctx context.Context) ([]CatalogRecord, error)
	Upsert(ctx context.Context, record CatalogRecord) error
	DeleteMissing(ctx context.Context, keepIDs []string) (int64, error)
	SyncState(ctx context.Context) (string, time.Time, error)
	SaveSyncState(ctx context.Context, commitSHA string, syncedAt time.Time) error
}

type Config struct {
	Repository         string
	Branch             string
	PollIntervalHours  int
	GitHubClientID     string
	GoogleClientID     string
	GoogleClientSecret string
}

type SyncSummary struct {
	Commit    string `json:"commit"`
	Added     int    `json:"added"`
	Updated   int    `json:"updated"`
	Removed   int64  `json:"removed"`
	Unchanged bool   `json:"unchanged"`
}

var ErrApplicationNotFound = fmt.Errorf("aplicativo não encontrado")

type Service struct {
	catalog    CatalogRepository
	source     *SourceClient
	downloader *http.Client
	dataDir    string
	config     Config
	logger     *slog.Logger
	now        func() time.Time

	reviewMu           sync.Mutex
	reviewSession      *reviewLoginSession
	githubClientID     string
	googleClientID     string
	googleClientSecret string
}

func NewService(
	catalog CatalogRepository,
	source *SourceClient,
	downloader *http.Client,
	dataDir string,
	config Config,
	logger *slog.Logger,
) *Service {
	if downloader == nil {
		downloader = http.DefaultClient
	}
	return &Service{
		catalog:            catalog,
		source:             source,
		downloader:         downloader,
		dataDir:            dataDir,
		config:             config,
		logger:             logger,
		now:                time.Now,
		githubClientID:     strings.TrimSpace(config.GitHubClientID),
		googleClientID:     strings.TrimSpace(config.GoogleClientID),
		googleClientSecret: strings.TrimSpace(config.GoogleClientSecret),
	}
}

func (service *Service) Run(parent context.Context) {
	interval := time.Duration(service.config.PollIntervalHours) * time.Hour
	if interval <= 0 {
		interval = 6 * time.Hour
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	syncContext, cancel := context.WithTimeout(parent, 10*time.Minute)
	if _, err := service.Sync(syncContext); err != nil {
		service.logSyncError(err)
	}
	cancel()

	for {
		select {
		case <-parent.Done():
			return
		case <-ticker.C:
			syncContext, cancel := context.WithTimeout(parent, 10*time.Minute)
			if _, err := service.Sync(syncContext); err != nil {
				service.logSyncError(err)
			}
			cancel()
		}
	}
}

func (service *Service) logSyncError(err error) {
	if service.logger != nil {
		service.logger.Warn("store sync failed", "error", err)
	}
}

func (service *Service) Catalog(ctx context.Context) ([]ApplicationSummaryDTO, error) {
	records, err := service.catalog.List(ctx)
	if err != nil {
		return nil, err
	}
	summaries := make([]ApplicationSummaryDTO, 0, len(records))
	for _, record := range records {
		summaries = append(summaries, record.Summary)
	}
	return summaries, nil
}

type CatalogFilter struct {
	Query    string
	Category string
	Sort     string
	Offset   int
	Limit    int
}

func (service *Service) CatalogFiltered(ctx context.Context, filter CatalogFilter) (PaginatedCatalog, error) {
	records, err := service.catalog.List(ctx)
	if err != nil {
		return PaginatedCatalog{}, err
	}

	search := strings.TrimSpace(strings.ToLower(filter.Query))
	category := strings.TrimSpace(filter.Category)
	sortBy := strings.TrimSpace(filter.Sort)

	summaries := make([]ApplicationSummaryDTO, 0, len(records))
	for _, record := range records {
		if category != "" && category != "all" && record.Summary.Category != category {
			continue
		}
		if search != "" {
			haystack := strings.ToLower(record.Summary.Name + " " + record.Summary.Developer + " " + record.Summary.Description)
			if !strings.Contains(haystack, search) {
				continue
			}
		}
		summaries = append(summaries, record.Summary)
	}

	switch sortBy {
	case "name":
		sort.Slice(summaries, func(i, j int) bool {
			return summaries[i].Name < summaries[j].Name
		})
	case "rating":
		sort.Slice(summaries, func(i, j int) bool {
			if summaries[i].Rating == nil && summaries[j].Rating == nil {
				return false
			}
			if summaries[i].Rating == nil {
				return false
			}
			if summaries[j].Rating == nil {
				return true
			}
			return *summaries[i].Rating > *summaries[j].Rating
		})
	case "recent":
		syncedAtFor := func(id string) string {
			for _, record := range records {
				if record.Summary.ID == id {
					return record.SyncedAt
				}
			}
			return ""
		}
		sort.Slice(summaries, func(i, j int) bool {
			return syncedAtFor(summaries[i].ID) > syncedAtFor(summaries[j].ID)
		})
	default:
		sort.Slice(summaries, func(i, j int) bool {
			return summaries[i].Name < summaries[j].Name
		})
	}

	total := len(summaries)

	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}
	if offset >= total {
		return PaginatedCatalog{Data: []ApplicationSummaryDTO{}, Total: total}, nil
	}

	limit := filter.Limit
	if limit <= 0 {
		limit = total
	}
	end := offset + limit
	if end > total {
		end = total
	}

	return PaginatedCatalog{
		Data:  summaries[offset:end],
		Total: total,
	}, nil
}

func (service *Service) Application(
	ctx context.Context,
	appID string,
) (*ApplicationDetailDTO, error) {
	records, err := service.catalog.List(ctx)
	if err != nil {
		return nil, err
	}
	for _, record := range records {
		if record.App.ID == appID {
			return &record.App, nil
		}
	}
	return nil, ErrApplicationNotFound
}

func (service *Service) AssetRoot(appID string) (string, error) {
	if !slugPattern.MatchString(appID) {
		return "", fmt.Errorf("id de aplicativo inválido")
	}
	return filepath.Join(service.dataDir, appID, assetsSubdirectory), nil
}

func (service *Service) Sync(ctx context.Context) (SyncSummary, error) {
	stateSHA, _, err := service.catalog.SyncState(ctx)
	if err != nil {
		return SyncSummary{}, fmt.Errorf("read sync state: %w", err)
	}
	commit, _, changed, err := service.source.LatestCommit(
		ctx,
		service.config.Repository,
		service.config.Branch,
		etagFor(stateSHA),
	)
	if err != nil {
		return SyncSummary{}, err
	}
	if !changed {
		return SyncSummary{Unchanged: true}, nil
	}

	tarball, err := service.source.DownloadTarball(ctx, service.config.Repository, service.config.Branch)
	if err != nil {
		return SyncSummary{}, err
	}
	extractionDir, err := os.MkdirTemp("", "glass-store-")
	if err != nil {
		return SyncSummary{}, fmt.Errorf("create extraction dir: %w", err)
	}
	defer os.RemoveAll(extractionDir)

	manifests, err := ExtractApps(tarball, extractionDir)
	if err != nil {
		return SyncSummary{}, err
	}

	summary := SyncSummary{Commit: commit[:min(12, len(commit))]}
	previous := map[string]string{}
	existingRecords, err := service.catalog.List(ctx)
	if err != nil {
		return SyncSummary{}, fmt.Errorf("list catalog: %w", err)
	}
	for _, record := range existingRecords {
		previous[record.App.ID] = record.ContentHash
	}

	appIDs := make([]string, 0, len(manifests))
	reviewsByApp, reviewsByAppErr := service.source.FetchReviews(ctx, service.config.Repository)
	if reviewsByAppErr != nil {
		service.warn("avaliações da comunidade ignoradas", "error", reviewsByAppErr.Error())
	}
	for id, manifestData := range manifests {
		parsed, parseErr := ParseManifest([]byte(manifestData))
		if parseErr != nil {
			service.warn("manifesto inválido ignorado", "app", id, "error", parseErr.Error())
			continue
		}
		if parsed.ID != id {
			service.warn("id divergente do diretório", "app", id, "esperado", parsed.ID)
			continue
		}

		hash := sha256.Sum256([]byte(manifestData))
		contentHash := hex.EncodeToString(hash[:])
		iconSrc, screenshots := service.resolveAssets(ctx, extractionDir, parsed)

		record := CatalogRecord{
			App:         parsed.Detail(iconSrc, screenshots),
			Summary:     parsed.Summary(iconSrc, screenshots),
			Version:     parsed.Version,
			ContentHash: contentHash,
		}
		if communityReviews := reviewsByApp[parsed.ID]; len(communityReviews) > 0 {
			record.App.Reviews = communityReviews
		}
		if _, ok := previous[parsed.ID]; ok {
			if previous[parsed.ID] != contentHash {
				summary.Updated++
			}
		} else {
			summary.Added++
		}
		if err := service.catalog.Upsert(ctx, record); err != nil {
			return summary, fmt.Errorf("upsert app %s: %w", parsed.ID, err)
		}
		appIDs = append(appIDs, parsed.ID)
	}

	sort.Strings(appIDs)
	removed, err := service.catalog.DeleteMissing(ctx, appIDs)
	if err != nil {
		return summary, fmt.Errorf("remove stale apps: %w", err)
	}
	summary.Removed = removed

	if err := service.catalog.SaveSyncState(ctx, commit, service.now().UTC()); err != nil {
		return summary, fmt.Errorf("save sync state: %w", err)
	}
	return summary, nil
}

func etagFor(commitSHA string) string {
	if commitSHA == "" {
		return ""
	}
	return `"` + commitSHA + `"`
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func (service *Service) warn(message string, args ...any) {
	if service.logger != nil {
		service.logger.Warn(message, args...)
	}
}

func (service *Service) resolveAssets(
	ctx context.Context,
	extractionDir string,
	app *App,
) (string, []ScreenshotDTO) {
	appDir := filepath.Join(extractionDir, "apps", app.ID)
	assetsDir := filepath.Join(service.dataDir, app.ID, assetsSubdirectory)
	if err := os.MkdirAll(assetsDir, 0o755); err != nil {
		service.warn("criar diretório de assets falhou", "app", app.ID, "error", err.Error())
	}

	iconSrc := service.resolveSingleAsset(ctx, appDir, assetsDir, app.ID, "icon", app.Icon)
	screenshots := make([]ScreenshotDTO, 0, len(app.Screenshots))
	for index, reference := range app.Screenshots {
		name := fmt.Sprintf("screenshot-%d", index+1)
		resolved := service.resolveSingleAsset(ctx, appDir, assetsDir, app.ID, name, reference)
		screenshots = append(screenshots, ScreenshotDTO{
			ID:  fmt.Sprintf("%s-%s-%d", app.ID, name, index),
			Src: resolved,
			Alt: fmt.Sprintf("%s screenshot %d", app.Title, index+1),
		})
	}
	if background := textValue(app.Background); background != "" {
		service.resolveSingleAsset(ctx, appDir, assetsDir, app.ID, "background", background)
	}
	return iconSrc, screenshots
}

func (service *Service) resolveSingleAsset(
	ctx context.Context,
	appDir string,
	assetsDir string,
	appID string,
	name string,
	reference string,
) string {
	if reference == "" {
		return ""
	}
	if err := os.MkdirAll(assetsDir, 0o755); err != nil {
		return remoteFallback(reference)
	}

	var (
		content   io.ReadCloser
		extension string
		err       error
	)
	switch {
	case isRemoteReference(reference):
		content, extension, err = service.downloadRemote(ctx, reference)
	default:
		localPath := filepath.Join(appDir, reference)
		extension = strings.ToLower(filepath.Ext(localPath))
		file, openErr := os.Open(localPath)
		if openErr != nil {
			service.warn("asset local ausente", "app", appID, "arquivo", reference)
			return remoteFallback(reference)
		}
		content, err = file, nil
		defer file.Close()
	}
	if err != nil || content == nil {
		service.warn("download de asset falhou", "app", appID, "origem", reference)
		return remoteFallback(reference)
	}
	defer content.Close()

	target := filepath.Join(assetsDir, name+extension)
	out, createErr := os.Create(target)
	if createErr != nil {
		return remoteFallback(reference)
	}
	if _, copyErr := io.Copy(out, io.LimitReader(content, 32<<20)); copyErr != nil {
		out.Close()
		os.Remove(target)
		return remoteFallback(reference)
	}
	if closeErr := out.Close(); closeErr != nil {
		os.Remove(target)
		return remoteFallback(reference)
	}
	return "/api/v1/store/apps/" + appID + "/assets/" + filepath.Base(target)
}

func (service *Service) downloadRemote(ctx context.Context, url string) (io.ReadCloser, string, error) {
	request, requestErr := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if requestErr != nil {
		return nil, "", requestErr
	}
	response, err := service.downloader.Do(request)
	if err != nil {
		return nil, "", err
	}
	if response.StatusCode != http.StatusOK {
		response.Body.Close()
		return nil, "", fmt.Errorf("asset endpoint returned %d", response.StatusCode)
	}
	extension := ".png"
	if strings.Contains(response.Header.Get("Content-Type"), "svg") {
		extension = ".svg"
	} else if strings.HasSuffix(strings.ToLower(url), ".jpg") || strings.HasSuffix(strings.ToLower(url), ".jpeg") {
		extension = ".jpg"
	} else if strings.HasSuffix(strings.ToLower(url), ".webp") {
		extension = ".webp"
	} else if strings.HasSuffix(strings.ToLower(url), ".gif") {
		extension = ".gif"
	} else if strings.HasSuffix(strings.ToLower(url), ".avif") {
		extension = ".avif"
	}
	return response.Body, extension, nil
}

func remoteFallback(reference string) string {
	if isRemoteReference(reference) {
		return reference
	}
	return ""
}

func (service *Service) CreateReview(
	ctx context.Context,
	appID string,
	rating int,
	comment string,
	fallbackAuthor string,
) error {
	comment = strings.TrimSpace(comment)
	if rating < 1 || rating > 5 || comment == "" {
		return ErrInvalidReview
	}
	if err := service.source.CreateReview(
		ctx,
		service.config.Repository,
		appID,
		rating,
		comment,
		service.reviewerIdentity(),
		strings.TrimSpace(fallbackAuthor),
	); err != nil {
		return err
	}
	return service.refreshReviews(ctx)
}

func (service *Service) refreshReviews(ctx context.Context) error {
	reviewsByApp, err := service.source.FetchReviews(ctx, service.config.Repository)
	if err != nil {
		return nil
	}
	records, err := service.catalog.List(ctx)
	if err != nil {
		return fmt.Errorf("list catalog: %w", err)
	}
	for _, record := range records {
		reviews := reviewsByApp[record.App.ID]
		if len(reviews) == 0 && len(record.App.Reviews) == 0 {
			continue
		}
		if len(reviews) > 0 {
			record.App.Reviews = reviews
		} else {
			record.App.Reviews = []ReviewDTO{}
		}
		if err := service.catalog.Upsert(ctx, record); err != nil {
			return fmt.Errorf("upsert app %s: %w", record.App.ID, err)
		}
	}
	return nil
}
