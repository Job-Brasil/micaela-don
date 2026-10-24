import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  serverExternalPackages: ["@prisma/client"],
  // Use a single wildcard trace for all routes that need the Prisma engine.
  // This is simpler and more robust than listing each route individually.
  outputFileTracingIncludes: {
    "/": ["./node_modules/.prisma/client/**/*"],
    "/[slug]": ["./node_modules/.prisma/client/**/*"],
    "/api/public/**": ["./node_modules/.prisma/client/**/*"],
    "/api/payments/**": ["./node_modules/.prisma/client/**/*"],
    "/api/webhooks/**": ["./node_modules/.prisma/client/**/*"],
    "/api/delivery/**": ["./node_modules/.prisma/client/**/*"],
    "/api/admin/**": ["./node_modules/.prisma/client/**/*"],
    "/pagamento/sucesso": ["./node_modules/.prisma/client/**/*"],
    "/pagamento/cancelado": ["./node_modules/.prisma/client/**/*"],
  },
};

export default nextConfig;
