package system

import (
	"context"
	"errors"
	"os/exec"

	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/host"
	"github.com/shirou/gopsutil/v4/mem"
)

type HostSnapshot struct {
	Hostname        string
	OS              string
	Platform        string
	PlatformFamily  string
	PlatformVersion string
	KernelVersion   string
	KernelArch      string
	Uptime          uint64
	BootTime        uint64
	CPU             HostCPU
	Memory          HostMemory
	GPU             *GPUHardware
}

type HostCPU struct {
	VendorID      string
	Model         string
	Family        string
	PhysicalCores int
	LogicalCores  int
	Mhz           float64
	Flags         []string
}

type HostMemory struct {
	TotalBytes uint64
}

type HostCollector struct {
	readHost        func(context.Context) (*host.InfoStat, error)
	readCPUInfo     func(context.Context) ([]cpu.InfoStat, error)
	countCPU        func(context.Context, bool) (int, error)
	readMemory      func(context.Context) (*mem.VirtualMemoryStat, error)
	readGPUHardware func(context.Context) (*GPUHardware, error)
}

func NewHostCollector() *HostCollector {
	return &HostCollector{
		readHost:        host.InfoWithContext,
		readCPUInfo:     cpu.InfoWithContext,
		countCPU:        cpu.CountsWithContext,
		readMemory:      mem.VirtualMemoryWithContext,
		readGPUHardware: readGPUHardware,
	}
}

func (collector *HostCollector) Read(context context.Context) (HostSnapshot, error) {
	var snapshot HostSnapshot
	var collectionErrors []error

	hostInfo, err := collector.readHost(context)
	if err != nil {
		collectionErrors = append(collectionErrors, err)
	} else {
		snapshot.Hostname = hostInfo.Hostname
		snapshot.OS = hostInfo.OS
		snapshot.Platform = hostInfo.Platform
		snapshot.PlatformFamily = hostInfo.PlatformFamily
		snapshot.PlatformVersion = hostInfo.PlatformVersion
		snapshot.KernelVersion = hostInfo.KernelVersion
		snapshot.KernelArch = hostInfo.KernelArch
		snapshot.Uptime = hostInfo.Uptime
		snapshot.BootTime = hostInfo.BootTime
	}

	cpuInfo, err := collector.readCPUInfo(context)
	if err != nil {
		collectionErrors = append(collectionErrors, err)
	} else if len(cpuInfo) > 0 {
		info := cpuInfo[0]
		physicalCores, physicalErr := collector.countCPU(context, false)
		logicalCores, logicalErr := collector.countCPU(context, true)
		if physicalErr != nil {
			collectionErrors = append(collectionErrors, physicalErr)
		}
		if logicalErr != nil {
			collectionErrors = append(collectionErrors, logicalErr)
		}
		snapshot.CPU = HostCPU{
			VendorID:      info.VendorID,
			Model:         info.ModelName,
			Family:        info.Family,
			PhysicalCores: physicalCores,
			LogicalCores:  logicalCores,
			Mhz:           info.Mhz,
			Flags:         append([]string(nil), info.Flags...),
		}
	}

	memory, err := collector.readMemory(context)
	if err != nil {
		collectionErrors = append(collectionErrors, err)
	} else {
		snapshot.Memory.TotalBytes = memory.Total
	}

	gpu, err := collector.readGPUHardware(context)
	if err != nil {
		collectionErrors = append(collectionErrors, err)
	} else {
		snapshot.GPU = gpu
	}

	return snapshot, errors.Join(collectionErrors...)
}

func runCommand(context context.Context, name string, args ...string) ([]byte, error) {
	return exec.CommandContext(context, name, args...).Output()
}
