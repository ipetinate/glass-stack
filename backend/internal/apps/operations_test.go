package apps

import (
	"strings"
	"testing"
)

func TestTransition(t *testing.T) {
	valid := []struct{ from, to OperationStatus }{
		{OperationQueued, OperationRunning},
		{OperationQueued, OperationFailed},
		{OperationRunning, OperationSucceeded},
		{OperationRunning, OperationFailed},
	}
	for _, step := range valid {
		if err := transition(step.from, step.to); err != nil {
			t.Fatalf("transition %s -> %s: %v", step.from, step.to, err)
		}
	}

	invalid := []struct{ from, to OperationStatus }{
		{OperationQueued, OperationSucceeded},
		{OperationRunning, OperationQueued},
		{OperationSucceeded, OperationRunning},
		{OperationSucceeded, OperationFailed},
		{OperationFailed, OperationRunning},
	}
	for _, step := range invalid {
		if err := transition(step.from, step.to); err == nil {
			t.Fatalf("transition %s -> %s should fail", step.from, step.to)
		} else if !strings.Contains(err.Error(), "transição") {
			t.Fatalf("transition %s -> %s err = %v", step.from, step.to, err)
		}
	}
}

func TestIsFinal(t *testing.T) {
	if !IsFinal(OperationSucceeded) || !IsFinal(OperationFailed) {
		t.Fatal("succeeded/failed must be final")
	}
	if IsFinal(OperationQueued) || IsFinal(OperationRunning) {
		t.Fatal("queued/running must not be final")
	}
}

func TestOperationProgress(t *testing.T) {
	if err := operationProgress(0); err != nil {
		t.Fatal(err)
	}
	if err := operationProgress(100); err != nil {
		t.Fatal(err)
	}
	if err := operationProgress(-1); err == nil {
		t.Fatal("negative progress must fail")
	}
	if err := operationProgress(101); err == nil {
		t.Fatal("progress above 100 must fail")
	}
}

func TestNewOperationID(t *testing.T) {
	first := newOperationID()
	second := newOperationID()
	if first == "" || first == second {
		t.Fatalf("ids = %q, %q", first, second)
	}
}

func TestOperationKinds(t *testing.T) {
	kinds := map[string]bool{
		OperationKindInstall:   true,
		OperationKindUpdate:    true,
		OperationKindEdit:      true,
		OperationKindRemove:    true,
		OperationKindUninstall: true,
	}
	for kind := range kinds {
		if kind == "" {
			t.Fatal("op kind must not be empty")
		}
	}
	if OperationKindInstall != "install" || OperationKindUpdate != "update" ||
		OperationKindEdit != "edit" || OperationKindRemove != "remove" {
		t.Fatalf(
			"kinds = %q, %q, %q, %q",
			OperationKindInstall,
			OperationKindUpdate,
			OperationKindEdit,
			OperationKindRemove,
		)
	}
}

func TestProjectOperationMatrix(t *testing.T) {
	cases := []struct {
		name       string
		kind       string
		status     OperationStatus
		wantStatus string
	}{
		{"install queued", OperationKindInstall, OperationQueued, "installing"},
		{"install running", OperationKindInstall, OperationRunning, "installing"},
		{"install succeeded", OperationKindInstall, OperationSucceeded, "installed"},
		{"install failed", OperationKindInstall, OperationFailed, "error"},
		{"update queued", OperationKindUpdate, OperationQueued, "updating"},
		{"update running", OperationKindUpdate, OperationRunning, "updating"},
		{"update succeeded", OperationKindUpdate, OperationSucceeded, "installed"},
		{"update failed", OperationKindUpdate, OperationFailed, "error"},
		{"edit queued", OperationKindEdit, OperationQueued, "editing"},
		{"edit running", OperationKindEdit, OperationRunning, "editing"},
		{"edit succeeded", OperationKindEdit, OperationSucceeded, "installed"},
		{"edit failed", OperationKindEdit, OperationFailed, "error"},
		{"remove queued", OperationKindRemove, OperationQueued, "removing"},
		{"remove running", OperationKindRemove, OperationRunning, "removing"},
		{"remove succeeded", OperationKindRemove, OperationSucceeded, "removed"},
		{"remove failed", OperationKindRemove, OperationFailed, "error"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			operation := Operation{
				ID: "op", AppID: "a", Kind: tc.kind, Status: tc.status, Progress: 50,
			}
			if projected := ProjectOperation(operation); projected.Status != tc.wantStatus {
				t.Fatalf("status = %q, want %q", projected.Status, tc.wantStatus)
			}
		})
	}
}

func TestProjectOperationErrorMessage(t *testing.T) {
	failed := Operation{
		ID: "op", AppID: "a", Kind: OperationKindUpdate, Status: OperationFailed,
		Progress: 60, Message: "aplicando", Error: "boom",
	}
	projected := ProjectOperation(failed)
	if projected.Status != "error" || projected.Message != "boom" {
		t.Fatalf("projected = %+v", projected)
	}
}
