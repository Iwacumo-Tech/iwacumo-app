/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", 
  images:  {
    domains: ["walrus-assets.s3.amazonaws.com", "res.cloudinary.com"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cloudinary.com"
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com"
      },

    ],
    // Add the domain here
  },
};

export default nextConfig;
