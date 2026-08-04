import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  outputDir: "node_modules/.cache/prompt-studio-playwright-results",
  snapshotPathTemplate:
    "{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}{ext}",
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 1440, height: 1100 },
      },
    },
    {
      name: "webkit",
      use: {
        browserName: "webkit",
        viewport: { width: 1440, height: 1100 },
      },
    },
    {
      name: "chromium-performance",
      use: {
        browserName: "chromium",
        viewport: { width: 1440, height: 1100 },
      },
    },
  ],
});
