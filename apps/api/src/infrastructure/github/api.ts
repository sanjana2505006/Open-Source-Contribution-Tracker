export class RateLimitError extends Error {
  constructor(public resetAt: Date | null) {
    super('GitHub rate limit exceeded');
    this.name = 'RateLimitError';
  }
}

export type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  description: string | null;
  language: string | null;
  stargazers_count: number;
  fork: boolean;
  private: boolean;
  html_url: string;
  default_branch: string | null;
  pushed_at: string | null;
};

export type GitHubSearchIssue = {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  html_url: string;
  created_at: string;
  updated_at: string;
  pull_request?: {
    merged_at: string | null;
    url: string;
  };
  repository_url: string;
  repository?: GitHubRepo;
};

export type GitHubEvent = {
  id: string;
  type: string;
  created_at: string;
  repo: { name: string; url: string };
  payload: {
    commits?: { sha: string; message: string }[];
    /** Present on push events — use when commits[] was removed from the API. */
    size?: number;
    distinct_size?: number;
  };
};

type Page<T> = T[];

export class GitHubApi {
  constructor(private token: string) {}

  private async request<T>(
    path: string,
    auth = true,
    init?: { method?: string; body?: string },
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (auth && this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    if (init?.body) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`https://api.github.com${path}`, {
      method: init?.method ?? 'GET',
      headers,
      body: init?.body,
    });

    if (res.status === 403 || res.status === 429) {
      const resetHeader = res.headers.get('x-ratelimit-reset');
      const resetAt = resetHeader
        ? new Date(Number(resetHeader) * 1000)
        : null;
      throw new RateLimitError(resetAt);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub API ${path} failed (${res.status}): ${text}`);
    }

    return res.json() as Promise<T>;
  }

  private async requestAllPages<T>(
    buildPath: (page: number) => string,
    maxPages = 10,
  ): Promise<T[]> {
    const items: T[] = [];

    for (let page = 1; page <= maxPages; page++) {
      const res = await fetch(`https://api.github.com${buildPath(page)}`, {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${this.token}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });

      if (res.status === 403 || res.status === 429) {
        const resetHeader = res.headers.get('x-ratelimit-reset');
        throw new RateLimitError(
          resetHeader ? new Date(Number(resetHeader) * 1000) : null,
        );
      }

      if (!res.ok) {
        throw new Error(`GitHub API page ${page} failed (${res.status})`);
      }

      const batch = (await res.json()) as Page<T>;
      items.push(...batch);

      const link = res.headers.get('link');
      if (!link?.includes('rel="next"')) break;
    }

    return items;
  }

  async fetchRepo(fullName: string): Promise<GitHubRepo> {
    return this.request<GitHubRepo>(`/repos/${fullName}`);
  }

  async listRepos(): Promise<GitHubRepo[]> {
    return this.requestAllPages<GitHubRepo>(
      (page) =>
        `/user/repos?affiliation=owner,collaborator,organization_member&sort=pushed&per_page=100&page=${page}`,
      10,
    );
  }

  async searchPullRequests(username: string): Promise<GitHubSearchIssue[]> {
    const items: GitHubSearchIssue[] = [];

    for (let page = 1; page <= 10; page++) {
      const data = await this.request<{
        items: GitHubSearchIssue[];
        incomplete_results: boolean;
      }>(
        `/search/issues?q=${encodeURIComponent(`author:${username} type:pr`)}&sort=updated&order=desc&per_page=100&page=${page}`,
      );
      items.push(...data.items);
      if (data.items.length < 100) break;
    }

    return items;
  }

  async searchIssues(query: string): Promise<GitHubSearchIssue[]> {
    try {
      return await this.searchIssuesWithAuth(query);
    } catch (err) {
      console.warn('Authenticated issue search failed, retrying public search:', err);
      return this.searchIssuesPublic(query);
    }
  }

  private async searchIssuesWithAuth(query: string): Promise<GitHubSearchIssue[]> {
    return this.searchIssuesPaged((page) =>
      `/search/issues?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=100&page=${page}`,
      true,
    );
  }

  private async searchIssuesPublic(query: string): Promise<GitHubSearchIssue[]> {
    return this.searchIssuesPaged((page) =>
      `/search/issues?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=100&page=${page}`,
      false,
    );
  }

  private async searchIssuesPaged(
    buildPath: (page: number) => string,
    auth: boolean,
  ): Promise<GitHubSearchIssue[]> {
    const items: GitHubSearchIssue[] = [];

    for (let page = 1; page <= 10; page++) {
      const data = await this.request<{
        items: GitHubSearchIssue[];
        incomplete_results: boolean;
      }>(buildPath(page), auth);

      for (const item of data.items) {
        if (item.pull_request) continue;
        items.push(item);
      }

      if (data.items.length < 100) break;
    }

    return items;
  }

  async searchIssuesCommented(username: string): Promise<GitHubSearchIssue[]> {
    return this.searchIssues(`commenter:${username} type:issue`);
  }

  async searchIssuesAssigned(username: string): Promise<GitHubSearchIssue[]> {
    return this.searchIssues(`assignee:${username} type:issue`);
  }

  async listPublicEvents(username: string): Promise<GitHubEvent[]> {
    return this.listUserEvents(username);
  }

  /** Events for the authenticated token owner (includes private repo pushes). */
  async listAuthenticatedUserEvents(maxPages = 10): Promise<GitHubEvent[]> {
    return this.requestAllPages<GitHubEvent>(
      (page) => `/user/events?per_page=100&page=${page}`,
      maxPages,
    );
  }

  /** Public-only activity feed — works without special OAuth scopes. */
  async listUserPublicEvents(username: string, maxPages = 10): Promise<GitHubEvent[]> {
    return this.requestAllPages<GitHubEvent>(
      (page) =>
        `/users/${encodeURIComponent(username)}/events/public?per_page=100&page=${page}`,
      maxPages,
    );
  }

  /** Authenticated feed — includes private repo activity and paginates beyond the first 100 events. */
  async listUserEvents(username: string, maxPages = 10): Promise<GitHubEvent[]> {
    return this.requestAllPages<GitHubEvent>(
      (page) =>
        `/users/${encodeURIComponent(username)}/events?per_page=100&page=${page}`,
      maxPages,
    );
  }

  async searchIssuesAuthored(username: string): Promise<GitHubSearchIssue[]> {
    return this.searchIssues(`author:${username} type:issue`);
  }

  async getIssue(
    owner: string,
    repo: string,
    number: number,
  ): Promise<GitHubIssueDetail> {
    return this.request<GitHubIssueDetail>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${number}`,
    );
  }

  async listIssueComments(
    owner: string,
    repo: string,
    number: number,
    maxPages = 3,
  ): Promise<GitHubIssueComment[]> {
    return this.requestAllPages<GitHubIssueComment>(
      (page) =>
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${number}/comments?per_page=100&page=${page}`,
      maxPages,
    );
  }

  async getPullRequest(
    owner: string,
    repo: string,
    number: number,
  ): Promise<GitHubPullRequestDetail> {
    return this.request<GitHubPullRequestDetail>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${number}`,
    );
  }

  async listPullRequestFiles(
    owner: string,
    repo: string,
    number: number,
    maxPages = 2,
  ): Promise<GitHubPullRequestFile[]> {
    return this.requestAllPages<GitHubPullRequestFile>(
      (page) =>
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${number}/files?per_page=100&page=${page}`,
      maxPages,
    );
  }

  async listPullRequestCommits(
    owner: string,
    repo: string,
    number: number,
    maxPages = 2,
  ): Promise<GitHubPullRequestCommit[]> {
    return this.requestAllPages<GitHubPullRequestCommit>(
      (page) =>
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${number}/commits?per_page=100&page=${page}`,
      maxPages,
    );
  }

  async createIssueComment(
    owner: string,
    repo: string,
    number: number,
    body: string,
  ): Promise<GitHubIssueComment> {
    return this.request<GitHubIssueComment>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${number}/comments`,
      true,
      {
        method: 'POST',
        body: JSON.stringify({ body }),
      },
    );
  }
}

export type GitHubIssueDetail = {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  body: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  labels: { name: string }[];
  assignees: { login: string }[];
  user: { login: string };
};

export type GitHubIssueComment = {
  id: number;
  user: { login: string } | null;
  body: string;
  created_at: string;
  html_url: string;
};

export type GitHubPullRequestDetail = {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  body: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  draft: boolean;
  user: { login: string };
  head: { ref: string };
  base: { ref: string };
  additions: number;
  deletions: number;
  changed_files: number;
  commits: number;
};

export type GitHubPullRequestFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
};

export type GitHubPullRequestCommit = {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string } | null;
  };
};
