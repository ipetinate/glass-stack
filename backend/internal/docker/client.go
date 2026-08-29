package docker

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/events"
	dockerclient "github.com/docker/docker/client"
	"github.com/docker/docker/pkg/stdcopy"
	"github.com/docker/go-connections/nat"
)

// Engine wraps the official Docker Engine API client. Read/control operations
// go through this adapter; apply operations go through ComposeRunner.
type Engine struct {
	client *dockerclient.Client
	host   string
}

// Dial tries each candidate engine target in order and returns the first one
// that answers a Ping within the timeout, mirroring how docker contexts are
// selected on the host.
func Dial(candidates []string, timeout time.Duration) (*Engine, error) {
	if len(candidates) == 0 {
		candidates = Candidates("")
	}
	var lastErr error
	for _, host := range candidates {
		engine, err := newEngine(host)
		if err != nil {
			lastErr = err
			continue
		}
		ctx, cancel := context.WithTimeout(context.Background(), timeout)
		pingErr := engine.Ping(ctx)
		cancel()
		if pingErr == nil {
			return engine, nil
		}
		lastErr = fmt.Errorf("%s: %w", host, pingErr)
	}
	return nil, fmt.Errorf(
		"docker engine unreachable (tried %s): %w",
		strings.Join(candidates, ", "),
		lastErr,
	)
}

func newEngine(host string) (*Engine, error) {
	client, err := dockerclient.NewClientWithOpts(
		dockerclient.WithHost(host),
		dockerclient.WithAPIVersionNegotiation(),
	)
	if err != nil {
		return nil, err
	}
	return &Engine{client: client, host: host}, nil
}

// Host returns the engine target this Engine is connected to.
func (engine *Engine) Host() string {
	return engine.host
}

// Ping verifies the daemon is reachable and negotiates the API version.
func (engine *Engine) Ping(ctx context.Context) error {
	_, err := engine.client.Ping(ctx)
	return err
}

// Info returns a normalized engine version/capability snapshot.
func (engine *Engine) Info(ctx context.Context) (EngineInfo, error) {
	info, err := engine.client.Info(ctx)
	if err != nil {
		return EngineInfo{}, err
	}
	return EngineInfo{
		ServerVersion:     info.ServerVersion,
		APIVersion:        engine.client.ClientVersion(),
		Architecture:      info.Architecture,
		OS:                info.OSType,
		ContainersTotal:   info.Containers,
		ContainersRunning: info.ContainersRunning,
	}, nil
}

// ListContainers returns all containers (running and stopped) as normalized
// records sorted by age.
func (engine *Engine) ListContainers(ctx context.Context) ([]ContainerRecord, error) {
	containers, err := engine.client.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		return nil, err
	}
	records := make([]ContainerRecord, 0, len(containers))
	for _, item := range containers {
		record := ContainerRecord{
			ID:        item.ID,
			Image:     item.Image,
			CreatedAt: time.Unix(item.Created, 0).UTC(),
			Labels:    item.Labels,
		}
		if len(item.Names) > 0 {
			record.Name = strings.TrimPrefix(item.Names[0], "/")
		}
		record.State = item.State
		record.Status = item.Status
		for _, port := range item.Ports {
			record.Ports = append(record.Ports, PortBinding{
				HostIP:        port.IP,
				HostPort:      formatHostPort(port.PublicPort),
				ContainerPort: port.PrivatePort,
				Protocol:      port.Type,
			})
		}
		records = append(records, record)
	}
	return records, nil
}

func formatHostPort(port uint16) string {
	if port == 0 {
		return ""
	}
	return strconv.FormatUint(uint64(port), 10)
}

// InspectContainer returns the normalized detail for one container.
func (engine *Engine) InspectContainer(ctx context.Context, id string) (ContainerDetail, error) {
	inspect, err := engine.client.ContainerInspect(ctx, id)
	if err != nil {
		return ContainerDetail{}, err
	}
	detail := ContainerDetail{
		ID:           inspect.ID,
		State:        containerState(inspect.State),
		RestartCount: inspect.RestartCount,
		Labels:       inspect.Config.Labels,
		CreatedAt:    parseTimestamp(inspect.Created),
	}
	if name := strings.TrimPrefix(inspect.Name, "/"); name != "" {
		detail.Name = name
	}
	if detail.Name == "" {
		detail.Name = inspect.ID
	}
	if config := inspect.Config; config != nil {
		detail.Image = config.Image
		detail.Command = config.Cmd
		detail.Entrypoint = config.Entrypoint
		detail.WorkingDir = config.WorkingDir
		detail.Environment = config.Env
	}
	if state := inspect.State; state != nil {
		detail.ExitCode = state.ExitCode
		detail.StartedAt = parseTimestamp(state.StartedAt)
		if state.Health != nil {
			detail.Health = state.Health.Status
		}
	}
	if hostConfig := inspect.HostConfig; hostConfig != nil {
		detail.NetworkMode = string(hostConfig.NetworkMode)
	}
	if settings := inspect.NetworkSettings; settings != nil {
		detail.IPAddress = firstNetworkIP(settings)
		detail.Ports = publishedPorts(settings.Ports)
	}
	for _, mount := range inspect.Mounts {
		detail.Mounts = append(detail.Mounts, ContainerMount{
			Type:        string(mount.Type),
			Source:      mount.Source,
			Destination: mount.Destination,
			ReadOnly:    !mount.RW,
		})
	}
	return detail, nil
}

// ContainerStart starts an existing container.
func (engine *Engine) ContainerStart(ctx context.Context, id string) error {
	return engine.client.ContainerStart(ctx, id, container.StartOptions{})
}

// ContainerStop stops an existing container.
func (engine *Engine) ContainerStop(ctx context.Context, id string) error {
	return engine.client.ContainerStop(ctx, id, container.StopOptions{})
}

// ContainerRestart restarts an existing container.
func (engine *Engine) ContainerRestart(ctx context.Context, id string) error {
	return engine.client.ContainerRestart(ctx, id, container.StopOptions{})
}

// ContainerLogs returns up to query.Tail lines of normalized recent log
// output from the container (stdout and stderr).
func (engine *Engine) ContainerLogs(ctx context.Context, id string, query LogQuery) ([]LogLine, error) {
	reader, err := engine.client.ContainerLogs(ctx, id, logsOptions(query, false))
	if err != nil {
		return nil, err
	}
	defer reader.Close()
	return demuxLogs(reader)
}

// ContainerLogStream streams normalized log lines to emit until the context is
// cancelled, the container stream ends, or emit returns an error.
func (engine *Engine) ContainerLogStream(
	ctx context.Context,
	id string,
	query LogQuery,
	emit func(LogLine) error,
) error {
	reader, err := engine.client.ContainerLogs(ctx, id, logsOptions(query, true))
	if err != nil {
		return err
	}
	defer reader.Close()
	return pumpLogStream(ctx, reader, emit)
}

func logsOptions(query LogQuery, follow bool) container.LogsOptions {
	options := container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Follow:     follow,
	}
	if query.Tail > 0 {
		options.Tail = strconv.Itoa(query.Tail)
	}
	return options
}

// ContainerStats returns a point-in-time resource snapshot (CPU, memory,
// network, block I/O, processes) for one container.
func (engine *Engine) ContainerStats(ctx context.Context, id string) (ContainerStats, error) {
	response, err := engine.client.ContainerStatsOneShot(ctx, id)
	if err != nil {
		return ContainerStats{}, err
	}
	defer response.Body.Close()
	var stats container.Stats
	if err := json.NewDecoder(response.Body).Decode(&stats); err != nil {
		return ContainerStats{}, err
	}
	return normalizeStats(id, &stats), nil
}

// EngineEvents streams normalized engine events to emit until the context is
// cancelled, the daemon closes the stream, or emit returns an error. The
// stream is the reconciliation source for containers surfaced by GlassStack.
func (engine *Engine) EngineEvents(
	ctx context.Context,
	emit func(EventMessage) error,
) error {
	messages, errs := engine.client.Events(ctx, events.ListOptions{})
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case err, ok := <-errs:
			if !ok {
				return nil
			}
			// The daemon closes the connection cleanly with EOF when the
			// event stream ends; anything else is a real error.
			if errors.Is(err, io.EOF) {
				return nil
			}
			if err != nil {
				return err
			}
		case message, ok := <-messages:
			if !ok {
				return nil
			}
			if err := emit(normalizeEvent(message)); err != nil {
				return err
			}
		}
	}
}

func normalizeStats(id string, stats *container.Stats) ContainerStats {
	result := ContainerStats{
		ID:         id,
		MeasuredAt: stats.Read.UTC(),
		Pids:       stats.PidsStats.Current,
	}
	if stats.MemoryStats.Limit > 0 {
		result.MemoryLimit = stats.MemoryStats.Limit
		result.MemoryUsed = stats.MemoryStats.Usage
		result.MemoryPercent = roundPercent(
			float64(stats.MemoryStats.Usage) / float64(stats.MemoryStats.Limit) * 100,
		)
	}
	if stats.CPUStats.CPUUsage.TotalUsage > stats.PreCPUStats.CPUUsage.TotalUsage &&
		stats.CPUStats.SystemUsage > stats.PreCPUStats.SystemUsage {
		cpuDelta := float64(stats.CPUStats.CPUUsage.TotalUsage - stats.PreCPUStats.CPUUsage.TotalUsage)
		systemDelta := float64(stats.CPUStats.SystemUsage - stats.PreCPUStats.SystemUsage)
		onlineCPUs := stats.CPUStats.OnlineCPUs
		if onlineCPUs == 0 {
			onlineCPUs = stats.NumProcs
		}
		if onlineCPUs > 0 && systemDelta > 0 {
			result.CPUPercent = roundPercent(cpuDelta / systemDelta * float64(onlineCPUs) * 100)
		}
	}
	for _, network := range stats.Networks {
		result.NetworkRx += network.RxBytes
		result.NetworkTx += network.TxBytes
	}
	for _, entry := range stats.BlkioStats.IoServiceBytesRecursive {
		switch entry.Op {
		case "read":
			result.BlockRead += entry.Value
		case "write":
			result.BlockWrite += entry.Value
		}
	}
	return result
}

func roundPercent(value float64) float64 {
	return math.Round(value*100) / 100
}

func normalizeEvent(message events.Message) EventMessage {
	actor := message.Actor.ID
	if len(actor) > 12 {
		actor = actor[:12]
	}
	return EventMessage{
		Type:   string(message.Type),
		Action: string(message.Action),
		Actor:  actor,
		Status: message.Status,
		Time:   time.Unix(message.Time, 0).UTC(),
	}
}

// demuxLogs reads the whole body (multiplexed or raw TTY) and returns the
// normalized stdout + stderr lines.
func demuxLogs(body io.Reader) ([]LogLine, error) {
	data, err := io.ReadAll(body)
	if err != nil {
		return nil, err
	}
	var stdout, stderr bytes.Buffer
	source := bytes.NewReader(data)
	if _, err := stdcopy.StdCopy(&stdout, &stderr, source); err != nil {
		// Not a multiplexed stream (e.g. a TTY container): treat the raw
		// body as stdout.
		stdout.Reset()
		_, _ = stdout.Write(data)
		stderr.Reset()
	}
	return mergeLogLines(&stdout, &stderr), nil
}

// pumpLogStream demultiplexes a live container log stream and emits one
// normalized line at a time until the body ends or ctx is cancelled.
func pumpLogStream(ctx context.Context, body io.Reader, emit func(LogLine) error) error {
	stdoutReader, stdoutWriter := io.Pipe()
	stderrReader, stderrWriter := io.Pipe()
	defer func() { _ = stdoutReader.Close() }()
	defer func() { _ = stderrReader.Close() }()

	copyDone := make(chan struct{})
	go func() {
		_, _ = stdcopy.StdCopy(stdoutWriter, stderrWriter, body)
		_ = stdoutWriter.Close()
		_ = stderrWriter.Close()
		close(copyDone)
	}()

	lines := make(chan LogLine, 256)
	go func() {
		defer close(lines)
		scan := func(stream string, source io.Reader) {
			scanner := bufio.NewScanner(source)
			for scanner.Scan() {
				line := strings.TrimRight(scanner.Text(), "\r")
				lines <- LogLine{Stream: stream, Line: line}
			}
		}
		stdoutDone := make(chan struct{})
		go func() {
			defer close(stdoutDone)
			scan("stdout", stdoutReader)
		}()
		scan("stderr", stderrReader)
		<-stdoutDone
		<-copyDone
	}()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case line, ok := <-lines:
			if !ok {
				return nil
			}
			if err := emit(line); err != nil {
				return err
			}
		}
	}
}

func mergeLogLines(stdout, stderr *bytes.Buffer) []LogLine {
	var lines []LogLine
	appendLines := func(stream string, data *bytes.Buffer) {
		scanner := bufio.NewScanner(data)
		for scanner.Scan() {
			line := strings.TrimRight(scanner.Text(), "\r")
			if line != "" {
				lines = append(lines, LogLine{Stream: stream, Line: line})
			}
		}
	}
	appendLines("stdout", stdout)
	appendLines("stderr", stderr)
	return lines
}

func containerState(state *container.State) string {
	if state == nil {
		return ""
	}
	return string(state.Status)
}

func parseTimestamp(value string) time.Time {
	if value == "" {
		return time.Time{}
	}
	parsed, err := time.Parse(time.RFC3339Nano, value)
	if err != nil {
		return time.Time{}
	}
	return parsed.UTC()
}

func firstNetworkIP(settings *container.NetworkSettings) string {
	if len(settings.Networks) == 0 {
		return ""
	}
	if network, ok := settings.Networks["default"]; ok && network != nil && network.IPAddress != "" {
		return network.IPAddress
	}
	for _, network := range settings.Networks {
		if network != nil && network.IPAddress != "" {
			return network.IPAddress
		}
	}
	return ""
}

func publishedPorts(ports nat.PortMap) []PortBinding {
	var result []PortBinding
	for containerPort, bindings := range ports {
		number, protocol := parsePortKey(string(containerPort))
		for _, binding := range bindings {
			hostPort := binding.HostPort
			if hostPort == "0" {
				hostPort = ""
			}
			result = append(result, PortBinding{
				HostIP:        binding.HostIP,
				HostPort:      hostPort,
				ContainerPort: number,
				Protocol:      protocol,
			})
		}
	}
	return result
}

func parsePortKey(value string) (uint16, string) {
	protocol := "tcp"
	if slash := strings.IndexByte(value, '/'); slash >= 0 {
		protocol = value[slash+1:]
		value = value[:slash]
	}
	number, err := strconv.ParseUint(value, 10, 16)
	if err != nil {
		return 0, protocol
	}
	return uint16(number), protocol
}
