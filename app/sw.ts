import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && url.pathname.startsWith("/_next/static/"),
      handler: new CacheFirst({
        cacheName: "verk-static",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 128,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          }),
        ],
      }),
    },
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin &&
        (request.destination === "script" ||
          request.destination === "style" ||
          request.destination === "font"),
      handler: new CacheFirst({
        cacheName: "verk-assets",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          }),
        ],
      }),
    },
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && request.destination === "image",
      handler: new StaleWhileRevalidate({
        cacheName: "verk-images",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 60 * 60 * 24 * 14,
          }),
        ],
      }),
    },
    {
      matcher: ({ request, url, sameOrigin }) =>
        sameOrigin &&
        request.mode === "navigate" &&
        url.pathname.startsWith("/t"),
      handler: new NetworkFirst({
        cacheName: "verk-pages",
        networkTimeoutSeconds: 3,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 32,
            maxAgeSeconds: 60 * 60 * 24,
          }),
        ],
      }),
    },
    {
      matcher: ({ url, request, sameOrigin }) =>
        sameOrigin &&
        request.method === "GET" &&
        /^\/api\/teams\/[^/]+\/issues/.test(url.pathname),
      handler: new StaleWhileRevalidate({
        cacheName: "verk-api-issues",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 32,
            maxAgeSeconds: 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin &&
        (url.pathname.startsWith("/api/auth") ||
          url.pathname.startsWith("/api/mcp")),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin &&
        (request.method === "POST" ||
          request.method === "PATCH" ||
          request.method === "DELETE" ||
          request.method === "PUT"),
      handler: new NetworkOnly(),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

self.addEventListener("sync", (event) => {
  const syncEvent = event as ExtendableEvent & { tag?: string };

  if (syncEvent.tag === "verk-outbox") {
    syncEvent.waitUntil(
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clients) => {
          for (const client of clients) {
            client.postMessage({ type: "verk-sync-outbox" });
          }
        }),
    );
  }
});

serwist.addEventListeners();
