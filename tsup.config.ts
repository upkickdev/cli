import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  clean: true,
  dts: false,
  minify: false,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
