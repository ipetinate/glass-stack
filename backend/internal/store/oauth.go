package store

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

type ReviewSessionStatus string

const (
	ReviewSessionIdle          ReviewSessionStatus = "idle"
	ReviewSessionPending       ReviewSessionStatus = "pending"
	ReviewSessionAuthenticated ReviewSessionStatus = "authenticated"
	ReviewSessionDenied        ReviewSessionStatus = "denied"
	ReviewSessionExpired       ReviewSessionStatus = "expired"
	ReviewSessionFailed        ReviewSessionStatus = "failed"
)

const (
	ProviderGitHub = "github"
	ProviderGoogle = "google"

	googleDeviceCodeURL = "https://oauth2.googleapis.com/device/code"
	googleTokenURL      = "https://oauth2.googleapis.com/token"
	googleUserinfoURL   = "https://openidconnect.googleapis.com/v1/userinfo"
)

var ErrClientIDMissing = fmt.Errorf("client id do provedor não configurado")

type ReviewSessionSnapshot struct {
	Status          ReviewSessionStatus `json:"status"`
	Provider        string              `json:"provider,omitempty"`
	UserCode        string              `json:"userCode,omitempty"`
	VerificationURI string              `json:"verificationUri,omitempty"`
	Login           string              `json:"login,omitempty"`
	AvatarURL       string              `json:"avatarUrl,omitempty"`
}

type reviewLoginSession struct {
	mu              sync.Mutex
	status          ReviewSessionStatus
	provider        string
	userCode        string
	verificationURI string
	login           string
	avatarURL       string
	sub             string
	token           string
	cancel          context.CancelFunc
}

type deviceFlowStart struct {
	DeviceCode      string `json:"device_code"`
	UserCode        string `json:"user_code"`
	VerificationURI string `json:"verification_uri"`
	VerificationURL string `json:"verification_url"`
	ExpiresIn       int    `json:"expires_in"`
	Interval        int    `json:"interval"`
}

func (flow *deviceFlowStart) verificationURI() string {
	if flow.VerificationURI != "" {
		return flow.VerificationURI
	}
	return flow.VerificationURL
}

func postForm(ctx context.Context, httpClient *http.Client, endpoint string, form url.Values, target any) error {
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	response, err := httpClient.Do(request)
	if err != nil {
		return fmt.Errorf("request %s: %w", endpoint, err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("%s returned %d", endpoint, response.StatusCode)
	}
	return json.NewDecoder(response.Body).Decode(target)
}

// StartGitHubDeviceFlow begins GitHub's device authorization grant.
func (client *SourceClient) StartGitHubDeviceFlow(
	ctx context.Context,
	clientID string,
) (*deviceFlowStart, error) {
	var flow deviceFlowStart
	err := postForm(ctx, client.http, client.webURL+"/login/device/code", url.Values{
		"client_id": {clientID},
		"scope":     {"public_repo"},
	}, &flow)
	if err != nil {
		return nil, err
	}
	if flow.DeviceCode == "" || flow.UserCode == "" {
		return nil, fmt.Errorf("device code payload incomplete")
	}
	return normalizeFlow(&flow), nil
}

type deviceTokenResponse struct {
	AccessToken      string `json:"access_token"`
	Error            string `json:"error"`
	ErrorDescription string `json:"error_description"`
	Interval         int    `json:"interval"`
}

func (client *SourceClient) requestGitHubDeviceToken(
	ctx context.Context,
	clientID string,
	deviceCode string,
) (*deviceTokenResponse, error) {
	var payload deviceTokenResponse
	err := postForm(ctx, client.http, client.webURL+"/login/oauth/access_token", url.Values{
		"client_id":   {clientID},
		"device_code": {deviceCode},
		"grant_type":  {"urn:ietf:params:oauth:grant-type:device_code"},
	}, &payload)
	if err != nil {
		return nil, err
	}
	return &payload, nil
}

// FetchAuthenticatedUser resolves login and avatar for a GitHub user token.
func (client *SourceClient) FetchAuthenticatedUser(
	ctx context.Context,
	token string,
) (string, string, string, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, client.commitsURL+"/user", nil)
	if err != nil {
		return "", "", "", err
	}
	request.Header.Set("Accept", "application/vnd.github+json")
	request.Header.Set("Authorization", "Bearer "+token)
	response, err := client.http.Do(request)
	if err != nil {
		return "", "", "", fmt.Errorf("request authenticated user: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return "", "", "", fmt.Errorf("user endpoint returned %d", response.StatusCode)
	}
	var payload struct {
		Login     string `json:"login"`
		AvatarURL string `json:"avatar_url"`
		ID        int64  `json:"id"`
	}
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return "", "", "", fmt.Errorf("decode user payload: %w", err)
	}
	return payload.Login, payload.AvatarURL, fmt.Sprintf("%d", payload.ID), nil
}

// StartGoogleDeviceFlow begins Google's device authorization grant.
func (client *SourceClient) StartGoogleDeviceFlow(
	ctx context.Context,
	clientID string,
) (*deviceFlowStart, error) {
	var flow deviceFlowStart
	err := postForm(ctx, client.http, googleDeviceCodeURL, url.Values{
		"client_id": {clientID},
		"scope":     {"openid email profile"},
	}, &flow)
	if err != nil {
		return nil, err
	}
	if flow.DeviceCode == "" || flow.UserCode == "" {
		return nil, fmt.Errorf("device code payload incomplete")
	}
	return normalizeFlow(&flow), nil
}

func (client *SourceClient) requestGoogleDeviceToken(
	ctx context.Context,
	clientID string,
	clientSecret string,
	deviceCode string,
) (*deviceTokenResponse, error) {
	var payload deviceTokenResponse
	err := postForm(ctx, client.http, googleTokenURL, url.Values{
		"client_id":     {clientID},
		"client_secret": {clientSecret},
		"device_code":   {deviceCode},
		"grant_type":    {"urn:ietf:params:oauth:grant-type:device_code"},
	}, &payload)
	if err != nil {
		return nil, err
	}
	return &payload, nil
}

type googleUserInfo struct {
	Sub     string `json:"sub"`
	Name    string `json:"name"`
	Email   string `json:"email"`
	Picture string `json:"picture"`
}

func (client *SourceClient) fetchGoogleUser(
	ctx context.Context,
	token string,
) (*googleUserInfo, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, googleUserinfoURL, nil)
	if err != nil {
		return nil, err
	}
	request.Header.Set("Authorization", "Bearer "+token)
	response, err := client.http.Do(request)
	if err != nil {
		return nil, fmt.Errorf("request google userinfo: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("google userinfo returned %d", response.StatusCode)
	}
	var payload googleUserInfo
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("decode google userinfo: %w", err)
	}
	return &payload, nil
}

func normalizeFlow(flow *deviceFlowStart) *deviceFlowStart {
	if flow.Interval <= 0 {
		flow.Interval = 5
	}
	if flow.ExpiresIn <= 0 {
		flow.ExpiresIn = 900
	}
	return flow
}

// StartReviewLogin begins the device flow for the given provider in the background.
func (service *Service) StartReviewLogin(provider string) (ReviewSessionSnapshot, error) {
	clientID := service.githubClientID
	switch provider {
	case ProviderGitHub:
	case ProviderGoogle:
		clientID = service.googleClientID
	default:
		return ReviewSessionSnapshot{}, fmt.Errorf("provedor desconhecido")
	}
	if clientID == "" {
		return ReviewSessionSnapshot{}, ErrClientIDMissing
	}

	service.reviewMu.Lock()
	service.cancelActiveSessionLocked()

	startContext, cancel := context.WithTimeout(context.Background(), 20*time.Minute)
	var (
		flow *deviceFlowStart
		err  error
	)
	if provider == ProviderGitHub {
		flow, err = service.source.StartGitHubDeviceFlow(startContext, clientID)
	} else {
		flow, err = service.source.StartGoogleDeviceFlow(startContext, clientID)
	}
	if err != nil {
		cancel()
		service.reviewMu.Unlock()
		return ReviewSessionSnapshot{}, fmt.Errorf("%w: %v", ErrReviewsUnavailable, err)
	}

	session := &reviewLoginSession{
		status:          ReviewSessionPending,
		provider:        provider,
		userCode:        flow.UserCode,
		verificationURI: flow.verificationURI(),
		cancel:          cancel,
	}
	service.reviewSession = session
	if provider == ProviderGitHub {
		go service.pollGitHubLogin(startContext, cancel, clientID, session, flow)
	} else {
		go service.pollGoogleLogin(startContext, cancel, clientID, session, flow)
	}
	service.reviewMu.Unlock()

	return ReviewSessionSnapshot{
		Status:          ReviewSessionPending,
		Provider:        provider,
		UserCode:        flow.UserCode,
		VerificationURI: flow.verificationURI(),
	}, nil
}

func (service *Service) pollGitHubLogin(
	ctx context.Context,
	cancel context.CancelFunc,
	clientID string,
	session *reviewLoginSession,
	flow *deviceFlowStart,
) {
	defer cancel()
	interval := time.Duration(flow.Interval) * time.Second

	for {
		select {
		case <-ctx.Done():
			service.mutateReviewSession(session, func(current *reviewLoginSession) {
				if current.status == ReviewSessionPending {
					current.status = ReviewSessionExpired
				}
			})
			return
		case <-time.After(interval):
		}

		tokenResponse, err := service.source.requestGitHubDeviceToken(ctx, clientID, flow.DeviceCode)
		if err != nil {
			if ctx.Err() == nil {
				continue
			}
			return
		}
		done := handleDeviceTokenResponse(service, session, tokenResponse.Error, interval)
		if done.handled {
			return
		}
		interval = done.interval
		if tokenResponse.AccessToken == "" {
			service.finishReviewSessionFailed(session)
			return
		}
		login, avatarURL, sub, userErr := service.source.FetchAuthenticatedUser(ctx, tokenResponse.AccessToken)
		if userErr != nil {
			login = ""
		}
		service.mutateReviewSession(session, func(current *reviewLoginSession) {
			current.token = tokenResponse.AccessToken
			current.login = login
			current.avatarURL = avatarURL
			current.sub = sub
			current.status = ReviewSessionAuthenticated
		})
		return
	}
}

func (service *Service) pollGoogleLogin(
	ctx context.Context,
	cancel context.CancelFunc,
	clientID string,
	session *reviewLoginSession,
	flow *deviceFlowStart,
) {
	defer cancel()
	interval := time.Duration(flow.Interval) * time.Second

	for {
		select {
		case <-ctx.Done():
			service.mutateReviewSession(session, func(current *reviewLoginSession) {
				if current.status == ReviewSessionPending {
					current.status = ReviewSessionExpired
				}
			})
			return
		case <-time.After(interval):
		}

		tokenResponse, err := service.source.requestGoogleDeviceToken(
			ctx,
			clientID,
			service.googleClientSecret,
			flow.DeviceCode,
		)
		if err != nil {
			if ctx.Err() == nil {
				continue
			}
			return
		}
		done := handleDeviceTokenResponse(service, session, tokenResponse.Error, interval)
		if done.handled {
			return
		}
		interval = done.interval
		if tokenResponse.AccessToken == "" {
			service.finishReviewSessionFailed(session)
			return
		}
		userInfo, userErr := service.source.fetchGoogleUser(ctx, tokenResponse.AccessToken)
		service.mutateReviewSession(session, func(current *reviewLoginSession) {
			current.token = tokenResponse.AccessToken
			current.status = ReviewSessionAuthenticated
			if userErr == nil && userInfo != nil {
				current.login = userInfo.Name
				if current.login == "" {
					current.login = userInfo.Email
				}
				current.avatarURL = userInfo.Picture
				current.sub = userInfo.Sub
			}
		})
		return
	}
}

type devicePollOutcome struct {
	handled  bool
	interval time.Duration
}

func handleDeviceTokenResponse(
	service *Service,
	session *reviewLoginSession,
	responseError string,
	interval time.Duration,
) devicePollOutcome {
	switch responseError {
	case "":
		return devicePollOutcome{handled: false, interval: interval}
	case "authorization_pending":
		return devicePollOutcome{handled: false, interval: interval}
	case "slow_down":
		return devicePollOutcome{handled: false, interval: interval + 5*time.Second}
	case "expired_token":
		service.mutateReviewSession(session, func(current *reviewLoginSession) {
			current.status = ReviewSessionExpired
		})
		return devicePollOutcome{handled: true, interval: interval}
	case "access_denied":
		service.mutateReviewSession(session, func(current *reviewLoginSession) {
			current.status = ReviewSessionDenied
		})
		return devicePollOutcome{handled: true, interval: interval}
	default:
		service.finishReviewSessionFailed(session)
		return devicePollOutcome{handled: true, interval: interval}
	}
}

func (service *Service) finishReviewSessionFailed(session *reviewLoginSession) {
	service.mutateReviewSession(session, func(current *reviewLoginSession) {
		current.status = ReviewSessionFailed
	})
}

func (service *Service) mutateReviewSession(
	target *reviewLoginSession,
	mutate func(session *reviewLoginSession),
) {
	service.reviewMu.Lock()
	defer service.reviewMu.Unlock()
	if service.reviewSession != target {
		return
	}
	target.mu.Lock()
	defer target.mu.Unlock()
	mutate(target)
}

func (service *Service) cancelActiveSessionLocked() {
	if service.reviewSession == nil {
		return
	}
	session := service.reviewSession
	session.mu.Lock()
	shouldCancel := session.cancel != nil
	session.cancel = nil
	session.mu.Unlock()
	if shouldCancel {
		session.cancel()
	}
	service.reviewSession = nil
}

func (service *Service) ReviewSession() ReviewSessionSnapshot {
	service.reviewMu.Lock()
	session := service.reviewSession
	service.reviewMu.Unlock()
	if session == nil {
		return ReviewSessionSnapshot{Status: ReviewSessionIdle}
	}
	session.mu.Lock()
	defer session.mu.Unlock()
	return ReviewSessionSnapshot{
		Status:          session.status,
		Provider:        session.provider,
		UserCode:        session.userCode,
		VerificationURI: session.verificationURI,
		Login:           session.login,
		AvatarURL:       session.avatarURL,
	}
}

func (service *Service) CancelReviewLogin() ReviewSessionSnapshot {
	service.reviewMu.Lock()
	defer service.reviewMu.Unlock()
	service.cancelActiveSessionLocked()
	return ReviewSessionSnapshot{Status: ReviewSessionIdle}
}

type reviewerIdentity struct {
	Provider string
	Login    string
	Avatar   string
	Subject  string
	Token    string
}

func (service *Service) reviewerIdentity() reviewerIdentity {
	service.reviewMu.Lock()
	session := service.reviewSession
	service.reviewMu.Unlock()
	if session == nil {
		return reviewerIdentity{}
	}
	session.mu.Lock()
	defer session.mu.Unlock()
	if session.status != ReviewSessionAuthenticated {
		return reviewerIdentity{}
	}
	return reviewerIdentity{
		Provider: session.provider,
		Login:    session.login,
		Avatar:   session.avatarURL,
		Subject:  session.sub,
		Token:    session.token,
	}
}
