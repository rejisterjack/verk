export type LinearNode = {
  title: string;
  description?: string | null;
  priority: number;
  state?: { name: string };
  assignee?: { email: string } | null;
  team?: { key: string };
  labels?: { nodes: { name: string }[] };
  project?: { name: string } | null;
};

const LINEAR_PAGE = `
  query($first: Int!, $after: String) {
    issues(first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        title
        description
        priority
        state { name }
        assignee { email }
        team { key }
        labels { nodes { name } }
        project { name }
      }
    }
  }
`;

export async function fetchLinearIssuePages(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
  cap = 2000,
) {
  const nodes: LinearNode[] = [];
  let after: string | undefined;
  let capped = false;

  while (nodes.length < cap) {
    const res = await fetchImpl("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({
        query: LINEAR_PAGE,
        variables: { first: 100, after: after ?? null },
      }),
    });

    if (!res.ok) {
      throw new Error(`Linear API error: ${res.status}`);
    }

    const json = (await res.json()) as {
      data?: {
        issues?: {
          pageInfo?: { hasNextPage: boolean; endCursor?: string | null };
          nodes: LinearNode[];
        };
      };
      errors?: Array<{ message: string }>;
    };

    if (json.errors?.length) {
      throw new Error(json.errors[0]!.message);
    }

    const page = json.data?.issues;
    const batch = page?.nodes ?? [];

    nodes.push(...batch);
    if (nodes.length >= cap) {
      capped = true;
      break;
    }
    if (!page?.pageInfo?.hasNextPage || !page.pageInfo.endCursor) break;
    after = page.pageInfo.endCursor;
  }

  return { nodes: nodes.slice(0, cap), capped };
}
