package store

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"github.com/goccy/go-yaml"
)

var (
	slugPattern      = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]*$`)
	pinnedImageRegex = regexp.MustCompile(`^[^:\s@]+:[A-Za-z0-9._-]+(@sha256:[a-f0-9]{64})?$`)
	datePattern      = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)
	portPattern      = regexp.MustCompile(`^\d+$`)
)

const DefaultSpecVersion = 1

type Entrypoint struct {
	Main    string
	Index   string
	PortMap string
	Scheme  string
}

type RequirementRow struct {
	Minimum     string
	Recommended string
}

type Requirements struct {
	Memory    RequirementRow
	Storage   RequirementRow
	Processor RequirementRow
}

type App struct {
	ID            string
	Title         string
	Tagline       string
	Description   string
	Developer     string
	Author        string
	Category      string
	Tags          []string
	Architectures []string
	Version       string
	UpdatedAt     string
	Icon          string
	Background    string
	Screenshots   []string
	Website       string
	Source        string
	Docs          string
	Support       string
	Image         string
	Entrypoint    Entrypoint
	CustomInstall bool
	Requirements  Requirements
}

type composeEnvelope struct {
	Name     string         `yaml:"name"`
	Services map[string]any `yaml:"services"`
	XGlass   map[string]any `yaml:"x-glass"`
	XCasaos  map[string]any `yaml:"x-casaos"`
}

func ParseManifest(data []byte) (*App, error) {
	var envelope composeEnvelope
	if err := yaml.Unmarshal(data, &envelope); err != nil {
		return nil, fmt.Errorf("parse compose: %w", err)
	}
	if envelope.Name == "" || !slugPattern.MatchString(envelope.Name) {
		return nil, fmt.Errorf("compose `name` ausente ou inválido")
	}
	if len(envelope.Services) == 0 {
		return nil, fmt.Errorf("compose sem serviços")
	}

	source := "x-glass"
	metadata := envelope.XGlass
	if metadata == nil {
		source = "x-casaos"
		metadata = envelope.XCasaos
	}
	if metadata == nil {
		return nil, fmt.Errorf("bloco x-glass ou x-casaos ausente")
	}

	app := &App{
		ID:            envelope.Name,
		CustomInstall: true,
	}
	if err := applyMetadata(app, metadata, source == "x-casaos"); err != nil {
		return nil, err
	}
	if err := applyEntrypoint(app, envelope, metadata); err != nil {
		return nil, err
	}
	if app.Version == "" {
		app.Version = versionFromImage(app.Image)
	}
	return app, nil
}

func versionFromImage(image string) string {
	if index := strings.LastIndex(image, ":"); index > strings.LastIndex(image, "/") && index+1 < len(image) {
		return image[index+1:]
	}
	return "latest"
}

func applyMetadata(app *App, metadata map[string]any, casaos bool) error {
	title := localizedText(metadata["title"])
	tagline := localizedText(metadata["tagline"])
	description := localizedText(metadata["description"])
	if casaos && tagline == "" {
		tagline = title
	}
	if casaos && description == "" {
		description = tagline
	}
	if title == "" || description == "" {
		return fmt.Errorf("x-glass.title e x-glass.description são obrigatórios")
	}

	developer := textValue(metadata["developer"])
	if developer == "" {
		return fmt.Errorf("x-glass.developer é obrigatório")
	}
	version := textValue(metadata["version"])
	if casaos && version == "" {
		// resolvido depois a partir da tag da imagem do serviço principal
	} else if version == "" {
		return fmt.Errorf("x-glass.version é obrigatório")
	}

	category := strings.ToLower(strings.TrimSpace(textValue(metadata["category"])))
	if casaos {
		category = normalizeCasaosCategory(category)
	} else if !validCategory(category) {
		return fmt.Errorf("categoria inválida: %q", category)
	}

	icon := textValue(metadata["icon"])
	if icon == "" {
		return fmt.Errorf("x-glass.icon é obrigatório")
	}

	app.Title = title
	app.Tagline = firstNonEmpty(tagline, title)
	app.Description = description
	app.Developer = developer
	app.Author = textValue(metadata["author"])
	app.Category = category
	app.Version = version
	app.Tags = textList(metadata["tags"])
	app.Architectures = textList(metadata["architectures"])

	updatedAt := textValue(metadata["updatedAt"])
	if casaos && updatedAt == "" {
		updatedAt = textValue(metadata["update_at"])
	}
	if updatedAt != "" && !datePattern.MatchString(updatedAt) {
		return fmt.Errorf("updatedAt fora do formato YYYY-MM-DD: %q", updatedAt)
	}
	app.UpdatedAt = updatedAt

	app.Icon = icon
	app.Background = firstNonEmpty(
		textValue(metadata["background"]),
		textValue(metadata["thumbnail"]),
	)
	app.Screenshots = textList(firstNonEmptyList(metadata["screenshots"], metadata["screenshot_link"]))
	app.Website = firstNonEmpty(textValue(metadata["website"]), textValue(metadata["homepage"]))
	app.Source = firstNonEmpty(textValue(metadata["source"]), textValue(metadata["repo"]))
	app.Docs = textValue(metadata["docs"])
	app.Support = textValue(metadata["support"])

	requirements, err := parseRequirements(metadata["requirements"])
	if err != nil {
		return err
	}
	app.Requirements = requirements
	return nil
}

func applyEntrypoint(app *App, envelope composeEnvelope, metadata map[string]any) error {
	entrypoint, _ := metadata["entrypoint"].(map[string]any)
	main := textValue(entrypoint["main"])
	index := textValue(entrypoint["index"])
	portMap := textValue(entrypoint["portMap"])
	scheme := strings.ToLower(textValue(entrypoint["scheme"]))

	if main == "" {
		main = textValue(metadata["main"])
	}
	if index == "" {
		index = textValue(metadata["index"])
	}
	if portMap == "" {
		portMap = textValue(metadata["port_map"])
	}
	if scheme == "" {
		scheme = strings.ToLower(textValue(metadata["scheme"]))
	}
	if index == "" {
		index = "/"
	}
	if scheme == "" {
		scheme = "http"
	}
	if main == "" {
		return fmt.Errorf("entrypoint.main não definido")
	}
	if _, ok := envelope.Services[main]; !ok {
		return fmt.Errorf("entrypoint.main %q não existe em services", main)
	}
	if portMap != "" && !portPattern.MatchString(portMap) {
		return fmt.Errorf("portMap deve ser numérico: %q", portMap)
	}
	if scheme != "http" && scheme != "https" {
		return fmt.Errorf("scheme inválido: %q", scheme)
	}

	app.Entrypoint = Entrypoint{Main: main, Index: index, PortMap: portMap, Scheme: scheme}
	app.Image = serviceImage(envelope.Services[main])
	if app.Image == "" {
		return fmt.Errorf("serviço principal %q sem imagem", main)
	}
	if !pinnedImageRegex.MatchString(app.Image) || strings.Contains(app.Image, ":latest") {
		return fmt.Errorf("imagem do serviço principal deve estar pinada: %q", app.Image)
	}
	return nil
}

var casaosCategories = map[string]string{
	"media":        "multimedia",
	"multimedia":   "multimedia",
	"video":        "multimedia",
	"photos":       "multimedia",
	"music":        "multimedia",
	"backup":       "productivity",
	"productivity": "productivity",
	"office":       "productivity",
	"network":      "networking",
	"networking":   "networking",
	"dns":          "networking",
	"home":         "home",
	"automation":   "home",
	"security":     "security",
	"developer":    "devops",
	"devops":       "devops",
	"monitoring":   "devops",
	"utilities":    "other",
	"social":       "other",
	"games":        "other",
	"finance":      "other",
	"books":        "other",
}

func normalizeCasaosCategory(raw string) string {
	if category, ok := casaosCategories[raw]; ok {
		return category
	}
	return "other"
}

func validCategory(category string) bool {
	switch category {
	case "multimedia", "productivity", "networking", "home", "security", "devops", "other":
		return true
	}
	return false
}

func serviceImage(service any) string {
	typed, ok := service.(map[string]any)
	if !ok {
		return ""
	}
	return textValue(typed["image"])
}

func parseRequirements(value any) (Requirements, error) {
	rows, _ := value.(map[string]any)
	requirements := Requirements{}
	for key, target := range map[string]*RequirementRow{
		"memory":    &requirements.Memory,
		"storage":   &requirements.Storage,
		"processor": &requirements.Processor,
	} {
		row, ok := rows[key].(map[string]any)
		if !ok {
			continue
		}
		target.Minimum = textValue(row["minimum"])
		target.Recommended = textValue(row["recommended"])
	}
	return requirements, nil
}

func localizedText(value any) string {
	if text, ok := value.(string); ok {
		return strings.TrimSpace(text)
	}
	if values, ok := value.(map[string]any); ok {
		for _, key := range []string{"pt_br", "en_us"} {
			if text, ok := values[key].(string); ok && strings.TrimSpace(text) != "" {
				return strings.TrimSpace(text)
			}
		}
		for _, candidate := range values {
			if text, ok := candidate.(string); ok && strings.TrimSpace(text) != "" {
				return strings.TrimSpace(text)
			}
		}
	}
	return ""
}

func textValue(value any) string {
	switch typed := value.(type) {
	case string:
		return strings.TrimSpace(typed)
	case int:
		return fmt.Sprintf("%d", typed)
	case int64:
		return fmt.Sprintf("%d", typed)
	case uint64:
		return fmt.Sprintf("%d", typed)
	case float64:
		if typed == float64(int64(typed)) {
			return fmt.Sprintf("%d", int64(typed))
		}
		return strings.TrimSpace(fmt.Sprintf("%v", typed))
	default:
		return ""
	}
}

func textList(value any) []string {
	items, ok := value.([]any)
	if !ok {
		return nil
	}
	var result []string
	for _, item := range items {
		if text := textValue(item); text != "" {
			result = append(result, text)
		}
	}
	return result
}

func firstNonEmptyList(values ...any) any {
	for _, value := range values {
		if list, ok := value.([]any); ok && len(list) > 0 {
			return value
		}
	}
	return nil
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func isRemoteReference(reference string) bool {
	parsed, err := url.Parse(reference)
	return err == nil && parsed.Scheme != ""
}
