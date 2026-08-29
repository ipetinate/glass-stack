package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/ipetinate/glass-stack/backend/internal/auth"
	"github.com/ipetinate/glass-stack/backend/internal/observability"
)

type AuthCookies interface {
	Set(http.ResponseWriter, *http.Request, string, string)
	Clear(http.ResponseWriter, *http.Request)
}

type AuthHandler struct {
	service *auth.Service
	cookies AuthCookies
}

type authCookieAdapter struct {
	set   func(http.ResponseWriter, *http.Request, string, string)
	clear func(http.ResponseWriter, *http.Request)
}

func (adapter authCookieAdapter) Set(
	response http.ResponseWriter,
	request *http.Request,
	sessionToken string,
	csrfToken string,
) {
	adapter.set(response, request, sessionToken, csrfToken)
}

func (adapter authCookieAdapter) Clear(response http.ResponseWriter, request *http.Request) {
	adapter.clear(response, request)
}

func NewAuthHandler(
	service *auth.Service,
	setCookies func(http.ResponseWriter, *http.Request, string, string),
	clearCookies func(http.ResponseWriter, *http.Request),
) *AuthHandler {
	return &AuthHandler{
		service: service,
		cookies: authCookieAdapter{set: setCookies, clear: clearCookies},
	}
}

func (handler *AuthHandler) SetupStatus(response http.ResponseWriter, request *http.Request) {
	status, err := handler.service.SetupStatus(request.Context())
	if err != nil {
		writeError(response, request, err)
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{"required": status.Required})
}

func (handler *AuthHandler) CheckPassword(
	response http.ResponseWriter,
	request *http.Request,
) {
	var input struct {
		Password string `json:"password"`
	}
	if err := decodeJSON(request, &input); err != nil {
		writeError(response, request, auth.ErrInvalidInput)
		return
	}
	assessment, err := handler.service.CheckPassword(
		request.Context(),
		input.Password,
	)
	if err != nil {
		writeError(response, request, err)
		return
	}
	result := map[string]any{"status": assessment.Status}
	if assessment.Status == auth.PasswordAssessmentCompromised &&
		assessment.Occurrences > 0 {
		result["occurrences"] = assessment.Occurrences
	}
	writeJSON(response, http.StatusOK, result)
}

func (handler *AuthHandler) BeginSetupTOTP(response http.ResponseWriter, request *http.Request) {
	var input struct {
		BootstrapToken string `json:"bootstrapToken"`
		Username       string `json:"username"`
	}
	if err := decodeJSON(request, &input); err != nil {
		writeError(response, request, auth.ErrInvalidInput)
		return
	}
	enrollment, err := handler.service.BeginSetupTOTP(
		request.Context(),
		input.BootstrapToken,
		input.Username,
	)
	if err != nil {
		writeError(response, request, err)
		return
	}
	writeJSON(response, http.StatusOK, enrollment)
}

func (handler *AuthHandler) ValidateSetupToken(response http.ResponseWriter, request *http.Request) {
	var input struct {
		BootstrapToken string `json:"bootstrapToken"`
	}
	if err := decodeJSON(request, &input); err != nil {
		writeError(response, request, auth.ErrInvalidInput)
		return
	}
	if err := handler.service.ValidateSetupToken(request.Context(), input.BootstrapToken); err != nil {
		writeError(response, request, err)
		return
	}
	writeJSON(response, http.StatusOK, map[string]bool{"valid": true})
}

func (handler *AuthHandler) CompleteSetup(response http.ResponseWriter, request *http.Request) {
	var input struct {
		BootstrapToken string          `json:"bootstrapToken"`
		ChallengeToken string          `json:"challengeToken"`
		Username       string          `json:"username"`
		Password       string          `json:"password"`
		TOTPCode       string          `json:"totpCode"`
		Preferences    json.RawMessage `json:"preferences"`
	}
	if err := decodeJSON(request, &input); err != nil {
		writeError(response, request, auth.ErrInvalidInput)
		return
	}
	result, recoveryCodes, err := handler.service.CompleteSetup(
		request.Context(),
		auth.CompleteSetupInput{
			BootstrapToken:  input.BootstrapToken,
			ChallengeToken:  input.ChallengeToken,
			Username:        input.Username,
			Password:        input.Password,
			TOTPCode:        input.TOTPCode,
			PreferencesJSON: string(input.Preferences),
		},
	)
	if err != nil {
		writeError(response, request, err)
		return
	}
	handler.cookies.Set(response, request, result.SessionToken, result.CSRFToken)
	writeJSON(response, http.StatusCreated, map[string]any{
		"user":          userResponse(result.User),
		"csrfToken":     result.CSRFToken,
		"recoveryCodes": recoveryCodes,
	})
}

func (handler *AuthHandler) Login(response http.ResponseWriter, request *http.Request) {
	var input struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := decodeJSON(request, &input); err != nil {
		writeError(response, request, auth.ErrAuthentication)
		return
	}
	result, err := handler.service.Login(request.Context(), input.Username, input.Password)
	if err != nil {
		writeError(response, request, err)
		return
	}
	if result.MFARequired {
		writeJSON(response, http.StatusAccepted, map[string]any{
			"mfaRequired":    true,
			"challengeToken": result.ChallengeToken,
		})
		return
	}
	handler.cookies.Set(response, request, result.SessionToken, result.CSRFToken)
	writeJSON(response, http.StatusOK, map[string]any{
		"mfaRequired": false,
		"user":        userResponse(result.User),
		"csrfToken":   result.CSRFToken,
	})
}

func (handler *AuthHandler) CompleteMFA(response http.ResponseWriter, request *http.Request) {
	var input auth.CompleteMFAInput
	if err := decodeJSON(request, &input); err != nil {
		writeError(response, request, auth.ErrAuthentication)
		return
	}
	result, err := handler.service.CompleteLoginMFA(request.Context(), input)
	if err != nil {
		writeError(response, request, err)
		return
	}
	handler.cookies.Set(response, request, result.SessionToken, result.CSRFToken)
	writeJSON(response, http.StatusOK, map[string]any{
		"user":      userResponse(result.User),
		"csrfToken": result.CSRFToken,
	})
}

func (handler *AuthHandler) Session(response http.ResponseWriter, request *http.Request) {
	cookie, err := request.Cookie("glass_session")
	if err != nil {
		writeError(response, request, auth.ErrAuthentication)
		return
	}
	sessionUser, err := handler.service.Authenticate(request.Context(), cookie.Value)
	if err != nil {
		handler.cookies.Clear(response, request)
		writeError(response, request, err)
		return
	}
	csrfCookie, _ := request.Cookie("glass_csrf")
	csrf := ""
	if csrfCookie != nil {
		csrf = csrfCookie.Value
	}
	writeJSON(response, http.StatusOK, map[string]any{
		"user":      userResponse(sessionUser.User),
		"csrfToken": csrf,
		"expiresAt": sessionUser.Session.AbsoluteExpiresAt,
	})
}

func (handler *AuthHandler) Logout(response http.ResponseWriter, request *http.Request) {
	if cookie, err := request.Cookie("glass_session"); err == nil {
		_ = handler.service.Logout(request.Context(), cookie.Value)
	}
	handler.cookies.Clear(response, request)
	response.WriteHeader(http.StatusNoContent)
}

func (handler *AuthHandler) BeginInvitationTOTP(
	response http.ResponseWriter,
	request *http.Request,
) {
	var input struct {
		InvitationToken string `json:"invitationToken"`
		Username        string `json:"username"`
	}
	if err := decodeJSON(request, &input); err != nil {
		writeError(response, request, auth.ErrInvalidInput)
		return
	}
	enrollment, err := handler.service.BeginInvitationTOTP(
		request.Context(),
		input.InvitationToken,
		input.Username,
	)
	if err != nil {
		writeError(response, request, err)
		return
	}
	writeJSON(response, http.StatusOK, enrollment)
}

func (handler *AuthHandler) InvitationStatus(
	response http.ResponseWriter,
	request *http.Request,
) {
	role, err := handler.service.InvitationStatus(
		request.Context(),
		request.URL.Query().Get("token"),
	)
	if err != nil {
		writeError(response, request, err)
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{"role": role})
}

func (handler *AuthHandler) AcceptInvitation(
	response http.ResponseWriter,
	request *http.Request,
) {
	var input struct {
		InvitationToken string          `json:"invitationToken"`
		ChallengeToken  string          `json:"challengeToken"`
		Username        string          `json:"username"`
		Password        string          `json:"password"`
		TOTPCode        string          `json:"totpCode"`
		Preferences     json.RawMessage `json:"preferences"`
	}
	if err := decodeJSON(request, &input); err != nil {
		writeError(response, request, auth.ErrInvalidInput)
		return
	}
	result, recoveryCodes, err := handler.service.AcceptInvitation(
		request.Context(),
		auth.AcceptInvitationInput{
			InvitationToken: input.InvitationToken,
			ChallengeToken:  input.ChallengeToken,
			Username:        input.Username,
			Password:        input.Password,
			TOTPCode:        input.TOTPCode,
			PreferencesJSON: string(input.Preferences),
		},
	)
	if err != nil {
		writeError(response, request, err)
		return
	}
	handler.cookies.Set(response, request, result.SessionToken, result.CSRFToken)
	writeJSON(response, http.StatusCreated, map[string]any{
		"user":          userResponse(result.User),
		"csrfToken":     result.CSRFToken,
		"recoveryCodes": recoveryCodes,
	})
}

func (handler *AuthHandler) Identities(response http.ResponseWriter, request *http.Request) {
	identities, err := handler.service.ListIdentities(request.Context())
	if err != nil {
		writeError(response, request, err)
		return
	}
	result := make([]map[string]any, 0, len(identities))
	for _, identity := range identities {
		result = append(result, map[string]any{
			"id":             identity.ID,
			"username":       identity.Username,
			"role":           identity.Role,
			"displayName":    identity.DisplayName,
			"avatarUrl":      identity.AvatarURL,
			"avatarPresetId": identity.AvatarPresetID,
		})
	}
	writeJSON(response, http.StatusOK, map[string]any{"identities": result})
}

func (handler *AuthHandler) Unlock(
	response http.ResponseWriter,
	request *http.Request,
	session auth.SessionUser,
) {
	var input struct {
		Password string `json:"password"`
	}
	if err := decodeJSON(request, &input); err != nil {
		writeError(response, request, auth.ErrInvalidInput)
		return
	}
	user, err := handler.service.Unlock(request.Context(), session.User, input.Password)
	if err != nil {
		writeError(response, request, err)
		return
	}
	csrf := ""
	if csrfCookie, err := request.Cookie("glass_csrf"); err == nil {
		csrf = csrfCookie.Value
	}
	writeJSON(response, http.StatusOK, map[string]any{
		"user":      userResponse(user),
		"csrfToken": csrf,
		"expiresAt": session.Session.AbsoluteExpiresAt,
	})
}

func (handler *AuthHandler) CreateInvitation(
	response http.ResponseWriter,
	request *http.Request,
	user auth.User,
) {
	var input struct {
		Role auth.Role `json:"role"`
	}
	if err := decodeJSON(request, &input); err != nil {
		writeError(response, request, auth.ErrInvalidInput)
		return
	}
	token, err := handler.service.CreateInvitation(request.Context(), user, input.Role)
	if err != nil {
		writeError(response, request, err)
		return
	}
	writeJSON(response, http.StatusCreated, map[string]any{
		"token":     token,
		"expiresIn": "24h",
	})
}

func (handler *AuthHandler) BeginUserTOTP(
	response http.ResponseWriter,
	request *http.Request,
	actor auth.User,
) {
	var input struct {
		Username string `json:"username"`
	}
	if err := decodeJSON(request, &input); err != nil {
		writeError(response, request, auth.ErrInvalidInput)
		return
	}
	enrollment, err := handler.service.BeginUserTOTP(
		request.Context(),
		actor,
		input.Username,
	)
	if err != nil {
		writeError(response, request, err)
		return
	}
	writeJSON(response, http.StatusOK, enrollment)
}

func (handler *AuthHandler) CreateUser(
	response http.ResponseWriter,
	request *http.Request,
	actor auth.User,
) {
	var input struct {
		Username       string    `json:"username"`
		Password       string    `json:"password"`
		Role           auth.Role `json:"role"`
		ChallengeToken string    `json:"challengeToken"`
		TOTPCode       string    `json:"totpCode"`
	}
	if err := decodeJSON(request, &input); err != nil {
		writeError(response, request, auth.ErrInvalidInput)
		return
	}
	user, recoveryCodes, err := handler.service.CreateUser(
		request.Context(),
		actor,
		auth.CreateUserInput{
			Username:       input.Username,
			Password:       input.Password,
			Role:           input.Role,
			ChallengeToken: input.ChallengeToken,
			TOTPCode:       input.TOTPCode,
		},
	)
	if err != nil {
		writeError(response, request, err)
		return
	}
	writeJSON(response, http.StatusCreated, map[string]any{
		"user":          userResponse(user),
		"recoveryCodes": recoveryCodes,
	})
}

func (handler *AuthHandler) ListUsers(
	response http.ResponseWriter,
	request *http.Request,
	user auth.User,
) {
	users, err := handler.service.ListUsers(request.Context(), user)
	if err != nil {
		writeError(response, request, err)
		return
	}
	result := make([]map[string]any, 0, len(users))
	for _, listedUser := range users {
		result = append(result, userResponse(listedUser))
	}
	writeJSON(response, http.StatusOK, map[string]any{"users": result})
}

func (handler *AuthHandler) ChangeUserRole(
	response http.ResponseWriter,
	request *http.Request,
	actor auth.User,
	userID string,
) {
	var input struct {
		Role auth.Role `json:"role"`
	}
	if err := decodeJSON(request, &input); err != nil {
		writeError(response, request, auth.ErrInvalidInput)
		return
	}
	if err := handler.service.ChangeUserRole(
		request.Context(),
		actor,
		userID,
		input.Role,
	); err != nil {
		writeError(response, request, err)
		return
	}
	response.WriteHeader(http.StatusNoContent)
}

func (handler *AuthHandler) DeleteUser(
	response http.ResponseWriter,
	request *http.Request,
	actor auth.User,
	userID string,
) {
	if err := handler.service.DeleteUser(request.Context(), actor, userID); err != nil {
		writeError(response, request, err)
		return
	}
	response.WriteHeader(http.StatusNoContent)
}

func (handler *AuthHandler) ChangePassword(
	response http.ResponseWriter,
	request *http.Request,
	user auth.User,
) {
	var input struct {
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
	}
	if err := decodeJSON(request, &input); err != nil {
		writeError(response, request, auth.ErrInvalidInput)
		return
	}
	if err := handler.service.ChangePassword(
		request.Context(),
		user,
		input.CurrentPassword,
		input.NewPassword,
	); err != nil {
		writeError(response, request, err)
		return
	}
	handler.cookies.Clear(response, request)
	response.WriteHeader(http.StatusNoContent)
}

func userResponse(user auth.User) map[string]any {
	return map[string]any{
		"id":       user.ID,
		"username": user.Username,
		"role":     user.Role,
		"status":   user.Status,
	}
}

func decodeJSON(request *http.Request, target any) error {
	decoder := json.NewDecoder(io.LimitReader(request.Body, (1<<20)+1))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return err
	}
	if decoder.InputOffset() > 1<<20 {
		return errors.New("request body is too large")
	}
	var trailing any
	if err := decoder.Decode(&trailing); err != io.EOF {
		return errors.New("request body must contain one JSON value")
	}
	return nil
}

func writeJSON(response http.ResponseWriter, status int, value any) {
	response.Header().Set("Content-Type", "application/json")
	response.WriteHeader(status)
	_ = json.NewEncoder(response).Encode(value)
}

func writeError(response http.ResponseWriter, request *http.Request, err error) {
	status := http.StatusInternalServerError
	code := "internal_error"
	message := "The request could not be completed."
	switch {
	case errors.Is(err, auth.ErrAuthentication):
		status, code, message = http.StatusUnauthorized, "invalid_credentials", "The credentials are invalid."
	case errors.Is(err, auth.ErrAuthorization):
		status, code, message = http.StatusForbidden, "permission_denied", "You do not have permission to perform this action."
	case errors.Is(err, auth.ErrSetupComplete):
		status, code, message = http.StatusConflict, "setup_complete", "Initial setup is already complete."
	case errors.Is(err, auth.ErrInvalidToken):
		status, code, message = http.StatusUnauthorized, "invalid_token", "The token is invalid or expired."
	case errors.Is(err, auth.ErrConflict):
		status, code, message = http.StatusConflict, "conflict", "The requested resource already exists."
	case errors.Is(err, auth.ErrCompromisedPassword):
		status, code, message = http.StatusUnprocessableEntity, "compromised_password", "This password appears in known data breaches. Choose a different password."
	case errors.Is(err, auth.ErrInvalidInput):
		status, code, message = http.StatusUnprocessableEntity, "invalid_input", strings.TrimPrefix(err.Error(), auth.ErrInvalidInput.Error()+": ")
	}
	writeJSON(response, status, map[string]any{
		"code":      code,
		"message":   message,
		"requestId": observability.RequestID(request.Context()),
	})
}
