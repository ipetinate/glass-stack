package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/ipetinate/glass-stack/backend/internal/settings"
)

type SettingsStore struct {
	database *Database
}

func NewSettingsStore(database *Database) *SettingsStore {
	return &SettingsStore{database: database}
}

func (store *SettingsStore) GetPreferences(
	ctx context.Context,
	userID string,
) (settings.PreferenceRecord, error) {
	var record settings.PreferenceRecord
	var encoded, updatedAt string
	err := store.database.db.QueryRowContext(
		ctx,
		`SELECT user_id, revision, preferences_json, updated_at
		   FROM user_preferences WHERE user_id = ?`,
		userID,
	).Scan(&record.UserID, &record.Revision, &encoded, &updatedAt)
	if err != nil {
		return settings.PreferenceRecord{}, err
	}
	if err := json.Unmarshal([]byte(encoded), &record.Preferences); err != nil {
		return settings.PreferenceRecord{}, fmt.Errorf("decode preferences: %w", err)
	}
	record.UpdatedAt, err = parseTime(updatedAt)
	return record, err
}

func (store *SettingsStore) UpdatePreferences(
	ctx context.Context,
	record settings.PreferenceRecord,
	expectedRevision int,
) error {
	encoded, err := json.Marshal(record.Preferences)
	if err != nil {
		return err
	}
	result, err := store.database.db.ExecContext(
		ctx,
		`UPDATE user_preferences
		    SET revision = ?, preferences_json = ?, updated_at = ?
		  WHERE user_id = ? AND revision = ?`,
		record.Revision,
		string(encoded),
		formatTime(record.UpdatedAt),
		record.UserID,
		expectedRevision,
	)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected != 1 {
		return settings.ErrRevisionConflict
	}
	return nil
}

func (store *SettingsStore) CreateWallpaper(
	ctx context.Context,
	wallpaper settings.Wallpaper,
	asset *settings.MediaAsset,
) (string, error) {
	metadata, err := json.Marshal(wallpaper.Metadata)
	if err != nil {
		return "", err
	}
	var resolvedAssetID string
	err = store.database.Write(ctx, func(transaction *sql.Tx) error {
		assetID := wallpaper.MediaAssetID
		if asset != nil {
			err := transaction.QueryRowContext(
				ctx,
				`SELECT id FROM media_assets WHERE sha256 = ?`,
				asset.SHA256,
			).Scan(&assetID)
			if err != nil && err != sql.ErrNoRows {
				return err
			}
			if err == sql.ErrNoRows {
				assetID = asset.ID
				if _, err := transaction.ExecContext(
					ctx,
					`INSERT INTO media_assets(
					id, owner_user_id, kind, storage_path, media_type, byte_size,
					width, height, sha256, created_at
				) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					asset.ID,
					asset.OwnerUserID,
					asset.Kind,
					asset.StoragePath,
					asset.MediaType,
					asset.ByteSize,
					asset.Width,
					asset.Height,
					asset.SHA256,
					formatTime(asset.CreatedAt),
				); err != nil {
					return err
				}
			}
		}
		resolvedAssetID = assetID
		_, err := transaction.ExecContext(
			ctx,
			`INSERT INTO wallpapers(
				id, owner_user_id, media_asset_id, source, provider_id, title,
				description, author_name, author_url, source_url, download_location,
				license_name, license_url, metadata_json, created_at
			) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			wallpaper.ID,
			wallpaper.OwnerUserID,
			nullable(assetID),
			wallpaper.Source,
			nullable(wallpaper.ProviderID),
			wallpaper.Title,
			wallpaper.Description,
			nullable(wallpaper.AuthorName),
			nullable(wallpaper.AuthorURL),
			nullable(wallpaper.SourceURL),
			nullable(wallpaper.DownloadLocation),
			nullable(wallpaper.LicenseName),
			nullable(wallpaper.LicenseURL),
			string(metadata),
			formatTime(wallpaper.CreatedAt),
		)
		return err
	})
	return resolvedAssetID, err
}

func (store *SettingsStore) GetWallpaper(
	ctx context.Context,
	userID string,
	wallpaperID string,
) (settings.Wallpaper, *settings.MediaAsset, error) {
	var wallpaper settings.Wallpaper
	var mediaAssetID, providerID, authorName, authorURL, sourceURL sql.NullString
	var downloadLocation, licenseName, licenseURL sql.NullString
	var metadata, createdAt string
	err := store.database.db.QueryRowContext(
		ctx,
		`SELECT id, owner_user_id, media_asset_id, source, provider_id, title,
		        description, author_name, author_url, source_url, download_location,
		        license_name, license_url, metadata_json, created_at
		   FROM wallpapers WHERE id = ? AND owner_user_id = ?`,
		wallpaperID,
		userID,
	).Scan(
		&wallpaper.ID,
		&wallpaper.OwnerUserID,
		&mediaAssetID,
		&wallpaper.Source,
		&providerID,
		&wallpaper.Title,
		&wallpaper.Description,
		&authorName,
		&authorURL,
		&sourceURL,
		&downloadLocation,
		&licenseName,
		&licenseURL,
		&metadata,
		&createdAt,
	)
	if err != nil {
		return settings.Wallpaper{}, nil, err
	}
	wallpaper.MediaAssetID = mediaAssetID.String
	wallpaper.ProviderID = providerID.String
	wallpaper.AuthorName = authorName.String
	wallpaper.AuthorURL = authorURL.String
	wallpaper.SourceURL = sourceURL.String
	wallpaper.DownloadLocation = downloadLocation.String
	wallpaper.LicenseName = licenseName.String
	wallpaper.LicenseURL = licenseURL.String
	if err := json.Unmarshal([]byte(metadata), &wallpaper.Metadata); err != nil {
		return settings.Wallpaper{}, nil, err
	}
	wallpaper.CreatedAt, err = parseTime(createdAt)
	if err != nil {
		return settings.Wallpaper{}, nil, err
	}
	if !mediaAssetID.Valid {
		return wallpaper, nil, nil
	}
	var asset settings.MediaAsset
	var assetCreatedAt string
	err = store.database.db.QueryRowContext(
		ctx,
		`SELECT id, owner_user_id, kind, storage_path, media_type, byte_size,
		        width, height, sha256, created_at
		   FROM media_assets WHERE id = ?`,
		mediaAssetID.String,
	).Scan(
		&asset.ID,
		&asset.OwnerUserID,
		&asset.Kind,
		&asset.StoragePath,
		&asset.MediaType,
		&asset.ByteSize,
		&asset.Width,
		&asset.Height,
		&asset.SHA256,
		&assetCreatedAt,
	)
	if err != nil {
		return settings.Wallpaper{}, nil, err
	}
	asset.CreatedAt, err = parseTime(assetCreatedAt)
	return wallpaper, &asset, err
}

func nullable(value string) any {
	if value == "" {
		return nil
	}
	return value
}
