package system

import (
	"context"
	"errors"
	"testing"
)

func TestIOCollectorKeepsAvailableMetricsWhenOneSourceFails(t *testing.T) {
	collector := &IOCollector{
		readDisk: func(context.Context) (DiskIOCounters, error) {
			return DiskIOCounters{}, errors.New("disk unavailable")
		},
		readMemory: func(context.Context) (MemoryCounters, error) {
			return MemoryCounters{UsedBytes: 42}, nil
		},
		readNetwork: func(context.Context) (NetworkIOCounters, error) {
			return NetworkIOCounters{ReceivedBytes: 84}, nil
		},
	}

	snapshot, err := collector.Read(context.Background())

	if err == nil {
		t.Fatal("expected partial collection error")
	}

	if snapshot.Disk != nil {
		t.Fatal("expected unavailable disk metrics")
	}

	if snapshot.Memory == nil || snapshot.Memory.UsedBytes != 42 {
		t.Fatalf("expected memory metrics, got %#v", snapshot.Memory)
	}

	if snapshot.Network == nil || snapshot.Network.ReceivedBytes != 84 {
		t.Fatalf("expected network metrics, got %#v", snapshot.Network)
	}
}

func TestIncludeDiskDeviceFiltersLinuxPartitionsAndVirtualDevices(t *testing.T) {
	excluded := []string{
		"loop0",
		"zram0",
		"dm-0",
		"sda1",
		"nvme0n1p2",
		"mmcblk0p1",
	}

	for _, name := range excluded {
		if includeDiskDevice(name, "linux") {
			t.Fatalf("expected %q to be excluded", name)
		}
	}

	for _, name := range []string{"sda", "nvme0n1", "mmcblk0"} {
		if !includeDiskDevice(name, "linux") {
			t.Fatalf("expected %q to be included", name)
		}
	}

	if !includeDiskDevice("disk0", "darwin") {
		t.Fatal("expected macOS whole disk to be included")
	}
}

func TestIsLoopbackInterface(t *testing.T) {
	for _, name := range []string{"lo", "lo0"} {
		if !isLoopbackInterface(name) {
			t.Fatalf("expected %q to be loopback", name)
		}
	}

	if isLoopbackInterface("en0") {
		t.Fatal("expected en0 not to be loopback")
	}
}
