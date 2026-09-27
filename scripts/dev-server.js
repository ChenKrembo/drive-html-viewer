// Static dev server. Usage: bun scripts/dev-server.js
// Serves ./public at / and ./tests/manual at /__dev/ (dev only, never deployed).
import { join, normalize, resolve } from 'node:path';

const PROJECT_DIR = resolve(import.meta.dir, '..');
const PUBLIC_DIR = join(PROJECT_DIR, 'public');
const MANUAL_TESTS_DIR = join(PROJECT_DIR, 'tests', 'manual');
const MANUAL_TESTS_PREFIX = '/__dev/';
const PORT = Number(process.env.PORT ?? 5173);

function resolveWithin(rootDir, relativePath) {
  const absolutePath = normalize(join(rootDir, decodeURIComponent(relativePath)));
  return absolutePath.startsWith(`${rootDir}/`) ? absolutePath : null;
}

function resolveRequestPath(pathname) {
  const filePath = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  if (filePath.startsWith(MANUAL_TESTS_PREFIX)) {
    return resolveWithin(MANUAL_TESTS_DIR, filePath.slice(MANUAL_TESTS_PREFIX.length));
  }
  return resolveWithin(PUBLIC_DIR, filePath);
}

const server = Bun.serve({
  port: PORT,
  hostname: 'localhost',
  async fetch(request) {
    const filePath = resolveRequestPath(new URL(request.url).pathname);
    if (filePath === null) {
      return new Response('Forbidden', { status: 403 });
    }
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      return new Response('Not found', { status: 404 });
    }
    return new Response(file, { headers: { 'Cache-Control': 'no-store' } });
  },
});

console.log(`Serving ${PUBLIC_DIR} at http://localhost:${server.port}`);
