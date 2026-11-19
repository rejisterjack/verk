import { z } from "zod";

export const roleSchema = z.enum(["OWNER", "ADMIN", "MEMBER", "GUEST"]);
export const issueStatusSchema = z.enum([
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
]);
export const prioritySchema = z.enum([
  "NONE",
  "URGENT",
  "HIGH",
  "MEDIUM",
  "LOW",
]);

export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createTeamSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  slug: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  cycleDurationWeeks: z.number().int().min(1).max(8).optional(),
  githubRepo: z
    .string()
    .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/)
    .nullable()
    .optional(),
  /** GitLab project path, `group/project` or nested `group/sub/project`. */
  gitlabProject: z
    .string()
    .max(200)
    .regex(/^[A-Za-z0-9_.-]+(\/[A-Za-z0-9_.-]+)+$/)
    .nullable()
    .optional(),
  slaHours: z
    .record(z.string(), z.number().nonnegative())
    .nullable()
    .optional(),
  cycleCooldownDays: z.number().int().min(0).max(30).optional(),
  triageOwnerId: z.string().cuid().nullable().optional(),
  slackWebhookUrl: z.string().url().nullable().optional(),
  /** Slack workspace id, e.g. T01234567. */
  slackTeamId: z
    .string()
    .regex(/^[A-Z0-9]{3,20}$/, "Use the Slack workspace id, like T01234567")
    .nullable()
    .optional(),
  /** Slack channel id, e.g. C01234567. Empty means every channel in the workspace. */
  slackChannelId: z
    .string()
    .regex(/^[A-Z0-9]{3,20}$/, "Use the Slack channel id, like C01234567")
    .nullable()
    .optional(),
  githubMergeCompletes: z.boolean().optional(),
  timezone: z.string().min(1).max(64).optional(),
  slaStartHour: z.number().int().min(0).max(23).optional(),
  slaEndHour: z.number().int().min(1).max(24).optional(),
  slaWeekdays: z.string().max(20).optional(),
  isPrivate: z.boolean().optional(),
  parentId: z.string().cuid().nullable().optional(),
  autoCloseParent: z.boolean().optional(),
  subIssueInherit: z.boolean().optional(),
  estimateScale: z
    .enum(["off", "linear", "exponential", "fibonacci", "tshirt"])
    .optional(),
});

export const estimateSchema = z.enum([
  "NONE",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "ONE",
  "TWO",
  "THREE",
  "FOUR",
  "FIVE",
  "EIGHT",
  "SIXTEEN",
  "THIRTEEN",
]);

export const createIssueSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(20000).optional().default(""),
  status: issueStatusSchema.optional(),
  priority: prioritySchema.optional(),
  estimate: estimateSchema.optional(),
  dueDate: z.coerce.date().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  visibility: z.enum(["TEAM", "RESTRICTED"]).optional(),
  readerIds: z.array(z.string().cuid()).max(50).optional(),
  assigneeId: z.string().cuid().nullable().optional(),
  cycleId: z.string().cuid().nullable().optional(),
  projectId: z.string().cuid().nullable().optional(),
  milestoneId: z.string().cuid().nullable().optional(),
  workflowStatusId: z.string().cuid().nullable().optional(),
  parentId: z.string().cuid().nullable().optional(),
  labelIds: z.array(z.string().cuid()).optional(),
  clientMutationId: z.string().min(1).max(80).optional(),
});

export const updateIssueSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(20000).optional(),
  status: issueStatusSchema.optional(),
  priority: prioritySchema.optional(),
  estimate: estimateSchema.optional(),
  dueDate: z.coerce.date().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  visibility: z.enum(["TEAM", "RESTRICTED"]).optional(),
  readerIds: z.array(z.string().cuid()).max(50).optional(),
  assigneeId: z.string().cuid().nullable().optional(),
  cycleId: z.string().cuid().nullable().optional(),
  projectId: z.string().cuid().nullable().optional(),
  milestoneId: z.string().cuid().nullable().optional(),
  workflowStatusId: z.string().cuid().nullable().optional(),
  parentId: z.string().cuid().nullable().optional(),
  order: z.number().optional(),
  triageAt: z.coerce.date().nullable().optional(),
  revision: z.number().int().optional(),
  clientMutationId: z.string().min(1).max(80).optional(),
});

export const reorderIssueSchema = z.object({
  issueId: z.string().min(1),
  status: issueStatusSchema,
  order: z.number(),
  revision: z.number().int().optional(),
  clientMutationId: z.string().min(1).max(80).optional(),
  workflowStatusId: z.string().cuid().nullable().optional(),
});

export const createCycleSchema = z
  .object({
    name: z.string().min(1).max(100),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

export const updateCycleSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
    capacityPoints: z.number().int().min(0).max(1000).nullable().optional(),
  })
  .refine((d) => !d.startDate || !d.endDate || d.endDate >= d.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

export const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER", "GUEST"]).default("MEMBER"),
});

export const updateMemberRoleSchema = z.object({
  role: roleSchema,
});

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(80),
  role: z.enum(["GUEST", "MEMBER", "ADMIN"]).default("MEMBER"),
});

/** HTML GET forms / clearable Selects submit "" for unset fields. */
const emptyToUndef = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema);

export const listIssuesQuerySchema = z.object({
  status: emptyToUndef(
    z.union([issueStatusSchema, z.array(issueStatusSchema)]).optional(),
  ),
  priority: emptyToUndef(prioritySchema.optional()),
  cycleId: emptyToUndef(z.string().cuid().optional()),
  assigneeId: emptyToUndef(z.string().cuid().optional()),
  projectId: emptyToUndef(z.string().cuid().optional()),
  workflowStatusId: emptyToUndef(z.string().cuid().optional()),
  labelGroup: emptyToUndef(z.string().max(40).optional()),
  number: z.coerce.number().int().positive().optional(),
  triage: z.coerce.boolean().optional(),
  /** `true` lists only archived issues. The default hides them. */
  archived: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v === true || v === "true"),
    z.boolean().optional(),
  ),
  /** A filter tree (see lib/issue-filter.ts), as an object or a JSON string. */
  filter: z.unknown().optional(),
  /** `parentId` lists the sub-issues of one issue; `topLevel` hides every sub-issue. */
  parentId: emptyToUndef(z.string().cuid().optional()),
  topLevel: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v === true || v === "true"),
    z.boolean().optional(),
  ),
  search: emptyToUndef(z.string().max(200).optional()),
  cursor: emptyToUndef(z.string().cuid().optional()),
  take: z.coerce.number().int().min(1).max(200).optional().default(50),
});

export const BULK_ISSUE_LIMIT = 200;

/** Fields a bulk edit may change on every selected issue. */
export const bulkIssuePatchSchema = z
  .object({
    status: issueStatusSchema.optional(),
    priority: prioritySchema.optional(),
    estimate: estimateSchema.optional(),
    dueDate: z.coerce.date().nullable().optional(),
    startDate: z.coerce.date().nullable().optional(),
    assigneeId: z.string().cuid().nullable().optional(),
    cycleId: z.string().cuid().nullable().optional(),
    projectId: z.string().cuid().nullable().optional(),
    workflowStatusId: z.string().cuid().nullable().optional(),
    addLabelIds: z.array(z.string().cuid()).max(50).optional(),
    removeLabelIds: z.array(z.string().cuid()).max(50).optional(),
  })
  .strict();

export const bulkIssuesSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(BULK_ISSUE_LIMIT),
  action: z.enum(["update", "archive", "restore", "delete"]).default("update"),
  patch: bulkIssuePatchSchema.optional(),
});

export const createCycleSchemaExtended = z.object({
  durationWeeks: z.number().int().min(1).max(8).optional(),
  carryOver: z.boolean().optional(),
});
