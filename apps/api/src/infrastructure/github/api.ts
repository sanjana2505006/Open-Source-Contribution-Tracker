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
  };
};

type Page<T> = T[];

export class GitHubApi {
  constructor(private token: string) {}

  private async request<T>(path: string): Promise<T> {
    const res = await fetch(`https://api.github.com${path}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
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
    const items: GitHubSearchIssue[] = [];

    for (let page = 1; page <= 10; page++) {
      const data = await this.request<{
        items: GitHubSearchIssue[];
        incomplete_results: boolean;
      }>(
        `/search/issues?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=100&page=${page}`,
      );

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

  async listPublicEvents(username: string): Promise<GitHubEvent[]> {
    return this.listUserEvents(username);
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
}
