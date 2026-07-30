package host

import (
	"context"

	systeminfo "github.com/ipetinate/glass-stack/backend/internal/system"
)

// StorageCollector adapts the host storage reader to the host domain boundary.
type StorageCollector struct{}

func (StorageCollector) Read(
	context context.Context,
) (systeminfo.StorageSnapshot, error) {
	return systeminfo.ReadStorage(context)
}
