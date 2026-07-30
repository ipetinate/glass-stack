package system

import (
	"testing"

	"github.com/shirou/gopsutil/v4/cpu"
)

func TestCPUUsagePercent(t *testing.T) {
	previous := cpu.TimesStat{
		User:   20,
		System: 10,
		Idle:   70,
	}
	current := cpu.TimesStat{
		User:   25,
		System: 15,
		Idle:   80,
	}

	if actual := cpuUsagePercent(previous, current); actual != 50 {
		t.Fatalf("expected 50%% CPU usage, got %.2f", actual)
	}
}

func TestCPUUsagePercentClampsCounterReset(t *testing.T) {
	previous := cpu.TimesStat{User: 20, Idle: 80}
	current := cpu.TimesStat{User: 10, Idle: 40}

	if actual := cpuUsagePercent(previous, current); actual != 0 {
		t.Fatalf("expected reset counter to produce 0%%, got %.2f", actual)
	}
}
