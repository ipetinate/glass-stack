package auth_test

import (
	"context"
	"crypto/hmac"
	"crypto/sha1"
	"encoding/base32"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"path/filepath"
	"testing"
	"time"

	"github.com/ipetinate/glass-stack/backend/internal/auth"
	"github.com/ipetinate/glass-stack/backend/internal/observability"
	"github.com/ipetinate/glass-stack/backend/internal/platform/database"
	"github.com/ipetinate/glass-stack/backend/internal/platform/secrets"
)

func TestAuthenticationLifecycleWithSQLite(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	directory := t.TempDir()
	db, err := database.Open(ctx, filepath.Join(directory, "glass-stack.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })

	masterKey, err := secrets.LoadOrCreateMasterKey(
		filepath.Join(directory, "master.key"),
	)
	if err != nil {
		t.Fatal(err)
	}
	service, err := auth.NewService(
		database.NewAuthStore(db),
		masterKey,
		safePasswordChecker{},
		slog.New(slog.NewTextHandler(io.Discard, nil)),
	)
	if err != nil {
		t.Fatal(err)
	}

	bootstrapToken, err := service.EnsureBootstrap(ctx)
	if err != nil || bootstrapToken == "" {
		t.Fatalf("EnsureBootstrap() token = %q, err = %v", bootstrapToken, err)
	}
	enrollment, err := service.BeginSetupTOTP(ctx, bootstrapToken, "owner")
	if err != nil {
		t.Fatal(err)
	}
	service, err = auth.NewService(
		database.NewAuthStore(db),
		masterKey,
		safePasswordChecker{},
		slog.New(slog.NewTextHandler(io.Discard, nil)),
	)
	if err != nil {
		t.Fatal(err)
	}
	setup, recoveryCodes, err := service.CompleteSetup(ctx, auth.CompleteSetupInput{
		BootstrapToken: bootstrapToken,
		ChallengeToken: enrollment.ChallengeToken,
		Username:       "owner",
		Password:       "correct but unique passphrase",
		TOTPCode:       currentTOTP(t, enrollment.Secret),
		PreferencesJSON: `{
			"schemaVersion":1,
			"locale":"pt-BR",
			"theme":"dark",
			"avatarPresetId":"default",
			"wallpaperId":"preset-dark"
		}`,
	})
	if err != nil {
		t.Fatal(err)
	}
	if setup.User.Role != auth.RoleAdmin || len(recoveryCodes) != 10 {
		t.Fatalf("unexpected setup result: role=%q recovery=%d", setup.User.Role, len(recoveryCodes))
	}
	if !service.ValidateCSRF(
		mustAuthenticate(t, service, setup.SessionToken).Session,
		setup.CSRFToken,
	) {
		t.Fatal("setup CSRF token was not accepted")
	}
	if _, _, err := service.CompleteSetup(ctx, auth.CompleteSetupInput{
		BootstrapToken: bootstrapToken,
	}); !errors.Is(err, auth.ErrSetupComplete) {
		t.Fatalf("replayed bootstrap err = %v, want ErrSetupComplete", err)
	}

	login, err := service.Login(ctx, "owner", "correct but unique passphrase")
	if err != nil || !login.MFARequired {
		t.Fatalf("Login() result=%+v err=%v", login, err)
	}
	service, err = auth.NewService(
		database.NewAuthStore(db),
		masterKey,
		safePasswordChecker{},
		slog.New(slog.NewTextHandler(io.Discard, nil)),
	)
	if err != nil {
		t.Fatal(err)
	}
	completed, err := service.CompleteLoginMFA(ctx, auth.CompleteMFAInput{
		ChallengeToken: login.ChallengeToken,
		Code:           recoveryCodes[0],
	})
	if err != nil {
		t.Fatal(err)
	}
	if completed.SessionToken == "" || completed.CSRFToken == "" {
		t.Fatal("MFA login did not issue session credentials")
	}
	if _, err := service.CompleteLoginMFA(ctx, auth.CompleteMFAInput{
		ChallengeToken: login.ChallengeToken,
		Code:           recoveryCodes[1],
	}); !errors.Is(err, auth.ErrInvalidToken) {
		t.Fatalf("replayed MFA challenge err = %v, want ErrInvalidToken", err)
	}

	requestContext := observability.WithRequestID(ctx, "integration-request-id")
	invitationToken, err := service.CreateInvitation(
		requestContext,
		setup.User,
		auth.RoleViewer,
	)
	if err != nil {
		t.Fatal(err)
	}
	invited, invitedRecovery, err := service.AcceptInvitation(ctx, auth.AcceptInvitationInput{
		InvitationToken: invitationToken,
		Username:        "viewer",
		Password:        "another unique passphrase",
		PreferencesJSON: `{"schemaVersion":1,"locale":"en-US","theme":"system","avatarPresetId":"default"}`,
	})
	if err != nil {
		t.Fatal(err)
	}
	if invited.User.Role != auth.RoleViewer || len(invitedRecovery) != 0 {
		t.Fatalf("unexpected invited user: role=%q recovery=%d", invited.User.Role, len(invitedRecovery))
	}

	if err := service.ChangeUserRole(ctx, setup.User, setup.User.ID, auth.RoleViewer); !errors.Is(err, auth.ErrConflict) {
		t.Fatalf("demoting last admin err = %v, want ErrConflict", err)
	}
	users, err := service.ListUsers(ctx, setup.User)
	if err != nil || len(users) != 2 {
		t.Fatalf("ListUsers() count=%d err=%v", len(users), err)
	}

	preferences, err := database.NewSettingsStore(db).GetPreferences(ctx, setup.User.ID)
	if err != nil {
		t.Fatal(err)
	}
	if preferences.Preferences.WallpaperID != "preset-dark" ||
		preferences.Preferences.Locale != "pt-BR" {
		t.Fatalf("preferences were not preserved: %+v", preferences.Preferences)
	}

	var auditCount int
	if err := db.SQL().QueryRow("SELECT COUNT(1) FROM audit_events").Scan(&auditCount); err != nil {
		t.Fatal(err)
	}
	if auditCount < 5 {
		t.Fatalf("audit event count = %d, want at least 5", auditCount)
	}
	var auditRequestID string
	if err := db.SQL().QueryRow(
		`SELECT request_id FROM audit_events
		  WHERE action = 'identity.invitation.create'
		  ORDER BY created_at DESC LIMIT 1`,
	).Scan(&auditRequestID); err != nil {
		t.Fatal(err)
	}
	if auditRequestID != "integration-request-id" {
		t.Fatalf("audit request ID = %q", auditRequestID)
	}

	backup := filepath.Join(directory, "backups", "control-plane.db")
	if err := db.Backup(ctx, backup); err != nil {
		t.Fatal(err)
	}
	backupDB, err := database.Open(ctx, backup)
	if err != nil {
		t.Fatal(err)
	}
	if err := backupDB.QuickCheck(ctx); err != nil {
		t.Fatal(err)
	}
	_ = backupDB.Close()

}

type safePasswordChecker struct{}

func (safePasswordChecker) Check(
	context.Context,
	auth.PasswordDigest,
) (auth.PasswordCompromiseResult, error) {
	return auth.PasswordCompromiseResult{Complete: true}, nil
}

func mustAuthenticate(
	t *testing.T,
	service *auth.Service,
	token string,
) auth.SessionUser {
	t.Helper()
	session, err := service.Authenticate(context.Background(), token)
	if err != nil {
		t.Fatal(err)
	}
	return session
}

func currentTOTP(t *testing.T, secret string) string {
	t.Helper()
	decoded, err := base32.StdEncoding.WithPadding(base32.NoPadding).
		DecodeString(secret)
	if err != nil {
		t.Fatal(err)
	}
	counter := uint64(time.Now().UTC().Unix() / 30)
	message := make([]byte, 8)
	binary.BigEndian.PutUint64(message, counter)
	mac := hmac.New(sha1.New, decoded)
	_, _ = mac.Write(message)
	sum := mac.Sum(nil)
	offset := sum[len(sum)-1] & 0x0f
	value := (uint32(sum[offset])&0x7f)<<24 |
		uint32(sum[offset+1])<<16 |
		uint32(sum[offset+2])<<8 |
		uint32(sum[offset+3])
	return fmt.Sprintf("%06d", value%1_000_000)
}
