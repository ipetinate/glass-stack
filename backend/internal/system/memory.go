package system

import (
	"context"

	"github.com/shirou/gopsutil/v4/mem"
)

type MemoryCounters struct {
	TotalBytes     uint64
	UsedBytes      uint64
	AvailableBytes uint64
	UsedPercent    float64
}

func readMemory(context context.Context) (MemoryCounters, error) {
	stats, err := mem.VirtualMemoryWithContext(context)
	if err != nil {
		return MemoryCounters{}, err
	}

	return MemoryCounters{
		TotalBytes:     stats.Total,
		UsedBytes:      stats.Used,
		AvailableBytes: stats.Available,
		UsedPercent:    stats.UsedPercent,
	}, nil
}
