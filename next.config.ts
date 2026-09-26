import type { NextConfig } from "next";

// STATIC_EXPORT=1 produces the itch.io build in ./out (no server, no API
// route). Without it the same app deploys to Vercel with the optional
// /api/moth/seed proxy route.
const isStatic = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  output: isStatic ? "export" : undefined,
  // itch.io serves the game from a nested path, so every asset URL must be
  // relative to the page rather than to the site root.
  assetPrefix: isStatic ? "./" : undefined,
  trailingSlash: isStatic,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
