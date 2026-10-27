const columns = [
  {
    title: "Backlog",
    items: [
      { id: "ACM-18", title: "Member role changes", priority: "Med" },
      { id: "ACM-10", title: "Polish empty states", priority: "Low" },
    ],
  },
  {
    title: "Todo",
    items: [
      { id: "ACM-6", title: "Expose MCP for agents", priority: "Urgent" },
      { id: "ACM-7", title: "Write deploy README", priority: "High" },
      { id: "ACM-20", title: "Vercel migrate on deploy", priority: "Urgent" },
    ],
  },
  {
    title: "In Progress",
    items: [
      { id: "ACM-3", title: "Build issues list view", priority: "High" },
      { id: "ACM-4", title: "Ship board drag and drop", priority: "Med" },
    ],
  },
  {
    title: "Done",
    items: [
      { id: "ACM-1", title: "Set up Neon database", priority: "High" },
      { id: "ACM-2", title: "Implement Auth.js login", priority: "High" },
    ],
  },
];

export function ProductBoardVisual() {
  return (
    <div
      aria-hidden
      className="animate-verk-drift pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[42%] min-h-[240px] overflow-hidden sm:h-[46%]"
    >
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-background via-background/85 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex gap-3 px-4 opacity-75 sm:gap-4 sm:px-8 lg:px-16 translate-y-8">
        {columns.map((col, i) => (
          <div
            key={col.title}
            className="min-w-[200px] flex-1 rounded-lg border border-separator/80 bg-surface/90 backdrop-blur-sm p-3"
            style={{ transform: `translateY(${(i % 2) * 10}px)` }}
          >
            <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-muted">
              <span>{col.title}</span>
              <span>{col.items.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {col.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border border-separator/70 bg-background px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-muted">
                      {item.id}
                    </span>
                    <span
                      className={
                        item.priority === "Urgent"
                          ? "text-[10px] text-danger"
                          : item.priority === "High"
                            ? "text-[10px] text-accent"
                            : "text-[10px] text-muted"
                      }
                    >
                      {item.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] font-medium leading-snug text-foreground">
                    {item.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
