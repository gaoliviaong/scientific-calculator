import type { NextConfig } from "next";

const repo = "scientific-calculator";
const isCI = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  output: "export", // static HTML for GitHub Pages
  images: { unoptimized: true },
  // GitHub Pages serves the site from /<repo-name>/
  basePath: isCI ? `/${repo}` : "",
  assetPrefix: isCI ? `/${repo}/` : undefined,
  trailingSlash: true,
};

export default nextConfig;
