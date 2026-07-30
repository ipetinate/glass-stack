package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"strconv"
	"strings"
	"unicode/utf8"

	"golang.org/x/crypto/argon2"
	"golang.org/x/text/unicode/norm"
)

const (
	argonMemory      = 19 * 1024
	argonIterations  = 2
	argonParallelism = 1
	argonKeyLength   = 32
)

var passwordWork = make(chan struct{}, 1)

// Generated once so an unknown username performs the same expensive password
// verification as a known username without doubling the request cost.
var dummyPasswordHash, _ = HashPassword("glass-stack-dummy-password")

func NormalizeUsername(username string) (string, error) {
	normalized := strings.ToLower(strings.TrimSpace(username))
	if len(normalized) < 3 || len(normalized) > 32 {
		return "", fmt.Errorf("%w: username must contain 3 to 32 characters", ErrInvalidInput)
	}
	for index, character := range normalized {
		valid := character >= 'a' && character <= 'z' ||
			character >= '0' && character <= '9' ||
			(index > 0 && (character == '.' || character == '_' || character == '-'))
		if !valid {
			return "", fmt.Errorf("%w: username contains unsupported characters", ErrInvalidInput)
		}
	}
	return normalized, nil
}

func NormalizePassword(password string, username string) (string, error) {
	password = norm.NFC.String(password)
	length := utf8.RuneCountInString(password)
	if length < 15 || length > 128 {
		return "", fmt.Errorf("%w: password must contain 15 to 128 characters", ErrInvalidInput)
	}
	lower := strings.ToLower(password)
	if username != "" && strings.Contains(lower, strings.ToLower(username)) {
		return "", fmt.Errorf("%w: password must not contain the username", ErrInvalidInput)
	}
	return password, nil
}

func HashPassword(password string) (string, error) {
	passwordWork <- struct{}{}
	defer func() { <-passwordWork }()

	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("generate password salt: %w", err)
	}
	hash := argon2.IDKey(
		[]byte(password),
		salt,
		argonIterations,
		argonMemory,
		argonParallelism,
		argonKeyLength,
	)
	return fmt.Sprintf(
		"$argon2id$v=19$m=%d,t=%d,p=%d$%s$%s",
		argonMemory,
		argonIterations,
		argonParallelism,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(hash),
	), nil
}

func VerifyPassword(password, encoded string) bool {
	passwordWork <- struct{}{}
	defer func() { <-passwordWork }()

	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[1] != "argon2id" || parts[2] != "v=19" {
		return false
	}
	parameters := strings.Split(parts[3], ",")
	if len(parameters) != 3 {
		return false
	}
	memory, okMemory := parseParameter(parameters[0], "m")
	iterations, okIterations := parseParameter(parameters[1], "t")
	parallelism, okParallelism := parseParameter(parameters[2], "p")
	if !okMemory || !okIterations || !okParallelism ||
		memory > 256*1024 || iterations > 10 || parallelism > 8 {
		return false
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false
	}
	expected, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil || len(expected) == 0 {
		return false
	}
	actual := argon2.IDKey(
		[]byte(norm.NFC.String(password)),
		salt,
		uint32(iterations),
		uint32(memory),
		uint8(parallelism),
		uint32(len(expected)),
	)
	return subtle.ConstantTimeCompare(actual, expected) == 1
}

func parseParameter(value, name string) (uint64, bool) {
	prefix := name + "="
	if !strings.HasPrefix(value, prefix) {
		return 0, false
	}
	parsed, err := strconv.ParseUint(strings.TrimPrefix(value, prefix), 10, 32)
	return parsed, err == nil
}
