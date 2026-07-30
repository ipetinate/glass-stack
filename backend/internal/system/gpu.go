package system

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"strings"
)

type GPUUsageSnapshot struct {
	UsagePercent    *float64
	RendererPercent *float64
	TilerPercent    *float64
}

type GPUCollector struct {
	readUsage func(context.Context) (GPUUsageSnapshot, error)
}

func NewGPUCollector() *GPUCollector {
	return &GPUCollector{readUsage: readGPUUsage}
}

func (collector *GPUCollector) Read(context context.Context) (GPUUsageSnapshot, error) {
	return collector.readUsage(context)
}

type GPUHardware struct {
	Vendor string
	Model  string
}

func readGPUUsage(context context.Context) (GPUUsageSnapshot, error) {
	switch runtime.GOOS {
	case "darwin":
		return readDarwinGPUUsage(context)
	case "linux":
		return readLinuxGPUUsage()
	default:
		return GPUUsageSnapshot{}, nil
	}
}

func readLinuxGPUUsage() (GPUUsageSnapshot, error) {
	paths, err := filepath.Glob("/sys/class/drm/card*/device/gpu_busy_percent")
	if err != nil {
		return GPUUsageSnapshot{}, err
	}

	var total float64
	var count int
	for _, path := range paths {
		value, readErr := os.ReadFile(path)
		if readErr != nil {
			continue
		}
		usage, parseErr := strconv.ParseFloat(strings.TrimSpace(string(value)), 64)
		if parseErr != nil || usage < 0 || usage > 100 {
			continue
		}
		total += usage
		count++
	}

	if count == 0 {
		return GPUUsageSnapshot{}, nil
	}

	usage := total / float64(count)
	return GPUUsageSnapshot{UsagePercent: &usage}, nil
}

var darwinGPUUtilizationPattern = regexp.MustCompile(
	`<key>(Device|Renderer|Tiler) Utilization %</key>\s*<(?:integer|real)>([-+]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+))</(?:integer|real)>`,
)
var darwinGPUPlainUtilizationPattern = regexp.MustCompile(
	`"((Device|Renderer|Tiler) Utilization %)"\s*=\s*([-+]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+))`,
)

// readDarwinGPUUsage reads the Apple GPU driver's public IORegistry metrics.
// This works for both Intel and Apple Silicon without requiring powermetrics
// (which requires elevated privileges on most macOS installations).
func readDarwinGPUUsage(context context.Context) (GPUUsageSnapshot, error) {
	output, err := runCommand(
		context,
		"ioreg",
		"-r",
		"-d",
		"1",
		"-c",
		"IOAccelerator",
	)
	if err != nil {
		return GPUUsageSnapshot{}, err
	}

	return parseDarwinGPUUsage(output), nil
}

func parseDarwinGPUUsage(output []byte) GPUUsageSnapshot {
	var snapshot GPUUsageSnapshot
	// The plain ioreg representation is the most reliable form on Apple
	// Silicon: it exposes the current PerformanceStatistics dictionary without
	// the XML serialization occasionally returning a stale zero sample.
	snapshot = mergeDarwinGPUUsage(snapshot, darwinGPUPlainUtilizationPattern.FindAllSubmatch(output, -1))
	// Keep XML parsing as a compatibility fallback for older macOS releases and
	// for callers/tests that provide the serialized IORegistry form.
	if snapshot.UsagePercent == nil && snapshot.RendererPercent == nil && snapshot.TilerPercent == nil {
		snapshot = mergeDarwinGPUUsage(snapshot, darwinGPUUtilizationPattern.FindAllSubmatch(output, -1))
	}
	return snapshot
}

func mergeDarwinGPUUsage(snapshot GPUUsageSnapshot, matches [][][]byte) GPUUsageSnapshot {
	for _, match := range matches {
		valueIndex := 2
		if len(match) == 4 {
			valueIndex = 3
		}
		usage, err := strconv.ParseFloat(string(match[valueIndex]), 64)
		if err != nil || usage < 0 || usage > 100 {
			continue
		}
		value := usage
		name := string(match[1])
		if len(match) == 4 {
			name = string(match[2])
		}
		switch name {
		case "Device":
			snapshot.UsagePercent = mergeGPUValue(snapshot.UsagePercent, value)
		case "Renderer":
			snapshot.RendererPercent = mergeGPUValue(snapshot.RendererPercent, value)
		case "Tiler":
			snapshot.TilerPercent = mergeGPUValue(snapshot.TilerPercent, value)
		}
	}
	return snapshot
}

func mergeGPUValue(current *float64, next float64) *float64 {
	if current == nil {
		return &next
	}
	merged := (*current + next) / 2
	return &merged
}

func readGPUHardware(context context.Context) (*GPUHardware, error) {
	if runtime.GOOS != "darwin" {
		return nil, nil
	}

	output, err := runCommand(context, "system_profiler", "SPDisplaysDataType", "-json")
	if err != nil {
		return nil, err
	}

	var payload struct {
		Displays []map[string]any `json:"SPDisplaysDataType"`
	}
	if err := json.Unmarshal(output, &payload); err != nil {
		return nil, fmt.Errorf("decode display information: %w", err)
	}
	if len(payload.Displays) == 0 {
		return nil, nil
	}

	display := payload.Displays[0]
	return &GPUHardware{
		Vendor: firstString(display, "sppci_vendor", "spdisplays_vendor"),
		Model:  firstString(display, "sppci_model", "_name", "spdisplays_chipset-model"),
	}, nil
}

func firstString(values map[string]any, keys ...string) string {
	for _, key := range keys {
		if value, ok := values[key].(string); ok && value != "" {
			return value
		}
	}
	return ""
}
