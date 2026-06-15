import { RateLimitError } from './api.js';
import type { GitHubRepo } from './api.js';
import type { HeatmapWeek } from '@osct/shared';

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

export type GraphQLIssue = {
  databaseId: number;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  state: 'OPEN' | 'CLOSED';
  repository: GraphQLRepoNode;
};

export type GraphQLCommitContribution = {
  commitCount: number;
  occurredAt: string;
  resourcePath: string;
  repository: GraphQLRepoNode;
};

/** Stable ID for commit rows — must fit PostgreSQL BIGINT and JS safe integers. */
function contributionGithubId(repositoryId: number, occurredAt: string): number {
  let h = 2166136261 >>> 0;
  const key = `${repositoryId}:${occurredAt}`;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const mix = (h ^ Math.imul(repositoryId | 0, 2654435761)) >>> 0;
  return mix + 1;
}

/** Stable ID for push-event rows (REST /users/:login/events). */
function pushEventGithubId(eventId: string): number {
  if (/^\d+$/.test(eventId)) {
    const n = Number(eventId);
    if (Number.isSafeInteger(n) && n > 0) return n;
  }
  let h = 2166136261 >>> 0;
  for (let i = 0; i < eventId.length; i++) {
    h ^= eventId.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h + 1;
}

function mapContributionLevel(count: number, level: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (Number.isFinite(level) && level >= 1 && level <= 4) {
    return level as 1 | 2 | 3 | 4;
  }
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  if (count <= 9) return 3;
  return 4;
}

export function issueState(issue: GraphQLIssue): 'open' | 'closed' {
  return issue.state === 'OPEN' ? 'open' : 'closed';
}

export { contributionGithubId, pushEventGithubId };

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

  private async listIssuesFromConnection(
    login: string,
    connection: 'assignedIssues' | 'issues',
  ): Promise<GraphQLIssue[]> {
    const items: GraphQLIssue[] = [];
    let cursor: string | null = null;

    const query = `
      query($login: String!, $cursor: String) {
        user(login: $login) {
          ${connection}(first: 100, after: $cursor, orderBy: { field: UPDATED_AT, direction: DESC }) {
            pageInfo { hasNextPage endCursor }
            nodes {
              databaseId
              title
              url
              createdAt
              updatedAt
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
      type IssuePage = {
        user: {
          [K in typeof connection]: {
            pageInfo: PageInfo;
            nodes: GraphQLIssue[];
          };
        } | null;
      };

      const data: IssuePage = await this.query<IssuePage>(query, { login, cursor });

      if (!data.user) {
        throw new Error(`GitHub user "${login}" not found`);
      }

      items.push(...data.user[connection].nodes);

      if (!data.user[connection].pageInfo.hasNextPage) break;
      cursor = data.user[connection].pageInfo.endCursor;
    }

    return items;
  }

  private async listViewerIssuesFromConnection(
    connection: 'assignedIssues',
  ): Promise<GraphQLIssue[]> {
    const items: GraphQLIssue[] = [];
    let cursor: string | null = null;

    const query = `
      query($cursor: String) {
        viewer {
          ${connection}(first: 100, after: $cursor, orderBy: { field: UPDATED_AT, direction: DESC }) {
            pageInfo { hasNextPage endCursor }
            nodes {
              databaseId
              title
              url
              createdAt
              updatedAt
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
      type IssuePage = {
        viewer: {
          assignedIssues: {
            pageInfo: PageInfo;
            nodes: GraphQLIssue[];
          };
        } | null;
      };

      const data: IssuePage = await this.query<IssuePage>(query, { cursor });

      if (!data.viewer) {
        throw new Error('GitHub viewer not available');
      }

      items.push(...data.viewer[connection].nodes);

      if (!data.viewer[connection].pageInfo.hasNextPage) break;
      cursor = data.viewer[connection].pageInfo.endCursor;
    }

    return items;
  }

  async listAssignedIssues(login: string): Promise<GraphQLIssue[]> {
    return this.listIssuesFromConnection(login, 'assignedIssues');
  }

  async listViewerAssignedIssues(): Promise<GraphQLIssue[]> {
    return this.listViewerIssuesFromConnection('assignedIssues');
  }

  async listAuthoredIssues(login: string): Promise<GraphQLIssue[]> {
    return this.listIssuesFromConnection(login, 'issues');
  }

  async listCommitContributions(
    login: string,
    sinceYears = 1,
    asViewer = false,
  ): Promise<GraphQLCommitContribution[]> {
    const items: GraphQLCommitContribution[] = [];
    const rangeEnd = new Date();
    const rangeStart = new Date();
    rangeStart.setUTCFullYear(rangeStart.getUTCFullYear() - sinceYears);

    let cursor = new Date(rangeStart);

    while (cursor < rangeEnd) {
      const chunkEnd = new Date(cursor);
      chunkEnd.setUTCDate(chunkEnd.getUTCDate() + 364);
      const to = chunkEnd < rangeEnd ? chunkEnd : rangeEnd;

      items.push(
        ...(await this.listCommitContributionsInRange(
          login,
          cursor.toISOString(),
          to.toISOString(),
          asViewer,
        )),
      );

      cursor = new Date(to);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return items;
  }

  private async listCommitContributionsInRange(
    login: string,
    from: string,
    to: string,
    asViewer: boolean,
  ): Promise<GraphQLCommitContribution[]> {
    const items: GraphQLCommitContribution[] = [];
    let cursor: string | null = null;
    const root = asViewer ? 'viewer' : 'user(login: $login)';

    const query = `
      query($login: String, $from: DateTime!, $to: DateTime!, $cursor: String) {
        ${root} {
          contributionsCollection(from: $from, to: $to) {
            commitContributions(first: 100, after: $cursor) {
              pageInfo { hasNextPage endCursor }
              nodes {
                commitCount
                occurredAt
                resourcePath
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
      }
    `;

    for (;;) {
      type CommitPage = {
        viewer?: {
          contributionsCollection: {
            commitContributions: {
              pageInfo: PageInfo;
              nodes: Array<{
                commitCount: number;
                occurredAt: string;
                resourcePath: string;
                repository: GraphQLRepoNode | null;
              }>;
            };
          };
        } | null;
        user?: {
          contributionsCollection: {
            commitContributions: {
              pageInfo: PageInfo;
              nodes: Array<{
                commitCount: number;
                occurredAt: string;
                resourcePath: string;
                repository: GraphQLRepoNode | null;
              }>;
            };
          };
        } | null;
      };

      const data: CommitPage = await this.query<CommitPage>(query, {
        login: asViewer ? undefined : login,
        from,
        to,
        cursor,
      });

      const subject = asViewer ? data.viewer : data.user;
      if (!subject) {
        throw new Error(
          asViewer ? 'GitHub viewer not available' : `GitHub user "${login}" not found`,
        );
      }

      const page = subject.contributionsCollection.commitContributions;

      for (const node of page.nodes) {
        if (node.commitCount < 1 || !node.repository) continue;
        items.push({
          commitCount: node.commitCount,
          occurredAt: node.occurredAt,
          resourcePath: node.resourcePath,
          repository: node.repository,
        });
      }

      if (!page.pageInfo.hasNextPage) break;
      cursor = page.pageInfo.endCursor;
    }

    return items;
  }

  async getTotalCommitContributions(
    login: string,
    sinceYears = 1,
    asViewer = false,
  ): Promise<number> {
    const rangeEnd = new Date();
    const rangeStart = new Date();
    rangeStart.setUTCFullYear(rangeStart.getUTCFullYear() - sinceYears);

    const root = asViewer ? 'viewer' : 'user(login: $login)';
    const query = `
      query($login: String, $from: DateTime!, $to: DateTime!) {
        ${root} {
          contributionsCollection(from: $from, to: $to) {
            totalCommitContributions
          }
        }
      }
    `;

    type TotalPage = {
      viewer?: { contributionsCollection: { totalCommitContributions: number } } | null;
      user?: { contributionsCollection: { totalCommitContributions: number } } | null;
    };

    const data = await this.query<TotalPage>(query, {
      login: asViewer ? undefined : login,
      from: rangeStart.toISOString(),
      to: rangeEnd.toISOString(),
    });

    const subject = asViewer ? data.viewer : data.user;
    if (!subject) {
      throw new Error(
        asViewer ? 'GitHub viewer not available' : `GitHub user "${login}" not found`,
      );
    }

    return subject.contributionsCollection.totalCommitContributions;
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

  async getContributionYears(login: string): Promise<number[]> {
    const data = await this.query<{
      user: {
        contributionsCollection: {
          contributionYears: number[];
        };
      } | null;
    }>(
      `query($login: String!) {
        user(login: $login) {
          contributionsCollection {
            contributionYears
          }
        }
      }`,
      { login },
    );

    if (!data.user) {
      throw new Error(`GitHub user "${login}" not found`);
    }

    return data.user.contributionsCollection.contributionYears;
  }

  async getContributionCalendar(
    login: string,
    year: number,
  ): Promise<{ totalContributions: number; weeks: HeatmapWeek[] }> {
    const from = `${year}-01-01T00:00:00.000Z`;
    const to = `${year}-12-31T23:59:59.999Z`;

    const data = await this.query<{
      user: {
        contributionsCollection: {
          contributionCalendar: {
            totalContributions: number;
            weeks: Array<{
              contributionDays: Array<{
                date: string;
                contributionCount: number;
                contributionLevel: number;
                color: string;
              }>;
            }>;
          };
        };
      } | null;
    }>(
      `query($login: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $login) {
          contributionsCollection(from: $from, to: $to) {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  date
                  contributionCount
                  contributionLevel
                  color
                }
              }
            }
          }
        }
      }`,
      { login, from, to },
    );

    if (!data.user) {
      throw new Error(`GitHub user "${login}" not found`);
    }

    const calendar = data.user.contributionsCollection.contributionCalendar;

    return {
      totalContributions: calendar.totalContributions,
      weeks: calendar.weeks.map((week) => ({
        days: week.contributionDays.map((day) => ({
          date: day.date.slice(0, 10),
          count: day.contributionCount,
          level: mapContributionLevel(day.contributionCount, day.contributionLevel),
          color: day.color,
        })),
      })),
    };
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
