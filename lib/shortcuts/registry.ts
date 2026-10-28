export type ShortcutDef = {
  id: string;
  keys: string;
  description: string;
  group: "navigation" | "issue" | "global";
};

export const SHORTCUTS: ShortcutDef[] = [
  {
    id: "command",
    keys: "⌘K / Ctrl+K",
    description: "Open command menu",
    group: "global",
  },
  {
    id: "help",
    keys: "?",
    description: "Show keyboard shortcuts",
    group: "global",
  },
  { id: "create", keys: "C", description: "Create issue", group: "issue" },
  { id: "filter", keys: "F", description: "Focus filters", group: "issue" },
  { id: "peek", keys: "Space", description: "Peek issue", group: "issue" },
  { id: "open", keys: "Enter", description: "Open issue", group: "issue" },
  { id: "up", keys: "K / ↑", description: "Previous issue", group: "issue" },
  { id: "down", keys: "J / ↓", description: "Next issue", group: "issue" },
  {
    id: "go-inbox",
    keys: "G then I",
    description: "Go to Inbox",
    group: "navigation",
  },
  {
    id: "go-issues",
    keys: "G then E",
    description: "Go to Issues",
    group: "navigation",
  },
  {
    id: "go-board",
    keys: "G then B",
    description: "Go to Board",
    group: "navigation",
  },
  {
    id: "go-cycles",
    keys: "G then C",
    description: "Go to Cycles",
    group: "navigation",
  },
  {
    id: "go-projects",
    keys: "G then P",
    description: "Go to Projects",
    group: "navigation",
  },
  {
    id: "go-my",
    keys: "G then M",
    description: "Go to My issues",
    group: "navigation",
  },
  {
    id: "go-triage",
    keys: "G then T",
    description: "Go to Triage",
    group: "navigation",
  },
  { id: "escape", keys: "Esc", description: "Close overlay", group: "global" },
];

export function isTypingTarget(el: EventTarget | null): boolean {
  if (!el || typeof el !== "object") return false;
  const node = el as { tagName?: string; isContentEditable?: boolean };
  const tag = node.tagName?.toLowerCase();

  if (!tag) return false;

  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    Boolean(node.isContentEditable)
  );
}
