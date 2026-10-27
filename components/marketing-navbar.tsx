"use client";

import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@heroui/react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ThemeSwitch } from "@/components/theme-switch";
import { VerkLogo } from "@/components/verk-logo";
import { siteConfig } from "@/config/site";

export function MarketingNavbar() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-separator/60 bg-background/75 backdrop-blur-xl">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-8">
          <NextLink
            className="group flex items-center transition-transform hover:scale-[1.02]"
            href="/"
          >
            <VerkLogo size={28} />
          </NextLink>
          <ul className="hidden md:flex gap-6">
            {siteConfig.navItems.map((item) => (
              <li key={item.href}>
                <NextLink
                  className="text-sm text-muted hover:text-foreground transition-colors"
                  href={item.href}
                >
                  {item.label}
                </NextLink>
              </li>
            ))}
            <li>
              <a
                className="text-sm text-muted hover:text-foreground transition-colors"
                href={siteConfig.links.github}
                rel="noopener noreferrer"
                target="_blank"
              >
                GitHub
              </a>
            </li>
          </ul>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <ThemeSwitch />
          <Button
            size="sm"
            variant="tertiary"
            onPress={() => router.push("/login")}
          >
            Log in
          </Button>
          <Button size="sm" onPress={() => router.push("/register")}>
            Start free
          </Button>
        </div>
        <div className="flex sm:hidden items-center gap-2">
          <ThemeSwitch />
          <button
            aria-label="Toggle menu"
            className="p-2"
            type="button"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
          </button>
        </div>
      </header>
      {open && (
        <div className="border-t border-separator px-6 py-4 sm:hidden flex flex-col gap-3">
          {siteConfig.navMenuItems.map((item) => (
            <NextLink key={item.href} href={item.href}>
              {item.label}
            </NextLink>
          ))}
          <Button onPress={() => router.push("/register")}>Start free</Button>
        </div>
      )}
    </nav>
  );
}
