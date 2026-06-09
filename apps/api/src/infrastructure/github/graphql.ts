import { RateLimitError } from './api.js';
import type { GitHubRepo } from './api.js';

type PageInfo = {
  hasNextPage: boolean;
  endCursor: string | null;
};

type GraphQLRepoNode = {
  databaseId: number;
  nameWithOwner: string;
  description: string | null;
  primaryLanguage: { name: string } | null;
  stargazerCount: number;
  isFork: boolean;
  isPrivate: boolean;
  url: string;
  defaultBranchRef: { name: string } | null;
  pushedAt: string | null;
};

export type GraphQLPullRequest = {
  databaseId: number;
  title: string;
  url: string;
  createdAt: string;
  merged: boolean;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  repository: GraphQLRepoNode;
};

export function graphRepoToGitHubRepo(node: GraphQLRepoNode): GitHubRepo {
  const slash = node.nameWithOwner.indexOf('/');
  const ownerLogin = node.nameWithOwner.slice(0, slash);
  const name = node.nameWithOwner.slice(slash + 1);

  return {
    id: node.databaseId,
    name,
    full_name: node.nameWithOwner,
    owner: { login: ownerLogin },
    description: node.description,
    language: node.primaryLanguage?.name ?? null,
    stargazers_count: node.stargazerCount,
    fork: node.isFork,
    private: node.isPrivate,
    html_url: node.url,
    default_branch: node.defaultBranchRef?.name ?? null,
    pushed_at: node.pushedAt,
  };
}

export class GitHubGraphQL {
  constructor(private token: string) {}

  private async query<T>(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<T> {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (res.status === 403 || res.status === 429) {
      const resetHeader = res.headers.get('x-ratelimit-reset');
      throw new RateLimitError(
        resetHeader ? new Date(Number(resetHeader) * 1000) : null,
      );
    }

    if (!res.ok) {
      throw new Error(`GitHub GraphQL failed (${res.status})`);
    }

    const json = (await res.json()) as {
      data?: T;
      errors?: { message: string }[];
    };

    if (json.errors?.length) {
      throw new Error(json.errors[0]!.message);
    }

    if (!json.data) {
      throw new Error('GitHub GraphQL returned no data');
    }

    return json.data;
  }

  async listAllPullRequests(login: string): Promise<GraphQLPullRequest[]> {
    const items: GraphQLPullRequest[] = [];
    let cursor: string | null = null;

    const query = `
      query($login: String!, $cursor: String) {
        user(login: $login) {
          pullRequests(first: 100, after: $cursor, orderBy: { field: CREATED_AT, direction: DESC }) {
            pageInfo { hasNextPage endCursor }
            nodes {
              databaseId
              title
              url
              createdAt
              merged
              state
              repository {
                databaseId
                nameWithOwner
                description
                primaryLanguage { name }
                stargazerCount
                isFork
                isPrivate
                url
                defaultBranchRef { name }
                pushedAt
              }
            }
          }
        }
      }
    `;

    for (;;) {
      type PullRequestPage = {
        user: {
          pullRequests: {
            pageInfo: PageInfo;
            nodes: GraphQLPullRequest[];
          };
        } | null;
      };

      const data: PullRequestPage = await this.query<PullRequestPage>(query, {
        login,
        cursor,
      });

      if (!data.user) {
        throw new Error(`GitHub user "${login}" not found`);
      }

      items.push(...data.user.pullRequests.nodes);

      if (!data.user.pullRequests.pageInfo.hasNextPage) break;
      cursor = data.user.pullRequests.pageInfo.endCursor;
    }

    return items;
  }

  async listContributedRepositories(login: string): Promise<GraphQLRepoNode[]> {
    const items: GraphQLRepoNode[] = [];
    let cursor: string | null = null;

    const query = `
      query($login: String!, $cursor: String) {
        user(login: $login) {
          repositoriesContributedTo(
            first: 100
            after: $cursor
            includeUserRepositories: true
            contributionTypes: [COMMIT, PULL_REQUEST, ISSUE, REPOSITORY]
          ) {
            pageInfo { hasNextPage endCursor }
            nodes {
              databaseId
              nameWithOwner
              description
              primaryLanguage { name }
              stargazerCount
              isFork
              isPrivate
              url
              defaultBranchRef { name }
              pushedAt
            }
          }
        }
      }
    `;

    for (;;) {
      type ContributedPage = {
        user: {
          repositoriesContributedTo: {
            pageInfo: PageInfo;
            nodes: GraphQLRepoNode[];
          };
        } | null;
      };

      const data: ContributedPage = await this.query<ContributedPage>(query, {
        login,
        cursor,
      });

      if (!data.user) break;

      items.push(...data.user.repositoriesContributedTo.nodes);

      if (!data.user.repositoriesContributedTo.pageInfo.hasNextPage) break;
      cursor = data.user.repositoriesContributedTo.pageInfo.endCursor;
    }

    return items;
  }

  async fetchUserProfile(login: string): Promise<{
    login: string;
    name: string | null;
    avatarUrl: string | null;
    url: string;
    databaseId: number;
  } | null> {
    const data = await this.query<{
      user: {
        login: string;
        name: string | null;
        avatarUrl: string | null;
        url: string;
        databaseId: number;
      } | null;
    }>(
      `query($login: String!) {
        user(login: $login) {
          login
          name
          avatarUrl
          url
          databaseId
        }
      }`,
      { login },
    );

    return data.user;
  }
}
