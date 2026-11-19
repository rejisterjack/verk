export type MatchingPull = {
  number: number;
  title: string;
  url: string;
  draft: boolean;
};

/**
 * Open pull requests whose head branch matches `branch`.
 * One GitHub call, filtered server-side. No diffs and no file lists.
 * Returns [] when GITHUB_TOKEN is unset, the repo is malformed, or GitHub errors.
 */
export async function listMatchingPulls(
  repo: string,
  branch: string,
  fetchImpl: typeof fetch = fetch,
): Promise<MatchingPull[]> {
  const token = process.env.GITHUB_TOKEN;
  const [owner, name, ...extra] = repo.split("/");

  if (!token || !owner || !name || extra.length || !branch) return [];

  const params = new URLSearchParams({
    state: "open",
    head: `${owner}:${branch}`,
    per_page: "10",
  });

  try {
    const response = await fetchImpl(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pulls?${params}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "verk",
        },
        signal: AbortSignal.timeout(4000),
      },
    );

    if (!response.ok) return [];
    const pulls = (await response.json()) as {
      number: number;
      title: string;
      html_url: string;
      draft?: boolean;
      head?: { ref?: string };
    }[];

    return pulls
      .filter((pull) => pull.head?.ref === branch)
      .map((pull) => ({
        number: pull.number,
        title: pull.title,
        url: pull.html_url,
        draft: Boolean(pull.draft),
      }));
  } catch {
    return [];
  }
}
