package store

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"time"
)

const reviewIssueLabel = "glass-review"

var ErrReviewsUnavailable = errors.New("avaliações indisponíveis")
var ErrInvalidReview = errors.New("avaliação inválida")
var ErrServerTokenRequired = fmt.Errorf("publicar avaliação exige autenticação")

type githubIssue struct {
	Number int    `json:"number"`
	Title  string `json:"title"`
}

type githubUser struct {
	Login string `json:"login"`
}

type githubComment struct {
	ID        int        `json:"id"`
	User      githubUser `json:"user"`
	Body      string     `json:"body"`
	CreatedAt time.Time  `json:"created_at"`
}

func (client *SourceClient) newGitHubRequest(
	ctx context.Context,
	method string,
	url string,
	body io.Reader,
) (*http.Request, error) {
	return client.newGitHubRequestAs(ctx, method, url, body, client.token)
}

func (client *SourceClient) newGitHubRequestAs(
	ctx context.Context,
	method string,
	url string,
	body io.Reader,
	token string,
) (*http.Request, error) {
	request, err := http.NewRequestWithContext(ctx, method, url, body)
	if err != nil {
		return nil, err
	}
	request.Header.Set("Accept", "application/vnd.github+json")
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
	}
	return request, nil
}

func (client *SourceClient) getJSON(
	ctx context.Context,
	url string,
	target any,
) error {
	request, err := client.newGitHubRequest(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	response, err := client.http.Do(request)
	if err != nil {
		return fmt.Errorf("request %s: %w", url, err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("%w: endpoint %s returned %d", ErrReviewsUnavailable, url, response.StatusCode)
	}
	return json.NewDecoder(response.Body).Decode(target)
}

func issueTitleFor(appID string) string {
	return "[review] " + appID
}

func appIDFromIssueTitle(title string) (string, bool) {
	if !strings.HasPrefix(title, "[review] ") {
		return "", false
	}
	appID := strings.TrimSpace(strings.TrimPrefix(title, "[review] "))
	if appID == "" || !slugPattern.MatchString(appID) {
		return "", false
	}
	return appID, true
}

var reviewMetaPattern = regexp.MustCompile(`\A<!--\s*glass-review\s+(\{[^}]*\})\s*-->`)

type reviewMeta struct {
	Rating   int    `json:"rating"`
	Author   string `json:"author"`
	Avatar   string `json:"avatar"`
	Provider string `json:"provider"`
}

func parseReviewComments(comments []githubComment) []ReviewDTO {
	reviews := make([]ReviewDTO, 0, len(comments))
	for _, comment := range comments {
		body := strings.TrimSpace(comment.Body)
		if body == "" {
			continue
		}
		meta := reviewMeta{}
		snippet := body
		if matches := reviewMetaPattern.FindStringSubmatch(body); matches != nil {
			_ = json.Unmarshal([]byte(matches[1]), &meta)
			snippet = strings.TrimSpace(body[len(matches[0]):])
		}
		if snippet == "" {
			continue
		}
		author := meta.Author
		if author == "" {
			author = comment.User.Login
		}
		rating := meta.Rating
		if rating < 1 || rating > 5 {
			rating = 0
		}
		provider := meta.Provider
		if provider == "" && comment.User.Login != "" && meta.Author == "" {
			provider = ProviderGitHub
		}
		reviews = append(reviews, ReviewDTO{
			ID:       fmt.Sprintf("gh-%d", comment.ID),
			Author:   author,
			Avatar:   meta.Avatar,
			Provider: provider,
			PostedAt: comment.CreatedAt.UTC().Format(time.RFC3339),
			Snippet:  snippet,
			Rating:   rating,
		})
	}
	sort.SliceStable(reviews, func(a, b int) bool { return reviews[a].PostedAt > reviews[b].PostedAt })
	return reviews
}

// FetchReviews returns community reviews grouped by application id.
func (client *SourceClient) FetchReviews(
	ctx context.Context,
	repository string,
) (map[string][]ReviewDTO, error) {
	reviews := map[string][]ReviewDTO{}
	for page := 1; page <= 3; page++ {
		var issues []githubIssue
		listURL := fmt.Sprintf(
			"%s/repos/%s/issues?state=all&labels=%s&per_page=100&page=%d",
			client.commitsURL,
			repository,
			reviewIssueLabel,
			page,
		)
		if err := client.getJSON(ctx, listURL, &issues); err != nil {
			return nil, err
		}
		for _, issue := range issues {
			appID, ok := appIDFromIssueTitle(issue.Title)
			if !ok {
				continue
			}
			var comments []githubComment
			commentsURL := fmt.Sprintf(
				"%s/repos/%s/issues/%d/comments?per_page=100",
				client.commitsURL,
				repository,
				issue.Number,
			)
			if err := client.getJSON(ctx, commentsURL, &comments); err != nil {
				continue
			}
			if parsed := parseReviewComments(comments); len(parsed) > 0 {
				reviews[appID] = parsed
			}
		}
		if len(issues) < 100 {
			break
		}
	}
	return reviews, nil
}

// CreateReview posts a new review as a comment on the per-app review issue.
// GitHub-authenticated reviewers publish with their own token; Google (or
// anonymous local) reviews are published through the server token with the
// identity embedded in the comment metadata.
func (client *SourceClient) CreateReview(
	ctx context.Context,
	repository string,
	appID string,
	rating int,
	text string,
	identity reviewerIdentity,
	fallbackAuthor string,
) error {
	issueNumber, err := client.findOrCreateReviewIssue(ctx, repository, appID)
	if err != nil {
		return err
	}

	var (
		endpoint   = client.commitsURL
		token      = client.token
		meta       = reviewMeta{Rating: rating}
		payloadKey = "body"
	)
	switch {
	case identity.Provider == ProviderGitHub && identity.Token != "":
		token = identity.Token
	case identity.Provider == ProviderGoogle && identity.Login != "":
		if !client.HasServerToken() {
			return fmt.Errorf("%w: avaliações com Google exigem GLASS_GITHUB_TOKEN no servidor", ErrServerTokenRequired)
		}
		meta.Author = identity.Login
		meta.Avatar = identity.Avatar
		meta.Provider = ProviderGoogle
	default:
		if !client.HasServerToken() {
			return ErrServerTokenRequired
		}
		meta.Author = fallbackAuthor
	}

	body := fmt.Sprintf("<!-- glass-review %s -->\n%s", mustMarshalMeta(meta), strings.TrimSpace(text))
	payload, marshalErr := json.Marshal(map[string]string{payloadKey: body})
	if marshalErr != nil {
		return marshalErr
	}
	commentURL := fmt.Sprintf(
		"%s/repos/%s/issues/%d/comments",
		endpoint,
		repository,
		issueNumber,
	)
	if err := client.postGitHubAs(ctx, commentURL, payload, token); err != nil {
		return err
	}
	return nil
}

func mustMarshalMeta(meta reviewMeta) string {
	encoded, _ := json.Marshal(meta)
	return string(encoded)
}

func (client *SourceClient) findOrCreateReviewIssue(
	ctx context.Context,
	repository string,
	appID string,
) (int, error) {
	title := issueTitleFor(appID)
	for page := 1; page <= 3; page++ {
		var issues []githubIssue
		listURL := fmt.Sprintf(
			"%s/repos/%s/issues?state=all&labels=%s&per_page=100&page=%d",
			client.commitsURL,
			repository,
			reviewIssueLabel,
			page,
		)
		if err := client.getJSON(ctx, listURL, &issues); err != nil {
			return 0, err
		}
		for _, issue := range issues {
			if issue.Title == title {
				return issue.Number, nil
			}
		}
		if len(issues) < 100 {
			break
		}
	}
	payload, marshalErr := json.Marshal(map[string]any{
		"title":  title,
		"body":   fmt.Sprintf("Avaliações da comunidade para **%s**.", appID),
		"labels": []string{reviewIssueLabel},
	})
	if marshalErr != nil {
		return 0, marshalErr
	}
	var created struct {
		Number int `json:"number"`
	}
	createURL := fmt.Sprintf("%s/repos/%s/issues", client.commitsURL, repository)
	if err := client.postGitHubJSON(ctx, createURL, payload, &created); err != nil {
		return 0, err
	}
	if created.Number == 0 {
		return 0, fmt.Errorf("%w: could not create review issue", ErrReviewsUnavailable)
	}
	return created.Number, nil
}

func (client *SourceClient) postGitHub(
	ctx context.Context,
	url string,
	payload []byte,
) error {
	return client.postGitHubAs(ctx, url, payload, client.token)
}

func (client *SourceClient) postGitHubJSON(
	ctx context.Context,
	url string,
	payload []byte,
	target any,
) error {
	request, err := client.newGitHubRequestAs(ctx, http.MethodPost, url, bytes.NewReader(payload), client.token)
	if err != nil {
		return err
	}
	response, err := client.http.Do(request)
	if err != nil {
		return fmt.Errorf("request %s: %w", url, err)
	}
	defer response.Body.Close()
	if response.StatusCode >= 300 {
		if response.StatusCode == http.StatusUnauthorized ||
			response.StatusCode == http.StatusForbidden ||
			response.StatusCode == http.StatusNotFound {
			return fmt.Errorf(
				"%w: GitHub recusou a operação (%d). Verifique o token configurado.",
				ErrReviewsUnavailable,
				response.StatusCode,
			)
		}
		return fmt.Errorf("%w: endpoint %s returned %d", ErrReviewsUnavailable, url, response.StatusCode)
	}
	if target == nil {
		return nil
	}
	return json.NewDecoder(response.Body).Decode(target)
}

func (client *SourceClient) postGitHubAs(
	ctx context.Context,
	url string,
	payload []byte,
	token string,
) error {
	request, err := client.newGitHubRequestAs(ctx, http.MethodPost, url, bytes.NewReader(payload), token)
	if err != nil {
		return err
	}
	response, err := client.http.Do(request)
	if err != nil {
		return fmt.Errorf("request %s: %w", url, err)
	}
	defer response.Body.Close()
	if response.StatusCode >= 300 {
		if response.StatusCode == http.StatusUnauthorized ||
			response.StatusCode == http.StatusForbidden ||
			response.StatusCode == http.StatusNotFound {
			return fmt.Errorf(
				"%w: GitHub recusou a operação (%d). Verifique o token configurado.",
				ErrReviewsUnavailable,
				response.StatusCode,
			)
		}
		return fmt.Errorf("%w: endpoint %s returned %d", ErrReviewsUnavailable, url, response.StatusCode)
	}
	return nil
}
