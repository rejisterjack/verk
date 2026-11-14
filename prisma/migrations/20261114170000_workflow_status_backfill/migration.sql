-- Make a workflow status the real status of every issue.
-- Until now `Issue.workflowStatusId` was optional and often empty. After this migration every
-- issue points at one, and the code keeps it that way.

-- 1. Teams that were never opened after workflow statuses were added have none: give them the
--    five defaults.
INSERT INTO "WorkflowStatus" ("id", "teamId", "key", "name", "type", "position", "color")
SELECT
  'ws_' || t."id" || '_' || d."key",
  t."id",
  d."key",
  d."name",
  d."type"::"WorkflowStatusType",
  d."position",
  d."color"
FROM "Team" t
CROSS JOIN (
  VALUES
    ('backlog', 'Backlog', 'backlog', 0, '#94a3b8'),
    ('todo', 'Todo', 'unstarted', 1, '#64748b'),
    ('in_progress', 'In Progress', 'started', 2, '#f59e0b'),
    ('done', 'Done', 'completed', 3, '#22c55e'),
    ('canceled', 'Canceled', 'canceled', 4, '#ef4444')
) AS d("key", "name", "type", "position", "color")
WHERE NOT EXISTS (
  SELECT 1 FROM "WorkflowStatus" w WHERE w."teamId" = t."id"
)
ON CONFLICT DO NOTHING;

-- 2. A team that deleted every status of some type still needs one, because each issue status
--    maps to a type. Recreate the missing ones.
INSERT INTO "WorkflowStatus" ("id", "teamId", "key", "name", "type", "position", "color")
SELECT
  'ws_' || t."id" || '_' || d."key",
  t."id",
  d."key",
  d."name",
  d."type"::"WorkflowStatusType",
  d."position",
  d."color"
FROM "Team" t
CROSS JOIN (
  VALUES
    ('backlog', 'Backlog', 'backlog', 0, '#94a3b8'),
    ('todo', 'Todo', 'unstarted', 1, '#64748b'),
    ('in_progress', 'In Progress', 'started', 2, '#f59e0b'),
    ('done', 'Done', 'completed', 3, '#22c55e'),
    ('canceled', 'Canceled', 'canceled', 4, '#ef4444')
) AS d("key", "name", "type", "position", "color")
WHERE NOT EXISTS (
  SELECT 1 FROM "WorkflowStatus" w
  WHERE w."teamId" = t."id" AND w."type" = d."type"::"WorkflowStatusType"
)
ON CONFLICT DO NOTHING;

-- 3. Point every issue without a workflow status at its team's first status of the matching type.
UPDATE "Issue" AS i
SET "workflowStatusId" = w."id"
FROM (
  SELECT DISTINCT ON ("teamId", "type") "id", "teamId", "type"
  FROM "WorkflowStatus"
  ORDER BY "teamId", "type", "position"
) AS w
WHERE i."workflowStatusId" IS NULL
  AND w."teamId" = i."teamId"
  AND w."type" = CASE i."status"
    WHEN 'BACKLOG' THEN 'backlog'::"WorkflowStatusType"
    WHEN 'TODO' THEN 'unstarted'::"WorkflowStatusType"
    WHEN 'IN_PROGRESS' THEN 'started'::"WorkflowStatusType"
    WHEN 'DONE' THEN 'completed'::"WorkflowStatusType"
    WHEN 'CANCELLED' THEN 'canceled'::"WorkflowStatusType"
  END;