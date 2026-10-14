import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 4173);
const baseURL = `http://127.0.0.1:${PORT}`;
// E2E_DEV=1：直接跑 vite dev server（源码 + HMR），省掉 e2e 前的 pnpm build（约 100s）。
// 默认仍跑 preview（服务 dist/ 产物），保持演示前全量把关的语义。
const E2E_DEV = process.env.E2E_DEV === '1';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'artifacts/test-results/e2e-html', open: 'never' }]],
  outputDir: 'artifacts/test-results/e2e-artifacts',
  use: {
    baseURL,
    // 定位不到元素 10s 就失败，不再空等到 test timeout（90–240s）。
    actionTimeout: 10_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  },
  projects: [
    { name: 'chromium-1440', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: E2E_DEV
      ? `pnpm exec vite --port ${PORT} --strictPort`
      : 'pnpm preview --port ' + PORT + ' --strictPort',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
