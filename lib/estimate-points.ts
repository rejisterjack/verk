/**
 * Estimate values, the scales a team can pick from, and the point value of each estimate.
 * Pure and shared by server and client.
 */

const POINTS: Record<string, number> = {
  NONE: 0,
  // t-shirt sizes
  XS: 1,
  S: 2,
  M: 3,
  L: 5,
  XL: 8,
  XXL: 13,
  // numbers
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
  EIGHT: 8,
  SIXTEEN: 16,
  THIRTEEN: 13,
};

export function estimatePoints(estimate: string | null | undefined) {
  return POINTS[estimate ?? "NONE"] ?? 0;
}

export type EstimateScale =
  "off" | "linear" | "exponential" | "fibonacci" | "tshirt";

export const ESTIMATE_SCALES = [
  "off",
  "linear",
  "exponential",
  "fibonacci",
  "tshirt",
] as const satisfies readonly EstimateScale[];

export const DEFAULT_ESTIMATE_SCALE: EstimateScale = "fibonacci";

export const SCALE_LABELS: Record<EstimateScale, string> = {
  off: "Not used",
  linear: "Linear (1, 2, 3, 4, 5)",
  exponential: "Exponential (1, 2, 4, 8, 16)",
  fibonacci: "Fibonacci (1, 2, 3, 5, 8, 13)",
  tshirt: "T-shirt (XS, S, M, L, XL, XXL)",
};

/** The estimate values a scale offers, smallest first. `NONE` is always allowed on top. */
const SCALE_VALUES: Record<EstimateScale, readonly string[]> = {
  off: [],
  linear: ["ONE", "TWO", "THREE", "FOUR", "FIVE"],
  exponential: ["ONE", "TWO", "FOUR", "EIGHT", "SIXTEEN"],
  fibonacci: ["ONE", "TWO", "THREE", "FIVE", "EIGHT", "THIRTEEN"],
  tshirt: ["XS", "S", "M", "L", "XL", "XXL"],
};

/** Display text for any estimate value (what the issue shows). */
export const ESTIMATE_TEXT: Record<string, string> = {
  NONE: "No estimate",
  XS: "XS",
  S: "S",
  M: "M",
  L: "L",
  XL: "XL",
  XXL: "XXL",
  ONE: "1",
  TWO: "2",
  THREE: "3",
  FOUR: "4",
  FIVE: "5",
  EIGHT: "8",
  SIXTEEN: "16",
  THIRTEEN: "13",
};

export function isEstimateScale(value: unknown): value is EstimateScale {
  return (
    typeof value === "string" &&
    (ESTIMATE_SCALES as readonly string[]).includes(value)
  );
}

/** Falls back to the default for an unknown or missing value, so bad data never hides the field. */
export function normalizeScale(value: unknown): EstimateScale {
  return isEstimateScale(value) ? value : DEFAULT_ESTIMATE_SCALE;
}

export function scaleValues(scale: EstimateScale): readonly string[] {
  return SCALE_VALUES[scale];
}

/** Is `estimate` something a team on `scale` may choose? "No estimate" is always fine. */
export function isAllowedEstimate(
  scale: EstimateScale,
  estimate: string | null | undefined,
): boolean {
  if (!estimate || estimate === "NONE") return true;

  return SCALE_VALUES[scale].includes(estimate);
}

export type EstimateOption = { id: string; label: string };

/**
 * The dropdown choices for a scale. Pass the issue's current value as `keep` so an issue
 * estimated under an older scale still shows (and keeps) its value instead of looking empty.
 */
export function estimateOptions(
  scale: EstimateScale,
  keep?: string | null,
): EstimateOption[] {
  const values = [...SCALE_VALUES[scale]];

  if (keep && keep !== "NONE" && !values.includes(keep)) values.push(keep);

  return [
    { id: "NONE", label: ESTIMATE_TEXT.NONE! },
    ...values.map((id) => ({ id, label: ESTIMATE_TEXT[id] ?? id })),
  ];
}
