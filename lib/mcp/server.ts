import type { Role } from "@/lib/generated/prisma/client";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { assertRole } from "@/lib/roles";
import * as commentsService from "@/lib/services/comments";
import * as cyclesService from "@/lib/services/cycles";
import * as issuesService from "@/lib/services/issues";
import * as labelsService from "@/lib/services/labels";
import * as membersService from "@/lib/services/members";
import * as projectsService from "@/lib/services/projects";

export type McpContext = {
  teamId: string;
  userId: string;
  /** The API key's effective role: its own role capped by its creator's team role. */
  role: Role;
};

/** Every write tool calls this first. GUEST keys are read-only. */
export function requireWrite(ctx: McpContext, min: Role = "MEMBER") {
  assertRole(ctx.role, min);
}

export function createVerkMcpServer(ctx: McpContext) {
  const server = new McpServer({
    name: "verk",
    version: "0.1.0",
  });

  server.registerTool(
    "list_issues",
    {
      title: "List issues",
      description: "List issues in the team backlog with optional filters",
      inputSchema: {
        status: z
          .enum(["BACKLOG", "TODO", "IN_PROGRESS", "DONE", "CANCELLED"])
          .optional(),
        priority: z
          .enum(["NONE", "URGENT", "HIGH", "MEDIUM", "LOW"])
          .optional(),
        cycleId: z.string().optional(),
        search: z.string().optional(),
        archived: z
          .boolean()
          .optional()
          .describe("true lists archived issues instead of active ones"),
        filter: z
          .any()
          .optional()
          .describe(
            'Advanced filter. A group is {"op":"and"|"or","rules":[...]}; a condition is {"field","op","value"}. Fields: status, priority, estimate, assignee, creator, subscriber, project, cycle, milestone, parent, workflow_status, label, label_group, title, description, number, created, updated, due, blocked, has_sub_issues. Use "me" for yourself. Example: {"op":"and","rules":[{"field":"status","op":"in","value":["TODO","IN_PROGRESS"]},{"field":"due","op":"within_next","value":7}]}',
          ),
        take: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args) => {
      const result = await issuesService.listIssues(ctx.teamId, args, {
        userId: ctx.userId,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    "get_issue",
    {
      title: "Get issue",
      description: "Get a single issue by number or id",
      inputSchema: {
        number: z.number().int().optional(),
        id: z.string().optional(),
      },
    },
    async (args) => {
      let issue = null;

      if (args.id) {
        issue = await issuesService.getIssueById(ctx.teamId, args.id);
      } else if (args.number) {
        issue = await issuesService.getIssueByNumber(ctx.teamId, args.number);
      }
      if (!issue) {
        return {
          content: [{ type: "text", text: "Issue not found" }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(issue, null, 2) }],
      };
    },
  );

  server.registerTool(
    "create_issue",
    {
      title: "Create issue",
      description: "Create a new issue in the team",
      inputSchema: {
        title: z.string(),
        description: z.string().optional(),
        status: z
          .enum(["BACKLOG", "TODO", "IN_PROGRESS", "DONE", "CANCELLED"])
          .optional(),
        priority: z
          .enum(["NONE", "URGENT", "HIGH", "MEDIUM", "LOW"])
          .optional(),
        cycleId: z.string().nullable().optional(),
        estimate: z.string().optional(),
        dueDate: z.string().nullable().optional(),
        projectId: z.string().nullable().optional(),
        parentId: z.string().nullable().optional(),
        workflowStatusId: z
          .string()
          .optional()
          .describe(
            "A workflow status id from list_statuses (overrides status)",
          ),
        labelIds: z.array(z.string()).optional(),
        clientMutationId: z.string().optional(),
      },
    },
    async (args) => {
      requireWrite(ctx);
      const { labelIds, ...rest } = args;
      const issue = await issuesService.createIssue(ctx.teamId, ctx.userId, {
        ...rest,
        labelIds,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(issue, null, 2) }],
      };
    },
  );

  server.registerTool(
    "update_issue",
    {
      title: "Update issue",
      description: "Update an issue including status changes",
      inputSchema: {
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z
          .enum(["BACKLOG", "TODO", "IN_PROGRESS", "DONE", "CANCELLED"])
          .optional(),
        priority: z
          .enum(["NONE", "URGENT", "HIGH", "MEDIUM", "LOW"])
          .optional(),
        assigneeId: z.string().nullable().optional(),
        cycleId: z.string().nullable().optional(),
        estimate: z.string().optional(),
        dueDate: z.string().nullable().optional(),
        projectId: z.string().nullable().optional(),
        workflowStatusId: z
          .string()
          .optional()
          .describe(
            "A workflow status id from list_statuses (overrides status)",
          ),
        labelIds: z.array(z.string()).optional(),
        clientMutationId: z.string().optional(),
      },
    },
    async (args) => {
      requireWrite(ctx);
      const { id, labelIds, ...patch } = args;

      if (labelIds) {
        await labelsService.setIssueLabels(
          ctx.teamId,
          id,
          labelIds,
          ctx.userId,
        );
      }
      const issue = await issuesService.updateIssue(
        ctx.teamId,
        id,
        patch,
        ctx.role,
        ctx.userId,
      );

      return {
        content: [{ type: "text", text: JSON.stringify(issue, null, 2) }],
      };
    },
  );

  server.registerTool(
    "archive_issue",
    {
      title: "Archive issue",
      description:
        "Archive an issue. It is hidden from lists and boards and permanently removed after 30 days unless restored",
      inputSchema: { id: z.string() },
    },
    async (args) => {
      requireWrite(ctx);
      const issue = await issuesService.archiveIssue(
        ctx.teamId,
        args.id,
        ctx.role,
        ctx.userId,
      );

      return {
        content: [{ type: "text", text: JSON.stringify(issue, null, 2) }],
      };
    },
  );

  server.registerTool(
    "restore_issue",
    {
      title: "Restore issue",
      description: "Restore an archived issue",
      inputSchema: { id: z.string() },
    },
    async (args) => {
      requireWrite(ctx);
      const issue = await issuesService.restoreIssue(
        ctx.teamId,
        args.id,
        ctx.role,
        ctx.userId,
      );

      return {
        content: [{ type: "text", text: JSON.stringify(issue, null, 2) }],
      };
    },
  );

  server.registerTool(
    "bulk_update_issues",
    {
      title: "Bulk update issues",
      description:
        "Apply one change to up to 200 issues at once: update fields (status, priority, assignee, cycle, project, add or remove labels), archive, restore or delete. Returns which ids succeeded and which failed",
      inputSchema: {
        ids: z.array(z.string()).min(1).max(200),
        action: z.enum(["update", "archive", "restore", "delete"]).optional(),
        patch: z
          .object({
            status: z
              .enum(["BACKLOG", "TODO", "IN_PROGRESS", "DONE", "CANCELLED"])
              .optional(),
            priority: z
              .enum(["NONE", "URGENT", "HIGH", "MEDIUM", "LOW"])
              .optional(),
            assigneeId: z.string().nullable().optional(),
            cycleId: z.string().nullable().optional(),
            projectId: z.string().nullable().optional(),
            dueDate: z.string().nullable().optional(),
            addLabelIds: z.array(z.string()).optional(),
            removeLabelIds: z.array(z.string()).optional(),
          })
          .optional(),
      },
    },
    async (args) => {
      requireWrite(ctx);
      const result = await issuesService.bulkUpdateIssues(
        ctx.teamId,
        args,
        ctx.role,
        ctx.userId,
      );

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    "list_cycles",
    {
      title: "List cycles",
      description: "List sprint cycles for the team",
      inputSchema: {},
    },
    async () => {
      const cycles = await cyclesService.listCycles(ctx.teamId);

      return {
        content: [{ type: "text", text: JSON.stringify({ cycles }, null, 2) }],
      };
    },
  );

  server.registerTool(
    "list_members",
    {
      title: "List members",
      description: "List team members (read-only)",
      inputSchema: {},
    },
    async () => {
      const members = await membersService.listMembers(ctx.teamId);

      return {
        content: [{ type: "text", text: JSON.stringify({ members }, null, 2) }],
      };
    },
  );

  server.registerTool(
    "list_projects",
    {
      title: "List projects",
      description: "List projects for the team",
      inputSchema: {},
    },
    async () => {
      const projects = await projectsService.listProjects(ctx.teamId);

      return {
        content: [
          { type: "text", text: JSON.stringify({ projects }, null, 2) },
        ],
      };
    },
  );

  server.registerTool(
    "create_project",
    {
      title: "Create project",
      description:
        "Create a project. Dates are ISO strings (2026-03-01); the start must not be after the target.",
      inputSchema: {
        name: z.string(),
        summary: z.string().optional(),
        startDate: z.string().nullable().optional(),
        targetDate: z.string().nullable().optional(),
      },
    },
    async (args) => {
      requireWrite(ctx);
      const project = await projectsService.createProject(ctx.teamId, args);

      return {
        content: [{ type: "text", text: JSON.stringify(project, null, 2) }],
      };
    },
  );

  server.registerTool(
    "update_project",
    {
      title: "Update project",
      description: "Update a project by id",
      inputSchema: {
        id: z.string(),
        name: z.string().optional(),
        summary: z.string().optional(),
        status: z
          .enum(["BACKLOG", "PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
          .optional(),
      },
    },
    async (args) => {
      requireWrite(ctx);
      const { id, ...patch } = args;
      const project = await projectsService.updateProject(
        ctx.teamId,
        id,
        patch,
      );

      return {
        content: [{ type: "text", text: JSON.stringify(project, null, 2) }],
      };
    },
  );

  server.registerTool(
    "list_labels",
    {
      title: "List labels",
      description: "List issue labels",
      inputSchema: {},
    },
    async () => {
      const labels = await labelsService.listLabels(ctx.teamId);

      return {
        content: [{ type: "text", text: JSON.stringify({ labels }, null, 2) }],
      };
    },
  );

  server.registerTool(
    "add_comment",
    {
      title: "Add comment",
      description: "Add a comment to an issue",
      inputSchema: {
        issueId: z.string(),
        body: z.string(),
      },
    },
    async (args) => {
      requireWrite(ctx);
      const comment = await commentsService.addComment(
        ctx.teamId,
        args.issueId,
        ctx.userId,
        { body: args.body },
      );

      return {
        content: [{ type: "text", text: JSON.stringify(comment, null, 2) }],
      };
    },
  );

  server.registerTool(
    "list_comments",
    {
      title: "List comments",
      description: "List comments on an issue",
      inputSchema: { issueId: z.string() },
    },
    async (args) => {
      const comments = await commentsService.listComments(
        ctx.teamId,
        args.issueId,
      );

      return {
        content: [
          { type: "text", text: JSON.stringify({ comments }, null, 2) },
        ],
      };
    },
  );

  server.registerTool(
    "delete_comment",
    {
      title: "Delete comment",
      description: "Delete a comment",
      inputSchema: { commentId: z.string() },
    },
    async (args) => {
      requireWrite(ctx);
      await commentsService.deleteComment(
        ctx.teamId,
        args.commentId,
        ctx.userId,
        ctx.role,
      );

      return { content: [{ type: "text", text: "deleted" }] };
    },
  );

  server.registerTool(
    "add_relation",
    {
      title: "Add relation",
      description:
        "Relate two issues. DUPLICATE means issueId is a duplicate of toIssueId: it is cancelled and its watchers move to toIssueId. Blocking and parent loops are rejected",
      inputSchema: {
        issueId: z.string(),
        toIssueId: z.string(),
        type: z.enum([
          "BLOCKS",
          "BLOCKED_BY",
          "RELATED",
          "PARENT",
          "CHILD",
          "DUPLICATE",
          "DUPLICATED_BY",
        ]),
      },
    },
    async (args) => {
      requireWrite(ctx);
      const { addRelation } = await import("@/lib/services/relations");
      const relation = await addRelation(
        ctx.teamId,
        args.issueId,
        { toIssueId: args.toIssueId, type: args.type },
        ctx.userId,
      );

      return {
        content: [{ type: "text", text: JSON.stringify(relation, null, 2) }],
      };
    },
  );

  server.registerTool(
    "search",
    {
      title: "Search",
      description:
        'Search the team across issues (title, description and comments), projects, initiatives, docs, customers, cycles and people. Words must all match; use "quotes" for a phrase, -word to exclude, ENG-12 or #12 to jump to an issue, and operators assignee:me, creator:, status:todo, priority:high, label:bug, project:, cycle:current, type:doc',
      inputSchema: {
        query: z.string(),
        limit: z.number().int().min(1).max(50).optional(),
      },
    },
    async (args) => {
      const { searchTeam } = await import("@/lib/services/search");
      const team = await (
        await import("@/lib/db")
      ).prisma.team.findUnique({
        where: { id: ctx.teamId },
        select: { slug: true },
      });
      const result = await searchTeam(
        ctx.teamId,
        team?.slug ?? "",
        args.query,
        {
          userId: ctx.userId,
          limit: args.limit,
        },
      );

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    "summarize_issue",
    {
      title: "Summarize an issue",
      description:
        "A short summary of an issue and its discussion (uses the configured model, or a plain extract when there is none). Read-only.",
      inputSchema: { issueId: z.string() },
    },
    async (args) => {
      const { summarizeIssue } = await import("@/lib/ai");
      const { canSeeIssue } = await import("@/lib/services/guest-scope");
      const issue = await issuesService.getIssueById(ctx.teamId, args.issueId);

      if (!issue || !(await canSeeIssue(ctx.teamId, ctx.userId, issue))) {
        return {
          isError: true,
          content: [{ type: "text", text: "Issue not found" }],
        };
      }
      const thread = await commentsService.listComments(
        ctx.teamId,
        args.issueId,
      );
      const result = await summarizeIssue({
        title: issue.title,
        description: issue.description,
        comments: thread,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    "suggest_triage",
    {
      title: "Suggest priority and labels",
      description:
        "Suggest a priority and existing labels for a title and description. Only a suggestion: nothing is changed. Uses the configured model, or keyword rules when there is none.",
      inputSchema: {
        title: z.string().min(1),
        description: z.string().optional(),
      },
    },
    async (args) => {
      const { suggestTriage } = await import("@/lib/ai");
      const labelList = await labelsService.listLabels(ctx.teamId);
      const result = await suggestTriage(
        args.title,
        args.description ?? "",
        labelList.map((label) => label.name),
      );

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    "list_statuses",
    {
      title: "List workflow statuses",
      description:
        "The team's workflow statuses in board order, each with its id, name, type (backlog, unstarted, started, completed, canceled) and color. Use an id as workflowStatusId in create_issue or update_issue to put an issue in a custom status",
      inputSchema: {},
    },
    async () => {
      const { getWorkflow } = await import("@/lib/services/workflow");
      const statuses = await getWorkflow(ctx.teamId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              statuses.map((s) => ({
                id: s.id,
                name: s.name,
                type: s.type,
                color: s.color,
              })),
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    "create_status",
    {
      title: "Create workflow status",
      description:
        "Add a custom workflow status (for example 'In review' of type started). Admin keys only",
      inputSchema: {
        name: z.string(),
        type: z.enum([
          "backlog",
          "unstarted",
          "started",
          "completed",
          "canceled",
        ]),
        color: z.string().optional().describe("Hex color like #6366f1"),
      },
    },
    async (args) => {
      requireWrite(ctx, "ADMIN");
      const { createWorkflowStatus } = await import("@/lib/services/workflow");
      const status = await createWorkflowStatus(ctx.teamId, args, ctx.role);

      return {
        content: [{ type: "text", text: JSON.stringify(status, null, 2) }],
      };
    },
  );

  server.registerTool(
    "list_sub_issues",
    {
      title: "List sub-issues",
      description:
        "Get an issue's parent, its sub-issues and how many sub-issues are finished",
      inputSchema: { id: z.string() },
    },
    async (args) => {
      const { listSubIssues } = await import("@/lib/services/sub-issues");
      const result = await listSubIssues(ctx.teamId, args.id);

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    "create_sub_issue",
    {
      title: "Create sub-issue",
      description:
        "Create an issue under a parent issue. It inherits the parent's project, cycle and labels when the team has that turned on",
      inputSchema: {
        parentId: z.string(),
        title: z.string(),
        description: z.string().optional(),
        priority: z
          .enum(["NONE", "URGENT", "HIGH", "MEDIUM", "LOW"])
          .optional(),
        assigneeId: z.string().nullable().optional(),
      },
    },
    async (args) => {
      requireWrite(ctx);
      const { createSubIssue } = await import("@/lib/services/sub-issues");
      const { parentId, ...rest } = args;
      const issue = await createSubIssue(
        ctx.teamId,
        parentId,
        ctx.userId,
        rest,
      );

      return {
        content: [{ type: "text", text: JSON.stringify(issue, null, 2) }],
      };
    },
  );

  server.registerTool(
    "set_parent_issue",
    {
      title: "Set parent issue",
      description:
        "Move an issue under a new parent, or pass parentId null to make it top-level. Loops are rejected",
      inputSchema: { id: z.string(), parentId: z.string().nullable() },
    },
    async (args) => {
      requireWrite(ctx);
      const { setParent } = await import("@/lib/services/sub-issues");
      const issue = await setParent(
        ctx.teamId,
        args.id,
        args.parentId,
        ctx.role,
        ctx.userId,
      );

      return {
        content: [{ type: "text", text: JSON.stringify(issue, null, 2) }],
      };
    },
  );

  server.registerTool(
    "find_similar_issues",
    {
      title: "Find similar issues",
      description:
        "Find existing issues whose title resembles a new one. Call before create_issue to avoid filing a duplicate",
      inputSchema: { title: z.string() },
    },
    async (args) => {
      const { findSimilarIssues } = await import("@/lib/services/relations");
      const similar = await findSimilarIssues(ctx.teamId, args.title);

      return {
        content: [{ type: "text", text: JSON.stringify({ similar }, null, 2) }],
      };
    },
  );

  server.registerResource(
    "backlog",
    "verk://backlog",
    {
      description: "Current team backlog issues",
      mimeType: "application/json",
    },
    async () => {
      const result = await issuesService.listIssues(ctx.teamId, {
        status: ["BACKLOG", "TODO", "IN_PROGRESS"],
        take: 100,
      });

      return {
        contents: [
          {
            uri: "verk://backlog",
            mimeType: "application/json",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  server.registerResource(
    "cycles",
    "verk://cycles",
    {
      description: "Team cycles",
      mimeType: "application/json",
    },
    async () => {
      const cycles = await cyclesService.listCycles(ctx.teamId);

      return {
        contents: [
          {
            uri: "verk://cycles",
            mimeType: "application/json",
            text: JSON.stringify({ cycles }, null, 2),
          },
        ],
      };
    },
  );

  // ---- Delegating work to a coding agent: claim, keep alive, report back. ----
  const claimText = (value: unknown) => ({
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  });
  const claimError = (error: unknown) => ({
    isError: true,
    content: [
      {
        type: "text" as const,
        text: error instanceof Error ? error.message : "Request failed",
      },
    ],
  });

  server.registerTool(
    "claim_issue",
    {
      title: "Claim an issue to work on",
      description:
        "Take a lease on an issue so no other agent works on it. You become the assignee and the issue moves to In progress. Keep the lease alive with agent_heartbeat; it runs out on its own (default 30 minutes) if you stop.",
      inputSchema: {
        issueId: z.string(),
        leaseMinutes: z.number().int().min(1).max(240).optional(),
      },
    },
    async (args) => {
      requireWrite(ctx);
      try {
        const claims = await import("@/lib/services/agent-claims");

        return claimText(
          await claims.claimIssue(ctx.teamId, ctx.userId, args.issueId, {
            leaseMinutes: args.leaseMinutes,
            role: ctx.role,
          }),
        );
      } catch (error) {
        return claimError(error);
      }
    },
  );

  server.registerTool(
    "agent_heartbeat",
    {
      title: "Keep an issue claim alive",
      description:
        "Extend your lease on a claimed issue, optionally leaving a short progress note.",
      inputSchema: {
        issueId: z.string(),
        leaseMinutes: z.number().int().min(1).max(240).optional(),
        note: z.string().max(2000).optional(),
      },
    },
    async (args) => {
      requireWrite(ctx);
      try {
        const claims = await import("@/lib/services/agent-claims");

        return claimText(
          await claims.heartbeat(ctx.teamId, ctx.userId, args.issueId, args),
        );
      } catch (error) {
        return claimError(error);
      }
    },
  );

  server.registerTool(
    "report_result",
    {
      title: "Report the outcome of a claimed issue",
      description:
        'Finish a claim. outcome "completed" posts your note as a comment (and marks the issue Done when markDone is true); "failed" posts the reason and returns the issue to Todo, unassigned.',
      inputSchema: {
        issueId: z.string(),
        outcome: z.enum(["completed", "failed"]),
        note: z.string().max(2000).optional(),
        resultUrl: z.string().url().optional(),
        markDone: z.boolean().optional(),
      },
    },
    async (args) => {
      requireWrite(ctx);
      try {
        const claims = await import("@/lib/services/agent-claims");

        return claimText(
          await claims.reportResult(ctx.teamId, ctx.userId, args.issueId, {
            ...args,
            role: ctx.role,
          }),
        );
      } catch (error) {
        return claimError(error);
      }
    },
  );

  server.registerTool(
    "release_issue",
    {
      title: "Give up a claimed issue",
      description:
        "Let go of an issue without a result. It goes back to Todo, unassigned, for someone else.",
      inputSchema: { issueId: z.string() },
    },
    async (args) => {
      requireWrite(ctx);
      try {
        const claims = await import("@/lib/services/agent-claims");

        return claimText(
          await claims.releaseClaim(
            ctx.teamId,
            ctx.userId,
            args.issueId,
            ctx.role,
          ),
        );
      } catch (error) {
        return claimError(error);
      }
    },
  );

  return server;
}
