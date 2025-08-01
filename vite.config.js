import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/Graph-Voyager/",
  plugins: [react()],
  css: {
    preprocessorOptions: {
      // No special config needed for Tailwind, just ensure tailwind.css is imported in your main entry
    },
  },
  resolve: {
    alias: {
      // You can add aliases here if needed, but for now use relative imports
    },
  },
});
