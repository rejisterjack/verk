/** Offline outbox + IndexedDB sync. Set NEXT_PUBLIC_PWA_OFFLINE=false to disable. */
export function isOfflineEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PWA_OFFLINE !== "false";
}
