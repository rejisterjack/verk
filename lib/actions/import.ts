"use server";

import { revalidatePath } from "next/cache";

import { detectSource, FIELDS, type Mapping } from "@/lib/import/generic-csv";
import { rateLimitShared } from "@/lib/rate-limit";
import { requireTeamBySlug } from "@/lib/rbac";
import {
  previewImport,
  readCsv,
  runImport,
} from "@/lib/services/import-generic";

/** Never trust the mapping from the browser: keep only known fields and sane column numbers. */
function cleanMapping(input: unknown, columns: number): Mapping {
  const out: Mapping = {};

  if (!input || typeof input !== "object") return out;
  for (const field of FIELDS) {
    const value = (input as Record<string, unknown>)[field.id];

    if (
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 0 &&
      value < columns
    ) {
      out[field.id] = value;
    }
  }

  return out;
}

export async function previewCsvAction(text: string, mapping?: Mapping) {
  try {
    const parsed = readCsv(text);
    const chosen = mapping
      ? cleanMapping(mapping, parsed.headers.length)
      : parsed.mapping;
    const result = previewImport(text, chosen);

    return {
      headers: parsed.headers,
      mapping: chosen,
      source: detectSource(parsed.headers),
      sample: result.sample,
      count: result.rows.length,
      problems: result.problems,
      truncated: result.truncated,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not read the file",
    };
  }
}

export async function importCsvAction(
  teamSlug: string,
  text: string,
  mapping: Mapping,
) {
  const { team, membership, user } = await requireTeamBySlug(
    teamSlug,
    "MEMBER",
  );

  try {
    if (!(await rateLimitShared(`import:${team.id}`, 5, 60_000)).ok) {
      return { error: "Too many imports. Wait a minute and try again." };
    }
    const { headers } = readCsv(text);
    const result = await runImport(
      team.id,
      user.id!,
      text,
      cleanMapping(mapping, headers.length),
      membership.role,
      { id: user.id!, name: user.name, email: user.email },
    );

    revalidatePath(`/t/${teamSlug}/issues`);

    return result;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Import failed" };
  }
}
