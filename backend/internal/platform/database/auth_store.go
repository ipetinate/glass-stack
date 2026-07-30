package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/ipetinate/glass-stack/backend/internal/auth"
)

type AuthStore struct {
	database *Database
}

func NewAuthStore(database *Database) *AuthStore {
	return &AuthStore{database: database}
}

func (store *AuthStore) CountUsers(ctx context.Context) (int, error) {
	var count int
	err := store.database.db.QueryRowContext(ctx, "SELECT COUNT(1) FROM users").Scan(&count)
	return count, err
}

func (store *AuthStore) CountAdmins(ctx context.Context) (int, error) {
	var count int
	err := store.database.db.QueryRowContext(
		ctx,
		"SELECT COUNT(1) FROM users WHERE role = 'admin' AND status = 'active'",
	).Scan(&count)
	return count, err
}

func (store *AuthStore) ReplaceBootstrapToken(
	ctx context.Context,
	hash []byte,
	createdAt time.Time,
	expiresAt time.Time,
) error {
	return store.database.Write(ctx, func(transaction *sql.Tx) error {
		if _, err := transaction.ExecContext(ctx, "DELETE FROM bootstrap_tokens"); err != nil {
			return err
		}
		_, err := transaction.ExecContext(
			ctx,
			`INSERT INTO bootstrap_tokens(token_hash, created_at, expires_at)
			 VALUES(?, ?, ?)`,
			hash,
			formatTime(createdAt),
			formatTime(expiresAt),
		)
		return err
	})
}

func (store *AuthStore) BootstrapTokenValid(
	ctx context.Context,
	hash []byte,
	now time.Time,
) (bool, error) {
	var count int
	err := store.database.db.QueryRowContext(
		ctx,
		`SELECT COUNT(1) FROM bootstrap_tokens
		 WHERE token_hash = ? AND consumed_at IS NULL AND expires_at > ?`,
		hash,
		formatTime(now),
	).Scan(&count)
	return count == 1, err
}

func (store *AuthStore) CreateFirstAdmin(
	ctx context.Context,
	first auth.FirstAdmin,
	bootstrapHash []byte,
	consumedAt time.Time,
) error {
	return store.database.Write(ctx, func(transaction *sql.Tx) error {
		var count int
		if err := transaction.QueryRowContext(ctx, "SELECT COUNT(1) FROM users").Scan(&count); err != nil {
			return err
		}
		if count != 0 {
			return auth.ErrSetupComplete
		}
		var tokenCount int
		if err := transaction.QueryRowContext(
			ctx,
			`SELECT COUNT(1) FROM bootstrap_tokens
			 WHERE token_hash = ? AND consumed_at IS NULL AND expires_at > ?`,
			bootstrapHash,
			formatTime(consumedAt),
		).Scan(&tokenCount); err != nil {
			return err
		}
		if tokenCount != 1 {
			return auth.ErrInvalidToken
		}
		if err := insertUser(ctx, transaction, first.User); err != nil {
			return err
		}
		if err := insertTOTP(ctx, transaction, first.TOTP); err != nil {
			return err
		}
		for _, recoveryHash := range first.Recovery {
			if _, err := transaction.ExecContext(
				ctx,
				`INSERT INTO mfa_recovery_codes(user_id, code_hash) VALUES(?, ?)`,
				first.User.ID,
				recoveryHash,
			); err != nil {
				return err
			}
		}
		if _, err := transaction.ExecContext(
			ctx,
			`INSERT INTO user_preferences(user_id, revision, preferences_json, updated_at)
			 VALUES(?, 1, ?, ?)`,
			first.User.ID,
			first.PreferencesJSON,
			formatTime(consumedAt),
		); err != nil {
			return err
		}
		_, err := transaction.ExecContext(
			ctx,
			`UPDATE bootstrap_tokens SET consumed_at = ?
			 WHERE token_hash = ? AND consumed_at IS NULL`,
			formatTime(consumedAt),
			bootstrapHash,
		)
		return err
	})
}

func (store *AuthStore) FindUserByUsername(
	ctx context.Context,
	normalized string,
) (auth.User, error) {
	return scanUser(store.database.db.QueryRowContext(
		ctx,
		`SELECT id, username, username_normalized, password_hash, role, status,
		        created_at, updated_at, password_changed_at, last_login_at
		   FROM users WHERE username_normalized = ?`,
		normalized,
	))
}

func (store *AuthStore) FindUserByID(ctx context.Context, id string) (auth.User, error) {
	return scanUser(store.database.db.QueryRowContext(
		ctx,
		`SELECT id, username, username_normalized, password_hash, role, status,
		        created_at, updated_at, password_changed_at, last_login_at
		   FROM users WHERE id = ?`,
		id,
	))
}

func (store *AuthStore) ListUsers(ctx context.Context) ([]auth.User, error) {
	rows, err := store.database.db.QueryContext(
		ctx,
		`SELECT id, username, username_normalized, password_hash, role, status,
		        created_at, updated_at, password_changed_at, last_login_at
		   FROM users ORDER BY username_normalized`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]auth.User, 0)
	for rows.Next() {
		user, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, rows.Err()
}

func (store *AuthStore) SetUserRole(
	ctx context.Context,
	id string,
	role auth.Role,
	updatedAt time.Time,
) error {
	_, err := store.database.db.ExecContext(
		ctx,
		"UPDATE users SET role = ?, updated_at = ? WHERE id = ?",
		role,
		formatTime(updatedAt),
		id,
	)
	return err
}

func (store *AuthStore) SetUserStatus(
	ctx context.Context,
	id string,
	status string,
	updatedAt time.Time,
) error {
	_, err := store.database.db.ExecContext(
		ctx,
		"UPDATE users SET status = ?, updated_at = ? WHERE id = ?",
		status,
		formatTime(updatedAt),
		id,
	)
	return err
}

func (store *AuthStore) UpdatePassword(
	ctx context.Context,
	id string,
	passwordHash string,
	updatedAt time.Time,
) error {
	return store.database.Write(ctx, func(transaction *sql.Tx) error {
		if _, err := transaction.ExecContext(
			ctx,
			`UPDATE users
			    SET password_hash = ?, password_changed_at = ?, updated_at = ?
			  WHERE id = ?`,
			passwordHash,
			formatTime(updatedAt),
			formatTime(updatedAt),
			id,
		); err != nil {
			return err
		}
		_, err := transaction.ExecContext(
			ctx,
			"UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL",
			formatTime(updatedAt),
			id,
		)
		return err
	})
}

func (store *AuthStore) CreateSession(ctx context.Context, session auth.Session) error {
	_, err := store.database.db.ExecContext(
		ctx,
		`INSERT INTO sessions(
			token_hash, user_id, csrf_hash, created_at, last_seen_at,
			idle_expires_at, absolute_expires_at, mfa_verified_at
		) VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
		session.TokenHash,
		session.UserID,
		session.CSRFHash,
		formatTime(session.CreatedAt),
		formatTime(session.LastSeenAt),
		formatTime(session.IdleExpiresAt),
		formatTime(session.AbsoluteExpiresAt),
		formatOptionalTime(session.MFAVerifiedAt),
	)
	return err
}

func (store *AuthStore) FindSession(
	ctx context.Context,
	hash []byte,
) (auth.Session, error) {
	var session auth.Session
	var createdAt, lastSeenAt, idleExpiresAt, absoluteExpiresAt string
	var revokedAt, mfaVerifiedAt sql.NullString
	err := store.database.db.QueryRowContext(
		ctx,
		`SELECT token_hash, user_id, csrf_hash, created_at, last_seen_at,
		        idle_expires_at, absolute_expires_at, revoked_at, mfa_verified_at
		   FROM sessions WHERE token_hash = ?`,
		hash,
	).Scan(
		&session.TokenHash,
		&session.UserID,
		&session.CSRFHash,
		&createdAt,
		&lastSeenAt,
		&idleExpiresAt,
		&absoluteExpiresAt,
		&revokedAt,
		&mfaVerifiedAt,
	)
	if err != nil {
		return auth.Session{}, err
	}
	session.CreatedAt, err = parseTime(createdAt)
	if err != nil {
		return auth.Session{}, err
	}
	session.LastSeenAt, err = parseTime(lastSeenAt)
	if err != nil {
		return auth.Session{}, err
	}
	session.IdleExpiresAt, err = parseTime(idleExpiresAt)
	if err != nil {
		return auth.Session{}, err
	}
	session.AbsoluteExpiresAt, err = parseTime(absoluteExpiresAt)
	if err != nil {
		return auth.Session{}, err
	}
	session.RevokedAt, err = parseOptionalTime(revokedAt)
	if err != nil {
		return auth.Session{}, err
	}
	session.MFAVerifiedAt, err = parseOptionalTime(mfaVerifiedAt)
	return session, err
}

func (store *AuthStore) TouchSession(
	ctx context.Context,
	hash []byte,
	lastSeenAt time.Time,
	idleExpiresAt time.Time,
) error {
	_, err := store.database.db.ExecContext(
		ctx,
		`UPDATE sessions SET last_seen_at = ?, idle_expires_at = ?
		 WHERE token_hash = ? AND revoked_at IS NULL`,
		formatTime(lastSeenAt),
		formatTime(idleExpiresAt),
		hash,
	)
	return err
}

func (store *AuthStore) RevokeSession(
	ctx context.Context,
	hash []byte,
	revokedAt time.Time,
) error {
	_, err := store.database.db.ExecContext(
		ctx,
		"UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL",
		formatTime(revokedAt),
		hash,
	)
	return err
}

func (store *AuthStore) RevokeUserSessions(
	ctx context.Context,
	userID string,
	revokedAt time.Time,
) error {
	_, err := store.database.db.ExecContext(
		ctx,
		"UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL",
		formatTime(revokedAt),
		userID,
	)
	return err
}

func (store *AuthStore) FindTOTP(
	ctx context.Context,
	userID string,
) (auth.TOTPCredential, error) {
	var credential auth.TOTPCredential
	var enabledAt string
	err := store.database.db.QueryRowContext(
		ctx,
		`SELECT user_id, secret_ciphertext, nonce, last_counter, enabled_at
		   FROM totp_credentials WHERE user_id = ?`,
		userID,
	).Scan(
		&credential.UserID,
		&credential.SecretCiphertext,
		&credential.Nonce,
		&credential.LastCounter,
		&enabledAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return auth.TOTPCredential{}, auth.ErrNotFound
		}
		return auth.TOTPCredential{}, err
	}
	credential.EnabledAt, err = parseTime(enabledAt)
	return credential, err
}

func (store *AuthStore) UpdateTOTPCounter(
	ctx context.Context,
	userID string,
	counter int64,
) error {
	result, err := store.database.db.ExecContext(
		ctx,
		`UPDATE totp_credentials SET last_counter = ?
		 WHERE user_id = ? AND last_counter < ?`,
		counter,
		userID,
		counter,
	)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected != 1 {
		return auth.ErrAuthentication
	}
	return nil
}

func (store *AuthStore) UseRecoveryCode(
	ctx context.Context,
	userID string,
	codeHash []byte,
	usedAt time.Time,
) (bool, error) {
	result, err := store.database.db.ExecContext(
		ctx,
		`UPDATE mfa_recovery_codes SET used_at = ?
		 WHERE user_id = ? AND code_hash = ? AND used_at IS NULL`,
		formatTime(usedAt),
		userID,
		codeHash,
	)
	if err != nil {
		return false, err
	}
	affected, err := result.RowsAffected()
	return affected == 1, err
}

func (store *AuthStore) ReplaceTOTP(
	ctx context.Context,
	credential auth.TOTPCredential,
	recovery [][]byte,
) error {
	return store.database.Write(ctx, func(transaction *sql.Tx) error {
		if _, err := transaction.ExecContext(
			ctx,
			"DELETE FROM mfa_recovery_codes WHERE user_id = ?",
			credential.UserID,
		); err != nil {
			return err
		}
		if _, err := transaction.ExecContext(
			ctx,
			"DELETE FROM totp_credentials WHERE user_id = ?",
			credential.UserID,
		); err != nil {
			return err
		}
		if err := insertTOTP(ctx, transaction, credential); err != nil {
			return err
		}
		for _, hash := range recovery {
			if _, err := transaction.ExecContext(
				ctx,
				"INSERT INTO mfa_recovery_codes(user_id, code_hash) VALUES(?, ?)",
				credential.UserID,
				hash,
			); err != nil {
				return err
			}
		}
		return nil
	})
}

func (store *AuthStore) CreateInvitation(
	ctx context.Context,
	invitation auth.Invitation,
) error {
	_, err := store.database.db.ExecContext(
		ctx,
		`INSERT INTO invitations(token_hash, role, created_by, created_at, expires_at)
		 VALUES(?, ?, ?, ?, ?)`,
		invitation.TokenHash,
		invitation.Role,
		invitation.CreatedBy,
		formatTime(invitation.CreatedAt),
		formatTime(invitation.ExpiresAt),
	)
	return err
}

func (store *AuthStore) InvitationByToken(
	ctx context.Context,
	hash []byte,
	now time.Time,
) (auth.Invitation, error) {
	var invitation auth.Invitation
	var role string
	var createdAt, expiresAt string
	err := store.database.db.QueryRowContext(
		ctx,
		`SELECT token_hash, role, created_by, created_at, expires_at
		   FROM invitations
		  WHERE token_hash = ? AND used_at IS NULL AND revoked_at IS NULL AND expires_at > ?`,
		hash,
		formatTime(now),
	).Scan(
		&invitation.TokenHash,
		&role,
		&invitation.CreatedBy,
		&createdAt,
		&expiresAt,
	)
	if err != nil {
		return auth.Invitation{}, err
	}
	invitation.Role = auth.Role(role)
	invitation.CreatedAt, err = parseTime(createdAt)
	if err != nil {
		return auth.Invitation{}, err
	}
	invitation.ExpiresAt, err = parseTime(expiresAt)
	return invitation, err
}

func (store *AuthStore) AcceptInvitation(
	ctx context.Context,
	invitation auth.Invitation,
	user auth.User,
	credential *auth.TOTPCredential,
	recovery [][]byte,
	preferencesJSON string,
	usedAt time.Time,
) error {
	return store.database.Write(ctx, func(transaction *sql.Tx) error {
		var count int
		if err := transaction.QueryRowContext(
			ctx,
			`SELECT COUNT(1) FROM invitations
			 WHERE token_hash = ? AND used_at IS NULL AND revoked_at IS NULL AND expires_at > ?`,
			invitation.TokenHash,
			formatTime(usedAt),
		).Scan(&count); err != nil {
			return err
		}
		if count != 1 {
			return auth.ErrInvalidToken
		}
		if err := insertUser(ctx, transaction, user); err != nil {
			return err
		}
		if credential != nil {
			if err := insertTOTP(ctx, transaction, *credential); err != nil {
				return err
			}
			for _, hash := range recovery {
				if _, err := transaction.ExecContext(
					ctx,
					"INSERT INTO mfa_recovery_codes(user_id, code_hash) VALUES(?, ?)",
					user.ID,
					hash,
				); err != nil {
					return err
				}
			}
		}
		if _, err := transaction.ExecContext(
			ctx,
			`INSERT INTO user_preferences(user_id, revision, preferences_json, updated_at)
			 VALUES(?, 1, ?, ?)`,
			user.ID,
			preferencesJSON,
			formatTime(usedAt),
		); err != nil {
			return err
		}
		_, err := transaction.ExecContext(
			ctx,
			"UPDATE invitations SET used_at = ? WHERE token_hash = ?",
			formatTime(usedAt),
			invitation.TokenHash,
		)
		return err
	})
}

func (store *AuthStore) AppendAudit(ctx context.Context, event auth.AuditEvent) error {
	metadata, err := json.Marshal(event.Metadata)
	if err != nil {
		return err
	}
	_, err = store.database.db.ExecContext(
		ctx,
		`INSERT INTO audit_events(
			id, actor_user_id, action, target, result, request_id,
			metadata_json, created_at
		) VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
		event.ID,
		nullableString(event.ActorUserID),
		event.Action,
		nullableString(event.Target),
		event.Result,
		nullableString(event.RequestID),
		string(metadata),
		formatTime(event.CreatedAt),
	)
	return err
}

func insertUser(ctx context.Context, transaction *sql.Tx, user auth.User) error {
	_, err := transaction.ExecContext(
		ctx,
		`INSERT INTO users(
			id, username, username_normalized, password_hash, role, status,
			created_at, updated_at, password_changed_at, last_login_at
		) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		user.ID,
		user.Username,
		user.UsernameNormalized,
		user.PasswordHash,
		user.Role,
		user.Status,
		formatTime(user.CreatedAt),
		formatTime(user.UpdatedAt),
		formatTime(user.PasswordChangedAt),
		formatOptionalTime(user.LastLoginAt),
	)
	if err != nil && isUniqueConstraint(err) {
		return auth.ErrConflict
	}
	return err
}

func insertTOTP(
	ctx context.Context,
	transaction *sql.Tx,
	credential auth.TOTPCredential,
) error {
	_, err := transaction.ExecContext(
		ctx,
		`INSERT INTO totp_credentials(
			user_id, secret_ciphertext, nonce, last_counter, enabled_at
		) VALUES(?, ?, ?, ?, ?)`,
		credential.UserID,
		credential.SecretCiphertext,
		credential.Nonce,
		credential.LastCounter,
		formatTime(credential.EnabledAt),
	)
	return err
}

type scanner interface {
	Scan(...any) error
}

func scanUser(row scanner) (auth.User, error) {
	var user auth.User
	var role string
	var createdAt, updatedAt, passwordChangedAt string
	var lastLoginAt sql.NullString
	err := row.Scan(
		&user.ID,
		&user.Username,
		&user.UsernameNormalized,
		&user.PasswordHash,
		&role,
		&user.Status,
		&createdAt,
		&updatedAt,
		&passwordChangedAt,
		&lastLoginAt,
	)
	if err != nil {
		return auth.User{}, err
	}
	user.Role = auth.Role(role)
	user.CreatedAt, err = parseTime(createdAt)
	if err != nil {
		return auth.User{}, err
	}
	user.UpdatedAt, err = parseTime(updatedAt)
	if err != nil {
		return auth.User{}, err
	}
	user.PasswordChangedAt, err = parseTime(passwordChangedAt)
	if err != nil {
		return auth.User{}, err
	}
	user.LastLoginAt, err = parseOptionalTime(lastLoginAt)
	return user, err
}

func formatTime(value time.Time) string {
	return value.UTC().Format(time.RFC3339Nano)
}

func formatOptionalTime(value *time.Time) any {
	if value == nil {
		return nil
	}
	return formatTime(*value)
}

func parseTime(value string) (time.Time, error) {
	parsed, err := time.Parse(time.RFC3339Nano, value)
	if err != nil {
		return time.Time{}, fmt.Errorf("parse database timestamp: %w", err)
	}
	return parsed, nil
}

func parseOptionalTime(value sql.NullString) (*time.Time, error) {
	if !value.Valid {
		return nil, nil
	}
	parsed, err := parseTime(value.String)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}

func isUniqueConstraint(err error) bool {
	return err != nil && !errors.Is(err, sql.ErrNoRows) &&
		contains(err.Error(), "UNIQUE constraint failed")
}

func contains(value, fragment string) bool {
	for index := 0; index+len(fragment) <= len(value); index++ {
		if value[index:index+len(fragment)] == fragment {
			return true
		}
	}
	return false
}

func nullableString(value string) any {
	if value == "" {
		return nil
	}
	return value
}
