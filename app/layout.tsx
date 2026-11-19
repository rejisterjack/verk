import "@/styles/globals.css";
import { Metadata, Viewport } from "next";
import clsx from "clsx";
import { cookies, headers } from "next/headers";

import { Providers } from "./providers";

import { ClarityScript } from "@/components/clarity-script";
import { DemoBanner } from "@/components/demo-banner";
import { siteConfig } from "@/config/site";
import { fontDisplay, fontMono, fontSans } from "@/config/fonts";
import { LocaleProvider } from "@/components/locale-provider";
import { APPEARANCE_SCRIPT } from "@/lib/appearance";
import { isLocale, LOCALE_COOKIE, pickLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  applicationName: siteConfig.name,
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteConfig.name,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/verk-logo.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f766e" },
    { media: "(prefers-color-scheme: dark)", color: "#0f766e" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(saved)
    ? saved
    : pickLocale((await headers()).get("accept-language"));

  return (
    <html suppressHydrationWarning lang={locale}>
      <head>
        {/* Sets accent / density / contrast before first paint so they never flash. */}
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_SCRIPT }} />
      </head>
      <body
        className={clsx(
          "min-h-screen text-foreground bg-background font-sans antialiased",
          fontSans.variable,
          fontDisplay.variable,
          fontMono.variable,
        )}
      >
        <ClarityScript />
        <Providers themeProps={{ attribute: "class", defaultTheme: "light" }}>
          <LocaleProvider initial={locale}>
            <DemoBanner />
            {children}
          </LocaleProvider>
        </Providers>
      </body>
    </html>
  );
}
