package main

import (
	"bufio"
	"bytes"
	"crypto/sha1"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"golang.org/x/text/unicode/norm"
)

const (
	sourceCommit = "aeb36e9df937d1b77042e5667780e8156cd419f7"
	sourceURL    = "https://raw.githubusercontent.com/danielmiessler/SecLists/" +
		sourceCommit +
		"/Passwords/Common-Credentials/Pwdb_top-100000.txt"
	sourceSHA256 = "07f876a616f08fb2cc5c3e0ce04e4a6d1123380580472b0997baebc4e8226977"
	sourceLimit  = 100_000
	maxSource    = 32 << 20
)

type manifest struct {
	Source       string `json:"source"`
	SourceCommit string `json:"sourceCommit"`
	SourceSHA256 string `json:"sourceSha256"`
	Entries      int    `json:"entries"`
	Format       string `json:"format"`
	OutputSHA256 string `json:"outputSha256"`
}

func main() {
	output := flag.String(
		"output",
		"internal/platform/passwords/data/common-passwords.sha1bin",
		"binary blocklist output path",
	)
	manifestPath := flag.String(
		"manifest",
		"internal/platform/passwords/data/manifest.json",
		"provenance manifest output path",
	)
	flag.Parse()

	if err := run(*output, *manifestPath); err != nil {
		_, _ = fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(output string, manifestPath string) error {
	client := &http.Client{
		Timeout: 30 * time.Second,
		CheckRedirect: func(*http.Request, []*http.Request) error {
			return fmt.Errorf("source redirects are disabled")
		},
	}
	response, err := client.Get(sourceURL)
	if err != nil {
		return fmt.Errorf("download blocklist source: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("blocklist source returned status %d", response.StatusCode)
	}
	source, err := io.ReadAll(io.LimitReader(response.Body, maxSource+1))
	if err != nil {
		return fmt.Errorf("read blocklist source: %w", err)
	}
	if len(source) > maxSource {
		return fmt.Errorf("blocklist source exceeds size limit")
	}
	sourceHash := sha256.Sum256(source)
	if !strings.EqualFold(hex.EncodeToString(sourceHash[:]), sourceSHA256) {
		return fmt.Errorf("blocklist source checksum mismatch")
	}

	digests, err := digestSource(source)
	if err != nil {
		return err
	}
	data := make([]byte, 0, len(digests)*sha1.Size)
	for _, digest := range digests {
		data = append(data, digest[:]...)
	}
	if err := os.MkdirAll(filepath.Dir(output), 0o755); err != nil {
		return fmt.Errorf("create blocklist output directory: %w", err)
	}
	if err := os.WriteFile(output, data, 0o644); err != nil {
		return fmt.Errorf("write blocklist: %w", err)
	}

	outputHash := sha256.Sum256(data)
	metadata, err := json.MarshalIndent(manifest{
		Source:       sourceURL,
		SourceCommit: sourceCommit,
		SourceSHA256: sourceSHA256,
		Entries:      len(digests),
		Format:       "sorted concatenated SHA-1 digests, 20 bytes per record",
		OutputSHA256: hex.EncodeToString(outputHash[:]),
	}, "", "  ")
	if err != nil {
		return fmt.Errorf("encode blocklist manifest: %w", err)
	}
	metadata = append(metadata, '\n')
	if err := os.WriteFile(manifestPath, metadata, 0o644); err != nil {
		return fmt.Errorf("write blocklist manifest: %w", err)
	}
	return nil
}

func digestSource(source []byte) ([][sha1.Size]byte, error) {
	unique := make(map[[sha1.Size]byte]struct{}, sourceLimit)
	scanner := bufio.NewScanner(bytes.NewReader(source))
	scanner.Buffer(make([]byte, 64<<10), 1<<20)
	for scanner.Scan() && len(unique) < sourceLimit {
		password := norm.NFC.String(strings.TrimSuffix(scanner.Text(), "\r"))
		if password == "" {
			continue
		}
		unique[sha1.Sum([]byte(password))] = struct{}{}
	}
	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("scan blocklist source: %w", err)
	}
	if len(unique) != sourceLimit {
		return nil, fmt.Errorf(
			"blocklist contains %d unique entries, want %d",
			len(unique),
			sourceLimit,
		)
	}
	digests := make([][sha1.Size]byte, 0, len(unique))
	for digest := range unique {
		digests = append(digests, digest)
	}
	sort.Slice(digests, func(first, second int) bool {
		return bytes.Compare(digests[first][:], digests[second][:]) < 0
	})
	return digests, nil
}
