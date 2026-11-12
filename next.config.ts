import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site → deployed to Netlify from the `out/` folder.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
