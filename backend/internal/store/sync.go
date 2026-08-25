package store

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

type SourceClient struct {
	http       *http.Client
	commitsURL string
	webURL     string
	tarballURL string
	token      string
}

func NewSourceClient(
	httpClient *http.Client,
	commitsBaseURL string,
	webBaseURL string,
	tarballBaseURL string,
	token string,
) *SourceClient {
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	if webBaseURL == "" {
		webBaseURL = "https://github.com"
	}
	return &SourceClient{
		http:       httpClient,
		commitsURL: strings.TrimSuffix(commitsBaseURL, "/"),
		webURL:     strings.TrimSuffix(webBaseURL, "/"),
		tarballURL: strings.TrimSuffix(tarballBaseURL, "/"),
		token:      strings.TrimSpace(token),
	}
}

// HasServerToken reports whether a server-wide GitHub token is configured.
func (client *SourceClient) HasServerToken() bool {
	return client.token != ""
}

func (client *SourceClient) LatestCommit(
	ctx context.Context,
	repository string,
	branch string,
	knownETag string,
) (string, string, bool, error) {
	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		fmt.Sprintf("%s/repos/%s/commits/%s", client.commitsURL, repository, branch),
		nil,
	)
	if err != nil {
		return "", "", false, fmt.Errorf("prepare commits request: %w", err)
	}
	request.Header.Set("Accept", "application/vnd.github+json")
	if knownETag != "" {
		request.Header.Set("If-None-Match", knownETag)
	}

	response, err := client.http.Do(request)
	if err != nil {
		return "", "", false, fmt.Errorf("request latest commit: %w", err)
	}
	defer response.Body.Close()

	if response.StatusCode == http.StatusNotModified {
		return "", knownETag, false, nil
	}
	if response.StatusCode != http.StatusOK {
		return "", "", false, fmt.Errorf("commits endpoint returned %d", response.StatusCode)
	}

	var payload struct {
		SHA string `json:"sha"`
	}
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return "", "", false, fmt.Errorf("decode commit payload: %w", err)
	}
	if payload.SHA == "" {
		return "", "", false, fmt.Errorf("commit payload sem sha")
	}
	return payload.SHA, strings.TrimSpace(response.Header.Get("ETag")), true, nil
}

func (client *SourceClient) DownloadTarball(
	ctx context.Context,
	repository string,
	branch string,
) ([]byte, error) {
	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		fmt.Sprintf("%s/%s/tar.gz/refs/heads/%s", client.tarballURL, repository, branch),
		nil,
	)
	if err != nil {
		return nil, fmt.Errorf("prepare tarball request: %w", err)
	}
	response, err := client.http.Do(request)
	if err != nil {
		return nil, fmt.Errorf("download tarball: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("tarball endpoint returned %d", response.StatusCode)
	}
	content, err := io.ReadAll(io.LimitReader(response.Body, 256<<20))
	if err != nil {
		return nil, fmt.Errorf("read tarball: %w", err)
	}
	return content, nil
}

func ExtractApps(tarball []byte, destination string) (map[string]string, error) {
	reader := bytes.NewReader(tarball)
	gzipReader, err := gzip.NewReader(reader)
	if err != nil {
		return nil, fmt.Errorf("open gzip stream: %w", err)
	}
	defer gzipReader.Close()

	manifests := map[string]string{}
	tarReader := tar.NewReader(gzipReader)
	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("read tar entry: %w", err)
		}
		cleaned := filepath.Clean(header.Name)
		if strings.Contains(cleaned, "..") || filepath.IsAbs(cleaned) {
			continue
		}
		parts := strings.SplitN(cleaned, "/", 2)
		if len(parts) < 2 || parts[0] == "" {
			continue
		}
		relative := parts[1]
		target := filepath.Join(destination, relative)

		switch header.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, 0o755); err != nil {
				return nil, fmt.Errorf("create directory %s: %w", relative, err)
			}
		case tar.TypeReg:
			if !strings.HasPrefix(relative, "apps/") {
				continue
			}
			relativeWithinApps := strings.TrimPrefix(relative, "apps/")
			if strings.Count(relativeWithinApps, "/") > 2 {
				continue
			}
			if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
				return nil, fmt.Errorf("create directory for %s: %w", relative, err)
			}
			file, err := os.OpenFile(target, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o644)
			if err != nil {
				return nil, fmt.Errorf("write %s: %w", relative, err)
			}
			_, copyErr := io.Copy(file, io.LimitReader(tarReader, 256<<20))
			closeErr := file.Close()
			if copyErr != nil {
				return nil, fmt.Errorf("copy %s: %w", relative, copyErr)
			}
			if closeErr != nil {
				return nil, fmt.Errorf("close %s: %w", relative, closeErr)
			}

			base := filepath.Base(relative)
			if strings.Count(relativeWithinApps, "/") == 1 &&
				(base == "docker-compose.yaml" || base == "docker-compose.yml") {
				appDir := strings.SplitN(relativeWithinApps, "/", 2)[0]
				content, readErr := os.ReadFile(target)
				if readErr != nil {
					return nil, fmt.Errorf("read manifest %s: %w", relative, readErr)
				}
				manifests[appDir] = string(content)
			}
		default:
		}
	}
	if len(manifests) == 0 {
		return nil, fmt.Errorf("nenhum docker-compose encontrado em apps/")
	}
	return manifests, nil
}
