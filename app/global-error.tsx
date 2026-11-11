"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-background p-6 font-sans text-foreground">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-accent">Application Error</h1>
          <p className="mt-2 text-sm text-muted">
            A critical error prevented the application layout from rendering.
            {error.digest ? (
              <span className="mt-1 block text-xs opacity-70">
                Error ID: {error.digest}
              </span>
            ) : null}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
              type="button"
              onClick={() => reset()}
            >
              Reload application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
