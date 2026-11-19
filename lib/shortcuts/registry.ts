export type ShortcutDef = {
  id: string;
  keys: string;
  description: string;
  group: "navigation" | "issue" | "global";
};

/**
 * Shared chord state. The keyboard shell sets `goArmed` after `G`; single-key handlers elsewhere
 * (like S / P / A on the issue list) read it so `G then S` goes to Settings instead of also
 * opening the status picker.
 */
export const chord = { goArmed: false };

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
    id: "select",
    keys: "X",
    description: "Select issue (then S / P / A act on all selected)",
    group: "issue",
  },
  {
    id: "set-status",
    keys: "S",
    description: "Set status of the focused or selected issues",
    group: "issue",
  },
  {
    id: "set-priority",
    keys: "P",
    description: "Set priority of the focused or selected issues",
    group: "issue",
  },
  {
    id: "set-assignee",
    keys: "A",
    description: "Assign the focused or selected issues",
    group: "issue",
  },
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
    id: "go-initiatives",
    keys: "G then N",
    description: "Go to Initiatives",
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
  {
    id: "go-releases",
    keys: "G then R",
    description: "Go to Releases",
    group: "navigation",
  },
  {
    id: "go-docs",
    keys: "G then D",
    description: "Go to Documents",
    group: "navigation",
  },
  {
    id: "go-timeline",
    keys: "G then L",
    description: "Go to Timeline",
    group: "navigation",
  },
  {
    id: "go-insights",
    keys: "G then H",
    description: "Go to Insights",
    group: "navigation",
  },
  {
    id: "go-customers",
    keys: "G then U",
    description: "Go to Customers",
    group: "navigation",
  },
  {
    id: "go-settings",
    keys: "G then S",
    description: "Go to Settings",
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
