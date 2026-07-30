package passwords

import (
	"bytes"
	"context"
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/ipetinate/glass-stack/backend/internal/auth"
)

const (
	ModeHybrid = "hybrid"
	ModeLocal  = "local"

	digestBytes    = 20
	maxRangeBytes  = 128 << 10
	hibpRangeURL   = "https://api.pwnedpasswords.com/range/"
	requestTimeout = 3 * time.Second
)

//go:embed data/common-passwords.sha1bin data/manifest.json
var passwordData embed.FS

type dataManifest struct {
	Entries      int    `json:"entries"`
	OutputSHA256 string `json:"outputSha256"`
}

type rangeClient interface {
	Check(context.Context, auth.PasswordDigest) (uint64, error)
}

type Checker struct {
	local  []byte
	remote rangeClient
}

func New(mode string) (*Checker, error) {
	local, err := passwordData.ReadFile("data/common-passwords.sha1bin")
	if err != nil {
		return nil, fmt.Errorf("read embedded password blocklist: %w", err)
	}
	encodedManifest, err := passwordData.ReadFile("data/manifest.json")
	if err != nil {
		return nil, fmt.Errorf("read embedded password blocklist manifest: %w", err)
	}
	var manifest dataManifest
	if err := json.Unmarshal(encodedManifest, &manifest); err != nil {
		return nil, fmt.Errorf("decode embedded password blocklist manifest: %w", err)
	}
	outputHash := sha256.Sum256(local)
	if manifest.Entries*digestBytes != len(local) ||
		!strings.EqualFold(
			manifest.OutputSHA256,
			hex.EncodeToString(outputHash[:]),
		) {
		return nil, fmt.Errorf("embedded password blocklist failed integrity check")
	}
	var remote rangeClient
	switch mode {
	case ModeHybrid:
		remote = newHIBPClient(hibpRangeURL)
	case ModeLocal:
	default:
		return nil, fmt.Errorf("unsupported password compromise mode %q", mode)
	}
	return newChecker(local, remote)
}

func newChecker(local []byte, remote rangeClient) (*Checker, error) {
	if len(local) == 0 || len(local)%digestBytes != 0 {
		return nil, fmt.Errorf("password blocklist has invalid length")
	}
	for offset := digestBytes; offset < len(local); offset += digestBytes {
		if bytes.Compare(local[offset-digestBytes:offset], local[offset:offset+digestBytes]) >= 0 {
			return nil, fmt.Errorf("password blocklist must be strictly sorted")
		}
	}
	return &Checker{
		local:  append([]byte(nil), local...),
		remote: remote,
	}, nil
}

func (checker *Checker) Check(
	ctx context.Context,
	digest auth.PasswordDigest,
) (auth.PasswordCompromiseResult, error) {
	if checker.contains(digest) {
		return auth.PasswordCompromiseResult{Compromised: true}, nil
	}
	if checker.remote == nil {
		return auth.PasswordCompromiseResult{Complete: false}, nil
	}
	occurrences, err := checker.remote.Check(ctx, digest)
	if err != nil {
		if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
			if ctx.Err() != nil {
				return auth.PasswordCompromiseResult{}, ctx.Err()
			}
		}
		return auth.PasswordCompromiseResult{Complete: false}, nil
	}
	return auth.PasswordCompromiseResult{
		Compromised: occurrences > 0,
		Complete:    true,
		Occurrences: occurrences,
	}, nil
}

func (checker *Checker) contains(digest auth.PasswordDigest) bool {
	low, high := 0, len(checker.local)/digestBytes
	for low < high {
		middle := int(uint(low+high) >> 1)
		candidate := checker.local[middle*digestBytes : (middle+1)*digestBytes]
		comparison := bytes.Compare(candidate, digest[:])
		if comparison < 0 {
			low = middle + 1
			continue
		}
		if comparison > 0 {
			high = middle
			continue
		}
		return true
	}
	return false
}

type hibpClient struct {
	baseURL string
	client  *http.Client
}

func newHIBPClient(baseURL string) *hibpClient {
	return &hibpClient{
		baseURL: baseURL,
		client: &http.Client{
			Timeout: requestTimeout,
			CheckRedirect: func(*http.Request, []*http.Request) error {
				return errors.New("redirects are disabled")
			},
		},
	}
}

func (client *hibpClient) Check(
	ctx context.Context,
	digest auth.PasswordDigest,
) (uint64, error) {
	encoded := strings.ToUpper(hex.EncodeToString(digest[:]))
	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		client.baseURL+encoded[:5],
		nil,
	)
	if err != nil {
		return 0, fmt.Errorf("create pwned-password request: %w", err)
	}
	request.Header.Set("Add-Padding", "true")
	request.Header.Set("User-Agent", "GlassStack password-compromise-check")

	response, err := client.client.Do(request)
	if err != nil {
		return 0, fmt.Errorf("request pwned-password range: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("pwned-password range returned status %d", response.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(response.Body, maxRangeBytes+1))
	if err != nil {
		return 0, fmt.Errorf("read pwned-password range: %w", err)
	}
	if len(body) > maxRangeBytes {
		return 0, fmt.Errorf("pwned-password range exceeds response limit")
	}
	return findSuffix(body, encoded[5:])
}

func findSuffix(body []byte, expected string) (uint64, error) {
	for _, rawLine := range bytes.Split(body, []byte{'\n'}) {
		line := strings.TrimSpace(string(rawLine))
		if line == "" {
			continue
		}
		suffix, rawCount, found := strings.Cut(line, ":")
		if !found || len(suffix) != 35 {
			return 0, fmt.Errorf("pwned-password range contains malformed entry")
		}
		if !isHex(suffix) {
			return 0, fmt.Errorf("pwned-password range contains invalid hash suffix")
		}
		count, err := strconv.ParseUint(rawCount, 10, 64)
		if err != nil {
			return 0, fmt.Errorf("pwned-password range contains invalid occurrence count")
		}
		if strings.EqualFold(suffix, expected) {
			return count, nil
		}
	}
	return 0, nil
}

func isHex(value string) bool {
	for _, character := range value {
		if character >= '0' && character <= '9' ||
			character >= 'a' && character <= 'f' ||
			character >= 'A' && character <= 'F' {
			continue
		}
		return false
	}
	return true
}
