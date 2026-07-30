package host

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/ipetinate/glass-stack/backend/internal/events"
	systeminfo "github.com/ipetinate/glass-stack/backend/internal/system"
)

type TemperatureReader interface {
	Read(context.Context) (systeminfo.TemperatureSnapshot, error)
}

type IOReader interface {
	Read(context.Context) (systeminfo.IOSnapshot, error)
}

type CPUReader interface {
	Read(context.Context) (systeminfo.CPUUsageSnapshot, error)
}

type GPUReader interface {
	Read(context.Context) (systeminfo.GPUUsageSnapshot, error)
}

type MetricsService struct {
	temperatureReader TemperatureReader
	ioReader          IOReader
	cpuReader         CPUReader
	gpuReader         GPUReader
}

func NewMetricsService(
	temperatureReader TemperatureReader,
	ioReader IOReader,
	cpuReader CPUReader,
	gpuReader GPUReader,
) *MetricsService {
	return &MetricsService{
		temperatureReader: temperatureReader,
		ioReader:          ioReader,
		cpuReader:         cpuReader,
		gpuReader:         gpuReader,
	}
}

// Run samples host adapters once per interval and publishes one event per
// metric family. All events from a sample share one timestamp so consumers can
// treat them as a single snapshot.
func (service *MetricsService) Run(
	context context.Context,
	publisher events.Publisher,
	interval time.Duration,
) error {
	if interval <= 0 {
		interval = time.Second
	}

	previousIO, previousIOAt := service.readIO(context)
	if err := service.publishSample(
		context,
		publisher,
		previousIO,
		previousIO,
		previousIOAt,
		previousIOAt,
		true,
	); err != nil {
		return err
	}

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-context.Done():
			return context.Err()
		case currentAt := <-ticker.C:
			currentIO, currentIOAt := service.readIO(context)
			if err := service.publishSample(
				context,
				publisher,
				previousIO,
				currentIO,
				previousIOAt,
				currentIOAt,
				false,
			); err != nil {
				return err
			}
			previousIO = currentIO
			previousIOAt = currentAt
		}
	}
}

func (service *MetricsService) publishSample(
	context context.Context,
	publisher events.Publisher,
	previousIO systeminfo.IOSnapshot,
	currentIO systeminfo.IOSnapshot,
	previousIOAt time.Time,
	currentIOAt time.Time,
	initial bool,
) error {
	at := currentIOAt.UTC()

	snapshot, err := service.temperatureReader.Read(context)
	if err != nil && context.Err() == nil {
		slog.Warn("failed to collect system temperatures", "error", err)
	}
	if err := publish(publisher, context, events.Event{
		Type:       "temperature",
		OccurredAt: at,
		Payload:    temperaturePayload(snapshot),
	}); err != nil {
		return err
	}

	cpuSnapshot, err := service.cpuReader.Read(context)
	if err != nil && context.Err() == nil {
		slog.Warn("failed to collect CPU usage", "error", err)
	}
	if err := publish(publisher, context, events.Event{
		Type:       "cpu",
		OccurredAt: at,
		Payload: CPUUsagePayload{
			Overall: cpuSnapshot.Overall,
			PerCore: cpuSnapshot.PerCore,
		},
	}); err != nil {
		return err
	}

	gpuSnapshot, err := service.gpuReader.Read(context)
	if err != nil && context.Err() == nil {
		slog.Warn("failed to collect GPU usage", "error", err)
	}
	if err := publish(publisher, context, events.Event{
		Type:       "gpu",
		OccurredAt: at,
		Payload: GPUUsagePayload{
			UsagePercent:    gpuSnapshot.UsagePercent,
			RendererPercent: gpuSnapshot.RendererPercent,
			TilerPercent:    gpuSnapshot.TilerPercent,
		},
	}); err != nil {
		return err
	}

	elapsed := currentIOAt.Sub(previousIOAt)
	if initial {
		elapsed = 0
	}
	return publish(publisher, context, events.Event{
		Type:       "io",
		OccurredAt: at,
		Payload:    ioPayload(previousIO, currentIO, elapsed),
	})
}

func publish(
	publisher events.Publisher,
	context context.Context,
	event events.Event,
) error {
	if err := publisher.Publish(context, event); err != nil {
		return errors.Join(errors.New("publish host metric event"), err)
	}
	return nil
}

func (service *MetricsService) readIO(
	context context.Context,
) (systeminfo.IOSnapshot, time.Time) {
	snapshot, err := service.ioReader.Read(context)
	if err != nil && context.Err() == nil {
		slog.Warn("failed to collect some system I/O metrics", "error", err)
	}
	return snapshot, time.Now().UTC()
}

type TemperaturePayload struct {
	CPU       *float64 `json:"cpu"`
	GPU       *float64 `json:"gpu"`
	CPUSensor string   `json:"cpuSensor,omitempty"`
	GPUSensor string   `json:"gpuSensor,omitempty"`
}

type CPUUsagePayload struct {
	Overall *float64  `json:"overall"`
	PerCore []float64 `json:"perCore"`
}

type GPUUsagePayload struct {
	UsagePercent    *float64 `json:"usagePercent"`
	RendererPercent *float64 `json:"rendererPercent"`
	TilerPercent    *float64 `json:"tilerPercent"`
}

type IOPayload struct {
	Disk    IOThroughputPayload `json:"disk"`
	Memory  MemoryPayload       `json:"memory"`
	Network IOThroughputPayload `json:"network"`
}

type IOThroughputPayload struct {
	ReadBytesPerSecond  *float64 `json:"readBytesPerSecond"`
	WriteBytesPerSecond *float64 `json:"writeBytesPerSecond"`
}

type MemoryPayload struct {
	TotalBytes     *uint64  `json:"totalBytes"`
	UsedBytes      *uint64  `json:"usedBytes"`
	AvailableBytes *uint64  `json:"availableBytes"`
	UsedPercent    *float64 `json:"usedPercent"`
}

func temperaturePayload(snapshot systeminfo.TemperatureSnapshot) TemperaturePayload {
	payload := TemperaturePayload{}
	if snapshot.CPU != nil {
		celsius := snapshot.CPU.Celsius
		payload.CPU = &celsius
		payload.CPUSensor = snapshot.CPU.Sensor
	}
	if snapshot.GPU != nil {
		celsius := snapshot.GPU.Celsius
		payload.GPU = &celsius
		payload.GPUSensor = snapshot.GPU.Sensor
	}
	return payload
}

func ioPayload(
	previous systeminfo.IOSnapshot,
	current systeminfo.IOSnapshot,
	elapsed time.Duration,
) IOPayload {
	payload := IOPayload{}
	if current.Disk != nil {
		payload.Disk.ReadBytesPerSecond = bytesPerSecond(previousDiskValue(previous.Disk, true), current.Disk.ReadBytes, elapsed)
		payload.Disk.WriteBytesPerSecond = bytesPerSecond(previousDiskValue(previous.Disk, false), current.Disk.WriteBytes, elapsed)
	}
	if current.Memory != nil {
		totalBytes := current.Memory.TotalBytes
		usedBytes := current.Memory.UsedBytes
		availableBytes := current.Memory.AvailableBytes
		usedPercent := current.Memory.UsedPercent
		payload.Memory.TotalBytes = &totalBytes
		payload.Memory.UsedBytes = &usedBytes
		payload.Memory.AvailableBytes = &availableBytes
		payload.Memory.UsedPercent = &usedPercent
	}
	if current.Network != nil {
		payload.Network.ReadBytesPerSecond = bytesPerSecond(previousNetworkValue(previous.Network, true), current.Network.ReceivedBytes, elapsed)
		payload.Network.WriteBytesPerSecond = bytesPerSecond(previousNetworkValue(previous.Network, false), current.Network.SentBytes, elapsed)
	}
	return payload
}

// IOPayloadFromSnapshots converts cumulative host counters into the API-ready
// metric payload used by the event publisher.
func IOPayloadFromSnapshots(
	previous systeminfo.IOSnapshot,
	current systeminfo.IOSnapshot,
	elapsed time.Duration,
) IOPayload {
	return ioPayload(previous, current, elapsed)
}

func previousDiskValue(previous *systeminfo.DiskIOCounters, read bool) *uint64 {
	if previous == nil {
		return nil
	}
	if read {
		return &previous.ReadBytes
	}
	return &previous.WriteBytes
}

func previousNetworkValue(previous *systeminfo.NetworkIOCounters, received bool) *uint64 {
	if previous == nil {
		return nil
	}
	if received {
		return &previous.ReceivedBytes
	}
	return &previous.SentBytes
}

func bytesPerSecond(previous *uint64, current uint64, elapsed time.Duration) *float64 {
	rate := float64(0)
	if previous != nil && current >= *previous && elapsed > 0 {
		rate = float64(current-*previous) / elapsed.Seconds()
	}
	return &rate
}
