import type { Role } from "@/lib/generated/prisma/client";

import {
  buildSchema,
  type DocumentNode,
  type GraphQLSchema,
  Kind,
  type SelectionSetNode,
  parse,
  validate,
} from "graphql";

import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/errors";
import * as comments from "@/lib/services/comments";
import * as cycles from "@/lib/services/cycles";
import * as issues from "@/lib/services/issues";
import * as labels from "@/lib/services/labels";
import { canSeeIssue, guestIssueScope } from "@/lib/services/guest-scope";
import * as projects from "@/lib/services/projects";
import { getWorkflow } from "@/lib/services/workflow";

/**
 * GraphQL over the same services the REST API and MCP use, so every permission check, validation
 * and side effect (webhooks, automations, audit) behaves identically. One endpoint per team:
 * `POST /api/teams/{teamId}/graphql`.
 */
export const typeDefs = /* GraphQL */ `
  enum IssueStatus {
    BACKLOG
    TODO
    IN_PROGRESS
    DONE
    CANCELLED
  }
  enum Priority {
    NONE
    URGENT
    HIGH
    MEDIUM
    LOW
  }

  type User {
    id: ID!
    name: String
    email: String!
  }
  type Label {
    id: ID!
    name: String!
    color: String!
    group: String
  }
  type Cycle {
    id: ID!
    name: String!
    startDate: String!
    endDate: String!
    isActive: Boolean!
  }
  type Project {
    id: ID!
    name: String!
    summary: String!
    status: String!
    startDate: String
    targetDate: String
  }
  type WorkflowStatus {
    id: ID!
    name: String!
    type: String!
    color: String!
  }
  type Comment {
    id: ID!
    body: String!
    createdAt: String!
    author: User
  }
  type Issue {
    id: ID!
    number: Int!
    title: String!
    description: String!
    status: IssueStatus!
    priority: Priority!
    estimate: String!
    dueDate: String
    revision: Int!
    createdAt: String!
    updatedAt: String!
    assignee: User
    creator: User
    cycle: Cycle
    project: Project
    labels: [Label!]!
    comments: [Comment!]!
  }
  type IssuePage {
    issues: [Issue!]!
    nextCursor: String
  }

  input IssueFilterInput {
    status: [IssueStatus!]
    priority: Priority
    assigneeId: ID
    cycleId: ID
    projectId: ID
    search: String
    """
    A filter tree as JSON (the same shape as the REST \`filter\` parameter).
    """
    filter: String
    cursor: String
    take: Int
  }
  input CreateIssueInput {
    title: String!
    description: String
    status: IssueStatus
    priority: Priority
    assigneeId: ID
    cycleId: ID
    projectId: ID
    labelIds: [ID!]
  }
  input UpdateIssueInput {
    title: String
    description: String
    status: IssueStatus
    priority: Priority
    assigneeId: ID
    cycleId: ID
    projectId: ID
    revision: Int
  }

  type Query {
    issue(id: ID, number: Int): Issue
    issues(filter: IssueFilterInput): IssuePage!
    projects: [Project!]!
    cycles: [Cycle!]!
    labels: [Label!]!
    members: [User!]!
    workflowStatuses: [WorkflowStatus!]!
  }

  type Mutation {
    createIssue(input: CreateIssueInput!): Issue!
    updateIssue(id: ID!, input: UpdateIssueInput!): Issue!
    addComment(issueId: ID!, body: String!): Comment!
  }
`;

export type GqlContext = {
  teamId: string;
  userId: string;
  role: Role;
};

type Json = Record<string, unknown>;

const iso = (value: unknown) =>
  value instanceof Date ? value.toISOString() : (value ?? null);

function shapeIssue(row: Json) {
  return {
    ...row,
    dueDate: iso(row.dueDate),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    labels: ((row.labels as { label: Json }[] | undefined) ?? []).map(
      (entry) => entry.label,
    ),
  };
}

export const rootValue = {
  async issue(args: { id?: string; number?: number }, ctx: GqlContext) {
    if (args.id == null && args.number == null) {
      throw new AuthError("Pass an id or a number", "BAD_REQUEST", 400);
    }
    const row =
      args.id != null
        ? await issues.getIssueById(ctx.teamId, args.id)
        : await issues.getIssueByNumber(ctx.teamId, args.number!);

    if (row && !(await canSeeIssue(ctx.teamId, ctx.userId, row))) return null;

    return row ? shapeIssue(row as unknown as Json) : null;
  },
  async issues(args: { filter?: Json }, ctx: GqlContext) {
    const result = await issues.listIssues(ctx.teamId, args.filter ?? {}, {
      userId: ctx.userId,
    });

    return {
      issues: result.issues.map((row) => shapeIssue(row as unknown as Json)),
      nextCursor: result.nextCursor ?? null,
    };
  },
  async projects(_args: unknown, ctx: GqlContext) {
    const scope = await guestIssueScope(ctx.teamId, ctx.userId);
    const allowed = scope ? (scope.projectId as { in: string[] }).in : null;
    const rows = (await projects.listProjects(ctx.teamId)).filter(
      (row) => !allowed || allowed.includes(row.id),
    );

    return rows.map((row) => ({
      ...row,
      startDate: iso(row.startDate),
      targetDate: iso(row.targetDate),
    }));
  },
  async cycles(_args: unknown, ctx: GqlContext) {
    const rows = await cycles.listCycles(ctx.teamId);

    return rows.map((row) => ({
      ...row,
      startDate: iso(row.startDate),
      endDate: iso(row.endDate),
    }));
  },
  labels: (_args: unknown, ctx: GqlContext) => labels.listLabels(ctx.teamId),
  async members(_args: unknown, ctx: GqlContext) {
    const rows = await prisma.membership.findMany({
      where: { teamId: ctx.teamId },
      select: { user: { select: { id: true, name: true, email: true } } },
    });

    return rows.map((row) => row.user);
  },
  workflowStatuses: (_args: unknown, ctx: GqlContext) =>
    getWorkflow(ctx.teamId),

  async createIssue(args: { input: Json }, ctx: GqlContext) {
    const created = await issues.createIssue(
      ctx.teamId,
      ctx.userId,
      args.input,
    );

    return shapeIssue(created as unknown as Json);
  },
  async updateIssue(args: { id: string; input: Json }, ctx: GqlContext) {
    const updated = await issues.updateIssue(
      ctx.teamId,
      args.id,
      args.input,
      ctx.role,
      ctx.userId,
    );

    return shapeIssue(updated as unknown as Json);
  },
  async addComment(args: { issueId: string; body: string }, ctx: GqlContext) {
    return comments.addComment(ctx.teamId, args.issueId, ctx.userId, {
      body: args.body,
    });
  },
};

let cached: GraphQLSchema | null = null;

export function getSchema(): GraphQLSchema {
  cached ??= buildSchema(typeDefs);

  return cached;
}

// ---- limits ---------------------------------------------------------------------------------

export const MAX_QUERY_CHARS = 20_000;
export const MAX_DEPTH = 8;
export const MAX_FIELDS = 400;

/** Deepest nesting and total field count of a query, to refuse abusive ones before running. */
export function measure(document: DocumentNode): {
  depth: number;
  fields: number;
} {
  let fields = 0;

  function walk(set: SelectionSetNode | undefined, depth: number): number {
    if (!set) return depth;
    let deepest = depth;

    for (const selection of set.selections) {
      if (selection.kind === Kind.FIELD) {
        fields += 1;
        deepest = Math.max(deepest, walk(selection.selectionSet, depth + 1));
      } else if (selection.kind === Kind.INLINE_FRAGMENT) {
        deepest = Math.max(deepest, walk(selection.selectionSet, depth));
      }
    }

    return deepest;
  }
  let depth = 0;

  for (const definition of document.definitions) {
    if (definition.kind === Kind.OPERATION_DEFINITION) {
      depth = Math.max(depth, walk(definition.selectionSet, 0));
    } else if (definition.kind === Kind.FRAGMENT_DEFINITION) {
      depth = Math.max(depth, walk(definition.selectionSet, 0));
    }
  }

  return { depth, fields };
}

export function parseAndCheck(query: string): {
  document?: DocumentNode;
  errors?: string[];
} {
  if (query.length > MAX_QUERY_CHARS) {
    return { errors: [`Query is larger than ${MAX_QUERY_CHARS} characters`] };
  }
  let document: DocumentNode;

  try {
    document = parse(query);
  } catch (error) {
    return { errors: [error instanceof Error ? error.message : "Parse error"] };
  }
  const invalid = validate(getSchema(), document);

  if (invalid.length) return { errors: invalid.map((e) => e.message) };
  const { depth, fields } = measure(document);

  if (depth > MAX_DEPTH) {
    return { errors: [`Query is nested deeper than ${MAX_DEPTH} levels`] };
  }
  if (fields > MAX_FIELDS) {
    return { errors: [`Query selects more than ${MAX_FIELDS} fields`] };
  }

  return { document };
}
