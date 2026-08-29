package store

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

const graphqlEndpoint = "https://api.github.com/graphql"

type graphqlRequest struct {
	Query     string `json:"query"`
	Variables any    `json:"variables,omitempty"`
}

type graphqlResponse struct {
	Data   any            `json:"data"`
	Errors []graphqlError `json:"errors,omitempty"`
}

type graphqlError struct {
	Message string `json:"message"`
}

func (client *SourceClient) graphqlRequest(
	ctx context.Context,
	token string,
	query string,
	variables any,
	target any,
) error {
	payload, err := json.Marshal(graphqlRequest{
		Query:     query,
		Variables: variables,
	})
	if err != nil {
		return fmt.Errorf("marshal graphql request: %w", err)
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, graphqlEndpoint, bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("create graphql request: %w", err)
	}
	request.Header.Set("Content-Type", "application/json")
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
	} else if client.token != "" {
		request.Header.Set("Authorization", "Bearer "+client.token)
	}

	response, err := client.http.Do(request)
	if err != nil {
		return fmt.Errorf("execute graphql request: %w", err)
	}
	defer response.Body.Close()

	body, err := io.ReadAll(response.Body)
	if err != nil {
		return fmt.Errorf("read graphql response: %w", err)
	}

	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("graphql endpoint returned %d: %s", response.StatusCode, string(body))
	}

	var result graphqlResponse
	if target != nil {
		result.Data = target
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return fmt.Errorf("decode graphql response: %w", err)
	}

	if len(result.Errors) > 0 {
		return fmt.Errorf("graphql error: %s", result.Errors[0].Message)
	}

	return nil
}

type repositoryIDResponse struct {
	Repository struct {
		ID                   string `json:"id"`
		DiscussionCategories struct {
			Nodes []struct {
				ID   string `json:"id"`
				Name string `json:"name"`
				Slug string `json:"slug"`
			} `json:"nodes"`
		} `json:"discussionCategories"`
	} `json:"repository"`
}

func (client *SourceClient) getRepositoryID(
	ctx context.Context,
	owner string,
	name string,
) (string, error) {
	query := `query($owner: String!, $name: String!) {
		repository(owner: $owner, name: $name) {
			id
		}
	}`

	var result repositoryIDResponse
	if err := client.graphqlRequest(ctx, "", query, map[string]any{
		"owner": owner,
		"name":  name,
	}, &result); err != nil {
		return "", err
	}

	if result.Repository.ID == "" {
		return "", fmt.Errorf("repository not found: %s/%s", owner, name)
	}

	return result.Repository.ID, nil
}

func (client *SourceClient) getDiscussionCategories(
	ctx context.Context,
	owner string,
	name string,
) ([]struct {
	ID   string
	Name string
	Slug string
}, error) {
	query := `query($owner: String!, $name: String!) {
		repository(owner: $owner, name: $name) {
			discussionCategories(first: 100) {
				nodes {
					id
					name
					slug
				}
			}
		}
	}`

	var result repositoryIDResponse
	if err := client.graphqlRequest(ctx, "", query, map[string]any{
		"owner": owner,
		"name":  name,
	}, &result); err != nil {
		return nil, err
	}

	categories := make([]struct {
		ID   string
		Name string
		Slug string
	}, 0, len(result.Repository.DiscussionCategories.Nodes))
	for _, node := range result.Repository.DiscussionCategories.Nodes {
		categories = append(categories, struct {
			ID   string
			Name string
			Slug string
		}{
			ID:   node.ID,
			Name: node.Name,
			Slug: node.Slug,
		})
	}

	return categories, nil
}

type discussionSearchResponse struct {
	Repository struct {
		Discussions struct {
			Nodes []struct {
				ID       string `json:"id"`
				Number   int    `json:"number"`
				Title    string `json:"title"`
				Category struct {
					ID string `json:"id"`
				} `json:"category"`
			} `json:"nodes"`
			PageInfo struct {
				HasNextPage bool   `json:"hasNextPage"`
				EndCursor   string `json:"endCursor"`
			} `json:"pageInfo"`
		} `json:"discussions"`
	} `json:"repository"`
}

func (client *SourceClient) findDiscussionByTitle(
	ctx context.Context,
	owner string,
	name string,
	title string,
	categoryID string,
) (string, int, error) {
	query := `query($owner: String!, $name: String!, $categoryID: ID!) {
		repository(owner: $owner, name: $name) {
			discussions(first: 100, categoryId: $categoryID) {
				nodes {
					id
					number
					title
				}
				pageInfo {
					hasNextPage
					endCursor
				}
			}
		}
	}`

	var result discussionSearchResponse
	if err := client.graphqlRequest(ctx, "", query, map[string]any{
		"owner":      owner,
		"name":       name,
		"categoryID": categoryID,
	}, &result); err != nil {
		return "", 0, err
	}

	for _, discussion := range result.Repository.Discussions.Nodes {
		if discussion.Title == title {
			return discussion.ID, discussion.Number, nil
		}
	}

	return "", 0, nil
}

type createDiscussionResponse struct {
	CreateDiscussion struct {
		Discussion struct {
			ID     string `json:"id"`
			Number int    `json:"number"`
		} `json:"discussion"`
	} `json:"createDiscussion"`
}

func (client *SourceClient) createDiscussion(
	ctx context.Context,
	repositoryID string,
	categoryID string,
	title string,
	body string,
) (string, int, error) {
	query := `mutation($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
		createDiscussion(input: {repositoryId: $repositoryId, categoryId: $categoryId, title: $title, body: $body}) {
			discussion {
				id
				number
			}
		}
	}`

	var result createDiscussionResponse
	if err := client.graphqlRequest(ctx, "", query, map[string]any{
		"repositoryId": repositoryID,
		"categoryId":   categoryID,
		"title":        title,
		"body":         body,
	}, &result); err != nil {
		return "", 0, err
	}

	if result.CreateDiscussion.Discussion.ID == "" {
		return "", 0, fmt.Errorf("failed to create discussion")
	}

	return result.CreateDiscussion.Discussion.ID, result.CreateDiscussion.Discussion.Number, nil
}

type addDiscussionCommentResponse struct {
	AddDiscussionComment struct {
		Comment struct {
			ID string `json:"id"`
		} `json:"comment"`
	} `json:"addDiscussionComment"`
}

func (client *SourceClient) addDiscussionComment(
	ctx context.Context,
	discussionID string,
	body string,
	token string,
) (string, error) {
	query := `mutation($discussionId: ID!, $body: String!) {
		addDiscussionComment(input: {discussionId: $discussionId, body: $body}) {
			comment {
				id
			}
		}
	}`

	var result addDiscussionCommentResponse
	if err := client.graphqlRequest(ctx, token, query, map[string]any{
		"discussionId": discussionID,
		"body":         body,
	}, &result); err != nil {
		return "", err
	}

	if result.AddDiscussionComment.Comment.ID == "" {
		return "", fmt.Errorf("failed to add discussion comment")
	}

	return result.AddDiscussionComment.Comment.ID, nil
}

type discussionWithCommentsResponse struct {
	Repository struct {
		Discussion struct {
			ID       string `json:"id"`
			Number   int    `json:"number"`
			Title    string `json:"title"`
			Comments struct {
				Nodes []struct {
					ID     string `json:"id"`
					Body   string `json:"body"`
					Author struct {
						Login     string `json:"login"`
						AvatarURL string `json:"avatarUrl"`
					} `json:"author"`
					CreatedAt string `json:"createdAt"`
				} `json:"nodes"`
				PageInfo struct {
					HasNextPage bool   `json:"hasNextPage"`
					EndCursor   string `json:"endCursor"`
				} `json:"pageInfo"`
			} `json:"comments"`
		} `json:"discussion"`
	} `json:"repository"`
}

func (client *SourceClient) getDiscussionWithComments(
	ctx context.Context,
	owner string,
	name string,
	discussionNumber int,
) (*discussionWithCommentsResponse, error) {
	query := `query($owner: String!, $name: String!, $number: Int!) {
		repository(owner: $owner, name: $name) {
			discussion(number: $number) {
				id
				number
				title
				comments(first: 100) {
					nodes {
						id
						body
						author {
							login
							avatarUrl
						}
						createdAt
					}
					pageInfo {
						hasNextPage
						endCursor
					}
				}
			}
		}
	}`

	var result discussionWithCommentsResponse
	if err := client.graphqlRequest(ctx, "", query, map[string]any{
		"owner":  owner,
		"name":   name,
		"number": discussionNumber,
	}, &result); err != nil {
		return nil, err
	}

	return &result, nil
}

type discussionsByCategoryResponse struct {
	Repository struct {
		Discussions struct {
			Nodes []struct {
				ID       string `json:"id"`
				Number   int    `json:"number"`
				Title    string `json:"title"`
				Comments struct {
					Nodes []struct {
						ID     string `json:"id"`
						Body   string `json:"body"`
						Author struct {
							Login     string `json:"login"`
							AvatarURL string `json:"avatarUrl"`
						} `json:"author"`
						CreatedAt string `json:"createdAt"`
					} `json:"nodes"`
					PageInfo struct {
						HasNextPage bool   `json:"hasNextPage"`
						EndCursor   string `json:"endCursor"`
					} `json:"pageInfo"`
				} `json:"comments"`
			} `json:"nodes"`
			PageInfo struct {
				HasNextPage bool   `json:"hasNextPage"`
				EndCursor   string `json:"endCursor"`
			} `json:"pageInfo"`
		} `json:"discussions"`
	} `json:"repository"`
}

func (client *SourceClient) getDiscussionsByCategory(
	ctx context.Context,
	owner string,
	name string,
	categoryID string,
) (*discussionsByCategoryResponse, error) {
	query := `query($owner: String!, $name: String!, $categoryID: ID!) {
		repository(owner: $owner, name: $name) {
			discussions(first: 100, categoryId: $categoryID) {
				nodes {
					id
					number
					title
					comments(first: 100) {
						nodes {
							id
							body
							author {
								login
								avatarUrl
							}
							createdAt
						}
						pageInfo {
							hasNextPage
							endCursor
						}
					}
				}
				pageInfo {
					hasNextPage
					endCursor
				}
			}
		}
	}`

	var result discussionsByCategoryResponse
	if err := client.graphqlRequest(ctx, "", query, map[string]any{
		"owner":      owner,
		"name":       name,
		"categoryID": categoryID,
	}, &result); err != nil {
		return nil, err
	}

	return &result, nil
}

type updateDiscussionCommentResponse struct {
	UpdateDiscussionComment struct {
		Comment struct {
			ID   string `json:"id"`
			Body string `json:"body"`
		} `json:"comment"`
	} `json:"updateDiscussionComment"`
}

func (client *SourceClient) updateDiscussionComment(
	ctx context.Context,
	commentID string,
	body string,
	token string,
) error {
	query := `mutation($commentId: ID!, $body: String!) {
		updateDiscussionComment(input: {commentId: $commentId, body: $body}) {
			comment {
				id
				body
			}
		}
	}`

	var result updateDiscussionCommentResponse
	if err := client.graphqlRequest(ctx, token, query, map[string]any{
		"commentId": commentID,
		"body":      body,
	}, &result); err != nil {
		return err
	}

	if result.UpdateDiscussionComment.Comment.ID == "" {
		return fmt.Errorf("failed to update discussion comment")
	}

	return nil
}
