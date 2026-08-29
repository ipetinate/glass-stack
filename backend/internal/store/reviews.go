package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"sort"
	"strings"
	"time"
)

const discussionReviewCategory = "announcements"

var ErrReviewsUnavailable = errors.New("avaliações indisponíveis")
var ErrInvalidReview = errors.New("avaliação inválida")
var ErrDuplicateReview = errors.New("você já avaliou este aplicativo")
var ErrEditWindowExpired = errors.New("janela de edição expirada")
var ErrAlreadyEdited = errors.New("avaliação já foi editada")
var ErrReviewNotFound = errors.New("avaliação não encontrada")
var ErrServerTokenRequired = fmt.Errorf("publicar avaliação exige autenticação")

const reviewEditWindow = 10 * time.Minute

type reviewMeta struct {
	Rating   int    `json:"rating"`
	Author   string `json:"author"`
	Avatar   string `json:"avatar"`
	Provider string `json:"provider"`
	Edits    int    `json:"edits,omitempty"`
	EditedAt string `json:"editedAt,omitempty"`
}

var reviewMetaPattern = regexp.MustCompile(`\A<!--\s*glass-review\s+(\{[^}]*\})\s*-->`)

func discussionTitleFor(appID string) string {
	return "Reviews: " + appID
}

func appIDFromDiscussionTitle(title string) (string, bool) {
	if !strings.HasPrefix(title, "Reviews: ") {
		return "", false
	}
	appID := strings.TrimSpace(strings.TrimPrefix(title, "Reviews: "))
	if appID == "" || !slugPattern.MatchString(appID) {
		return "", false
	}
	return appID, true
}

func parseReviewComments(comments []discussionComment) []ReviewDTO {
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
			author = comment.Author.Login
		}
		rating := meta.Rating
		if rating < 1 || rating > 5 {
			rating = 0
		}
		provider := meta.Provider
		if provider == "" && comment.Author.Login != "" && meta.Author == "" {
			provider = ProviderGitHub
		}
		reviews = append(reviews, ReviewDTO{
			ID:        fmt.Sprintf("disc-%s", comment.ID),
			CommentID: comment.ID,
			Author:    author,
			Avatar:    meta.Avatar,
			Provider:  provider,
			PostedAt:  comment.CreatedAt,
			EditedAt:  meta.EditedAt,
			Edits:     meta.Edits,
			Snippet:   snippet,
			Rating:    rating,
		})
	}
	sort.SliceStable(reviews, func(a, b int) bool { return reviews[a].PostedAt > reviews[b].PostedAt })
	return reviews
}

type discussionComment struct {
	ID        string
	Body      string
	Author    struct{ Login string }
	CreatedAt string
}

type discussionEntry struct {
	ID       string
	Number   int
	Title    string
	Comments []discussionComment
}

func parseDiscussionNodes(nodes []struct {
	ID       string `json:"id"`
	Number   int    `json:"number"`
	Title    string `json:"title"`
	Comments struct {
		Nodes []struct {
			ID     string `json:"id"`
			Body   string `json:"body"`
			Author struct {
				Login string `json:"login"`
			} `json:"author"`
			CreatedAt string `json:"createdAt"`
		} `json:"nodes"`
	} `json:"comments"`
}) []discussionEntry {
	entries := make([]discussionEntry, 0, len(nodes))
	for _, node := range nodes {
		comments := make([]discussionComment, 0, len(node.Comments.Nodes))
		for _, c := range node.Comments.Nodes {
			comments = append(comments, discussionComment{
				ID:   c.ID,
				Body: c.Body,
				Author: struct{ Login string }{
					Login: c.Author.Login,
				},
				CreatedAt: c.CreatedAt,
			})
		}
		entries = append(entries, discussionEntry{
			ID:       node.ID,
			Number:   node.Number,
			Title:    node.Title,
			Comments: comments,
		})
	}
	return entries
}

func (client *SourceClient) resolveRepositoryParts(
	ctx context.Context,
	repository string,
) (owner string, name string, err error) {
	parts := strings.SplitN(repository, "/", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", "", fmt.Errorf("repositório inválido: %s", repository)
	}
	return parts[0], parts[1], nil
}

func (client *SourceClient) findOrCreateReviewCategory(
	ctx context.Context,
	owner string,
	name string,
) (string, error) {
	categories, err := client.getDiscussionCategories(ctx, owner, name)
	if err != nil {
		return "", fmt.Errorf("listar categorias de discussão: %w", err)
	}
	for _, cat := range categories {
		if cat.Slug == discussionReviewCategory || strings.EqualFold(cat.Name, "Announcements") {
			return cat.ID, nil
		}
	}
	for _, cat := range categories {
		if cat.Slug == "general" || strings.EqualFold(cat.Name, "General") {
			return cat.ID, nil
		}
	}
	if len(categories) > 0 {
		return categories[0].ID, nil
	}
	return "", fmt.Errorf("%w: nenhuma categoria de discussão encontrada", ErrReviewsUnavailable)
}

func (client *SourceClient) findOrCreateReviewDiscussion(
	ctx context.Context,
	owner string,
	name string,
	categoryID string,
	appID string,
) (string, int, error) {
	title := discussionTitleFor(appID)
	discussionID, discussionNumber, err := client.findDiscussionByTitle(ctx, owner, name, title, categoryID)
	if err != nil {
		return "", 0, err
	}
	if discussionID != "" {
		return discussionID, discussionNumber, nil
	}

	repositoryID, err := client.getRepositoryID(ctx, owner, name)
	if err != nil {
		return "", 0, fmt.Errorf("obter ID do repositório: %w", err)
	}

	body := fmt.Sprintf("Avaliações da comunidade para **%s**.", appID)
	discussionID, discussionNumber, err = client.createDiscussion(
		ctx,
		repositoryID,
		categoryID,
		title,
		body,
	)
	if err != nil {
		return "", 0, fmt.Errorf("criar discussão de reviews: %w", err)
	}

	return discussionID, discussionNumber, nil
}

// FetchReviews returns community reviews grouped by application id.
func (client *SourceClient) FetchReviews(
	ctx context.Context,
	repository string,
) (map[string][]ReviewDTO, error) {
	owner, name, err := client.resolveRepositoryParts(ctx, repository)
	if err != nil {
		return nil, err
	}

	categoryID, err := client.findOrCreateReviewCategory(ctx, owner, name)
	if err != nil {
		return nil, err
	}

	result, err := client.getDiscussionsByCategory(ctx, owner, name, categoryID)
	if err != nil {
		return nil, fmt.Errorf("buscar discussões: %w", err)
	}

	reviews := map[string][]ReviewDTO{}
	_ = categoryID
	for _, node := range result.Repository.Discussions.Nodes {
		appID, ok := appIDFromDiscussionTitle(node.Title)
		if !ok {
			continue
		}
		comments := make([]discussionComment, 0, len(node.Comments.Nodes))
		for _, c := range node.Comments.Nodes {
			comments = append(comments, discussionComment{
				ID:   c.ID,
				Body: c.Body,
				Author: struct{ Login string }{
					Login: c.Author.Login,
				},
				CreatedAt: c.CreatedAt,
			})
		}
		if parsed := parseReviewComments(comments); len(parsed) > 0 {
			reviews[appID] = parsed
		}
	}

	return reviews, nil
}

// CreateReview posts a new review as a comment on the per-app review Discussion.
func (client *SourceClient) CreateReview(
	ctx context.Context,
	repository string,
	appID string,
	rating int,
	text string,
	identity reviewerIdentity,
	fallbackAuthor string,
) error {
	owner, name, err := client.resolveRepositoryParts(ctx, repository)
	if err != nil {
		return err
	}

	categoryID, err := client.findOrCreateReviewCategory(ctx, owner, name)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrReviewsUnavailable, err)
	}

	discussionID, discussionNumber, err := client.findOrCreateReviewDiscussion(ctx, owner, name, categoryID, appID)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrReviewsUnavailable, err)
	}

	if err := client.checkDuplicateReview(ctx, owner, name, discussionNumber, identity, fallbackAuthor); err != nil {
		return err
	}

	var (
		token = client.token
		meta  = reviewMeta{Rating: rating}
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
	_, err = client.addDiscussionComment(ctx, discussionID, body, token)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrReviewsUnavailable, err)
	}
	return nil
}

func (client *SourceClient) checkDuplicateReview(
	ctx context.Context,
	owner string,
	name string,
	discussionNumber int,
	identity reviewerIdentity,
	fallbackAuthor string,
) error {
	result, err := client.getDiscussionWithComments(ctx, owner, name, discussionNumber)
	if err != nil {
		return nil
	}
	for _, comment := range result.Repository.Discussion.Comments.Nodes {
		body := strings.TrimSpace(comment.Body)
		if body == "" {
			continue
		}
		matches := reviewMetaPattern.FindStringSubmatch(body)
		if matches == nil {
			continue
		}
		var meta reviewMeta
		_ = json.Unmarshal([]byte(matches[1]), &meta)

		switch {
		case identity.Provider == ProviderGitHub && identity.Login != "":
			if comment.Author.Login == identity.Login {
				return ErrDuplicateReview
			}
		case identity.Provider == ProviderGoogle && meta.Provider == ProviderGoogle:
			if meta.Author == identity.Login {
				return ErrDuplicateReview
			}
		default:
			if meta.Author == fallbackAuthor && fallbackAuthor != "Anônimo" {
				return ErrDuplicateReview
			}
		}
	}
	return nil
}

func mustMarshalMeta(meta reviewMeta) string {
	encoded, _ := json.Marshal(meta)
	return string(encoded)
}

type existingReviewResult struct {
	CommentID string
	Meta      reviewMeta
	Body      string
	Snippet   string
}

func (client *SourceClient) findExistingReview(
	ctx context.Context,
	owner string,
	name string,
	discussionNumber int,
	identity reviewerIdentity,
	fallbackAuthor string,
) (*existingReviewResult, error) {
	result, err := client.getDiscussionWithComments(ctx, owner, name, discussionNumber)
	if err != nil {
		return nil, err
	}
	for _, comment := range result.Repository.Discussion.Comments.Nodes {
		body := strings.TrimSpace(comment.Body)
		if body == "" {
			continue
		}
		matches := reviewMetaPattern.FindStringSubmatch(body)
		if matches == nil {
			continue
		}
		var meta reviewMeta
		_ = json.Unmarshal([]byte(matches[1]), &meta)
		snippet := strings.TrimSpace(body[len(matches[0]):])

		switch {
		case identity.Provider == ProviderGitHub && identity.Login != "":
			if comment.Author.Login == identity.Login {
				return &existingReviewResult{
					CommentID: comment.ID,
					Meta:      meta,
					Body:      body,
					Snippet:   snippet,
				}, nil
			}
		case identity.Provider == ProviderGoogle && meta.Provider == ProviderGoogle:
			if meta.Author == identity.Login {
				return &existingReviewResult{
					CommentID: comment.ID,
					Meta:      meta,
					Body:      body,
					Snippet:   snippet,
				}, nil
			}
		default:
			if meta.Author == fallbackAuthor && fallbackAuthor != "Anônimo" {
				return &existingReviewResult{
					CommentID: comment.ID,
					Meta:      meta,
					Body:      body,
					Snippet:   snippet,
				}, nil
			}
		}
	}
	return nil, ErrReviewNotFound
}

func (client *SourceClient) EditReview(
	ctx context.Context,
	repository string,
	appID string,
	commentID string,
	newText string,
	identity reviewerIdentity,
	fallbackAuthor string,
) error {
	owner, name, err := client.resolveRepositoryParts(ctx, repository)
	if err != nil {
		return err
	}

	categoryID, err := client.findOrCreateReviewCategory(ctx, owner, name)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrReviewsUnavailable, err)
	}

	_, discussionNumber, err := client.findOrCreateReviewDiscussion(ctx, owner, name, categoryID, appID)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrReviewsUnavailable, err)
	}

	existing, err := client.findExistingReview(ctx, owner, name, discussionNumber, identity, fallbackAuthor)
	if err != nil {
		return err
	}

	if existing.CommentID != commentID {
		return ErrReviewNotFound
	}

	editCount := existing.Meta.Edits
	editedAt := existing.Meta.EditedAt
	now := time.Now().UTC()

	if editedAt != "" {
		parsed, parseErr := time.Parse(time.RFC3339, editedAt)
		if parseErr == nil && now.Sub(parsed) > reviewEditWindow {
			return ErrEditWindowExpired
		}
	}
	if editCount >= 1 {
		return ErrAlreadyEdited
	}

	existing.Meta.Edits = editCount + 1
	existing.Meta.EditedAt = now.Format(time.RFC3339)

	var (
		token = client.token
		meta  = existing.Meta
	)
	switch {
	case identity.Provider == ProviderGitHub && identity.Token != "":
		token = identity.Token
	case identity.Provider == ProviderGoogle && identity.Login != "":
		if !client.HasServerToken() {
			return ErrServerTokenRequired
		}
	default:
		if !client.HasServerToken() {
			return ErrServerTokenRequired
		}
	}

	newBody := fmt.Sprintf("<!-- glass-review %s -->\n%s", mustMarshalMeta(meta), strings.TrimSpace(newText))
	err = client.updateDiscussionComment(ctx, commentID, newBody, token)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrReviewsUnavailable, err)
	}
	return nil
}

func computeAverageRating(reviews []ReviewDTO) *float64 {
	var sum float64
	var count int
	for _, r := range reviews {
		if r.Rating >= 1 && r.Rating <= 5 {
			sum += float64(r.Rating)
			count++
		}
	}
	if count == 0 {
		return nil
	}
	avg := sum / float64(count)
	return &avg
}

func formatReviewPostedAt(t time.Time) string {
	return t.UTC().Format(time.RFC3339)
}
