package auth_test

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"path/filepath"
	"testing"

	"github.com/ipetinate/glass-stack/backend/internal/auth"
	"github.com/ipetinate/glass-stack/backend/internal/platform/database"
	"github.com/ipetinate/glass-stack/backend/internal/platform/secrets"
)

func TestListIdentitiesAndUnlockWithSQLite(t *testing.T) {
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

	bootstrapToken, err := service.EnsureBootstrap(ctx, "")
	if err != nil {
		t.Fatal(err)
	}
	enrollment, err := service.BeginSetupTOTP(ctx, bootstrapToken, "owner")
	if err != nil {
		t.Fatal(err)
	}
	setup, _, err := service.CompleteSetup(ctx, auth.CompleteSetupInput{
		BootstrapToken: bootstrapToken,
		ChallengeToken: enrollment.ChallengeToken,
		Username:       "owner",
		Password:       "correct but unique passphrase",
		TOTPCode:       currentTOTP(t, enrollment.Secret),
		PreferencesJSON: `{
			"schemaVersion":1,
			"locale":"pt-BR",
			"theme":"dark",
			"avatarPresetId":"admin",
			"displayName":"Owner",
			"lockScreen":{"autoLockMinutes":5}
		}`,
	})
	if err != nil {
		t.Fatal(err)
	}

	identities, err := service.ListIdentities(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(identities) != 1 {
		t.Fatalf("ListIdentities() count = %d, want 1", len(identities))
	}
	identity := identities[0]
	if identity.Username != "owner" ||
		identity.Role != auth.RoleAdmin ||
		identity.DisplayName != "Owner" ||
		identity.AvatarPresetID != "admin" ||
		identity.AvatarURL != "" {
		t.Fatalf("identity = %+v", identity)
	}

	unlocked, err := service.Unlock(ctx, setup.User, "correct but unique passphrase")
	if err != nil || unlocked.ID != setup.User.ID {
		t.Fatalf("Unlock() user = %+v, err = %v", unlocked, err)
	}
	if _, err := service.Unlock(ctx, setup.User, "wrong password"); !errors.Is(err, auth.ErrAuthentication) {
		t.Fatalf("Unlock() with bad password err = %v, want ErrAuthentication", err)
	}

	invitationToken, err := service.CreateInvitation(ctx, setup.User, auth.RoleViewer)
	if err != nil {
		t.Fatal(err)
	}
	if _, _, err := service.AcceptInvitation(ctx, auth.AcceptInvitationInput{
		InvitationToken: invitationToken,
		Username:        "viewer",
		Password:        "another unique passphrase",
		PreferencesJSON: `{"schemaVersion":1,"locale":"en-US","theme":"system","avatarPresetId":"default"}`,
	}); err != nil {
		t.Fatal(err)
	}

	identities, err = service.ListIdentities(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(identities) != 2 {
		t.Fatalf("ListIdentities() count = %d, want 2", len(identities))
	}

	viewerUnlocked, err := service.Unlock(ctx, setup.User, "another unique passphrase")
	if err == nil {
		t.Fatalf("Unlock() as another user succeeded: %+v", viewerUnlocked)
	}
	if !errors.Is(err, auth.ErrAuthentication) {
		t.Fatalf("Unlock() cross-user err = %v, want ErrAuthentication", err)
	}
}
