// Package apps is the domain service that plans and applies app installs from
// the glass-store: it renders the docker-compose manifest with the requested
// options, runs the compose project on the host, and records the operation and
// resulting instance state.
package apps

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"
)

// OperationStatus models the lifecycle of an install/uninstall operation. The
// statuses form a strict linear machine; transition is the single gate for all
// writes to an operation's status/progress/message.
type OperationStatus string

const (
	OperationQueued    OperationStatus = "queued"
	OperationRunning   OperationStatus = "running"
	OperationSucceeded OperationStatus = "succeeded"
	OperationFailed    OperationStatus = "failed"
)

const (
	OperationKindInstall   = "install"
	OperationKindUpdate    = "update"
	OperationKindEdit      = "edit"
	OperationKindRemove    = "remove"
	OperationKindUninstall = "uninstall"
)

var (
	// ErrApplicationNotFound proxies the manifest source miss.
	ErrApplicationNotFound = errors.New("aplicativo não encontrado")
	// ErrAlreadyInstalled guards idempotent re-installs.
	ErrAlreadyInstalled = errors.New("aplicativo já está instalado")
	// ErrInstallInProgress guards a second install while one is running.
	ErrInstallInProgress = errors.New("uma instalação já está em andamento")
	// ErrInvalidOptions reports an invalid install request.
	ErrInvalidOptions = errors.New("opções de instalação inválidas")
	// ErrUnsupportedMode reports an install mode outside the supported set.
	ErrUnsupportedMode = errors.New("modo de instalação não suportado")
	// ErrFinalOperation reports writes to a finished operation.
	ErrFinalOperation = errors.New("operação já finalizada")
	// ErrPortMapRequired is raised when a host port is requested but the
	// manifest does not declare entrypoint.portMap.
	ErrPortMapRequired = errors.New("manifesto não define entrypoint.portMap para expor uma porta")
	// ErrVolumeUnsupported is raised when a volume is requested but the
	// manifest declares no volumes to retarget.
	ErrVolumeUnsupported = errors.New("manifesto não suporta customização de volume")
	// ErrInvalidTransition is raised by an illegal status change.
	ErrInvalidTransition = errors.New("transição de status inválida")
	// ErrNotInstalled guards updates/edits/removes against apps with no
	// installed instance.
	ErrNotInstalled = errors.New("aplicativo não está instalado")
	// ErrUpdateInProgress guards a second update while one is running.
	ErrUpdateInProgress = errors.New("uma atualização já está em andamento")
	// ErrEditInProgress guards a second edit while one is running.
	ErrEditInProgress = errors.New("uma edição já está em andamento")
	// ErrRemoveInProgress guards a second remove while one is running.
	ErrRemoveInProgress = errors.New("uma remoção já está em andamento")
	// ErrRemoveNeedsConfirmation is raised when a remove request confirms
	// nothing destructive.
	ErrRemoveNeedsConfirmation = errors.New("remoção requer confirmação")
)

// transitions defines the only legal OperationStatus moves.
var transitions = map[OperationStatus]map[OperationStatus]bool{
	OperationQueued: {
		OperationRunning: true,
		OperationFailed:  true,
	},
	OperationRunning: {
		OperationSucceeded: true,
		OperationFailed:    true,
	},
	OperationSucceeded: {},
	OperationFailed:    {},
}

// operationProgress validates the progress range (0-100).
func operationProgress(progress int) error {
	if progress < 0 || progress > 100 {
		return fmt.Errorf("%w: progress fora do intervalo 0-100", ErrInvalidOptions)
	}
	return nil
}

func transition(from, to OperationStatus) error {
	if !transitions[from][to] {
		return fmt.Errorf("%w: %s -> %s", ErrInvalidTransition, from, to)
	}
	return nil
}

// IsFinal reports whether an operation status is terminal.
func IsFinal(status OperationStatus) bool {
	return status == OperationSucceeded || status == OperationFailed
}

// Operation is the durable record of one install/uninstall attempt.
type Operation struct {
	ID          string
	AppID       string
	Kind        string
	Status      OperationStatus
	Progress    int
	Message     string
	CreatedAt   time.Time
	CompletedAt *time.Time
	Error       string
}

func newOperationID() string {
	bytes := make([]byte, 8)
	if _, err := rand.Read(bytes); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(bytes)
}
