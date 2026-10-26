import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "http://localhost:3000" } },
    setupFiles: "./src/setupTests.js",
    clearMocks: true,
    restoreMocks: true,
  },
});
