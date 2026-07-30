package auth

import (
	"context"
	"crypto/sha1"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/ipetinate/glass-stack/backend/internal/observability"
)

const (
	sessionIdleTTL     = 12 * time.Hour
	sessionAbsoluteTTL = 7 * 24 * time.Hour
	challengeTTL       = 15 * time.Minute
	bootstrapTTL       = 24 * time.Hour
	invitationTTL      = 24 * time.Hour

	challengePurposeSetup      = "setup"
	challengePurposeInvitation = "invitation"
	challengePurposeLoginMFA   = "login_mfa"
)

type Service struct {
	store           Store
	masterKey       []byte
	passwordChecker PasswordCompromiseChecker
	logger          *slog.Logger
	now             func() time.Time
}

type enrollmentChallengePayload struct {
	Username         string `json:"username"`
	SecretCiphertext []byte `json:"secretCiphertext"`
	Nonce            []byte `json:"nonce"`
}

type SetupStatus struct {
	Required bool
}

type TOTPEnrollment struct {
	ChallengeToken string `json:"challengeToken"`
	Secret         string `json:"secret"`
	URI            string `json:"uri"`
	QRCodeDataURI  string `json:"qrCodeDataUri"`
}

type CompleteSetupInput struct {
	BootstrapToken  string
	ChallengeToken  string
	Username        string
	Password        string
	TOTPCode        string
	PreferencesJSON string
}

type LoginResult struct {
	MFARequired    bool
	ChallengeToken string
	SessionToken   string
	CSRFToken      string
	User           User
}

type CompleteMFAInput struct {
	ChallengeToken string `json:"challengeToken"`
	Code           string `json:"code"`
}

type AcceptInvitationInput struct {
	InvitationToken string
	ChallengeToken  string
	Username        string
	Password        string
	TOTPCode        string
	PreferencesJSON string
}

type Authenticated struct {
	User         User
	SessionToken string
	CSRFToken    string
}

func NewService(
	store Store,
	masterKey []byte,
	passwordChecker PasswordCompromiseChecker,
	logger *slog.Logger,
) (*Service, error) {
	if len(masterKey) != 32 {
		return nil, fmt.Errorf("master key has invalid length")
	}
	if passwordChecker == nil {
		return nil, fmt.Errorf("password compromise checker is required")
	}
	if logger == nil {
		return nil, fmt.Errorf("logger is required")
	}
	return &Service{
		store:           store,
		masterKey:       append([]byte(nil), masterKey...),
		passwordChecker: passwordChecker,
		logger:          logger,
		now:             time.Now,
	}, nil
}

func (service *Service) CheckPassword(
	ctx context.Context,
	password string,
) (PasswordAssessment, error) {
	normalized, err := NormalizePassword(password, "")
	if err != nil {
		return PasswordAssessment{}, err
	}
	return service.assessNormalizedPassword(ctx, normalized)
}

func (service *Service) SetupStatus(ctx context.Context) (SetupStatus, error) {
	count, err := service.store.CountUsers(ctx)
	if err != nil {
		return SetupStatus{}, fmt.Errorf("count users: %w", err)
	}
	return SetupStatus{Required: count == 0}, nil
}

func (service *Service) EnsureBootstrap(
	ctx context.Context,
	previousToken string,
) (string, error) {
	status, err := service.SetupStatus(ctx)
	if err != nil {
		return "", err
	}
	if !status.Required {
		return "", nil
	}
	if strings.TrimSpace(previousToken) != "" {
		valid, err := service.store.BootstrapTokenValid(
			ctx,
			hashToken(strings.TrimSpace(previousToken)),
			service.now().UTC(),
		)
		if err != nil {
			return "", fmt.Errorf("validate previous bootstrap token: %w", err)
		}
		if valid {
			return strings.TrimSpace(previousToken), nil
		}
	}
	token, hash, err := randomToken(32)
	if err != nil {
		return "", err
	}
	now := service.now().UTC()
	if err := service.store.ReplaceBootstrapToken(ctx, hash, now, now.Add(bootstrapTTL)); err != nil {
		return "", fmt.Errorf("store bootstrap token: %w", err)
	}
	return token, nil
}

func (service *Service) BeginSetupTOTP(
	ctx context.Context,
	bootstrapToken string,
	username string,
) (TOTPEnrollment, error) {
	if err := service.validateBootstrap(ctx, bootstrapToken); err != nil {
		return TOTPEnrollment{}, err
	}
	normalized, err := NormalizeUsername(username)
	if err != nil {
		return TOTPEnrollment{}, err
	}
	secret, err := newTOTPSecret()
	if err != nil {
		return TOTPEnrollment{}, err
	}
	uri := totpURI("GlassStack", normalized, secret)
	qr, err := qrDataURI(uri)
	if err != nil {
		return TOTPEnrollment{}, err
	}
	challenge, err := service.createEnrollmentChallenge(
		ctx,
		challengePurposeSetup,
		normalized,
		secret,
	)
	if err != nil {
		return TOTPEnrollment{}, err
	}

	return TOTPEnrollment{
		ChallengeToken: challenge,
		Secret:         secret,
		URI:            uri,
		QRCodeDataURI:  qr,
	}, nil
}

func (service *Service) BeginInvitationTOTP(
	ctx context.Context,
	invitationToken string,
	username string,
) (TOTPEnrollment, error) {
	invitation, err := service.store.InvitationByToken(
		ctx,
		hashToken(invitationToken),
		service.now().UTC(),
	)
	if err != nil {
		return TOTPEnrollment{}, ErrInvalidToken
	}
	if invitation.Role != RoleAdmin {
		return TOTPEnrollment{}, ErrInvalidInput
	}
	normalized, err := NormalizeUsername(username)
	if err != nil {
		return TOTPEnrollment{}, err
	}
	secret, err := newTOTPSecret()
	if err != nil {
		return TOTPEnrollment{}, err
	}
	uri := totpURI("GlassStack", normalized, secret)
	qr, err := qrDataURI(uri)
	if err != nil {
		return TOTPEnrollment{}, err
	}
	challenge, err := service.createEnrollmentChallenge(
		ctx,
		challengePurposeInvitation,
		normalized,
		secret,
	)
	if err != nil {
		return TOTPEnrollment{}, err
	}
	return TOTPEnrollment{
		ChallengeToken: challenge,
		Secret:         secret,
		URI:            uri,
		QRCodeDataURI:  qr,
	}, nil
}

func (service *Service) InvitationStatus(
	ctx context.Context,
	invitationToken string,
) (Role, error) {
	invitation, err := service.store.InvitationByToken(
		ctx,
		hashToken(invitationToken),
		service.now().UTC(),
	)
	if err != nil {
		return "", ErrInvalidToken
	}
	return invitation.Role, nil
}

func (service *Service) AcceptInvitation(
	ctx context.Context,
	input AcceptInvitationInput,
) (LoginResult, []string, error) {
	now := service.now().UTC()
	invitation, err := service.store.InvitationByToken(
		ctx,
		hashToken(input.InvitationToken),
		now,
	)
	if err != nil {
		return LoginResult{}, nil, ErrInvalidToken
	}
	normalized, err := NormalizeUsername(input.Username)
	if err != nil {
		return LoginResult{}, nil, err
	}
	password, passwordAssessment, err := service.validateNewPassword(
		ctx,
		input.Password,
		normalized,
	)
	if err != nil {
		return LoginResult{}, nil, err
	}
	passwordHash, err := HashPassword(password)
	if err != nil {
		return LoginResult{}, nil, err
	}
	userID, err := newID()
	if err != nil {
		return LoginResult{}, nil, err
	}
	user := User{
		ID:                 userID,
		Username:           strings.TrimSpace(input.Username),
		UsernameNormalized: normalized,
		PasswordHash:       passwordHash,
		Role:               invitation.Role,
		Status:             "active",
		CreatedAt:          now,
		UpdatedAt:          now,
		PasswordChangedAt:  now,
	}
	var credential *TOTPCredential
	var recoveryCodes []string
	var recoveryHashes [][]byte
	if invitation.Role == RoleAdmin {
		secret, err := service.loadEnrollmentChallenge(
			ctx,
			input.ChallengeToken,
			challengePurposeInvitation,
			normalized,
			now,
		)
		if err != nil {
			return LoginResult{}, nil, err
		}
		counter, valid := validateTOTP(secret, input.TOTPCode, now, -1)
		if !valid {
			return LoginResult{}, nil, ErrAuthentication
		}
		if _, err := service.store.ConsumeAuthChallenge(
			ctx,
			hashToken(input.ChallengeToken),
			challengePurposeInvitation,
			now,
		); err != nil {
			return LoginResult{}, nil, ErrInvalidToken
		}
		ciphertext, nonce, err := encryptSecret(service.masterKey, []byte(secret))
		if err != nil {
			return LoginResult{}, nil, err
		}
		recoveryCodes, recoveryHashes, err = newRecoveryCodes()
		if err != nil {
			return LoginResult{}, nil, err
		}
		credential = &TOTPCredential{
			UserID:           userID,
			SecretCiphertext: ciphertext,
			Nonce:            nonce,
			LastCounter:      counter,
			EnabledAt:        now,
		}
	}
	if err := service.store.AcceptInvitation(
		ctx,
		invitation,
		user,
		credential,
		recoveryHashes,
		sanitizePreferencesJSON(input.PreferencesJSON),
		now,
	); err != nil {
		return LoginResult{}, nil, err
	}
	service.recordAudit(ctx, userID, "identity.invitation.accept", userID, "success", map[string]any{
		"role":                      invitation.Role,
		"password_compromise_check": passwordAssessment.auditValue(),
	})
	sessionToken, csrfToken, err := service.createSession(
		ctx,
		userID,
		credential != nil,
	)
	if err != nil {
		return LoginResult{}, nil, err
	}
	return LoginResult{
		SessionToken: sessionToken,
		CSRFToken:    csrfToken,
		User:         user,
	}, recoveryCodes, nil
}

func (service *Service) CompleteSetup(
	ctx context.Context,
	input CompleteSetupInput,
) (LoginResult, []string, error) {
	if err := service.validateBootstrap(ctx, input.BootstrapToken); err != nil {
		return LoginResult{}, nil, err
	}
	normalized, err := NormalizeUsername(input.Username)
	if err != nil {
		return LoginResult{}, nil, err
	}
	password, passwordAssessment, err := service.validateNewPassword(
		ctx,
		input.Password,
		normalized,
	)
	if err != nil {
		return LoginResult{}, nil, err
	}
	hash, err := HashPassword(password)
	if err != nil {
		return LoginResult{}, nil, err
	}

	now := service.now().UTC()
	secret, err := service.loadEnrollmentChallenge(
		ctx,
		input.ChallengeToken,
		challengePurposeSetup,
		normalized,
		now,
	)
	if err != nil {
		return LoginResult{}, nil, err
	}
	counter, valid := validateTOTP(secret, input.TOTPCode, now, -1)
	if !valid {
		return LoginResult{}, nil, ErrAuthentication
	}
	if _, err := service.store.ConsumeAuthChallenge(
		ctx,
		hashToken(input.ChallengeToken),
		challengePurposeSetup,
		now,
	); err != nil {
		return LoginResult{}, nil, ErrInvalidToken
	}
	ciphertext, nonce, err := encryptSecret(service.masterKey, []byte(secret))
	if err != nil {
		return LoginResult{}, nil, err
	}
	recoveryCodes, recoveryHashes, err := newRecoveryCodes()
	if err != nil {
		return LoginResult{}, nil, err
	}
	userID, err := newID()
	if err != nil {
		return LoginResult{}, nil, err
	}
	preferences := sanitizePreferencesJSON(input.PreferencesJSON)
	user := User{
		ID:                 userID,
		Username:           strings.TrimSpace(input.Username),
		UsernameNormalized: normalized,
		PasswordHash:       hash,
		Role:               RoleAdmin,
		Status:             "active",
		CreatedAt:          now,
		UpdatedAt:          now,
		PasswordChangedAt:  now,
	}
	firstAdmin := FirstAdmin{
		User: user,
		TOTP: TOTPCredential{
			UserID:           userID,
			SecretCiphertext: ciphertext,
			Nonce:            nonce,
			LastCounter:      counter,
			EnabledAt:        now,
		},
		Recovery:        recoveryHashes,
		PreferencesJSON: preferences,
	}
	if err := service.store.CreateFirstAdmin(
		ctx,
		firstAdmin,
		hashToken(input.BootstrapToken),
		now,
	); err != nil {
		if errors.Is(err, ErrSetupComplete) {
			return LoginResult{}, nil, err
		}
		return LoginResult{}, nil, fmt.Errorf("create first administrator: %w", err)
	}
	service.recordAudit(ctx, userID, "identity.bootstrap.complete", userID, "success", map[string]any{
		"role":                      RoleAdmin,
		"mfa":                       true,
		"password_compromise_check": passwordAssessment.auditValue(),
	})
	sessionToken, csrfToken, err := service.createSession(ctx, userID, true)
	if err != nil {
		return LoginResult{}, nil, err
	}
	return LoginResult{
		SessionToken: sessionToken,
		CSRFToken:    csrfToken,
		User:         user,
	}, recoveryCodes, nil
}

func (service *Service) Login(
	ctx context.Context,
	username string,
	password string,
) (LoginResult, error) {
	normalized, err := NormalizeUsername(username)
	if err != nil {
		service.consumeDummyPassword(password)
		service.recordAudit(ctx, "", "identity.login.password", "", "denied", nil)
		return LoginResult{}, ErrAuthentication
	}
	user, err := service.store.FindUserByUsername(ctx, normalized)
	if err != nil {
		service.consumeDummyPassword(password)
		return LoginResult{}, ErrAuthentication
	}
	passwordValid := VerifyPassword(password, user.PasswordHash)
	if user.Status != "active" || !passwordValid {
		service.recordAudit(ctx, user.ID, "identity.login.password", user.ID, "denied", nil)
		return LoginResult{}, ErrAuthentication
	}
	_, totpErr := service.store.FindTOTP(ctx, user.ID)
	if totpErr == nil || user.Role == RoleAdmin {
		challenge, hash, err := randomToken(32)
		if err != nil {
			return LoginResult{}, err
		}
		now := service.now().UTC()
		if err := service.store.CreateAuthChallenge(ctx, AuthChallenge{
			TokenHash:   hash,
			Purpose:     challengePurposeLoginMFA,
			UserID:      user.ID,
			PayloadJSON: "{}",
			CreatedAt:   now,
			ExpiresAt:   now.Add(challengeTTL),
		}); err != nil {
			return LoginResult{}, fmt.Errorf("store login challenge: %w", err)
		}
		service.recordAudit(ctx, user.ID, "identity.login.password", user.ID, "challenge", map[string]any{
			"mfa": true,
		})
		return LoginResult{MFARequired: true, ChallengeToken: challenge}, nil
	}
	if !errors.Is(totpErr, ErrNotFound) {
		return LoginResult{}, fmt.Errorf("load totp credential: %w", totpErr)
	}
	sessionToken, csrfToken, err := service.createSession(ctx, user.ID, false)
	if err != nil {
		return LoginResult{}, err
	}
	service.recordAudit(ctx, user.ID, "identity.login", user.ID, "success", map[string]any{
		"mfa": false,
	})
	return LoginResult{SessionToken: sessionToken, CSRFToken: csrfToken, User: user}, nil
}

func (service *Service) CompleteLoginMFA(
	ctx context.Context,
	input CompleteMFAInput,
) (LoginResult, error) {
	now := service.now().UTC()
	challenge, err := service.store.ConsumeAuthChallenge(
		ctx,
		hashToken(input.ChallengeToken),
		challengePurposeLoginMFA,
		now,
	)
	if err != nil {
		service.recordAudit(ctx, "", "identity.login.mfa", "", "denied", nil)
		return LoginResult{}, ErrInvalidToken
	}
	user, err := service.store.FindUserByID(ctx, challenge.UserID)
	if err != nil || user.Status != "active" {
		return LoginResult{}, ErrAuthentication
	}
	credential, err := service.store.FindTOTP(ctx, user.ID)
	if err != nil {
		return LoginResult{}, ErrAuthentication
	}
	secret, err := decryptSecret(service.masterKey, credential.SecretCiphertext, credential.Nonce)
	if err != nil {
		return LoginResult{}, err
	}
	counter, valid := validateTOTP(string(secret), input.Code, now, credential.LastCounter)
	if valid {
		if err := service.store.UpdateTOTPCounter(ctx, user.ID, counter); err != nil {
			return LoginResult{}, fmt.Errorf("record totp counter: %w", err)
		}
	} else {
		used, recoveryErr := service.store.UseRecoveryCode(
			ctx,
			user.ID,
			hashRecoveryCode(input.Code),
			now,
		)
		if recoveryErr != nil || !used {
			service.recordAudit(ctx, user.ID, "identity.login.mfa", user.ID, "denied", nil)
			return LoginResult{}, ErrAuthentication
		}
	}
	sessionToken, csrfToken, err := service.createSession(ctx, user.ID, true)
	if err != nil {
		return LoginResult{}, err
	}
	service.recordAudit(ctx, user.ID, "identity.login.mfa", user.ID, "success", nil)
	return LoginResult{SessionToken: sessionToken, CSRFToken: csrfToken, User: user}, nil
}

func (service *Service) Authenticate(
	ctx context.Context,
	sessionToken string,
) (SessionUser, error) {
	if sessionToken == "" {
		return SessionUser{}, ErrAuthentication
	}
	session, err := service.store.FindSession(ctx, hashToken(sessionToken))
	if err != nil {
		return SessionUser{}, ErrAuthentication
	}
	now := service.now().UTC()
	if session.RevokedAt != nil ||
		!now.Before(session.IdleExpiresAt) ||
		!now.Before(session.AbsoluteExpiresAt) {
		return SessionUser{}, ErrAuthentication
	}
	user, err := service.store.FindUserByID(ctx, session.UserID)
	if err != nil || user.Status != "active" {
		return SessionUser{}, ErrAuthentication
	}
	if now.Sub(session.LastSeenAt) >= 5*time.Minute {
		nextIdle := now.Add(sessionIdleTTL)
		if nextIdle.After(session.AbsoluteExpiresAt) {
			nextIdle = session.AbsoluteExpiresAt
		}
		_ = service.store.TouchSession(ctx, session.TokenHash, now, nextIdle)
		session.LastSeenAt = now
		session.IdleExpiresAt = nextIdle
	}
	return SessionUser{User: user, Session: session}, nil
}

func (service *Service) ValidateCSRF(session Session, token string) bool {
	if token == "" {
		return false
	}
	return subtle.ConstantTimeCompare(session.CSRFHash, hashToken(token)) == 1
}

func (service *Service) Logout(ctx context.Context, sessionToken string) error {
	if sessionToken == "" {
		return nil
	}
	hash := hashToken(sessionToken)
	session, _ := service.store.FindSession(ctx, hash)
	err := service.store.RevokeSession(ctx, hash, service.now().UTC())
	if err == nil {
		service.recordAudit(ctx, session.UserID, "identity.logout", session.UserID, "success", nil)
	}
	return err
}

func (service *Service) CreateInvitation(
	ctx context.Context,
	actor User,
	role Role,
) (string, error) {
	if actor.Role != RoleAdmin || !role.Valid() {
		return "", ErrAuthorization
	}
	token, hash, err := randomToken(32)
	if err != nil {
		return "", err
	}
	now := service.now().UTC()
	if err := service.store.CreateInvitation(ctx, Invitation{
		TokenHash: hash,
		Role:      role,
		CreatedBy: actor.ID,
		CreatedAt: now,
		ExpiresAt: now.Add(invitationTTL),
	}); err != nil {
		return "", fmt.Errorf("create invitation: %w", err)
	}
	service.recordAudit(ctx, actor.ID, "identity.invitation.create", string(role), "success", map[string]any{
		"role": role,
	})
	return token, nil
}

func (service *Service) ListUsers(ctx context.Context, actor User) ([]User, error) {
	if actor.Role != RoleAdmin {
		return nil, ErrAuthorization
	}
	return service.store.ListUsers(ctx)
}

func (service *Service) ChangeUserRole(
	ctx context.Context,
	actor User,
	userID string,
	role Role,
) error {
	if actor.Role != RoleAdmin || !role.Valid() {
		return ErrAuthorization
	}
	target, err := service.store.FindUserByID(ctx, userID)
	if err != nil {
		return err
	}
	if target.Role == RoleAdmin && role != RoleAdmin {
		admins, err := service.store.CountAdmins(ctx)
		if err != nil {
			return err
		}
		if admins <= 1 {
			return fmt.Errorf("%w: at least one active administrator is required", ErrConflict)
		}
	}
	if role == RoleAdmin {
		if _, err := service.store.FindTOTP(ctx, target.ID); err != nil {
			return fmt.Errorf("%w: administrator role requires TOTP", ErrConflict)
		}
	}
	if err := service.store.SetUserRole(ctx, userID, role, service.now().UTC()); err != nil {
		return err
	}
	if err := service.store.RevokeUserSessions(ctx, userID, service.now().UTC()); err != nil {
		return err
	}
	service.recordAudit(ctx, actor.ID, "identity.user.role.change", userID, "success", map[string]any{
		"role": role,
	})
	return nil
}

func (service *Service) ChangePassword(
	ctx context.Context,
	user User,
	currentPassword string,
	newPassword string,
) error {
	stored, err := service.store.FindUserByID(ctx, user.ID)
	if err != nil || !VerifyPassword(currentPassword, stored.PasswordHash) {
		return ErrAuthentication
	}
	normalized, passwordAssessment, err := service.validateNewPassword(
		ctx,
		newPassword,
		stored.UsernameNormalized,
	)
	if err != nil {
		return err
	}
	hash, err := HashPassword(normalized)
	if err != nil {
		return err
	}
	if err := service.store.UpdatePassword(ctx, stored.ID, hash, service.now().UTC()); err != nil {
		return err
	}
	service.recordAudit(ctx, stored.ID, "identity.password.change", stored.ID, "success", map[string]any{
		"password_compromise_check": passwordAssessment.auditValue(),
	})
	return nil
}

func (service *Service) validateNewPassword(
	ctx context.Context,
	password string,
	username string,
) (string, PasswordAssessment, error) {
	normalized, err := NormalizePassword(password, username)
	if err != nil {
		return "", PasswordAssessment{}, err
	}
	assessment, err := service.assessNormalizedPassword(ctx, normalized)
	if err != nil {
		return "", PasswordAssessment{}, err
	}
	if assessment.Status == PasswordAssessmentCompromised {
		return "", assessment, ErrCompromisedPassword
	}
	return normalized, assessment, nil
}

func (service *Service) assessNormalizedPassword(
	ctx context.Context,
	password string,
) (PasswordAssessment, error) {
	sum := sha1.Sum([]byte(password))
	result, err := service.passwordChecker.Check(ctx, PasswordDigest(sum))
	if err != nil {
		return PasswordAssessment{}, fmt.Errorf("check compromised password: %w", err)
	}
	if result.Compromised {
		return PasswordAssessment{
			Status:      PasswordAssessmentCompromised,
			Occurrences: result.Occurrences,
		}, nil
	}
	if !result.Complete {
		return PasswordAssessment{Status: PasswordAssessmentUnavailable}, nil
	}
	return PasswordAssessment{Status: PasswordAssessmentSafe}, nil
}

func (assessment PasswordAssessment) auditValue() string {
	if assessment.Status == PasswordAssessmentUnavailable {
		return "local_only"
	}
	return "full"
}

func (role Role) Valid() bool {
	return role == RoleAdmin || role == RoleOperator || role == RoleViewer
}

func (service *Service) createSession(
	ctx context.Context,
	userID string,
	mfaVerified bool,
) (string, string, error) {
	sessionToken, sessionHash, err := randomToken(32)
	if err != nil {
		return "", "", err
	}
	csrfToken, csrfHash, err := randomToken(32)
	if err != nil {
		return "", "", err
	}
	now := service.now().UTC()
	var mfaVerifiedAt *time.Time
	if mfaVerified {
		mfaVerifiedAt = &now
	}
	if err := service.store.CreateSession(ctx, Session{
		TokenHash:         sessionHash,
		UserID:            userID,
		CSRFHash:          csrfHash,
		CreatedAt:         now,
		LastSeenAt:        now,
		IdleExpiresAt:     now.Add(sessionIdleTTL),
		AbsoluteExpiresAt: now.Add(sessionAbsoluteTTL),
		MFAVerifiedAt:     mfaVerifiedAt,
	}); err != nil {
		return "", "", fmt.Errorf("create session: %w", err)
	}
	return sessionToken, csrfToken, nil
}

func (service *Service) validateBootstrap(ctx context.Context, token string) error {
	status, err := service.SetupStatus(ctx)
	if err != nil {
		return err
	}
	if !status.Required {
		return ErrSetupComplete
	}
	valid, err := service.store.BootstrapTokenValid(ctx, hashToken(token), service.now().UTC())
	if err != nil {
		return fmt.Errorf("validate bootstrap token: %w", err)
	}
	if !valid {
		return ErrInvalidToken
	}
	return nil
}

func (service *Service) createEnrollmentChallenge(
	ctx context.Context,
	purpose string,
	username string,
	secret string,
) (string, error) {
	ciphertext, nonce, err := encryptSecret(service.masterKey, []byte(secret))
	if err != nil {
		return "", err
	}
	payload, err := json.Marshal(enrollmentChallengePayload{
		Username:         username,
		SecretCiphertext: ciphertext,
		Nonce:            nonce,
	})
	if err != nil {
		return "", fmt.Errorf("encode enrollment challenge: %w", err)
	}
	token, hash, err := randomToken(32)
	if err != nil {
		return "", err
	}
	now := service.now().UTC()
	if err := service.store.CreateAuthChallenge(ctx, AuthChallenge{
		TokenHash:   hash,
		Purpose:     purpose,
		PayloadJSON: string(payload),
		CreatedAt:   now,
		ExpiresAt:   now.Add(challengeTTL),
	}); err != nil {
		return "", fmt.Errorf("store enrollment challenge: %w", err)
	}
	return token, nil
}

func (service *Service) loadEnrollmentChallenge(
	ctx context.Context,
	token string,
	purpose string,
	username string,
	now time.Time,
) (string, error) {
	challenge, err := service.store.AuthChallengeByToken(
		ctx,
		hashToken(token),
		purpose,
		now,
	)
	if err != nil {
		return "", ErrInvalidToken
	}
	var payload enrollmentChallengePayload
	if err := json.Unmarshal([]byte(challenge.PayloadJSON), &payload); err != nil {
		return "", fmt.Errorf("decode enrollment challenge: %w", err)
	}
	if payload.Username != username {
		return "", ErrInvalidToken
	}
	secret, err := decryptSecret(
		service.masterKey,
		payload.SecretCiphertext,
		payload.Nonce,
	)
	if err != nil {
		return "", fmt.Errorf("decrypt enrollment challenge: %w", err)
	}
	return string(secret), nil
}

func (service *Service) consumeDummyPassword(password string) {
	_ = VerifyPassword(password, dummyPasswordHash)
}

func (service *Service) recordAudit(
	ctx context.Context,
	actorUserID string,
	action string,
	target string,
	result string,
	metadata map[string]any,
) {
	id, err := newID()
	if err != nil {
		service.logger.ErrorContext(
			ctx,
			"failed to create authentication audit event",
			"action", action,
			"error", err,
		)
		return
	}
	if metadata == nil {
		metadata = map[string]any{}
	}
	err = service.store.AppendAudit(ctx, AuditEvent{
		ID:          id,
		ActorUserID: actorUserID,
		Action:      action,
		Target:      target,
		Result:      result,
		RequestID:   observability.RequestID(ctx),
		Metadata:    metadata,
		CreatedAt:   service.now().UTC(),
	})
	if err != nil {
		service.logger.ErrorContext(
			ctx,
			"failed to persist authentication audit event",
			"request_id", observability.RequestID(ctx),
			"action", action,
			"target", target,
			"result", result,
			"error", err,
		)
	}
}

func sanitizePreferencesJSON(value string) string {
	if strings.TrimSpace(value) == "" {
		return `{"schemaVersion":1,"locale":"en-US","theme":"system","avatarPresetId":"default"}`
	}
	var decoded map[string]any
	if json.Unmarshal([]byte(value), &decoded) != nil {
		return `{"schemaVersion":1,"locale":"en-US","theme":"system","avatarPresetId":"default"}`
	}
	decoded["schemaVersion"] = 1
	encoded, err := json.Marshal(decoded)
	if err != nil {
		return `{"schemaVersion":1,"locale":"en-US","theme":"system","avatarPresetId":"default"}`
	}
	return string(encoded)
}
