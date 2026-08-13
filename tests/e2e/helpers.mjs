import { existsSync } from 'node:fs';
import { repoPath, repoFileUrl } from './paths.mjs';
export { repoPath, repoFileUrl } from './paths.mjs';

const localBrowsers = repoPath('.pw-browsers');
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(localBrowsers)) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = localBrowsers;
}

const { chromium } = await import('playwright');

export function launchBrowser(options = {}) {
  return chromium.launch(options);
}
