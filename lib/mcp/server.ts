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

  // ---- Planning surface: initiatives, releases, documents, customers, saved views. ----
  // Reads that can expose issue or customer detail need MEMBER, so a project-scoped guest key
  // cannot see more through these tools than it can through list_issues.
  const json = (value: unknown) => ({
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  });

  server.registerTool(
    "list_initiatives",
    {
      title: "List initiatives",
      description:
        "List initiatives with their parent, child count, target date, health and projects",
      inputSchema: {},
    },
    async () =>
      json({ initiatives: await projectsService.listInitiatives(ctx.teamId) }),
  );

  server.registerTool(
    "create_initiative",
    {
      title: "Create initiative",
      description:
        "Create an initiative. Pass parentId to nest it under another initiative; targetDate is an ISO date",
      inputSchema: {
        name: z.string(),
        targetDate: z.string().nullable().optional(),
        parentId: z.string().nullable().optional(),
      },
    },
    async (args) => {
      requireWrite(ctx);

      return json(await projectsService.createInitiative(ctx.teamId, args));
    },
  );

  server.registerTool(
    "update_initiative",
    {
      title: "Update initiative",
      description:
        "Rename an initiative, move its target date or set its health",
      inputSchema: {
        id: z.string(),
        name: z.string().optional(),
        targetDate: z.string().nullable().optional(),
        health: z.enum(["ON_TRACK", "AT_RISK", "OFF_TRACK"]).optional(),
      },
    },
    async (args) => {
      requireWrite(ctx);
      const { id, ...patch } = args;

      return json(
        await projectsService.updateInitiative(ctx.teamId, id, patch),
      );
    },
  );

  server.registerTool(
    "list_releases",
    {
      title: "List releases",
      description:
        "List releases with their pipeline, current stage and the issues in each",
      inputSchema: {},
    },
    async () => {
      requireWrite(ctx, "MEMBER");
      const { listReleases } = await import("@/lib/services/releases");

      return json({ releases: await listReleases(ctx.teamId) });
    },
  );

  server.registerTool(
    "create_release",
    {
      title: "Create release",
      description:
        "Create a release in a pipeline (the first pipeline and its first stage by default)",
      inputSchema: {
        name: z.string(),
        targetDate: z.string().nullable().optional(),
        pipelineId: z.string().optional(),
        stageId: z.string().optional(),
      },
    },
    async (args) => {
      requireWrite(ctx);
      const { createRelease } = await import("@/lib/services/releases");

      return json(await createRelease(ctx.teamId, args));
    },
  );

  server.registerTool(
    "set_issue_release",
    {
      title: "Put an issue in a release",
      description:
        "Move an issue into a release (and optionally a stage of its pipeline). Pass releaseId null to remove it from its release",
      inputSchema: {
        issueId: z.string(),
        releaseId: z.string().nullable(),
        stageId: z.string().nullable().optional(),
      },
    },
    async (args) => {
      requireWrite(ctx);
      const { setIssueRelease } = await import("@/lib/services/releases");

      return json({
        release: await setIssueRelease(
          ctx.teamId,
          args.issueId,
          args.releaseId,
          args.stageId,
        ),
      });
    },
  );

  server.registerTool(
    "list_documents",
    {
      title: "List documents",
      description:
        "List team documents with their project or initiative and comments",
      inputSchema: {},
    },
    async () => {
      requireWrite(ctx, "MEMBER");
      const { listDocuments } = await import("@/lib/services/surface");

      return json({ documents: await listDocuments(ctx.teamId) });
    },
  );

  server.registerTool(
    "save_document",
    {
      title: "Create or update a document",
      description:
        "Create a document, or update one when id is given. Pass baseBody (the body you started from) when updating so a save made in between is merged by line instead of overwritten. Attach to a project or initiative with projectId / initiativeId",
      inputSchema: {
        id: z.string().optional(),
        title: z.string(),
        body: z.string().optional(),
        baseBody: z.string().optional(),
        projectId: z.string().nullable().optional(),
        initiativeId: z.string().nullable().optional(),
      },
    },
    async (args) => {
      requireWrite(ctx);
      const { saveDocument } = await import("@/lib/services/surface");
      const { id, ...input } = args;

      return json(await saveDocument(ctx.teamId, ctx.userId, input, id));
    },
  );

  server.registerTool(
    "list_customers",
    {
      title: "List customers",
      description: "List customers and the requests each has made",
      inputSchema: {},
    },
    async () => {
      requireWrite(ctx, "MEMBER");
      const { listCustomers } = await import("@/lib/services/surface");

      return json({ customers: await listCustomers(ctx.teamId) });
    },
  );

  server.registerTool(
    "add_customer_request",
    {
      title: "Record a customer request",
      description:
        "Record that a customer asked for something, optionally linked to an issue by number. Pass customerName to create the customer on the fly",
      inputSchema: {
        customerId: z.string().optional(),
        customerName: z.string().optional(),
        body: z.string(),
        issueNumber: z.number().int().positive().optional(),
      },
    },
    async (args) => {
      requireWrite(ctx);
      const { addCustomerRequest, createCustomer, listCustomers } =
        await import("@/lib/services/surface");
      let customerId = args.customerId;

      if (!customerId) {
        const name = args.customerName?.trim();

        if (!name) {
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text: "Pass customerId or customerName",
              },
            ],
          };
        }
        const existing = (await listCustomers(ctx.teamId)).find(
          (customer) => customer.name.toLowerCase() === name.toLowerCase(),
        );

        customerId = (existing ?? (await createCustomer(ctx.teamId, { name })))
          .id;
      }

      return json(
        await addCustomerRequest(ctx.teamId, customerId, {
          body: args.body,
          issueNumber: args.issueNumber,
        }),
      );
    },
  );

  server.registerTool(
    "list_views",
    {
      title: "List saved views",
      description:
        "List saved issue views (name, layout and the filter each stores). Pass a view's filter to list_issues to run it",
      inputSchema: {},
    },
    async () => {
      requireWrite(ctx, "MEMBER");
      const { listViews } = await import("@/lib/services/views");

      return json({ views: await listViews(ctx.teamId) });
    },
  );

  // ---- Project dependencies and customer value. ----
  server.registerTool(
    "list_project_dependencies",
    {
      title: "List project dependencies",
      description:
        "List which projects depend on which, plus scheduling conflicts (a project that starts or is due before the project it waits on) and the projects that are ready to start",
      inputSchema: {},
    },
    async () => {
      requireWrite(ctx, "MEMBER");
      const service = await import("@/lib/services/project-dependencies");
      const [dependencies, report] = await Promise.all([
        service.listDependencies(ctx.teamId, ctx.userId),
        service.dependencyReport(ctx.teamId, ctx.userId),
      ]);

      return json({ dependencies, ...report });
    },
  );

  server.registerTool(
    "add_project_dependency",
    {
      title: "Make a project depend on another",
      description:
        "projectId depends on dependsOnId (the second should finish first). Loops, duplicates and self-dependencies are refused",
      inputSchema: { projectId: z.string(), dependsOnId: z.string() },
    },
    async (args) => {
      requireWrite(ctx);
      const service = await import("@/lib/services/project-dependencies");

      try {
        return json(
          await service.addDependency(
            ctx.teamId,
            args.projectId,
            args.dependsOnId,
            ctx.role,
          ),
        );
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: error instanceof Error ? error.message : "Request failed",
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    "remove_project_dependency",
    {
      title: "Remove a project dependency",
      description: "Stop projectId depending on dependsOnId",
      inputSchema: { projectId: z.string(), dependsOnId: z.string() },
    },
    async (args) => {
      requireWrite(ctx);
      const service = await import("@/lib/services/project-dependencies");

      await service.removeDependency(
        ctx.teamId,
        args.projectId,
        args.dependsOnId,
        ctx.role,
      );

      return json({ removed: true });
    },
  );

  server.registerTool(
    "set_customer_value",
    {
      title: "Set a customer's tier and revenue",
      description:
        "Record a customer's plan (tier, free text) and annual revenue (whole currency units). Customer demand can then be ranked by revenue",
      inputSchema: {
        customerId: z.string(),
        tier: z.string().optional(),
        arr: z.number().int().min(0).optional(),
      },
    },
    async (args) => {
      requireWrite(ctx);
      const { updateCustomerValue } = await import("@/lib/services/surface");
      const { customerId, ...value } = args;

      return json(
        await updateCustomerValue(ctx.teamId, customerId, value, ctx.role),
      );
    },
  );

  // ---- Admin tools: the same role the settings pages need. ----
  server.registerTool(
    "list_automations",
    {
      title: "List automations",
      description:
        "List the team's automation rules (trigger, conditions, actions, run count). Admin only",
      inputSchema: {},
    },
    async () => {
      requireWrite(ctx, "ADMIN");
      const { listAutomations } = await import("@/lib/services/automations");

      return json({ automations: await listAutomations(ctx.teamId) });
    },
  );

  server.registerTool(
    "list_audit_log",
    {
      title: "List the audit log",
      description:
        "Who changed members, keys, hooks and settings, newest first. Filter by action and ISO day (YYYY-MM-DD); pass the returned nextCursor to page back. Admin only",
      inputSchema: {
        action: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        cursor: z.string().optional(),
        take: z.number().int().min(1).max(200).optional(),
      },
    },
    async (args) => {
      requireWrite(ctx, "ADMIN");
      const { listAuditLog } = await import("@/lib/services/audit");

      return json(await listAuditLog(ctx.teamId, args));
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
