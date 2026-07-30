package system

import (
	"context"
	"fmt"
	"math"
	"runtime"
	"strings"

	"github.com/shirou/gopsutil/v4/sensors"
)

type TemperatureValue struct {
	Celsius float64
	Sensor  string
}

type TemperatureSnapshot struct {
	CPU *TemperatureValue
	GPU *TemperatureValue
}

type TemperatureCollector struct {
	readSensors func(context.Context) ([]sensors.TemperatureStat, error)
	goos        string
}

func NewTemperatureCollector() *TemperatureCollector {
	return &TemperatureCollector{
		readSensors: sensors.TemperaturesWithContext,
		goos:        runtime.GOOS,
	}
}

func (collector *TemperatureCollector) Read(
	context context.Context,
) (TemperatureSnapshot, error) {
	readings, err := collector.readSensors(context)
	snapshot := selectTemperatures(readings, collector.goos)

	if snapshot.CPU != nil || snapshot.GPU != nil {
		return snapshot, nil
	}

	if err != nil {
		return snapshot, fmt.Errorf("failed to read temperature sensors: %w", err)
	}

	return snapshot, nil
}

type sensorRole int

const (
	sensorUnknown sensorRole = iota
	sensorCPU
	sensorGPU
)

func selectTemperatures(
	readings []sensors.TemperatureStat,
	goos string,
) TemperatureSnapshot {
	var snapshot TemperatureSnapshot
	var hottestUnknown *TemperatureValue

	for _, reading := range readings {
		if !validTemperature(reading.Temperature) {
			continue
		}

		value := &TemperatureValue{
			Celsius: reading.Temperature,
			Sensor:  reading.SensorKey,
		}

		switch classifySensor(reading.SensorKey) {
		case sensorCPU:
			snapshot.CPU = hottest(snapshot.CPU, value)
		case sensorGPU:
			snapshot.GPU = hottest(snapshot.GPU, value)
		default:
			hottestUnknown = hottest(hottestUnknown, value)
		}
	}

	// Apple Silicon exposes SoC temperature products whose names vary between
	// generations. When none can be classified, the hottest real sensor is the
	// safest CPU/SoC representation. It must not be duplicated as a GPU value.
	if goos == "darwin" && snapshot.CPU == nil {
		snapshot.CPU = hottestUnknown
	}

	return snapshot
}

func classifySensor(sensorKey string) sensorRole {
	key := strings.ToLower(strings.TrimSpace(sensorKey))

	if strings.HasPrefix(key, "tg") ||
		containsAny(key, "gpu", "graphics", "amdgpu", "nouveau") {
		return sensorGPU
	}

	if strings.HasPrefix(key, "tc") ||
		containsAny(
			key,
			"cpu",
			"coretemp",
			"k10temp",
			"package",
			"tdie",
			"tctl",
			"x86_pkg",
			"soc_thermal",
		) {
		return sensorCPU
	}

	return sensorUnknown
}

func containsAny(value string, candidates ...string) bool {
	for _, candidate := range candidates {
		if strings.Contains(value, candidate) {
			return true
		}
	}

	return false
}

func validTemperature(value float64) bool {
	return value > 0 &&
		value < 150 &&
		!math.IsNaN(value) &&
		!math.IsInf(value, 0)
}

func hottest(
	current *TemperatureValue,
	candidate *TemperatureValue,
) *TemperatureValue {
	if current == nil || candidate.Celsius > current.Celsius {
		return candidate
	}

	return current
}
