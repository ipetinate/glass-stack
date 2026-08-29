package handlers_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/ipetinate/glass-stack/backend/internal/apps"
	"github.com/ipetinate/glass-stack/backend/internal/http/handlers"
)

type appsServiceStub struct {
	installErr  error
	queued      apps.Operation
	operation   apps.InstallOperation
	operationID string
	request     apps.InstallRequest
	updateAppID string
	updateErr   error
	editAppID   string
	editMode    string
	editOptions apps.InstallOptions
	editErr     error
	removeReq   apps.RemoveRequest
	removeErr   error
	lastOp      apps.Operation
	appsOut     []apps.InstalledApp
	appsErr     error
	app         apps.InstalledApp
	appErr      error
	appID       string
}

func (stub *appsServiceStub) Install(_ context.Context, request apps.InstallRequest) (apps.Operation, error) {
	stub.request = request
	if stub.installErr != nil {
		return apps.Operation{}, stub.installErr
	}
	return stub.queued, nil
}

func (stub *appsServiceStub) Operation(_ context.Context, id string) (apps.InstallOperation, error) {
	stub.operationID = id
	return stub.operation, nil
}

func (stub *appsServiceStub) Update(_ context.Context, appID string) (apps.Operation, error) {
	stub.updateAppID = appID
	if stub.updateErr != nil {
		return apps.Operation{}, stub.updateErr
	}
	stub.lastOp = stub.queued
	stub.lastOp.Kind = apps.OperationKindUpdate
	return stub.lastOp, nil
}

func (stub *appsServiceStub) Edit(_ context.Context, appID, mode string, options apps.InstallOptions) (apps.Operation, error) {
	stub.editAppID = appID
	stub.editMode = mode
	stub.editOptions = options
	if stub.editErr != nil {
		return apps.Operation{}, stub.editErr
	}
	stub.lastOp = stub.queued
	stub.lastOp.Kind = apps.OperationKindEdit
	return stub.lastOp, nil
}

func (stub *appsServiceStub) Remove(_ context.Context, request apps.RemoveRequest) (apps.Operation, error) {
	stub.removeReq = request
	if stub.removeErr != nil {
		return apps.Operation{}, stub.removeErr
	}
	stub.lastOp = stub.queued
	stub.lastOp.Kind = apps.OperationKindRemove
	return stub.lastOp, nil
}

func (stub *appsServiceStub) Apps(_ context.Context) ([]apps.InstalledApp, error) {
	if stub.appsErr != nil {
		return nil, stub.appsErr
	}
	return stub.appsOut, nil
}

func (stub *appsServiceStub) App(_ context.Context, appID string) (apps.InstalledApp, error) {
	stub.appID = appID
	if stub.appErr != nil {
		return apps.InstalledApp{}, stub.appErr
	}
	return stub.app, nil
}

func TestInstallAppAccepted(t *testing.T) {
	stub := &appsServiceStub{queued: apps.Operation{ID: "op1", AppID: "uptime-kuma", Status: apps.OperationQueued, Progress: 0}}
	server := httptest.NewServer(handlers.InstallApp(stub))
	defer server.Close()

	requestBody := `{"appId":"uptime-kuma","mode":"custom","options":{"port":8080,"volume":"data"}}`
	request, _ := http.NewRequest(http.MethodPost, server.URL, strings.NewReader(requestBody))
	request.Header.Set("Content-Type", "application/json")
	response, err := server.Client().Do(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusAccepted {
		t.Fatalf("status = %d", response.StatusCode)
	}
	if stub.request.AppID != "uptime-kuma" || stub.request.Options.Port != 8080 ||
		stub.request.Options.Volume != "data" {
		t.Fatalf("request = %+v", stub.request)
	}
	var result struct {
		Data apps.InstallOperation `json:"data"`
	}
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}
	if result.Data.Status != "installing" || result.Data.ID != "op1" {
		t.Fatalf("result = %+v", result)
	}
}

func TestInstallAppInvalidBody(t *testing.T) {
	server := httptest.NewServer(handlers.InstallApp(&appsServiceStub{}))
	defer server.Close()

	request, _ := http.NewRequest(http.MethodPost, server.URL, strings.NewReader("{not-json"))
	request.Header.Set("Content-Type", "application/json")
	response, err := server.Client().Do(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d", response.StatusCode)
	}
}

func TestInstallAppRejectsUnknown(t *testing.T) {
	server := httptest.NewServer(handlers.InstallApp(&appsServiceStub{
		installErr: apps.ErrApplicationNotFound,
	}))
	defer server.Close()

	request, _ := http.NewRequest(http.MethodPost, server.URL, strings.NewReader(`{"appId":"ghost"}`))
	request.Header.Set("Content-Type", "application/json")
	response, err := server.Client().Do(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d", response.StatusCode)
	}
	var body errorBody
	if err := json.NewDecoder(response.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body.Code != "app_not_found" {
		t.Fatalf("body = %+v", body)
	}
}

func TestInstallOperationStatus(t *testing.T) {
	stub := &appsServiceStub{operation: apps.InstallOperation{
		ID: "op1", AppID: "uptime-kuma", Status: "installed", Progress: 100,
	}}
	router := chi.NewRouter()
	router.Get("/api/v1/apps/install/{operationId}", handlers.InstallOperationStatus(stub))
	server := httptest.NewServer(router)
	defer server.Close()

	response, err := server.Client().Get(server.URL + "/api/v1/apps/install/op1")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", response.StatusCode)
	}
	if stub.operationID != "op1" {
		t.Fatalf("operationID = %q", stub.operationID)
	}
	var result struct {
		Data apps.InstallOperation `json:"data"`
	}
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}
	if result.Data.Progress != 100 || result.Data.Status != "installed" {
		t.Fatalf("result = %+v", result)
	}
}

func newAppsRouter(stub *appsServiceStub) *httptest.Server {
	router := chi.NewRouter()
	router.Post("/api/v1/apps/{appId}/update", handlers.UpdateApp(stub))
	router.Patch("/api/v1/apps/{appId}", handlers.EditApp(stub))
	router.Post("/api/v1/apps/{appId}/remove", handlers.RemoveApp(stub))
	server := httptest.NewServer(router)
	return server
}

func TestUpdateAppAccepted(t *testing.T) {
	stub := &appsServiceStub{queued: apps.Operation{ID: "op1", AppID: "uptime-kuma", Status: apps.OperationQueued, Progress: 0}}
	server := newAppsRouter(stub)
	defer server.Close()

	request, _ := http.NewRequest(http.MethodPost, server.URL+"/api/v1/apps/uptime-kuma/update", nil)
	response, err := server.Client().Do(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusAccepted {
		t.Fatalf("status = %d", response.StatusCode)
	}
	if stub.updateAppID != "uptime-kuma" {
		t.Fatalf("updateAppID = %q", stub.updateAppID)
	}
	var result struct {
		Data apps.InstallOperation `json:"data"`
	}
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}
	if result.Data.Status != "updating" || result.Data.ID != "op1" {
		t.Fatalf("result = %+v", result)
	}
}

func TestEditAppAccepted(t *testing.T) {
	stub := &appsServiceStub{queued: apps.Operation{ID: "op1", AppID: "uptime-kuma", Status: apps.OperationQueued, Progress: 0}}
	server := newAppsRouter(stub)
	defer server.Close()

	body := `{"mode":"custom","options":{"port":9090,"volume":"new-vol"}}`
	request, _ := http.NewRequest(http.MethodPatch, server.URL+"/api/v1/apps/uptime-kuma", strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	response, err := server.Client().Do(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusAccepted {
		t.Fatalf("status = %d", response.StatusCode)
	}
	if stub.editAppID != "uptime-kuma" || stub.editMode != "custom" ||
		stub.editOptions.Port != 9090 || stub.editOptions.Volume != "new-vol" {
		t.Fatalf("edit captured = %q %q %+v", stub.editAppID, stub.editMode, stub.editOptions)
	}
	var result struct {
		Data apps.InstallOperation `json:"data"`
	}
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}
	if result.Data.Status != "editing" {
		t.Fatalf("result = %+v", result)
	}
}

func TestRemoveAppAccepted(t *testing.T) {
	stub := &appsServiceStub{queued: apps.Operation{ID: "op1", AppID: "uptime-kuma", Status: apps.OperationQueued, Progress: 0}}
	server := newAppsRouter(stub)
	defer server.Close()

	body := `{"containers":true,"images":true,"config":false,"data":true}`
	request, _ := http.NewRequest(http.MethodPost, server.URL+"/api/v1/apps/uptime-kuma/remove", strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	response, err := server.Client().Do(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusAccepted {
		t.Fatalf("status = %d", response.StatusCode)
	}
	if stub.removeReq.AppID != "uptime-kuma" || !stub.removeReq.Containers ||
		!stub.removeReq.Images || stub.removeReq.Config || !stub.removeReq.Data {
		t.Fatalf("removeReq = %+v", stub.removeReq)
	}
	var result struct {
		Data apps.InstallOperation `json:"data"`
	}
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}
	if result.Data.Status != "removing" {
		t.Fatalf("result = %+v", result)
	}
}

func TestUpdateAppNotInstalled(t *testing.T) {
	stub := &appsServiceStub{updateErr: apps.ErrNotInstalled}
	server := newAppsRouter(stub)
	defer server.Close()

	request, _ := http.NewRequest(http.MethodPost, server.URL+"/api/v1/apps/uptime-kuma/update", nil)
	response, err := server.Client().Do(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusConflict {
		t.Fatalf("status = %d", response.StatusCode)
	}
	var body errorBody
	if err := json.NewDecoder(response.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body.Code != "app_not_installed" {
		t.Fatalf("body = %+v", body)
	}
}

func TestUpdateAppInProgress(t *testing.T) {
	stub := &appsServiceStub{updateErr: apps.ErrUpdateInProgress}
	server := newAppsRouter(stub)
	defer server.Close()

	request, _ := http.NewRequest(http.MethodPost, server.URL+"/api/v1/apps/uptime-kuma/update", nil)
	response, err := server.Client().Do(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusConflict {
		t.Fatalf("status = %d", response.StatusCode)
	}
	var body errorBody
	if err := json.NewDecoder(response.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body.Code != "update_in_progress" {
		t.Fatalf("body = %+v", body)
	}
}

func TestRemoveAppNeedsConfirmation(t *testing.T) {
	stub := &appsServiceStub{removeErr: apps.ErrRemoveNeedsConfirmation}
	server := newAppsRouter(stub)
	defer server.Close()

	body := `{"containers":false,"images":false,"config":false,"data":false}`
	request, _ := http.NewRequest(http.MethodPost, server.URL+"/api/v1/apps/uptime-kuma/remove", strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	response, err := server.Client().Do(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d", response.StatusCode)
	}
	var eb errorBody
	if err := json.NewDecoder(response.Body).Decode(&eb); err != nil {
		t.Fatal(err)
	}
	if eb.Code != "remove_confirmation_required" {
		t.Fatalf("body = %+v", eb)
	}
}

func TestRemoveAppInProgress(t *testing.T) {
	stub := &appsServiceStub{removeErr: apps.ErrRemoveInProgress}
	server := newAppsRouter(stub)
	defer server.Close()

	body := `{"containers":true}`
	request, _ := http.NewRequest(http.MethodPost, server.URL+"/api/v1/apps/uptime-kuma/remove", strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	response, err := server.Client().Do(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusConflict {
		t.Fatalf("status = %d", response.StatusCode)
	}
	var eb errorBody
	if err := json.NewDecoder(response.Body).Decode(&eb); err != nil {
		t.Fatal(err)
	}
	if eb.Code != "remove_in_progress" {
		t.Fatalf("body = %+v", eb)
	}
}

func TestAppsList(t *testing.T) {
	stub := &appsServiceStub{appsOut: []apps.InstalledApp{{
		ID: "uptime-kuma", Title: "Uptime Kuma", Version: "1.23.16",
		Status: apps.InstanceInstalled, Runtime: apps.RuntimeRunning,
		AccessURL: "http://localhost:8080/",
	}}}
	server := httptest.NewServer(handlers.AppsList(stub))
	defer server.Close()

	response, err := server.Client().Get(server.URL + "/api/v1/apps")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", response.StatusCode)
	}
	var result struct {
		Data []apps.InstalledApp `json:"data"`
	}
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}
	if len(result.Data) != 1 || result.Data[0].ID != "uptime-kuma" ||
		result.Data[0].AccessURL != "http://localhost:8080/" ||
		result.Data[0].Status != apps.InstanceInstalled || result.Data[0].Runtime != apps.RuntimeRunning {
		t.Fatalf("result = %+v", result)
	}
}

func TestAppsListEmpty(t *testing.T) {
	stub := &appsServiceStub{appsOut: []apps.InstalledApp{}}
	server := httptest.NewServer(handlers.AppsList(stub))
	defer server.Close()

	response, err := server.Client().Get(server.URL + "/api/v1/apps")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", response.StatusCode)
	}
	var result struct {
		Data []apps.InstalledApp `json:"data"`
	}
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}
	if result.Data == nil {
		t.Fatal("data = null, want empty array")
	}
	if len(result.Data) != 0 {
		t.Fatalf("len(data) = %d", len(result.Data))
	}
}

func newAppDetailRouter(stub *appsServiceStub) *httptest.Server {
	router := chi.NewRouter()
	router.Get("/api/v1/apps/{appId}", handlers.AppDetail(stub))
	return httptest.NewServer(router)
}

func TestAppDetail(t *testing.T) {
	stub := &appsServiceStub{app: apps.InstalledApp{
		ID: "uptime-kuma", Title: "Uptime Kuma", Version: "1.23.16",
		Status: apps.InstanceInstalled, Runtime: apps.RuntimeRunning,
		AccessURL: "http://localhost:3001/",
	}}
	server := newAppDetailRouter(stub)
	defer server.Close()

	response, err := server.Client().Get(server.URL + "/api/v1/apps/uptime-kuma")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", response.StatusCode)
	}
	if stub.appID != "uptime-kuma" {
		t.Fatalf("appID = %q", stub.appID)
	}
	var result struct {
		Data apps.InstalledApp `json:"data"`
	}
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}
	if result.Data.ID != "uptime-kuma" || result.Data.AccessURL != "http://localhost:3001/" {
		t.Fatalf("result = %+v", result)
	}
}

func TestAppDetailNotInstalled(t *testing.T) {
	stub := &appsServiceStub{appErr: apps.ErrNotInstalled}
	server := newAppDetailRouter(stub)
	defer server.Close()

	response, err := server.Client().Get(server.URL + "/api/v1/apps/ghost")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d", response.StatusCode)
	}
	var eb errorBody
	if err := json.NewDecoder(response.Body).Decode(&eb); err != nil {
		t.Fatal(err)
	}
	if eb.Code != "app_not_installed" {
		t.Fatalf("body = %+v", eb)
	}
}

func TestAppDetailStoreNotFound(t *testing.T) {
	stub := &appsServiceStub{appErr: apps.ErrNotFound}
	server := newAppDetailRouter(stub)
	defer server.Close()

	response, err := server.Client().Get(server.URL + "/api/v1/apps/ghost")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d", response.StatusCode)
	}
	var eb errorBody
	if err := json.NewDecoder(response.Body).Decode(&eb); err != nil {
		t.Fatal(err)
	}
	if eb.Code != "app_not_installed" {
		t.Fatalf("body = %+v", eb)
	}
}
