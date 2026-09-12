import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isGithubActions = process.env.GITHUB_ACTIONS === "true" || process.env.GITHUB_PAGES === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: isGithubActions ? "export" : undefined,
  basePath: isGithubActions ? "/Cineapp" : "",
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ["@electric-sql/pglite", "postgres", "bcryptjs"],
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
