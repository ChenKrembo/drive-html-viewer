// End-to-end check of the host page against stubbed Google endpoints.
// Requires the dev server: `bun run dev`, then `bun run test:e2e`.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const APP_URL = process.env.APP_URL ?? 'http://localhost:5173/';
const FAKE_TOKEN = 'fake-access-token';
const FILE_ID = 'file_ABC-123';
const RESOURCE_KEY = '0-resourceKey';
const FILE_NAME = 'report.html';

const VIEWED_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>x</title>
<style>body { background: rgb(1, 2, 3); }</style></head>
<body><h1 id="heading">static</h1>
<script>document.getElementById('heading').textContent = 'script ran as ' + self.origin;</script>
</body></html>`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-goog-drive-resource-keys',
};

function buildGisStub({ isPopupBlockedOnce }) {
  return `
    let shouldBlockPopup = ${isPopupBlockedOnce};
    window.google = { accounts: { oauth2: {
      hasGrantedAllScopes: () => true,
      initTokenClient: (config) => ({
        requestAccessToken: () => setTimeout(() => {
          window.__tokenRequests = (window.__tokenRequests ?? []).concat({ login_hint: config.login_hint, prompt: config.prompt });
          if (shouldBlockPopup) {
            shouldBlockPopup = false;
            config.error_callback({ type: 'popup_failed_to_open', message: 'Popup blocked' });
            return;
          }
          config.callback({ access_token: '${FAKE_TOKEN}', expires_in: 3600, scope: config.scope });
        }, 0),
      }),
    } } };`;
}

async function stubGoogle(page, { isPopupBlockedOnce }) {
  const driveRequests = [];
  await page.route('https://accounts.google.com/gsi/client', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: buildGisStub({ isPopupBlockedOnce }) }),
  );
  await page.route('**/js/config.js', async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    const body = source.replace(/'REPLACE_WITH_CLIENT_ID[^']*'/, "'e2e-client-id.apps.googleusercontent.com'");
    await route.fulfill({ response, body });
  });
  await page.route('https://www.googleapis.com/drive/v3/files/**', (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS_HEADERS });
    }
    driveRequests.push({ url: request.url(), headers: request.headers() });
    const isDownload = new URL(request.url()).searchParams.get('alt') === 'media';
    if (isDownload) {
      return route.fulfill({ headers: CORS_HEADERS, contentType: 'text/html', body: VIEWED_HTML });
    }
    const metadata = { id: FILE_ID, name: FILE_NAME, mimeType: 'text/html', size: String(VIEWED_HTML.length) };
    return route.fulfill({ headers: CORS_HEADERS, contentType: 'application/json', body: JSON.stringify(metadata) });
  });
  return driveRequests;
}

function buildOpenUrl() {
  const state = { ids: [FILE_ID], action: 'open', userId: '1234567890', resourceKeys: { [FILE_ID]: RESOURCE_KEY } };
  return `${APP_URL}?state=${encodeURIComponent(JSON.stringify(state))}`;
}

function collectCspViolations(page) {
  const violations = [];
  page.on('console', (message) => {
    if (message.text().includes('Content Security Policy')) {
      violations.push(message.text());
    }
  });
  return violations;
}

async function assertFileRendered(page) {
  await page.waitForSelector('#viewer iframe');
  const frame = page.frames().find((candidate) => candidate !== page.mainFrame());
  await frame.waitForFunction(() => document.getElementById('heading')?.textContent.startsWith('script ran'));
  assert.equal(await frame.textContent('#heading'), 'script ran as null', 'viewed file runs in an opaque origin');
  const background = await frame.evaluate(() => getComputedStyle(document.body).backgroundColor);
  assert.equal(background, 'rgb(1, 2, 3)', 'inline styles of the viewed file apply');
  assert.equal(await page.textContent('#file-name'), FILE_NAME);
  assert.equal(await page.title(), FILE_NAME);
}

async function testOpenFlow(browser) {
  const page = await browser.newPage();
  const cspViolations = collectCspViolations(page);
  const driveRequests = await stubGoogle(page, { isPopupBlockedOnce: false });
  await page.goto(buildOpenUrl());
  await assertFileRendered(page);

  assert.equal(driveRequests.length, 2, 'one metadata and one download request');
  for (const request of driveRequests) {
    assert.equal(request.headers.authorization, `Bearer ${FAKE_TOKEN}`);
    assert.equal(request.headers['x-goog-drive-resource-keys'], `${FILE_ID}/${RESOURCE_KEY}`);
    assert.ok(request.url.includes('supportsAllDrives=true'));
  }
  const tokenRequests = await page.evaluate(() => window.__tokenRequests);
  assert.deepEqual(tokenRequests, [{ login_hint: '1234567890', prompt: '' }]);
  assert.deepEqual(cspViolations, [], 'host page CSP is not violated');
  await page.close();
}

async function testPopupBlockedFallback(browser) {
  const page = await browser.newPage();
  await stubGoogle(page, { isPopupBlockedOnce: true });
  await page.goto(buildOpenUrl());
  await page.waitForSelector('#panel-action:not([hidden])');
  assert.equal(await page.textContent('#panel-title'), 'Sign-in needed');
  await page.click('#panel-action');
  await assertFileRendered(page);
  await page.close();
}

async function testLanding(browser) {
  const page = await browser.newPage();
  await stubGoogle(page, { isPopupBlockedOnce: false });
  await page.goto(APP_URL);
  await page.waitForSelector('#panel-action:not([hidden])');
  assert.equal(await page.textContent('#panel-action'), 'Connect to Google Drive');
  await page.click('#panel-action');
  await page.waitForFunction(() => document.getElementById('panel-title').textContent === 'Connected to Google Drive');
  await page.close();
}

const TESTS = [testOpenFlow, testPopupBlockedFallback, testLanding];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
let failureCount = 0;
for (const runTest of TESTS) {
  try {
    await runTest(browser);
    console.log(`pass  ${runTest.name}`);
  } catch (error) {
    failureCount += 1;
    console.error(`FAIL  ${runTest.name}\n${error.stack}`);
  }
}
await browser.close();
process.exit(failureCount === 0 ? 0 : 1);
