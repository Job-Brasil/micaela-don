import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No `output: "standalone"` — Vercel handles the build output natively.
  // Standalone mode caused issues in serverless and is unnecessary on Vercel.
  reactStrictMode: false,
  // Prisma must run as an external package (not bundled by the serverless build),
  // otherwise its native engine binary can be stripped/missed in the serverless bundle.
  serverExternalPackages: ["@prisma/client", "@prisma/client/runtime"],
  // Do NOT ignore build errors in production — surface them so they get fixed.
  // (typescript.ignoreBuildErrors was previously true and hid real issues.)
};

export default nextConfig;
