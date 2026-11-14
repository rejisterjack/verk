/**
 * Personal appearance settings, kept per device in localStorage and applied as data attributes
 * on <html> (`data-accent`, `data-density`, `data-contrast`). Light / dark / system is handled
 * by next-themes separately. Pure, so the same validation runs in the pre-paint script, the
 * settings screen and tests.
 */

export const APPEARANCE_KEY = "verk:appearance";

export const ACCENTS = [
  { id: "teal", label: "Teal", swatch: "oklch(0.62 0.12 175)" },
  { id: "blue", label: "Blue", swatch: "oklch(0.6 0.16 255)" },
  { id: "violet", label: "Violet", swatch: "oklch(0.6 0.18 295)" },
  { id: "rose", label: "Rose", swatch: "oklch(0.62 0.19 10)" },
  { id: "orange", label: "Orange", swatch: "oklch(0.7 0.16 55)" },
  { id: "green", label: "Green", swatch: "oklch(0.62 0.14 150)" },
  { id: "graphite", label: "Graphite", swatch: "oklch(0.5 0.02 250)" },
] as const;

export const DENSITIES = [
  { id: "comfortable", label: "Comfortable", hint: "Roomy rows" },
  { id: "compact", label: "Compact", hint: "More issues on screen" },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];
export type DensityId = (typeof DENSITIES)[number]["id"];

export type Appearance = {
  accent: AccentId;
  density: DensityId;
  /** Stronger text and borders for low-vision users. */
  highContrast: boolean;
};

export const DEFAULT_APPEARANCE: Appearance = {
  accent: "teal",
  density: "comfortable",
  highContrast: false,
};

/** Read whatever is stored, falling back to the default for anything unknown or malformed. */
export function parseAppearance(raw: unknown): Appearance {
  let value: unknown = raw;

  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return { ...DEFAULT_APPEARANCE };
    }
  }
  if (!value || typeof value !== "object") return { ...DEFAULT_APPEARANCE };
  const input = value as Record<string, unknown>;
  const accent = ACCENTS.find((a) => a.id === input.accent)?.id;
  const density = DENSITIES.find((d) => d.id === input.density)?.id;

  return {
    accent: accent ?? DEFAULT_APPEARANCE.accent,
    density: density ?? DEFAULT_APPEARANCE.density,
    highContrast: input.highContrast === true,
  };
}

/** The data attributes for an appearance. The default value of each is left off entirely. */
export function appearanceAttributes(
  appearance: Appearance,
): Record<"data-accent" | "data-density" | "data-contrast", string | null> {
  return {
    "data-accent": appearance.accent === "teal" ? null : appearance.accent,
    "data-density": appearance.density === "compact" ? "compact" : null,
    "data-contrast": appearance.highContrast ? "high" : null,
  };
}

/** Apply to a document element (browser only). */
export function applyAppearance(
  appearance: Appearance,
  el: HTMLElement = document.documentElement,
) {
  for (const [name, value] of Object.entries(
    appearanceAttributes(appearance),
  )) {
    if (value === null) el.removeAttribute(name);
    else el.setAttribute(name, value);
  }
}

export function saveAppearance(appearance: Appearance) {
  try {
    window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
  } catch {
    // Private mode or storage full: the choice still applies for this page view.
  }
  applyAppearance(appearance);
}

export function loadAppearance(): Appearance {
  try {
    return parseAppearance(window.localStorage.getItem(APPEARANCE_KEY));
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

/**
 * Inline script that runs before first paint so the chosen accent and density never flash. It
 * repeats the allow-lists above, so a tampered value in storage can't inject anything.
 */
export const APPEARANCE_SCRIPT = `(function(){try{var a=JSON.parse(localStorage.getItem(${JSON.stringify(
  APPEARANCE_KEY,
)})||"{}"),d=document.documentElement,A=${JSON.stringify(
  ACCENTS.map((x) => x.id),
)};if(A.indexOf(a.accent)>0)d.setAttribute("data-accent",a.accent);if(a.density==="compact")d.setAttribute("data-density","compact");if(a.highContrast===true)d.setAttribute("data-contrast","high")}catch(e){}})();`;
