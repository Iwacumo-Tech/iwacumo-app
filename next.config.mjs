import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
  sw: "service-worker.js",
  scope: "/",
  // Keep all default runtime caches; only override the apis rule below.
  extendDefaultRuntimeCaching: true,
  fallbacks: {
    document: "/offline.html",
    // Failed image requests offline (icons, book covers) serve this
    // precached placeholder instead of surfacing Response.error() in
    // the page as "Failed to fetch" TypeErrors.
    image: "/bookcover.png",
  },
  workboxOptions: {
    // NOTE: skipWaiting is read from workboxOptions, not the plugin's
    // top level. false = new service workers wait, the /install page
    // prompts the user, and {type: "SKIP_WAITING"} activates the update.
    skipWaiting: false,
    runtimeCaching: [
      {
        // Same-origin API (tRPC) responses. Overrides the plugin default
        // rule (same cacheName) which evicted at just 16 entries — far
        // too small for a browsing session, causing intermittent
        // offline failures when evicted responses were needed.
        urlPattern: /\/api\//,
        handler: "NetworkFirst",
        options: {
          cacheName: "apis",
          networkTimeoutSeconds: 10,
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 86400,
          },
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot:
    process.env.NODE_ENV === "production"
      ? "/home/purpose/Desktop/booka"
      : undefined,
  images: {
    domains: [
      "walrus-assets.s3.amazonaws.com",
      "res.cloudinary.com",
      "ucarecdn.com",
      "pfirenjlvylwekls.public.blob.vercel-storage.com",
      "rg4wfi2dsa5f8bye.public.blob.vercel-storage.com", 
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "http",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "ucarecdn.com",
      },
      {
        protocol: "https",
        hostname: "pfirenjlvylwekls.public.blob.vercel-storage.com", 
      },
      {
        protocol: "https",
        hostname: "rg4wfi2dsa5f8bye.public.blob.vercel-storage.com", 
      },
    ],
  },
};

export default withPWA(nextConfig);
