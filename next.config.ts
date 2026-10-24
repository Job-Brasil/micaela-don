import type { NextConfig } from "next";

// Routes that import @/lib/db (directly or transitively) and therefore need the
// Prisma query engine binary bundled in the serverless function.
// This is the fix for the #1 most common Prisma + Vercel issue: the generated
// engine binary at node_modules/.prisma/client/*.so.node is not traced by Vercel's
// nft when @prisma/client is listed in serverExternalPackages, because the require
// is inside an externalized module. outputFileTracingIncludes forces inclusion.
const PRISMA_ENGINE_TRACE = ["./node_modules/.prisma/client/**/*"];

const DB_ROUTES = [
  "/",
  "/[slug]",
  "/pagamento/sucesso",
  "/pagamento/cancelado",
  "/api/public/site",
  "/api/public/pix-qr",
  "/api/public/donation-intent",
  "/api/public/payment-methods",
  "/api/public/consent",
  "/api/payments/stripe/create-session",
  "/api/payments/pixgo/create",
  "/api/payments/manual-pix/create",
  "/api/webhooks/stripe",
  "/api/webhooks/pixgo",
  "/api/delivery/[token]",
  "/api/admin/payments",
  "/api/admin/payments/[id]/confirm",
  "/api/admin/login",
  "/api/admin/logout",
  "/api/admin/session",
  "/api/admin/site",
  "/api/admin/payment-config",
  "/api/admin/pix",
  "/api/admin/pix/preview",
  "/api/admin/materials",
  "/api/admin/materials/[id]",
  "/api/admin/donations",
  "/api/admin/donations/[id]",
  "/api/admin/donations/[id]/thankyou",
  "/api/admin/templates",
  "/api/admin/templates/[id]",
  "/api/admin/contact-channels",
  "/api/admin/contact-channels/[id]",
  "/api/admin/consents",
  "/api/admin/messages",
  "/api/admin/messages/[id]",
  "/api/admin/audit",
  "/api/admin/campaigns",
  "/api/admin/campaigns/[id]",
  "/api/admin/assets",
  "/api/admin/assets/[id]",
  "/api/admin/assets/[id]/preview",
];

const outputFileTracingIncludes = Object.fromEntries(
  DB_ROUTES.map((r) => [r, PRISMA_ENGINE_TRACE]),
);

const nextConfig: NextConfig = {
  // No `output: "standalone"` — Vercel handles the build output natively.
  reactStrictMode: false,
  // Prisma must run as an external package (not bundled by the serverless build),
  // otherwise its native engine binary can be stripped/missed in the serverless bundle.
  serverExternalPackages: ["@prisma/client"],
  // Explicitly include the Prisma engine binary in the serverless function trace.
  // Without this, Vercel's nft may not include node_modules/.prisma/client/*.so.node
  // because it's loaded via a dynamic require inside the externalized @prisma/client.
  outputFileTracingIncludes,
};

export default nextConfig;
