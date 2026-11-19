import {
  type Filter,
  type FilterField,
  FilterError,
  parseFilter,
} from "@/lib/issue-filter";

const FIELD_ALIASES: Record<string, FilterField> = {
  status: "status",
  priority: "priority",
  estimate: "estimate",
  assignee: "assignee",
  creator: "creator",
  project: "project",
  cycle: "cycle",
  label: "label",
  title: "title",
  due: "due",
  start: "start",
  number: "number",
};

type Token =
  | { kind: "and" | "or" | "lparen" | "rparen" }
  | { kind: "cond"; field: FilterField; op: "is" | "lt" | "lte" | "gt" | "gte"; value: string }
  | { kind: "text"; value: string };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  const re =
    /"([^"]*)"|(\()|(\))|\b(AND|OR)\b|([A-Za-z_]+):(<|<=|>|>=)?([^\s()]+)|(\S+)/gi;
  let match: RegExpExecArray | null;

  while ((match = re.exec(input))) {
    if (match[1] !== undefined) {
      tokens.push({ kind: "text", value: match[1] });
    } else if (match[2]) {
      tokens.push({ kind: "lparen" });
    } else if (match[3]) {
      tokens.push({ kind: "rparen" });
    } else if (match[4]) {
      tokens.push({ kind: match[4].toLowerCase() === "and" ? "and" : "or" });
    } else if (match[5]) {
      const field = FIELD_ALIASES[match[5].toLowerCase()];

      if (!field) throw new FilterError(`Unknown field ${match[5]}`);
      const symbol = match[6];
      const op =
        symbol === "<"
          ? "lt"
          : symbol === "<="
            ? "lte"
            : symbol === ">"
              ? "gt"
              : symbol === ">="
                ? "gte"
                : "is";

      tokens.push({ kind: "cond", field, op, value: match[7] });
    } else if (match[8]) {
      tokens.push({ kind: "text", value: match[8] });
    }
  }

  return tokens;
}

function conditionFrom(token: Extract<Token, { kind: "cond" | "text" }>): Filter {
  if (token.kind === "text") {
    return { field: "title", op: "contains", value: token.value };
  }
  if (token.field === "due" || token.field === "start") {
    const relative = token.value.match(/^(\d+)d$/);

    if (token.op === "lt" && relative) {
      return {
        field: token.field,
        op: "within_next",
        value: Number(relative[1]),
      };
    }
    if (token.op === "is") {
      return { field: token.field, op: "on", value: token.value };
    }
  }
  if (token.field === "number") {
    return { field: "number", op: token.op === "is" ? "is" : token.op, value: Number(token.value) };
  }

  return { field: token.field, op: "is", value: token.value };
}

/**
 * Turn a short query into the same filter tree the builder stores.
 * JSON objects are accepted unchanged so saved views keep working.
 */
export function parseIssueQuery(input: string): Filter {
  const trimmed = input.trim();

  if (!trimmed) return { op: "and", rules: [] };
  if (trimmed.startsWith("{")) return parseFilter(trimmed);

  const tokens = tokenize(trimmed);
  const rules: Filter[] = [];
  let mode: "and" | "or" = "and";
  let group: Filter[] | null = null;

  const push = (rule: Filter) => {
    if (group) group.push(rule);
    else rules.push(rule);
  };

  for (const token of tokens) {
    if (token.kind === "and" || token.kind === "or") {
      mode = token.kind;
      continue;
    }
    if (token.kind === "lparen") {
      group = [];
      continue;
    }
    if (token.kind === "rparen") {
      if (group) {
        rules.push({ op: mode, rules: group });
        group = null;
      }
      continue;
    }
    if (token.kind === "cond" || token.kind === "text") {
      push(conditionFrom(token));
    }
  }
  if (group) rules.push({ op: mode, rules: group });
  const tree = rules.length === 1 ? rules[0] : { op: mode, rules };

  return parseFilter(tree);
}
