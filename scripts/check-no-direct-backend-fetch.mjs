import { promises as fs } from 'node:fs';
import path from 'node:path';

const WEB_ROOT = path.resolve(process.cwd());
const TARGET_DIRS = ['app', 'components'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const DISALLOWED_PATTERNS = [
  {
    regex: /process\.env\.NEXT_PUBLIC_API_BASE_URL/,
    reason: 'frontend app/components must not read NEXT_PUBLIC_API_BASE_URL directly',
  },
  {
    regex: /process\.env\.BACKEND_URL/,
    reason: 'frontend app/components must not read BACKEND_URL directly',
  },
  {
    regex: /['"`]http:\/\/localhost:4000/,
    reason: 'frontend app/components must not hardcode backend origins',
  },
  {
    regex: /['"`]https:\/\/localfarm-backend\.vercel\.app/,
    reason: 'frontend app/components must not hardcode backend origins',
  },
];

async function collectFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const relative = path.relative(WEB_ROOT, fullPath).replaceAll('\\', '/');
      if (relative === 'app/api' || relative.startsWith('app/api/')) {
        continue;
      }
      files.push(...await collectFiles(fullPath));
      continue;
    }

    if (!entry.isFile()) continue;
    if (!EXTENSIONS.has(path.extname(entry.name))) continue;
    files.push(fullPath);
  }

  return files;
}

async function main() {
  const violations = [];
  for (const target of TARGET_DIRS) {
    const targetPath = path.join(WEB_ROOT, target);
    const files = await collectFiles(targetPath);
    for (const filePath of files) {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        for (const pattern of DISALLOWED_PATTERNS) {
          if (!pattern.regex.test(line)) continue;
          violations.push({
            file: path.relative(WEB_ROOT, filePath).replaceAll('\\', '/'),
            line: index + 1,
            reason: pattern.reason,
            snippet: line.trim(),
          });
          break;
        }
      });
    }
  }

  if (violations.length === 0) {
    console.log('Direct backend-origin check passed.');
    return;
  }

  console.error('Direct backend-origin usage is forbidden in app/components. Use local BFF routes (`/api/v1/*`).');
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} ${violation.reason}`);
    console.error(`  ${violation.snippet}`);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error('Failed to run direct backend-origin check:', error);
  process.exit(1);
});
