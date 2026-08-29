package store

import (
	"fmt"
	"strings"
)

type ApplicationSummaryDTO struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Developer   string   `json:"developer"`
	Description string   `json:"description"`
	Category    string   `json:"category"`
	Type        string   `json:"type,omitempty"`
	Tags        []string `json:"tags"`
	IconSrc     string   `json:"iconSrc"`
	Screenshots []any    `json:"screenshots"`
	Rating      *float64 `json:"rating,omitempty"`
	Downloads   string   `json:"downloads,omitempty"`
	Status      string   `json:"status"`
}

type PaginatedCatalog struct {
	Data  []ApplicationSummaryDTO `json:"data"`
	Total int                     `json:"total"`
}

type ScreenshotDTO struct {
	ID  string `json:"id"`
	Src string `json:"src"`
	Alt string `json:"alt"`
}

type RequirementRowDTO struct {
	Category    string `json:"category"`
	Minimum     string `json:"minimum"`
	Recommended string `json:"recommended"`
}

type ReviewDTO struct {
	ID        string `json:"id"`
	CommentID string `json:"commentId,omitempty"`
	Author    string `json:"author"`
	Avatar    string `json:"avatar,omitempty"`
	Provider  string `json:"provider,omitempty"`
	PostedAt  string `json:"postedAt"`
	EditedAt  string `json:"editedAt,omitempty"`
	Edits     int    `json:"edits,omitempty"`
	Snippet   string `json:"snippet"`
	Rating    int    `json:"rating"`
}

type ApplicationDetailDTO struct {
	ApplicationSummaryDTO
	Type            string              `json:"type"`
	Version         string              `json:"version"`
	ImageSize       string              `json:"imageSize,omitempty"`
	Architectures   []string            `json:"architectures"`
	Requirements    []RequirementRowDTO `json:"requirements"`
	Reviews         []ReviewDTO         `json:"reviews"`
	DockerHubURL    string              `json:"dockerHubUrl,omitempty"`
	LongDescription string              `json:"longDescription"`
	Entrypoint      EntrypointDTO       `json:"entrypoint"`
}

type EntrypointDTO struct {
	Main    string `json:"main"`
	Index   string `json:"index"`
	PortMap string `json:"portMap"`
	Scheme  string `json:"scheme"`
}

var displayCategories = map[string]string{
	"multimedia":   "Multimedia",
	"productivity": "Productivity",
	"networking":   "Networking",
	"home":         "Home",
	"security":     "Security",
	"devops":       "DeveloperTools",
	"other":        "Other",
}

var architectureLabels = map[string]string{
	"amd64":   "x86-64",
	"arm64":   "arm64",
	"arm":     "armv7",
	"riscv64": "riscv64",
	"mips64":  "mips64",
}

var defaultRequirements = Requirements{
	Memory:    RequirementRow{Minimum: "2GB", Recommended: "4GB+"},
	Storage:   RequirementRow{Minimum: "50GB", Recommended: "100GB+"},
	Processor: RequirementRow{Minimum: "Dual Core 64 bits", Recommended: "Quad Core ARM"},
}

func (app *App) Summary(iconSrc string, screenshots []ScreenshotDTO) ApplicationSummaryDTO {
	converted := make([]any, 0, len(screenshots))
	for _, screenshot := range screenshots {
		converted = append(converted, screenshot)
	}
	return ApplicationSummaryDTO{
		ID:          app.ID,
		Name:        app.Title,
		Developer:   app.Developer,
		Description: app.Tagline,
		Category:    displayCategories[app.Category],
		Type:        "Docker Image",
		Tags:        defaultTags(app.Tags),
		IconSrc:     iconSrc,
		Screenshots: converted,
		Status:      "available",
	}
}

func (app *App) Detail(iconSrc string, screenshots []ScreenshotDTO) ApplicationDetailDTO {
	requirements := app.Requirements
	if requirements == (Requirements{}) {
		requirements = defaultRequirements
	}
	detail := ApplicationDetailDTO{
		ApplicationSummaryDTO: app.Summary(iconSrc, screenshots),
		Type:                  "Docker Image",
		Version:               app.Version,
		Architectures:         architectureList(app.Architectures),
		Reviews:               []ReviewDTO{},
		LongDescription:       app.Description,
		Entrypoint: EntrypointDTO{
			Main:    app.Entrypoint.Main,
			Index:   app.Entrypoint.Index,
			PortMap: app.Entrypoint.PortMap,
			Scheme:  app.Entrypoint.Scheme,
		},
	}
	if detail.Tags == nil {
		detail.Tags = []string{}
	}
	if app.ImageSize() != "" {
		detail.ImageSize = app.ImageSize()
	}
	if hub := app.dockerHubURL(); hub != "" {
		detail.DockerHubURL = hub
	}
	detail.Requirements = []RequirementRowDTO{
		{Category: "Memória", Minimum: orDefault(requirements.Memory.Minimum, defaultRequirements.Memory.Minimum), Recommended: orDefault(requirements.Memory.Recommended, defaultRequirements.Memory.Recommended)},
		{Category: "Armazenamento", Minimum: orDefault(requirements.Storage.Minimum, defaultRequirements.Storage.Minimum), Recommended: orDefault(requirements.Storage.Recommended, defaultRequirements.Storage.Recommended)},
		{Category: "Processador", Minimum: orDefault(requirements.Processor.Minimum, defaultRequirements.Processor.Minimum), Recommended: orDefault(requirements.Processor.Recommended, defaultRequirements.Processor.Recommended)},
	}
	return detail
}

func (app *App) ImageSize() string {
	return ""
}

func (app *App) dockerHubURL() string {
	image := stripImageTag(app.Image)
	image = strings.TrimPrefix(image, "docker.io/")
	if !strings.Contains(image, "/") {
		image = "library/" + image
	}
	switch {
	case strings.HasPrefix(app.Image, "ghcr.io/"):
		return fmt.Sprintf("https://ghcr.io/%s", strings.TrimPrefix(image, "ghcr.io/"))
	default:
		return fmt.Sprintf("https://hub.docker.com/r/%s", image)
	}
}

func stripImageTag(image string) string {
	if index := strings.LastIndex(image, ":"); index > strings.LastIndex(image, "/") {
		return image[:index]
	}
	return image
}

func architectureList(architectures []string) []string {
	labels := make([]string, 0, len(architectures))
	for _, architecture := range architectures {
		label := architectureLabels[architecture]
		if label == "" {
			label = architecture
		}
		labels = append(labels, label)
	}
	return labels
}

func defaultTags(tags []string) []string {
	if len(tags) > 0 {
		return tags
	}
	return []string{}
}

func orDefault(value, fallback string) string {
	if value != "" {
		return value
	}
	return fallback
}

func (requirements Requirements) isEmpty() bool {
	return requirements == Requirements{}
}
