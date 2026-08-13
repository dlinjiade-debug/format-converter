import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const repoPath = (...segments) => resolve(repoRoot, ...segments);
export const repoFileUrl = (...segments) => pathToFileURL(repoPath(...segments)).href;
