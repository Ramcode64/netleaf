import type { NextConfig } from "next";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);

// Absolute path to next/dist — used for the file-symlink fix below.
const nextDist = path.join(path.dirname(req.resolve("next/package.json")), "dist");


const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: appDir,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  },
  webpack(config, { isServer }) {
    if (isServer) {
      // npm workspaces hoists `next` to the monorepo root so there is no
      // next/dist at a path relative to .next/server/. The compiled _document.js
      // (at .next/server/pages/_document.js) contains native CJS requires like
      //   require('../shared/lib/constants')
      // that resolve relative to .next/server/pages/ → .next/server/shared/...
      // which does not exist. NormalModuleReplacementPlugin cannot fix this because
      // these are externals left as runtime requires, not modules being bundled.
      //
      // Fix: after webpack emits, create individual file-level symlinks for exactly
      // the files _document.js needs. File symlinks (not directory symlinks) are
      // safe: Node.js resolves each symlink to the real file path on disk, so any
      // require() inside those files resolves from next/dist/ — no circular paths
      // and no React double-loading (which directory symlinks cause).
      config.plugins.push({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        apply(compiler: any) {
          compiler.hooks.afterEmit.tap("NetleafDocSymlinks", () => {
            const serverOut = path.join(appDir, ".next", "server");
            // Each tuple: [path under .next/server/, path under next/dist/]
            const links: [string, string][] = [
              ["shared/lib/constants.js", "shared/lib/constants.js"],
              ["shared/lib/encode-uri-path.js", "shared/lib/encode-uri-path.js"],
              ["shared/lib/html-context.shared-runtime.js", "shared/lib/html-context.shared-runtime.js"],
              ["shared/lib/utils.js", "shared/lib/utils.js"],
              ["server/get-page-files.js", "server/get-page-files.js"],
              ["server/htmlescape.js", "server/htmlescape.js"],
              ["server/utils.js", "server/utils.js"],
              ["server/lib/trace/tracer.js", "server/lib/trace/tracer.js"],
              ["server/lib/trace/utils.js", "server/lib/trace/utils.js"],
              ["lib/is-error.js", "lib/is-error.js"],
              ["lib/pretty-bytes.js", "lib/pretty-bytes.js"],
            ];
            for (const [rel, src] of links) {
              const linkPath = path.join(serverOut, rel);
              const target = path.join(nextDist, src);
              if (fs.existsSync(target) && !fs.existsSync(linkPath)) {
                fs.mkdirSync(path.dirname(linkPath), { recursive: true });
                fs.symlinkSync(target, linkPath);
              }
            }
          });
        },
      });
    }
    return config;
  },
};

export default nextConfig;
