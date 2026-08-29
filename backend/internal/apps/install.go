package apps

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/goccy/go-yaml"

	"github.com/ipetinate/glass-stack/backend/internal/events"
	"github.com/ipetinate/glass-stack/backend/internal/store"
)

var slugPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]*$`)

// Runner applies a compose project on the host and reports the resulting
// service states. The reference implementation shells out to `docker compose`;
// tests provide a fake.
type Runner interface {
	Apply(ctx context.Context, projectDir string) (string, error)
	Status(ctx context.Context, projectDir string) ([]ServiceStatus, error)
	Down(ctx context.Context, projectDir string, removeVolumes bool) error
	RemoveImage(ctx context.Context, image string) error
	Available() bool
}

// ServiceStatus is one normalized compose service state.
type ServiceStatus struct {
	Name   string
	Image  string
	State  string
	Health string
}

// InstallRequest is the normalized install contract consumed from the API.
type InstallRequest struct {
	AppID   string
	Mode    string
	Options InstallOptions
}

// RemoveRequest is the normalized remove contract consumed from the API. Each
// flag selects a destructive level; Containers is the core level and must be
// confirmed for a remove to proceed.
type RemoveRequest struct {
	AppID      string
	Containers bool
	Images     bool
	Config     bool
	Data       bool
}

// InstallOperation is the API-facing operation projection (status and progress
// in the UI vocabulary: installing/installed/error).
type InstallOperation struct {
	ID       string `json:"id"`
	AppID    string `json:"appId"`
	Status   string `json:"status"`
	Progress int    `json:"progress"`
	Message  string `json:"message"`
}

// Installer plans and applies app installs. Install runs asynchronously: the
// endpoint returns the queued operation immediately and a goroutine advances
// it through the state machine, persisting every step.
type Installer struct {
	store        Store
	manifests    ManifestSource
	runner       Runner
	projectRoot  string
	publisher    events.Publisher
	logger       *slog.Logger
	hostResolver func() string
	portResolver PortResolver
	now          func() time.Time
	slackSeconds int
}

// NewInstaller wires the install service.
func NewInstaller(
	store Store,
	manifests ManifestSource,
	runner Runner,
	projectRoot string,
	publisher events.Publisher,
	logger *slog.Logger,
) *Installer {
	return &Installer{
		store:        store,
		manifests:    manifests,
		runner:       runner,
		projectRoot:  projectRoot,
		publisher:    publisher,
		logger:       logger,
		now:          time.Now,
		slackSeconds: 30,
	}
}

// Install validates, queues and starts an install operation.
func (service *Installer) Install(
	ctx context.Context,
	request InstallRequest,
) (Operation, error) {
	appID := strings.TrimSpace(request.AppID)
	if !slugPattern.MatchString(appID) {
		return Operation{}, fmt.Errorf("%w: id de aplicativo inválido", ErrInvalidOptions)
	}
	switch request.Mode {
	case "", "standard", "custom", "docker":
	default:
		return Operation{}, fmt.Errorf("%w: modo %q", ErrUnsupportedMode, request.Mode)
	}
	if request.Options.Port < 0 {
		return Operation{}, fmt.Errorf("%w: porta inválida", ErrInvalidOptions)
	}
	if existing, err := service.store.LoadInstance(ctx, appID); err == nil {
		switch InstanceStatus(existing.Status) {
		case InstanceInstalled:
			return Operation{}, ErrAlreadyInstalled
		case InstanceInstalling:
			return Operation{}, ErrInstallInProgress
		}
	} else if !errors.Is(err, ErrNotFound) {
		return Operation{}, fmt.Errorf("verificar instância: %w", err)
	}

	operation := Operation{
		ID:        newOperationID(),
		AppID:     appID,
		Kind:      OperationKindInstall,
		Status:    OperationQueued,
		Progress:  0,
		Message:   "instalação na fila",
		CreatedAt: service.now().UTC(),
	}
	if err := service.store.CreateOperation(ctx, operation); err != nil {
		return Operation{}, fmt.Errorf("criar operação: %w", err)
	}

	go service.executeInstall(operation.ID, request)
	return operation, nil
}

// Operation returns the current projection of an operation.
func (service *Installer) Operation(ctx context.Context, id string) (InstallOperation, error) {
	operation, err := service.store.LoadOperation(ctx, id)
	if err != nil {
		return InstallOperation{}, err
	}
	return ProjectOperation(operation), nil
}

// ProjectOperation maps the internal state machine onto the API vocabulary:
// running operations project onto kind-specific verbs (installing/updating/
// editing/removing), failures onto "error", and terminal success onto the
// installed-family status (removed for removes).
func ProjectOperation(operation Operation) InstallOperation {
	status := string(operation.Status)
	switch operation.Status {
	case OperationQueued, OperationRunning:
		status = runningVerb(operation.Kind)
	case OperationFailed:
		status = string(InstanceError)
	case OperationSucceeded:
		status = succeededStatus(operation.Kind)
	}
	message := operation.Message
	if operation.Status == OperationFailed && operation.Error != "" {
		message = operation.Error
	}
	return InstallOperation{
		ID:       operation.ID,
		AppID:    operation.AppID,
		Status:   status,
		Progress: operation.Progress,
		Message:  message,
	}
}

// runningVerb projects an in-flight operation kind onto the UI verb.
func runningVerb(kind string) string {
	switch kind {
	case OperationKindUpdate:
		return "updating"
	case OperationKindEdit:
		return "editing"
	case OperationKindRemove:
		return "removing"
	default:
		return string(InstanceInstalling)
	}
}

// succeededStatus projects a successful operation kind onto the UI status.
func succeededStatus(kind string) string {
	switch kind {
	case OperationKindRemove:
		return "removed"
	default:
		return string(InstanceInstalled)
	}
}

const (
	stepQueued      = 0
	stepPlanning    = 20
	stepApplying    = 60
	stepLaunching   = 90
	stepInstalled   = 100
	phaseValidating = "validando manifesto"
	phaseApplying   = "aplicando docker compose"
	phaseLaunching  = "aguardando contêineres"
)

func (service *Installer) executeInstall(operationID string, request InstallRequest) {
	ctx := context.Background()
	now := service.now().UTC()

	operation := Operation{
		ID:        operationID,
		AppID:     request.AppID,
		Kind:      OperationKindInstall,
		Status:    OperationRunning,
		Progress:  stepPlanning,
		Message:   phaseValidating,
		CreatedAt: now,
	}
	if err := service.syncOperation(ctx, operation); err != nil {
		service.failOperation(ctx, OperationKindInstall, operationID, request.AppID, err, stepPlanning)
		return
	}

	plan, err := service.Plan(ctx, request.AppID, request.Options)
	if err != nil {
		service.failOperation(ctx, OperationKindInstall, operationID, request.AppID, err, stepPlanning)
		return
	}
	hash := sha256.Sum256(plan.Compose)
	composeHash := hex.EncodeToString(hash[:])

	projectDir, err := service.writeProject(plan)
	if err != nil {
		service.failOperation(ctx, OperationKindInstall, operationID, request.AppID, err, stepPlanning)
		return
	}

	operation.Status = OperationRunning
	operation.Progress = stepApplying
	operation.Message = phaseApplying
	if err := service.syncOperation(ctx, operation); err != nil {
		service.failOperation(ctx, OperationKindInstall, operationID, request.AppID, err, stepApplying)
		return
	}

	if output, applyErr := service.runner.Apply(ctx, projectDir); applyErr != nil {
		service.failOperation(ctx, OperationKindInstall, operationID, request.AppID, applyErr, stepApplying)
		return
	} else if output != "" && service.logger != nil {
		service.logger.Debug("compose apply output", "app", request.AppID, "output", output)
	}

	operation.Status = OperationRunning
	operation.Progress = stepLaunching
	operation.Message = phaseLaunching
	if err := service.syncOperation(ctx, operation); err != nil {
		service.failOperation(ctx, OperationKindInstall, operationID, request.AppID, err, stepLaunching)
		return
	}

	if err := service.awaitHealthy(ctx, projectDir); err != nil {
		service.failOperation(ctx, OperationKindInstall, operationID, request.AppID, err, stepApplying)
		return
	}

	completedAt := service.now().UTC()
	operation.Status = OperationSucceeded
	operation.Progress = stepInstalled
	operation.Message = "instalação concluída"
	operation.CompletedAt = &completedAt
	if err := service.syncOperation(ctx, operation); err != nil {
		service.failOperation(ctx, OperationKindInstall, operationID, request.AppID, err, stepInstalled)
		return
	}

	instance := Instance{
		ID:          request.AppID,
		AppID:       request.AppID,
		Status:      InstanceInstalled,
		ComposeHash: composeHash,
		Options:     request.Options,
		Version:     plan.Version,
		Runtime:     RuntimeRunning,
		CreatedAt:   now,
		UpdatedAt:   completedAt,
	}
	if err := service.store.UpsertInstance(ctx, instance); err != nil {
		service.logIfPresent("upsert instância falhou", "app", request.AppID, "error", err)
	}

	service.publish(ctx, "glass.apps.installed", InstallOperation{
		ID:       operation.ID,
		AppID:    request.AppID,
		Status:   string(InstanceInstalled),
		Progress: stepInstalled,
		Message:  "instalação concluída",
	})
}

// Update re-applies an installed app from its persisted options: it re-plans
// with the saved install options (no new user input), rewrites the project,
// applies it, awaits health and finally refreshes the instance record.
func (service *Installer) Update(ctx context.Context, appID string) (Operation, error) {
	appID = strings.TrimSpace(appID)
	instance, err := service.loadInstalled(ctx, appID, ErrUpdateInProgress)
	if err != nil {
		return Operation{}, err
	}
	operation, err := service.queueOperation(ctx, OperationKindUpdate, appID, "atualização na fila")
	if err != nil {
		return Operation{}, err
	}
	go service.executeUpdate(operation.ID, appID, instance.Options)
	return operation, nil
}

// Edit re-applies an installed app with new install options: it validates the
// mode exactly like install, re-plans with the new options, applies them and
// persists the new options, version and compose hash.
func (service *Installer) Edit(
	ctx context.Context,
	appID string,
	mode string,
	options InstallOptions,
) (Operation, error) {
	appID = strings.TrimSpace(appID)
	switch mode {
	case "", "standard", "custom", "docker":
	default:
		return Operation{}, fmt.Errorf("%w: modo %q", ErrUnsupportedMode, mode)
	}
	if options.Port < 0 {
		return Operation{}, fmt.Errorf("%w: porta inválida", ErrInvalidOptions)
	}
	if _, err := service.loadInstalled(ctx, appID, ErrEditInProgress); err != nil {
		return Operation{}, err
	}
	operation, err := service.queueOperation(ctx, OperationKindEdit, appID, "edição na fila")
	if err != nil {
		return Operation{}, err
	}
	go service.executeEdit(operation.ID, appID, options)
	return operation, nil
}

// Remove tears down an installed app according to the destructive levels
// confirmed in the request: containers (always), images, config files and app
// data. The instance row is deleted only after the executor finishes.
func (service *Installer) Remove(ctx context.Context, request RemoveRequest) (Operation, error) {
	appID := strings.TrimSpace(request.AppID)
	if !request.Containers && !request.Images && !request.Config && !request.Data {
		return Operation{}, ErrRemoveNeedsConfirmation
	}
	if !slugPattern.MatchString(appID) {
		return Operation{}, fmt.Errorf("%w: id de aplicativo inválido", ErrInvalidOptions)
	}
	if _, err := service.store.LoadInstance(ctx, appID); err != nil {
		if errors.Is(err, ErrNotFound) {
			return Operation{}, ErrNotInstalled
		}
		return Operation{}, fmt.Errorf("verificar instância: %w", err)
	}
	operation, err := service.queueOperation(ctx, OperationKindRemove, appID, "remoção na fila")
	if err != nil {
		return Operation{}, err
	}
	go service.executeRemove(operation.ID, request)
	return operation, nil
}

// loadInstalled loads an instance and applies the not-installed / in-progress
// guards common to update and edit. inProgress is the guard to report when the
// instance is not in a settled installed state.
func (service *Installer) loadInstalled(ctx context.Context, appID string, inProgress error) (Instance, error) {
	existing, err := service.store.LoadInstance(ctx, appID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return Instance{}, ErrNotInstalled
		}
		return Instance{}, fmt.Errorf("verificar instância: %w", err)
	}
	switch InstanceStatus(existing.Status) {
	case InstanceInstalled:
		return existing, nil
	case InstanceInstalling, InstanceError:
		return Instance{}, inProgress
	}
	return existing, nil
}

// queueOperation creates a queued operation of the given kind.
func (service *Installer) queueOperation(
	ctx context.Context,
	kind string,
	appID string,
	message string,
) (Operation, error) {
	operation := Operation{
		ID:        newOperationID(),
		AppID:     appID,
		Kind:      kind,
		Status:    OperationQueued,
		Progress:  0,
		Message:   message,
		CreatedAt: service.now().UTC(),
	}
	if err := service.store.CreateOperation(ctx, operation); err != nil {
		return Operation{}, fmt.Errorf("criar operação: %w", err)
	}
	return operation, nil
}

func (service *Installer) executeUpdate(operationID, appID string, options InstallOptions) {
	ctx := context.Background()
	service.executeApply(ctx, operationID, appID, OperationKindUpdate, options, func(instance *Instance, plan Plan) {
		instance.Options = options
		instance.Version = plan.Version
		instance.Runtime = RuntimeRunning
	}, "glass.apps.updated")
}

func (service *Installer) executeEdit(operationID, appID string, options InstallOptions) {
	ctx := context.Background()
	service.executeApply(ctx, operationID, appID, OperationKindEdit, options, func(instance *Instance, plan Plan) {
		instance.Options = options
		instance.Version = plan.Version
		instance.Runtime = RuntimeRunning
	}, "glass.apps.edited")
}

// executeApply runs the shared plan/write/apply/await/persist pipeline for
// update and edit operations. It reports progress, marks failures through the
// current failOperation and, on success, updates the instance via persist and
// publishes the given success event.
func (service *Installer) executeApply(
	ctx context.Context,
	operationID string,
	appID string,
	kind string,
	options InstallOptions,
	persist func(*Instance, Plan),
	successEvent string,
) {
	now := service.now().UTC()

	operation := Operation{
		ID:        operationID,
		AppID:     appID,
		Kind:      kind,
		Status:    OperationRunning,
		Progress:  stepPlanning,
		Message:   phaseValidating,
		CreatedAt: now,
	}
	if err := service.syncOperation(ctx, operation); err != nil {
		service.failOperation(ctx, kind, operationID, appID, err, stepPlanning)
		return
	}

	plan, err := service.Plan(ctx, appID, options)
	if err != nil {
		service.failOperation(ctx, kind, operationID, appID, err, stepPlanning)
		return
	}
	hash := sha256.Sum256(plan.Compose)
	composeHash := hex.EncodeToString(hash[:])

	projectDir, err := service.writeProject(plan)
	if err != nil {
		service.failOperation(ctx, kind, operationID, appID, err, stepPlanning)
		return
	}

	operation.Status = OperationRunning
	operation.Progress = stepApplying
	operation.Message = phaseApplying
	if err := service.syncOperation(ctx, operation); err != nil {
		service.failOperation(ctx, kind, operationID, appID, err, stepApplying)
		return
	}

	if output, applyErr := service.runner.Apply(ctx, projectDir); applyErr != nil {
		service.failOperation(ctx, kind, operationID, appID, applyErr, stepApplying)
		return
	} else if output != "" && service.logger != nil {
		service.logger.Debug("compose apply output", "app", appID, "output", output)
	}

	operation.Status = OperationRunning
	operation.Progress = stepLaunching
	operation.Message = phaseLaunching
	if err := service.syncOperation(ctx, operation); err != nil {
		service.failOperation(ctx, kind, operationID, appID, err, stepLaunching)
		return
	}

	if err := service.awaitHealthy(ctx, projectDir); err != nil {
		service.failOperation(ctx, kind, operationID, appID, err, stepApplying)
		return
	}

	completedAt := service.now().UTC()
	operation.Status = OperationSucceeded
	operation.Progress = stepInstalled
	operation.Message = opKindMessage(kind)
	operation.CompletedAt = &completedAt
	if err := service.syncOperation(ctx, operation); err != nil {
		service.failOperation(ctx, kind, operationID, appID, err, stepInstalled)
		return
	}

	instance, err := service.store.LoadInstance(ctx, appID)
	if err != nil {
		service.logIfPresent("carregar instância para atualizar falhou", "app", appID, "error", err)
	} else {
		instance.Status = InstanceInstalled
		instance.ComposeHash = composeHash
		instance.UpdatedAt = completedAt
		persist(&instance, plan)
		if err := service.store.UpsertInstance(ctx, instance); err != nil {
			service.logIfPresent("upsert instância falhou", "app", appID, "error", err)
		}
	}

	service.publish(ctx, successEvent, InstallOperation{
		ID:       operationID,
		AppID:    appID,
		Status:   string(InstanceInstalled),
		Progress: stepInstalled,
		Message:  opKindMessage(kind),
	})
}

func (service *Installer) executeRemove(operationID string, request RemoveRequest) {
	ctx := context.Background()
	now := service.now().UTC()
	operation := Operation{
		ID:        operationID,
		AppID:     request.AppID,
		Kind:      OperationKindRemove,
		Status:    OperationRunning,
		Progress:  stepPlanning,
		Message:   "removendo contêineres",
		CreatedAt: now,
	}
	if err := service.syncOperation(ctx, operation); err != nil {
		service.failOperation(ctx, OperationKindRemove, operationID, request.AppID, err, stepPlanning)
		return
	}

	progress := stepApplying
	if request.Containers {
		if err := service.runner.Down(ctx, service.projectDirFor(request.AppID), true); err != nil {
			service.failOperation(ctx, OperationKindRemove, operationID, request.AppID, err, progress)
			return
		}
	}

	if request.Images {
		image, err := service.mainImage(ctx, request.AppID)
		if err != nil {
			service.logIfPresent("obter imagem para remoção falhou", "app", request.AppID, "error", err)
		} else if image != "" {
			if err := service.runner.RemoveImage(ctx, image); err != nil {
				service.logIfPresent("remoção de imagem falhou", "app", request.AppID, "image", image, "error", err)
			}
		}
	}

	if request.Config {
		if err := os.RemoveAll(filepath.Join(service.projectRoot, request.AppID)); err != nil {
			service.failOperation(ctx, OperationKindRemove, operationID, request.AppID, err, progress)
			return
		}
	}

	if request.Data {
		dataDir := filepath.Join(parentOf(service.projectRoot), request.AppID)
		if err := os.RemoveAll(dataDir); err != nil {
			service.failOperation(ctx, OperationKindRemove, operationID, request.AppID, err, progress)
			return
		}
	}

	completedAt := service.now().UTC()
	operation.Status = OperationSucceeded
	operation.Progress = stepInstalled
	operation.Message = "remoção concluída"
	operation.CompletedAt = &completedAt
	if err := service.syncOperation(ctx, operation); err != nil {
		service.failOperation(ctx, OperationKindRemove, operationID, request.AppID, err, stepInstalled)
		return
	}

	if err := service.store.DeleteInstance(ctx, request.AppID); err != nil {
		service.logIfPresent("remover instância falhou", "app", request.AppID, "error", err)
	}

	service.publish(ctx, "glass.apps.removed", InstallOperation{
		ID:       operationID,
		AppID:    request.AppID,
		Status:   "removed",
		Progress: stepInstalled,
		Message:  "remoção concluída",
	})
}

func (service *Installer) projectDirFor(appID string) string {
	return filepath.Join(service.projectRoot, appID)
}

// mainImage resolves the entrypoint service's image from the current manifest
// so remove can offer to delete it.
func (service *Installer) mainImage(ctx context.Context, appID string) (string, error) {
	composeYAML, err := service.manifests.Manifest(ctx, appID)
	if err != nil {
		return "", translateManifestErr(err)
	}
	parsed, err := store.ParseManifest([]byte(composeYAML))
	if err != nil {
		return "", fmt.Errorf("manifesto inválido: %w", err)
	}
	var root map[string]any
	if err := yaml.Unmarshal([]byte(composeYAML), &root); err != nil {
		return "", fmt.Errorf("parse compose: %w", err)
	}
	services, ok := root["services"].(map[string]any)
	if !ok {
		return "", fmt.Errorf("compose sem services")
	}
	main, ok := services[parsed.Entrypoint.Main].(map[string]any)
	if !ok {
		return "", fmt.Errorf("serviço principal %q não encontrado", parsed.Entrypoint.Main)
	}
	image, _ := main["image"].(string)
	return image, nil
}

// parentOf returns the parent directory of a path.
func parentOf(path string) string {
	return filepath.Dir(path)
}

// awaitHealthy polls the compose project until every declared service is
// running (and healthy when the manifest declares a healthcheck) or the grace
// period elapses. The deadline is only enforced between polls, so a healthy
// result is never preempted by an expired deadline.
func (service *Installer) awaitHealthy(ctx context.Context, projectDir string) error {
	if service.runner == nil {
		return nil
	}
	deadline := time.Now().Add(time.Duration(service.slackSeconds) * time.Second)
	var lastErr error
	for {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		states, err := service.runner.Status(ctx, projectDir)
		if err == nil && servicesHealthy(states) {
			return nil
		}
		lastErr = err
		if time.Now().After(deadline) {
			if lastErr != nil {
				return fmt.Errorf(
					"tempo esgotado aguardando os contêineres ficarem saudáveis: %w",
					lastErr,
				)
			}
			return fmt.Errorf("tempo esgotado aguardando os contêineres ficarem saudáveis")
		}
		time.Sleep(400 * time.Millisecond)
	}
}

func servicesHealthy(states []ServiceStatus) bool {
	if len(states) == 0 {
		return false
	}
	for _, status := range states {
		if status.State != "running" {
			return false
		}
		if status.Health != "" && status.Health != "healthy" {
			return false
		}
	}
	return true
}

func (service *Installer) writeProject(plan Plan) (string, error) {
	projectDir := filepath.Join(service.projectRoot, plan.AppID)
	if err := os.MkdirAll(projectDir, 0o755); err != nil {
		return "", fmt.Errorf("criar diretório do projeto: %w", err)
	}
	composePath := filepath.Join(projectDir, "docker-compose.yaml")
	if err := os.WriteFile(composePath, plan.Compose, 0o644); err != nil {
		return "", fmt.Errorf("escrever docker-compose.yaml: %w", err)
	}
	return projectDir, nil
}

func (service *Installer) failOperation(
	ctx context.Context,
	kind string,
	operationID string,
	appID string,
	cause error,
	progress int,
) {
	now := service.now().UTC()
	operation := Operation{
		ID:          operationID,
		AppID:       appID,
		Kind:        kind,
		Status:      OperationFailed,
		Progress:    progress,
		Message:     failMessage(kind),
		CreatedAt:   now,
		CompletedAt: &now,
		Error:       cause.Error(),
	}
	if err := service.syncOperation(ctx, operation); err != nil {
		service.logIfPresent("marcar operação como falha falhou", "operation", operationID, "error", err)
	}
	instance := Instance{
		ID:        appID,
		AppID:     appID,
		Status:    InstanceError,
		LastError: cause.Error(),
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := service.store.UpsertInstance(ctx, instance); err != nil {
		service.logIfPresent("registrar falha de operação falhou", "app", appID, "error", err)
	}
	service.publish(ctx, failEvent(kind), InstallOperation{
		ID:       operationID,
		AppID:    appID,
		Status:   string(InstanceError),
		Progress: progress,
		Message:  cause.Error(),
	})
}

// failMessage is the UI message for a failed operation of the given kind.
func failMessage(kind string) string {
	switch kind {
	case OperationKindUpdate:
		return "atualização falhou"
	case OperationKindEdit:
		return "edição falhou"
	case OperationKindRemove:
		return "remoção falhou"
	default:
		return "instalação falhou"
	}
}

// failEvent is the event topic published for a failed operation of the given
// kind.
func failEvent(kind string) string {
	switch kind {
	case OperationKindUpdate:
		return "glass.apps.update_failed"
	case OperationKindEdit:
		return "glass.apps.edit_failed"
	case OperationKindRemove:
		return "glass.apps.remove_failed"
	default:
		return "glass.apps.install_failed"
	}
}

// opKindMessage is the completion message for a succeeded operation kind.
func opKindMessage(kind string) string {
	switch kind {
	case OperationKindUpdate:
		return "atualização concluída"
	case OperationKindEdit:
		return "edição concluída"
	case OperationKindRemove:
		return "remoção concluída"
	default:
		return "instalação concluída"
	}
}

// operationEventType is the SSE topic carrying every persisted operation
// change (progress, status and message) so clients can track installs,
// updates, edits and removes in real time without polling.
const operationEventType = "glass.apps.operation"

// syncOperation persists the operation and then publishes its projected
// install-state as a real-time event for every connected SSE client.
func (service *Installer) syncOperation(ctx context.Context, operation Operation) error {
	if err := service.store.UpdateOperation(ctx, operation); err != nil {
		return err
	}
	service.publish(ctx, operationEventType, ProjectOperation(operation))
	return nil
}

func (service *Installer) publish(ctx context.Context, eventType string, payload any) {
	if service.publisher == nil {
		return
	}
	_ = service.publisher.Publish(ctx, events.Event{
		Type:       eventType,
		OccurredAt: service.now().UTC(),
		Payload:    payload,
	})
}

func (service *Installer) logIfPresent(message string, args ...any) {
	if service.logger != nil {
		service.logger.Warn(message, args...)
	}
}

// InstalledApp is the API-facing projection of one installed application:
// identity, catalog title, persisted version, instance and runtime status,
// resolved access URL and install options.
type InstalledApp struct {
	ID        string         `json:"id"`
	Title     string         `json:"title"`
	Version   string         `json:"version"`
	Status    InstanceStatus `json:"status"`
	Runtime   RuntimeStatus  `json:"runtime"`
	AccessURL string         `json:"accessUrl"`
	Options   InstallOptions `json:"options"`
	LastError string         `json:"lastError"`
	UpdatedAt time.Time      `json:"updatedAt"`
}

// Apps projects every installed instance. The catalog title is resolved from
// the manifest when available and empty otherwise; access URL resolution is
// best-effort. An empty catalog projects to an empty, non-nil slice.
func (service *Installer) Apps(ctx context.Context) ([]InstalledApp, error) {
	instances, err := service.store.ListInstances(ctx)
	if err != nil {
		return nil, err
	}
	if len(instances) == 0 {
		return []InstalledApp{}, nil
	}
	projected := make([]InstalledApp, 0, len(instances))
	for _, instance := range instances {
		projected = append(projected, service.projectInstalledApp(ctx, instance))
	}
	return projected, nil
}

// App projects a single installed instance, reporting ErrNotInstalled when no
// instance exists for the requested app.
func (service *Installer) App(ctx context.Context, appID string) (InstalledApp, error) {
	instance, err := service.store.LoadInstance(ctx, appID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return InstalledApp{}, ErrNotInstalled
		}
		return InstalledApp{}, fmt.Errorf("verificar instância: %w", err)
	}
	return service.projectInstalledApp(ctx, instance), nil
}

func (service *Installer) projectInstalledApp(ctx context.Context, instance Instance) InstalledApp {
	projected := InstalledApp{
		ID:        instance.AppID,
		Version:   instance.Version,
		Status:    instance.Status,
		Runtime:   instance.Runtime,
		Options:   instance.Options,
		LastError: instance.LastError,
		UpdatedAt: instance.UpdatedAt,
	}
	if title := service.manifestTitle(ctx, instance.AppID); title != "" {
		projected.Title = title
	}
	if accessURL, err := service.AccessURL(ctx, instance.AppID); err == nil {
		projected.AccessURL = accessURL
	}
	return projected
}

// manifestTitle resolves the catalog title of an app from its manifest,
// returning "" on any manifest error.
func (service *Installer) manifestTitle(ctx context.Context, appID string) string {
	composeYAML, err := service.manifests.Manifest(ctx, appID)
	if err != nil {
		return ""
	}
	parsed, err := store.ParseManifest([]byte(composeYAML))
	if err != nil {
		return ""
	}
	return parsed.Title
}
