package system

import (
	"context"
	"regexp"
	"runtime"
	"strings"

	"github.com/shirou/gopsutil/v4/disk"
)

type StorageVolume struct {
	Device     string `json:"device"`
	Mountpoint string `json:"mountpoint"`
	Filesystem string `json:"filesystem"`
	TotalBytes uint64 `json:"totalBytes"`
	UsedBytes  uint64 `json:"usedBytes"`
	FreeBytes  uint64 `json:"freeBytes"`
}

type StorageDevice struct {
	Name        string   `json:"name"`
	Device      string   `json:"device"`
	Kind        string   `json:"kind"`
	Mountpoints []string `json:"mountpoints"`
}

type StorageSnapshot struct {
	Volumes []StorageVolume `json:"volumes"`
	Devices []StorageDevice `json:"devices"`
}

func ReadStorage(context context.Context) (StorageSnapshot, error) {
	partitions, err := disk.PartitionsWithContext(context, false)
	if err != nil {
		return StorageSnapshot{}, err
	}
	snapshot := StorageSnapshot{}
	seen := map[string]bool{}
	for _, partition := range partitions {
		if !includeStorageVolume(partition.Fstype, partition.Mountpoint) {
			continue
		}
		usage, usageErr := disk.UsageWithContext(context, partition.Mountpoint)
		if usageErr != nil || usage == nil {
			continue
		}
		snapshot.Volumes = append(snapshot.Volumes, StorageVolume{Device: partition.Device, Mountpoint: partition.Mountpoint, Filesystem: partition.Fstype, TotalBytes: usage.Total, UsedBytes: usage.Used, FreeBytes: usage.Free})
		device := physicalDeviceName(partition.Device, runtime.GOOS)
		if device != "" {
			if !seen[device] {
				seen[device] = true
				snapshot.Devices = append(snapshot.Devices, StorageDevice{Name: device, Device: device, Kind: storageDeviceKind(device), Mountpoints: []string{partition.Mountpoint}})
			} else {
				for index := range snapshot.Devices {
					if snapshot.Devices[index].Device == device {
						snapshot.Devices[index].Mountpoints = append(snapshot.Devices[index].Mountpoints, partition.Mountpoint)
						break
					}
				}
			}
		}
	}
	return snapshot, nil
}

func physicalDeviceName(device, goos string) string {
	name := strings.TrimPrefix(device, "/dev/")
	if goos == "darwin" {
		if match := regexp.MustCompile(`^(disk\d+)s\d+`).FindStringSubmatch(name); len(match) > 1 {
			return match[1]
		}
		return ""
	}
	if match := regexp.MustCompile(`^(nvme\d+n\d+|mmcblk\d+)p\d+$`).FindStringSubmatch(name); len(match) > 1 {
		return match[1]
	}
	return strings.TrimRight(name, "0123456789")
}

func includeStorageVolume(filesystem, mountpoint string) bool {
	fs := strings.ToLower(filesystem)
	switch fs {
	case "devfs", "autofs", "proc", "sysfs", "tmpfs", "devtmpfs", "overlay", "squashfs", "cgroup", "cgroup2":
		return false
	}
	// macOS exposes APFS helper volumes with the same capacity as the system
	// volume. They are implementation details, not user storage targets.
	if runtime.GOOS == "darwin" && strings.HasPrefix(mountpoint, "/System/Volumes/") {
		return false
	}
	return mountpoint != "" && mountpoint != "/proc" && mountpoint != "/sys"
}

func storageDeviceKind(name string) string {
	if strings.HasPrefix(name, "disk") {
		return "disk"
	}
	if strings.HasPrefix(name, "sd") || strings.HasPrefix(name, "nvme") || strings.HasPrefix(name, "vd") {
		return "disk"
	}
	return "device"
}

type DiskIOCounters struct {
	ReadBytes  uint64
	WriteBytes uint64
}

var linuxPartitionPatterns = []*regexp.Regexp{
	regexp.MustCompile(`^(sd|vd)[a-z]+\d+$`),
	regexp.MustCompile(`^xvd[a-z]+\d+$`),
	regexp.MustCompile(`^nvme\d+n\d+p\d+$`),
	regexp.MustCompile(`^mmcblk\d+p\d+$`),
}

func readDiskIO(context context.Context) (DiskIOCounters, error) {
	stats, err := disk.IOCountersWithContext(context)
	if err != nil {
		return DiskIOCounters{}, err
	}

	var counters DiskIOCounters

	for name, stat := range stats {
		if !includeDiskDevice(name, runtime.GOOS) {
			continue
		}

		counters.ReadBytes += stat.ReadBytes
		counters.WriteBytes += stat.WriteBytes
	}

	return counters, nil
}

func includeDiskDevice(name string, goos string) bool {
	if goos != "linux" {
		return true
	}

	normalized := strings.TrimPrefix(name, "/dev/")

	if strings.HasPrefix(normalized, "loop") ||
		strings.HasPrefix(normalized, "ram") ||
		strings.HasPrefix(normalized, "zram") ||
		strings.HasPrefix(normalized, "dm-") {
		return false
	}

	for _, pattern := range linuxPartitionPatterns {
		if pattern.MatchString(normalized) {
			return false
		}
	}

	return true
}
