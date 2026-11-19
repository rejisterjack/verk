/**
 * Search query parsing and ranking. Pure, so it is shared by the API, the palette and tests.
 *
 *   login bug                  words (every word must match)
 *   "login bug"                an exact phrase
 *   assignee:me status:todo    operators, mixed with words
 *   -wontfix                   a word that must not appear
 *   ENG-123  or  #123          jump to an issue by key
 */

export const SEARCH_KINDS = [
  "issue",
  "project",
  "initiative",
  "doc",
  "customer",
  "cycle",
  "person",
] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];

export type Operator = { key: string; value: string; negate: boolean };

export type ParsedQuery = {
  /** Words and phrases that must all appear. Lower-cased. */
  terms: string[];
  /** Words that must not appear. */
  excluded: string[];
  operators: Operator[];
  /** `ENG-123` / `#123` style jump to an issue number. */
  issueNumber: number | null;
  /** Limit results to these kinds (from `type:doc`). Empty means all. */
  kinds: SearchKind[];
};

const OPERATOR_KEYS = new Set([
  "assignee",
  "status",
  "priority",
  "label",
  "project",
  "cycle",
  "creator",
  "type",
]);

export const MAX_QUERY_LENGTH = 200;

/** Split on spaces but keep "quoted phrases" together. */
function tokens(input: string): string[] {
  const out: string[] = [];
  const re = /(-?)"([^"]*)"|(\S+)/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(input))) {
    if (m[3] !== undefined) out.push(m[3]);
    else if (m[2]) out.push(`${m[1]}"${m[2]}"`);
  }

  return out;
}

/**
 * `teamKey` is the team's issue prefix (`ENG`). A token like `ENG-12` then means issue 12.
 * Any other three-letter prefix is treated as ordinary text.
 */
export function parseQuery(raw: string, teamKey?: string): ParsedQuery {
  const input = raw.slice(0, MAX_QUERY_LENGTH).trim();
  const terms: string[] = [];
  const excluded: string[] = [];
  const operators: Operator[] = [];
  const kinds: SearchKind[] = [];
  let issueNumber: number | null = null;

  for (const token of tokens(input)) {
    const negate = token.startsWith("-") && token.length > 1;
    const body = negate ? token.slice(1) : token;
    const colon = body.indexOf(":");

    if (colon > 0 && !body.startsWith('"')) {
      const key = body.slice(0, colon).toLowerCase();
      const value = body.slice(colon + 1).replace(/^"|"$/g, "");

      if (OPERATOR_KEYS.has(key) && value) {
        if (key === "type") {
          const kind = value.toLowerCase().replace(/s$/, "");
          const hit = SEARCH_KINDS.find((k) => k === kind);

          if (hit && !kinds.includes(hit)) kinds.push(hit);
        } else {
          operators.push({ key, value, negate });
        }
        continue;
      }
    }
    const key =
      /^#(\d{1,9})$/.exec(body) ?? /^([A-Za-z]{2,6})-(\d{1,9})$/.exec(body);

    if (key && !negate) {
      const prefix = key.length === 3 ? key[1]!.toUpperCase() : null;
      const num = Number(key[key.length - 1]);

      if (!prefix || !teamKey || prefix === teamKey.toUpperCase()) {
        issueNumber = num;
        continue;
      }
    }
    const text = body.replace(/^"|"$/g, "").trim().toLowerCase();

    if (!text) continue;
    if (negate) excluded.push(text);
    else terms.push(text);
  }

  return { terms, excluded, operators, issueNumber, kinds };
}

export function isEmptyQuery(query: ParsedQuery): boolean {
  return (
    query.terms.length === 0 &&
    query.operators.length === 0 &&
    query.issueNumber === null
  );
}

/** Escape `%`, `_` and `\` so user text is matched literally inside a SQL LIKE pattern. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export type Scored<T> = T & { score: number };

/**
 * Score one result against the query terms. Title beats body, an exact or prefix title match
 * beats a mid-word one, and a newer item breaks ties. Higher is better; 0 means no match.
 */
export function scoreMatch(
  fields: { title: string; body?: string; key?: string },
  terms: string[],
  recency = 0,
): number {
  if (!terms.length) return 1 + recency;
  const title = fields.title.toLowerCase();
  const body = (fields.body ?? "").toLowerCase();
  const key = (fields.key ?? "").toLowerCase();
  let score = 0;

  for (const term of terms) {
    let part = 0;

    if (key && key === term) part = 100;
    else if (title === term) part = 60;
    else if (title.startsWith(term)) part = 40;
    else if (
      new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(
        title,
      )
    ) {
      part = 30;
    } else if (title.includes(term)) part = 20;
    else if (body.includes(term)) part = 8;
    else return 0; // every term must match somewhere
    score += part;
  }

  return score + recency;
}

/** A 0..4 bonus for how recently something changed, so fresh work wins ties. */
export function recencyBonus(updatedAt: Date, now = new Date()): number {
  const days = (now.getTime() - updatedAt.getTime()) / 86_400_000;

  if (days < 1) return 4;
  if (days < 7) return 3;
  if (days < 30) return 2;
  if (days < 180) return 1;

  return 0;
}

/** A short snippet of `body` around the first matching term, with the text trimmed to `width`. */
export function snippet(body: string, terms: string[], width = 120): string {
  const flat = body.replace(/\s+/g, " ").trim();

  if (!flat) return "";
  const lower = flat.toLowerCase();
  const at = terms
    .map((term) => lower.indexOf(term))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b)[0];

  if (at === undefined)
    return flat.length > width ? `${flat.slice(0, width)}…` : flat;
  const start = Math.max(0, at - Math.floor(width / 3));
  const end = Math.min(flat.length, start + width);

  return `${start > 0 ? "…" : ""}${flat.slice(start, end)}${end < flat.length ? "…" : ""}`;
}
