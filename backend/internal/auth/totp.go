package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"crypto/sha256"
	"encoding/base32"
	"encoding/base64"
	"encoding/binary"
	"fmt"
	"net/url"
	"strings"
	"time"

	qrcode "github.com/skip2/go-qrcode"
)

const totpStep = 30 * time.Second

func newTOTPSecret() (string, error) {
	secret := make([]byte, 20)
	if _, err := rand.Read(secret); err != nil {
		return "", fmt.Errorf("generate totp secret: %w", err)
	}
	return base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(secret), nil
}

func totpURI(issuer, account, secret string) string {
	label := url.PathEscape(issuer + ":" + account)
	values := url.Values{}
	values.Set("secret", secret)
	values.Set("issuer", issuer)
	values.Set("algorithm", "SHA1")
	values.Set("digits", "6")
	values.Set("period", "30")
	return "otpauth://totp/" + label + "?" + values.Encode()
}

func qrDataURI(uri string) (string, error) {
	png, err := qrcode.Encode(uri, qrcode.Medium, 256)
	if err != nil {
		return "", fmt.Errorf("encode totp qr: %w", err)
	}
	return "data:image/png;base64," + base64Std(png), nil
}

func validateTOTP(secret, code string, now time.Time, lastCounter int64) (int64, bool) {
	if len(code) != 6 {
		return 0, false
	}
	counter := now.Unix() / int64(totpStep/time.Second)
	for offset := int64(-1); offset <= 1; offset++ {
		candidateCounter := counter + offset
		if candidateCounter <= lastCounter {
			continue
		}
		if hmac.Equal([]byte(generateTOTP(secret, candidateCounter)), []byte(code)) {
			return candidateCounter, true
		}
	}
	return 0, false
}

func generateTOTP(secret string, counter int64) string {
	key, err := base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(strings.ToUpper(secret))
	if err != nil {
		return ""
	}
	message := make([]byte, 8)
	binary.BigEndian.PutUint64(message, uint64(counter))
	mac := hmac.New(sha1.New, key)
	_, _ = mac.Write(message)
	sum := mac.Sum(nil)
	offset := sum[len(sum)-1] & 0x0f
	binaryCode := (uint32(sum[offset])&0x7f)<<24 |
		uint32(sum[offset+1])<<16 |
		uint32(sum[offset+2])<<8 |
		uint32(sum[offset+3])
	return fmt.Sprintf("%06d", binaryCode%1_000_000)
}

func newRecoveryCodes() ([]string, [][]byte, error) {
	codes := make([]string, 10)
	hashes := make([][]byte, 10)
	for index := range codes {
		raw := make([]byte, 8)
		if _, err := rand.Read(raw); err != nil {
			return nil, nil, fmt.Errorf("generate recovery code: %w", err)
		}
		code := strings.ToUpper(base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(raw))
		code = code[:6] + "-" + code[6:]
		codes[index] = code
		hash := sha256.Sum256([]byte(strings.ReplaceAll(code, "-", "")))
		hashes[index] = hash[:]
	}
	return codes, hashes, nil
}

func hashRecoveryCode(code string) []byte {
	normalized := strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(code), "-", ""))
	hash := sha256.Sum256([]byte(normalized))
	return hash[:]
}

func base64Std(value []byte) string {
	return base64.StdEncoding.EncodeToString(value)
}
