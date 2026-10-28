import { z } from "zod";

export const roleSchema = z.enum(["OWNER", "ADMIN", "MEMBER"]);
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
  "FIVE",
  "EIGHT",
  "THIRTEEN",
]);

export const createIssueSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(20000).optional().default(""),
  status: issueStatusSchema.optional(),
  priority: prioritySchema.optional(),
  estimate: estimateSchema.optional(),
  dueDate: z.coerce.date().nullable().optional(),
  assigneeId: z.string().cuid().nullable().optional(),
  cycleId: z.string().cuid().nullable().optional(),
  projectId: z.string().cuid().nullable().optional(),
  milestoneId: z.string().cuid().nullable().optional(),
  labelIds: z.array(z.string().cuid()).optional(),
  clientMutationId: z.string().min(1).max(80).optional(),
});

export const updateIssueSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(20000).optional(),
  status: issueStatusSchema.optional(),
  priority: prioritySchema.optional(),
  estimate: estimateSchema.optional(),
  dueDate: z.coerce.date().nullable().optional(),
  assigneeId: z.string().cuid().nullable().optional(),
  cycleId: z.string().cuid().nullable().optional(),
  projectId: z.string().cuid().nullable().optional(),
  milestoneId: z.string().cuid().nullable().optional(),
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
  })
  .refine((d) => !d.startDate || !d.endDate || d.endDate >= d.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

export const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export const updateMemberRoleSchema = z.object({
  role: roleSchema,
});

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(80),
});

export const listIssuesQuerySchema = z.object({
  status: z.union([issueStatusSchema, z.array(issueStatusSchema)]).optional(),
  priority: prioritySchema.optional(),
  cycleId: z.string().cuid().optional(),
  assigneeId: z.string().cuid().optional(),
  projectId: z.string().cuid().optional(),
  number: z.coerce.number().int().positive().optional(),
  triage: z.coerce.boolean().optional(),
  search: z.string().max(200).optional(),
  cursor: z.string().cuid().optional(),
  take: z.coerce.number().int().min(1).max(200).optional().default(50),
});

export const createCycleSchemaExtended = z.object({
  durationWeeks: z.number().int().min(1).max(8).optional(),
  carryOver: z.boolean().optional(),
});
