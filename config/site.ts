export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "Verk",
  description:
    "Linear UX, Vercel deploy, Neon database, free forever. Minimal project management with built-in MCP for AI agents.",
  navItems: [
    { label: "Docs", href: "/docs" },
    { label: "About", href: "/about" },
  ],
  navMenuItems: [
    { label: "Docs", href: "/docs" },
    { label: "About", href: "/about" },
    { label: "Log in", href: "/login" },
  ],
  links: {
    github: "https://github.com/rejisterjack/verk",
    demo: "https://verk.rejisterjack.com",
    deploy:
      "https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frejisterjack%2Fverk&env=DATABASE_URL,DIRECT_URL,AUTH_SECRET,AUTH_URL&envDescription=Required%3A%20DATABASE_URL%20(Neon%20pooled)%2C%20DIRECT_URL%20(Neon%20direct)%2C%20AUTH_SECRET%2C%20AUTH_URL&project-name=verk&repository-name=verk",
  },
};
