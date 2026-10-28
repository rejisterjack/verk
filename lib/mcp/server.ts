import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import * as commentsService from "@/lib/services/comments";
import * as cyclesService from "@/lib/services/cycles";
import * as issuesService from "@/lib/services/issues";
import * as labelsService from "@/lib/services/labels";
import * as membersService from "@/lib/services/members";
import * as projectsService from "@/lib/services/projects";

export function createVerkMcpServer(ctx: { teamId: string; userId: string }) {
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
        take: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args) => {
      const result = await issuesService.listIssues(ctx.teamId, args);

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
      },
    },
    async (args) => {
      const issue = await issuesService.createIssue(
        ctx.teamId,
        ctx.userId,
        args,
      );

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
      },
    },
    async (args) => {
      const { id, ...patch } = args;
      const issue = await issuesService.updateIssue(
        ctx.teamId,
        id,
        patch,
        "ADMIN",
        ctx.userId,
      );

      return {
        content: [{ type: "text", text: JSON.stringify(issue, null, 2) }],
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
      description: "Create a project",
      inputSchema: {
        name: z.string(),
        summary: z.string().optional(),
      },
    },
    async (args) => {
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

  return server;
}
