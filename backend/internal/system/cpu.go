package system

import (
	"context"
	"errors"
	"math"
	"sync"

	"github.com/shirou/gopsutil/v4/cpu"
)

type CPUUsageSnapshot struct {
	Overall *float64
	PerCore []float64
}

type CPUCollector struct {
	readTimes func(context.Context, bool) ([]cpu.TimesStat, error)
	mu        sync.Mutex
	previous  *cpu.TimesStat
	perCore   []cpu.TimesStat
}

func NewCPUCollector() *CPUCollector {
	return &CPUCollector{readTimes: cpu.TimesWithContext}
}

func (collector *CPUCollector) Read(context context.Context) (CPUUsageSnapshot, error) {
	collector.mu.Lock()
	defer collector.mu.Unlock()

	overallTimes, overallErr := collector.readTimes(context, false)
	perCoreTimes, perCoreErr := collector.readTimes(context, true)

	if overallErr != nil && perCoreErr != nil {
		return CPUUsageSnapshot{}, errors.Join(overallErr, perCoreErr)
	}

	var snapshot CPUUsageSnapshot
	if len(overallTimes) > 0 {
		current := overallTimes[0]
		if collector.previous != nil {
			value := cpuUsagePercent(*collector.previous, current)
			snapshot.Overall = &value
		}
		collector.previous = &current
	}

	if len(perCoreTimes) > 0 && len(perCoreTimes) == len(collector.perCore) {
		snapshot.PerCore = make([]float64, len(perCoreTimes))
		for index, current := range perCoreTimes {
			snapshot.PerCore[index] = cpuUsagePercent(
				collector.perCore[index],
				current,
			)
		}
	}
	if len(perCoreTimes) > 0 {
		collector.perCore = append(collector.perCore[:0], perCoreTimes...)
	}

	if overallErr != nil {
		return snapshot, overallErr
	}
	return snapshot, perCoreErr
}

func cpuUsagePercent(previous, current cpu.TimesStat) float64 {
	previousTotal, previousBusy := cpuTimes(previous)
	currentTotal, currentBusy := cpuTimes(current)

	totalDelta := currentTotal - previousTotal
	busyDelta := currentBusy - previousBusy
	if totalDelta <= 0 || busyDelta <= 0 {
		return 0
	}

	return math.Min(100, math.Max(0, busyDelta/totalDelta*100))
}

func cpuTimes(value cpu.TimesStat) (total float64, busy float64) {
	total = value.User + value.System + value.Idle + value.Nice +
		value.Iowait + value.Irq + value.Softirq + value.Steal +
		value.Guest + value.GuestNice

	if value.CPU != "" {
		total -= value.Guest + value.GuestNice
	}

	busy = total - value.Idle - value.Iowait
	return total, busy
}
