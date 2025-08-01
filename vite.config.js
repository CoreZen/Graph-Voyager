import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

const isSingleFile = process.env.BUILD_SINGLEFILE === "true";

export default defineConfig({
  base: process.env.VITE_BASE || "/",
  plugins: isSingleFile ? [react(), viteSingleFile()] : [react()],
  css: {
    preprocessorOptions: {},
  },
  resolve: {
    alias: {},
  },
});
