// Custom worker code compiled and importScripts'd into the generated
// service worker by @ducanh2912/next-pwa (customWorkerSrc defaults to
// the `worker/` directory). Plain JS on purpose: the tsconfig lib set
// (dom, no webworker) cannot type worker-scope globals.
// Caching, precaching and the update lifecycle are handled by the plugin.

// Background sync for queued reading progress. The app registers the
// `sync-reading-progress` tag via SyncManager; the actual flush happens
// in the app's sync engine when connectivity returns.
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-reading-progress") {
    event.waitUntil(
      (async () => {
        const clients = await self.clients.matchAll({ type: "window" });
        for (const client of clients) {
          client.postMessage({ type: "SYNC_READING_PROGRESS" });
        }
      })()
    );
  }
});
