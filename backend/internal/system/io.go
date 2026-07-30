package system

import (
	"context"
	"errors"
	"fmt"
)

type IOSnapshot struct {
	Disk    *DiskIOCounters
	Memory  *MemoryCounters
	Network *NetworkIOCounters
}

type IOCollector struct {
	readDisk    func(context.Context) (DiskIOCounters, error)
	readMemory  func(context.Context) (MemoryCounters, error)
	readNetwork func(context.Context) (NetworkIOCounters, error)
}

func NewIOCollector() *IOCollector {
	return &IOCollector{
		readDisk:    readDiskIO,
		readMemory:  readMemory,
		readNetwork: readNetworkIO,
	}
}

func (collector *IOCollector) Read(context context.Context) (IOSnapshot, error) {
	var snapshot IOSnapshot
	var collectionErrors []error

	diskCounters, err := collector.readDisk(context)
	if err != nil {
		collectionErrors = append(
			collectionErrors,
			fmt.Errorf("disk I/O: %w", err),
		)
	} else {
		snapshot.Disk = &diskCounters
	}

	memoryCounters, err := collector.readMemory(context)
	if err != nil {
		collectionErrors = append(
			collectionErrors,
			fmt.Errorf("memory: %w", err),
		)
	} else {
		snapshot.Memory = &memoryCounters
	}

	networkCounters, err := collector.readNetwork(context)
	if err != nil {
		collectionErrors = append(
			collectionErrors,
			fmt.Errorf("network I/O: %w", err),
		)
	} else {
		snapshot.Network = &networkCounters
	}

	return snapshot, errors.Join(collectionErrors...)
}
