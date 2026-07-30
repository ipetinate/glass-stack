package system

import (
	"context"
	"errors"
	"testing"

	"github.com/shirou/gopsutil/v4/sensors"
)

func TestSelectTemperaturesOnLinux(t *testing.T) {
	snapshot := selectTemperatures(
		[]sensors.TemperatureStat{
			{SensorKey: "coretemp_package_id_0", Temperature: 62},
			{SensorKey: "coretemp_core_0", Temperature: 58},
			{SensorKey: "amdgpu_edge", Temperature: 54},
			{SensorKey: "nvme_composite", Temperature: 47},
		},
		"linux",
	)

	assertTemperature(t, snapshot.CPU, 62, "coretemp_package_id_0")
	assertTemperature(t, snapshot.GPU, 54, "amdgpu_edge")
}

func TestSelectTemperaturesOnAppleSilicon(t *testing.T) {
	snapshot := selectTemperatures(
		[]sensors.TemperatureStat{
			{SensorKey: "PMU tdie1", Temperature: 48},
			{SensorKey: "PMU tdie2", Temperature: 52},
			{SensorKey: "Battery", Temperature: 31},
		},
		"darwin",
	)

	assertTemperature(t, snapshot.CPU, 52, "PMU tdie2")

	if snapshot.GPU != nil {
		t.Fatalf("expected GPU temperature to be unavailable, got %+v", snapshot.GPU)
	}
}

func TestSelectTemperaturesOnIntelMac(t *testing.T) {
	snapshot := selectTemperatures(
		[]sensors.TemperatureStat{
			{SensorKey: "TC0D", Temperature: 67},
			{SensorKey: "TG0D", Temperature: 61},
			{SensorKey: "TA0P", Temperature: 29},
		},
		"darwin",
	)

	assertTemperature(t, snapshot.CPU, 67, "TC0D")
	assertTemperature(t, snapshot.GPU, 61, "TG0D")
}

func TestSelectTemperaturesIgnoresInvalidReadings(t *testing.T) {
	snapshot := selectTemperatures(
		[]sensors.TemperatureStat{
			{SensorKey: "cpu", Temperature: 0},
			{SensorKey: "gpu", Temperature: -1},
			{SensorKey: "coretemp", Temperature: 180},
		},
		"linux",
	)

	if snapshot.CPU != nil || snapshot.GPU != nil {
		t.Fatalf("expected invalid readings to be ignored, got %+v", snapshot)
	}
}

func TestTemperatureCollectorReturnsPartialReadingsDespiteWarnings(
	t *testing.T,
) {
	collector := &TemperatureCollector{
		goos: "linux",
		readSensors: func(
			context.Context,
		) ([]sensors.TemperatureStat, error) {
			return []sensors.TemperatureStat{
				{SensorKey: "cpu_thermal", Temperature: 49},
			}, errors.New("one sensor could not be read")
		},
	}

	snapshot, err := collector.Read(context.Background())

	if err != nil {
		t.Fatalf("expected valid partial readings, got error %v", err)
	}

	assertTemperature(t, snapshot.CPU, 49, "cpu_thermal")
}

func assertTemperature(
	t *testing.T,
	value *TemperatureValue,
	expected float64,
	sensor string,
) {
	t.Helper()

	if value == nil {
		t.Fatal("expected temperature to be available")
	}

	if value.Celsius != expected {
		t.Fatalf("expected temperature %.2f, got %.2f", expected, value.Celsius)
	}

	if value.Sensor != sensor {
		t.Fatalf("expected sensor %q, got %q", sensor, value.Sensor)
	}
}
