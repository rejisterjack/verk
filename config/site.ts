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
      "https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frejisterjack%2Fverk&env=DATABASE_URL,DIRECT_URL,AUTH_SECRET,AUTH_URL&envDescription=Neon%20Postgres%20URLs%20and%20Auth.js%20secret&project-name=verk&repository-name=verk",
  },
};
