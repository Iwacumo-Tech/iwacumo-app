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
      "pfirenjlvylwekls.public.blob.vercel-storage.com", // Added here
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
    ],
  },
};

export default nextConfig;