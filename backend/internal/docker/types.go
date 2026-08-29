// Package docker adapts the Docker Engine API into GlassStack's normalized
// container model. It owns the connection details (engine host resolution and
// probing) and maps engine primitives to transport-friendly records.
package docker

import "time"

// EngineStatus is the connectivity and capability snapshot surfaced to the UI
// (status bar and docker module).
type EngineStatus struct {
	Connected         bool   `json:"connected"`
	ServerVersion     string `json:"serverVersion,omitempty"`
	APIVersion        string `json:"apiVersion,omitempty"`
	Architecture      string `json:"architecture,omitempty"`
	OS                string `json:"os,omitempty"`
	ComposeAvailable  bool   `json:"composeAvailable"`
	ContainersTotal   int    `json:"containersTotal"`
	ContainersRunning int    `json:"containersRunning"`
	Error             string `json:"error,omitempty"`
}

// EngineInfo is a normalized subset of the Docker Engine version/info payload.
type EngineInfo struct {
	ServerVersion     string `json:"serverVersion"`
	APIVersion        string `json:"apiVersion"`
	Architecture      string `json:"architecture"`
	OS                string `json:"os"`
	ContainersTotal   int    `json:"containersTotal"`
	ContainersRunning int    `json:"containersRunning"`
}

// ContainerRecord is the normalized representation of a container for listing
// and troubleshooting. The Docker engine remains the source of truth.
type ContainerRecord struct {
	ID        string            `json:"id"`
	Name      string            `json:"name"`
	Image     string            `json:"image"`
	State     string            `json:"state"`
	Status    string            `json:"status"`
	Ports     []PortBinding     `json:"ports,omitempty"`
	CreatedAt time.Time         `json:"createdAt"`
	Labels    map[string]string `json:"labels,omitempty"`
}

// PortBinding describes one published container port.
type PortBinding struct {
	HostIP        string `json:"ip,omitempty"`
	HostPort      string `json:"hostPort,omitempty"`
	ContainerPort uint16 `json:"containerPort"`
	Protocol      string `json:"protocol"`
}

// ContainerMount describes one volume or bind mount attached to a container.
type ContainerMount struct {
	Type        string `json:"type"`
	Source      string `json:"source,omitempty"`
	Destination string `json:"destination"`
	ReadOnly    bool   `json:"readOnly,omitempty"`
}

// ContainerDetail is the normalized container inspection payload.
type ContainerDetail struct {
	ID           string            `json:"id"`
	Name         string            `json:"name"`
	Image        string            `json:"image"`
	State        string            `json:"state"`
	Health       string            `json:"health,omitempty"`
	ExitCode     int               `json:"exitCode,omitempty"`
	RestartCount int               `json:"restartCount,omitempty"`
	NetworkMode  string            `json:"networkMode,omitempty"`
	IPAddress    string            `json:"ipAddress,omitempty"`
	Command      []string          `json:"command,omitempty"`
	Entrypoint   []string          `json:"entrypoint,omitempty"`
	WorkingDir   string            `json:"workingDir,omitempty"`
	Environment  []string          `json:"environment,omitempty"`
	Ports        []PortBinding     `json:"ports,omitempty"`
	Mounts       []ContainerMount  `json:"mounts,omitempty"`
	Labels       map[string]string `json:"labels,omitempty"`
	CreatedAt    time.Time         `json:"createdAt"`
	StartedAt    time.Time         `json:"startedAt"`
}

// LogQuery selects which container log lines to return or follow.
type LogQuery struct {
	Tail   int
	Follow bool
}

// LogLine is one normalized log line from a container stream.
type LogLine struct {
	Stream string `json:"stream"`
	Line   string `json:"line"`
}

// ContainerStats is a point-in-time resource snapshot for one container,
// normalized from the engine stats endpoint.
type ContainerStats struct {
	ID            string    `json:"id"`
	CPUPercent    float64   `json:"cpuPercent"`
	MemoryUsed    uint64    `json:"memoryUsed"`
	MemoryLimit   uint64    `json:"memoryLimit"`
	MemoryPercent float64   `json:"memoryPercent"`
	NetworkRx     uint64    `json:"networkRx"`
	NetworkTx     uint64    `json:"networkTx"`
	BlockRead     uint64    `json:"blockRead"`
	BlockWrite    uint64    `json:"blockWrite"`
	Pids          uint64    `json:"pids"`
	MeasuredAt    time.Time `json:"measuredAt"`
}

// EventMessage is one normalized Docker Engine event (container create/start/
// die/destroy, and so on), forwarded to UI clients via SSE.
type EventMessage struct {
	Type   string    `json:"type"`
	Action string    `json:"action"`
	Actor  string    `json:"actor,omitempty"`
	Status string    `json:"status,omitempty"`
	Time   time.Time `json:"time"`
}
