// Quick UI snapshot using Playwright (installed as devDependency)
// Usage: node web/scripts/snapshots/ui-check.js

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function ensureDir(p) {
  await fs.promises.mkdir(p, { recursive: true });
}

async function snap(url, outPath) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.screenshot({ path: outPath, fullPage: true });
  await browser.close();
}

(async () => {
  const base = process.env.UI_BASE || 'http://localhost:3000';
  const outDir = path.join(__dirname, '../../test-results/ui');
  await ensureDir(outDir);

  try {
    await snap(`${base}/ja`, path.join(outDir, 'home-ja.png'));
    await snap(`${base}/ja/chat`, path.join(outDir, 'chat-ja.png'));
    console.log('UI snapshots saved to', outDir);
  } catch (err) {
    console.error('Snapshot error:', err.message);
    process.exitCode = 1;
  }
})();

