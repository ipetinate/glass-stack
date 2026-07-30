package system

import "testing"

func TestParseDarwinGPUUsage(t *testing.T) {
	output := []byte(`
<plist><array>
  <dict><key>PerformanceStatistics</key><dict>
    <key>Device Utilization %</key><integer>31</integer>
  </dict></dict>
  <dict><key>PerformanceStatistics</key><dict>
    <key>Device Utilization %</key><real>49.0</real>
    <key>Renderer Utilization %</key><integer>22</integer>
    <key>Tiler Utilization %</key><integer>11</integer>
  </dict></dict>
</array></plist>`)

	snapshot := parseDarwinGPUUsage(output)
	if snapshot.UsagePercent == nil {
		t.Fatal("expected GPU utilization")
	}
	if *snapshot.UsagePercent != 40 {
		t.Fatalf("expected average GPU utilization 40, got %.2f", *snapshot.UsagePercent)
	}
	if snapshot.RendererPercent == nil || *snapshot.RendererPercent != 22 {
		t.Fatalf("expected renderer utilization 22, got %v", snapshot.RendererPercent)
	}
	if snapshot.TilerPercent == nil || *snapshot.TilerPercent != 11 {
		t.Fatalf("expected tiler utilization 11, got %v", snapshot.TilerPercent)
	}
}

func TestParseDarwinGPUUsageIgnoresInvalidValues(t *testing.T) {
	output := []byte(`<key>Device Utilization %</key><integer>101</integer>`)

	if snapshot := parseDarwinGPUUsage(output); snapshot.UsagePercent != nil {
		t.Fatalf("expected unavailable GPU utilization, got %.2f", *snapshot.UsagePercent)
	}
}

func TestParseDarwinGPUUsagePlainIORegistry(t *testing.T) {
	output := []byte(`
"PerformanceStatistics" = {"Tiler Utilization %"=18,"Renderer Utilization %"=73,"Device Utilization %"=75}
`)

	snapshot := parseDarwinGPUUsage(output)
	if snapshot.UsagePercent == nil || *snapshot.UsagePercent != 75 {
		t.Fatalf("expected device utilization 75, got %v", snapshot.UsagePercent)
	}
	if snapshot.RendererPercent == nil || *snapshot.RendererPercent != 73 {
		t.Fatalf("expected renderer utilization 73, got %v", snapshot.RendererPercent)
	}
	if snapshot.TilerPercent == nil || *snapshot.TilerPercent != 18 {
		t.Fatalf("expected tiler utilization 18, got %v", snapshot.TilerPercent)
	}
}
