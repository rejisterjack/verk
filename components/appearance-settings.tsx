"use client";

import clsx from "clsx";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { useT } from "@/components/locale-provider";
import { LOCALES } from "@/lib/i18n";
import {
  ACCENTS,
  type Appearance,
  DEFAULT_APPEARANCE,
  DENSITIES,
  loadAppearance,
  saveAppearance,
} from "@/lib/appearance";

const THEMES = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "Match system" },
] as const;

const optionClass = (active: boolean) =>
  clsx(
    "rounded-md border px-3 py-1.5 text-[13px] transition-colors",
    active
      ? "border-accent bg-accent/10 font-medium text-accent"
      : "border-separator text-muted hover:text-foreground",
  );

/**
 * Personal appearance: theme, accent color, density and contrast. Stored in this browser only
 * (localStorage), so it applies on every team without a server round trip.
 */
export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useT();
  const [mounted, setMounted] = useState(false);
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);

  useEffect(() => {
    setAppearance(loadAppearance());
    setMounted(true);
  }, []);

  function update(patch: Partial<Appearance>) {
    const next = { ...appearance, ...patch };

    setAppearance(next);
    saveAppearance(next);
  }

  // Avoid a hydration mismatch: the stored values only exist in the browser.
  if (!mounted) return <div aria-hidden className="h-64" />;

  return (
    <div className="space-y-6 text-sm">
      <section>
        <h2 className="font-medium">{t("settings.language")}</h2>
        <p className="mt-0.5 text-[12px] text-muted">
          {t("settings.languageHint")}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {LOCALES.map((option) => (
            <button
              key={option.id}
              aria-pressed={locale === option.id}
              className={optionClass(locale === option.id)}
              type="button"
              onClick={() => setLocale(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-medium">Theme</h2>
        <p className="mt-0.5 text-[12px] text-muted">
          Light, dark, or follow your device.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {THEMES.map((option) => (
            <button
              key={option.id}
              aria-pressed={theme === option.id}
              className={optionClass(theme === option.id)}
              type="button"
              onClick={() => setTheme(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-medium">Accent color</h2>
        <p className="mt-0.5 text-[12px] text-muted">
          Used for links, selection and primary buttons.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ACCENTS.map((accent) => (
            <button
              key={accent.id}
              aria-pressed={appearance.accent === accent.id}
              className={clsx(
                optionClass(appearance.accent === accent.id),
                "flex items-center gap-2",
              )}
              type="button"
              onClick={() => update({ accent: accent.id })}
            >
              <span
                aria-hidden
                className="h-3 w-3 rounded-full"
                style={{ background: accent.swatch }}
              />
              {accent.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-medium">Density</h2>
        <p className="mt-0.5 text-[12px] text-muted">
          How tall issue rows and toolbars are.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DENSITIES.map((density) => (
            <button
              key={density.id}
              aria-pressed={appearance.density === density.id}
              className={optionClass(appearance.density === density.id)}
              type="button"
              onClick={() => update({ density: density.id })}
            >
              {density.label}
              <span className="ml-2 text-[11px] font-normal text-muted">
                {density.hint}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-start gap-3">
          <input
            checked={appearance.highContrast}
            className="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--accent)]"
            id="appearance-contrast"
            type="checkbox"
            onChange={(e) => update({ highContrast: e.target.checked })}
          />
          <label className="cursor-pointer" htmlFor="appearance-contrast">
            <span className="font-medium">Higher contrast</span>
            <span className="block text-[12px] text-muted">
              Darker secondary text and stronger borders.
            </span>
          </label>
        </div>
      </section>

      <button
        className="text-[12px] text-muted underline hover:text-foreground"
        type="button"
        onClick={() => {
          setTheme("light");
          update({ ...DEFAULT_APPEARANCE });
        }}
      >
        Reset to defaults
      </button>

      <p className="text-[12px] text-muted">
        These choices are saved in this browser, not on your account.
      </p>
    </div>
  );
}
