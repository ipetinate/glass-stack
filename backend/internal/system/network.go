package system

import (
	"context"
	"strings"

	gopsutilnet "github.com/shirou/gopsutil/v4/net"
)

type NetworkIOCounters struct {
	ReceivedBytes uint64
	SentBytes     uint64
}

func readNetworkIO(context context.Context) (NetworkIOCounters, error) {
	stats, err := gopsutilnet.IOCountersWithContext(context, true)
	if err != nil {
		return NetworkIOCounters{}, err
	}

	var counters NetworkIOCounters

	for _, stat := range stats {
		if isLoopbackInterface(stat.Name) {
			continue
		}

		counters.ReceivedBytes += stat.BytesRecv
		counters.SentBytes += stat.BytesSent
	}

	return counters, nil
}

func isLoopbackInterface(name string) bool {
	normalized := strings.ToLower(strings.TrimSpace(name))

	return normalized == "lo" || strings.HasPrefix(normalized, "lo0")
}
