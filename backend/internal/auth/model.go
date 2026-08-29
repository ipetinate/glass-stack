package auth

import (
	"context"
	"errors"
	"time"
)

type Role string

const (
	RoleAdmin    Role = "admin"
	RoleOperator Role = "operator"
	RoleViewer   Role = "viewer"
)

var (
	ErrAuthentication      = errors.New("invalid credentials")
	ErrAuthorization       = errors.New("insufficient permission")
	ErrSetupComplete       = errors.New("initial setup is already complete")
	ErrSetupRequired       = errors.New("initial setup is required")
	ErrInvalidToken        = errors.New("invalid or expired token")
	ErrConflict            = errors.New("resource conflict")
	ErrInvalidInput        = errors.New("invalid input")
	ErrNotFound            = errors.New("resource not found")
	ErrCompromisedPassword = errors.New("password appears in known breaches")
)

type PasswordDigest [20]byte

type PasswordCompromiseResult struct {
	Compromised bool
	Complete    bool
	Occurrences uint64
}

type PasswordCompromiseChecker interface {
	Check(context.Context, PasswordDigest) (PasswordCompromiseResult, error)
}

type PasswordAssessmentStatus string

const (
	PasswordAssessmentSafe        PasswordAssessmentStatus = "safe"
	PasswordAssessmentCompromised PasswordAssessmentStatus = "compromised"
	PasswordAssessmentUnavailable PasswordAssessmentStatus = "unavailable"
)

type PasswordAssessment struct {
	Status      PasswordAssessmentStatus
	Occurrences uint64
}

type User struct {
	ID                 string
	Username           string
	UsernameNormalized string
	PasswordHash       string
	Role               Role
	Status             string
	CreatedAt          time.Time
	UpdatedAt          time.Time
	PasswordChangedAt  time.Time
	LastLoginAt        *time.Time
}

type Identity struct {
	ID             string
	Username       string
	Role           Role
	DisplayName    string
	AvatarURL      string
	AvatarPresetID string
}

type Session struct {
	TokenHash         []byte
	UserID            string
	CSRFHash          []byte
	CreatedAt         time.Time
	LastSeenAt        time.Time
	IdleExpiresAt     time.Time
	AbsoluteExpiresAt time.Time
	RevokedAt         *time.Time
	MFAVerifiedAt     *time.Time
}

type TOTPCredential struct {
	UserID           string
	SecretCiphertext []byte
	Nonce            []byte
	LastCounter      int64
	EnabledAt        time.Time
}

type FirstAdmin struct {
	User            User
	TOTP            TOTPCredential
	Recovery        [][]byte
	PreferencesJSON string
}

type SessionUser struct {
	User      User
	Session   Session
	CSRFToken string
}

type Invitation struct {
	TokenHash []byte
	Role      Role
	CreatedBy string
	CreatedAt time.Time
	ExpiresAt time.Time
}

type AuthChallenge struct {
	TokenHash   []byte
	Purpose     string
	UserID      string
	PayloadJSON string
	CreatedAt   time.Time
	ExpiresAt   time.Time
}

type AuditEvent struct {
	ID          string
	ActorUserID string
	Action      string
	Target      string
	Result      string
	RequestID   string
	Metadata    map[string]any
	CreatedAt   time.Time
}

type Store interface {
	SetupStore
	ChallengeStore
	UserStore
	SessionStore
	MFAStore
	InvitationStore
	AuditStore
}

type SetupStore interface {
	CountUsers(context.Context) (int, error)
	ReplaceBootstrapToken(context.Context, []byte, time.Time, time.Time) error
	BootstrapTokenValid(context.Context, []byte, time.Time) (bool, error)
	CreateFirstAdmin(context.Context, FirstAdmin, []byte, time.Time) error
}

type ChallengeStore interface {
	CreateAuthChallenge(context.Context, AuthChallenge) error
	AuthChallengeByToken(context.Context, []byte, string, time.Time) (AuthChallenge, error)
	ConsumeAuthChallenge(context.Context, []byte, string, time.Time) (AuthChallenge, error)
}

type UserStore interface {
	CountAdmins(context.Context) (int, error)
	FindUserByUsername(context.Context, string) (User, error)
	FindUserByID(context.Context, string) (User, error)
	ListUsers(context.Context) ([]User, error)
	ListIdentities(context.Context) ([]Identity, error)
	SetUserRole(context.Context, string, Role, time.Time) error
	UpdatePassword(context.Context, string, string, time.Time) error
	CreateUser(context.Context, User, *TOTPCredential, [][]byte, string) error
	DeleteUser(context.Context, string) (bool, error)
}

type SessionStore interface {
	CreateSession(context.Context, Session) error
	FindSession(context.Context, []byte) (Session, error)
	TouchSession(context.Context, []byte, time.Time, time.Time) error
	RevokeSession(context.Context, []byte, time.Time) error
	RevokeUserSessions(context.Context, string, time.Time) error
}

type MFAStore interface {
	FindTOTP(context.Context, string) (TOTPCredential, error)
	UpdateTOTPCounter(context.Context, string, int64) error
	UseRecoveryCode(context.Context, string, []byte, time.Time) (bool, error)
	ReplaceTOTP(context.Context, TOTPCredential, [][]byte) error
}

type InvitationStore interface {
	CreateInvitation(context.Context, Invitation) error
	InvitationByToken(context.Context, []byte, time.Time) (Invitation, error)
	AcceptInvitation(context.Context, Invitation, User, *TOTPCredential, [][]byte, string, time.Time) error
}

type AuditStore interface {
	AppendAudit(context.Context, AuditEvent) error
}
