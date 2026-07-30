package auth

import (
	"context"
	"errors"
	"testing"
)

func TestValidateNewPasswordRejectsCompromisedPassword(t *testing.T) {
	t.Parallel()

	service := &Service{
		passwordChecker: staticPasswordChecker{
			result: PasswordCompromiseResult{
				Compromised: true,
				Complete:    true,
				Occurrences: 88,
			},
		},
	}
	_, assessment, err := service.validateNewPassword(
		context.Background(),
		"an otherwise valid passphrase",
		"owner",
	)
	if !errors.Is(err, ErrCompromisedPassword) {
		t.Fatalf("err = %v, want ErrCompromisedPassword", err)
	}
	if assessment.Status != PasswordAssessmentCompromised ||
		assessment.Occurrences != 88 {
		t.Fatalf("assessment = %+v", assessment)
	}
}

func TestValidateNewPasswordAllowsLocalOnlyAssessment(t *testing.T) {
	t.Parallel()

	service := &Service{
		passwordChecker: staticPasswordChecker{
			result: PasswordCompromiseResult{Complete: false},
		},
	}
	password, assessment, err := service.validateNewPassword(
		context.Background(),
		"an offline unique passphrase",
		"owner",
	)
	if err != nil {
		t.Fatal(err)
	}
	if password != "an offline unique passphrase" ||
		assessment.Status != PasswordAssessmentUnavailable {
		t.Fatalf("password = %q, assessment = %+v", password, assessment)
	}
	if assessment.auditValue() != "local_only" {
		t.Fatalf("audit value = %q", assessment.auditValue())
	}
}

func TestCheckPasswordReportsSafeResult(t *testing.T) {
	t.Parallel()

	service := &Service{
		passwordChecker: staticPasswordChecker{
			result: PasswordCompromiseResult{Complete: true},
		},
	}
	assessment, err := service.CheckPassword(
		context.Background(),
		"a sufficiently long unique passphrase",
	)
	if err != nil {
		t.Fatal(err)
	}
	if assessment.Status != PasswordAssessmentSafe {
		t.Fatalf("assessment = %+v", assessment)
	}
}

type staticPasswordChecker struct {
	result PasswordCompromiseResult
	err    error
}

func (checker staticPasswordChecker) Check(
	context.Context,
	PasswordDigest,
) (PasswordCompromiseResult, error) {
	return checker.result, checker.err
}
