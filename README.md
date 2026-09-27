# drive-html-viewer

Google Drive "Open with" app that renders `.html` files stored in Drive.
Static, client-only. No backend. File bytes go from Google to the browser and nowhere else.

## How it works

1. Drive opens `https://<host>/?state={...}` with the file ID ([docs](https://developers.google.com/workspace/drive/api/guides/integrate-open)).
2. The page gets a short-lived access token through Google Identity Services (token model).
3. It downloads the file with `files.get?alt=media` using the `drive.file` scope.
4. It renders the HTML in `sandbox.html` inside `<iframe sandbox>` without `allow-same-origin`.
   The viewed file runs in an opaque origin and cannot read the token, storage, or DOM of the host page.

`srcdoc` and blob URLs are not used: both inherit the host page CSP, which would block the viewed file's scripts.

## Layout

| Path | Purpose |
|---|---|
| `public/index.html` | Host page (strict CSP) |
| `public/sandbox.html`, `public/js/sandbox-frame.js` | Render target for untrusted HTML |
| `public/js/state.js` | Parses the Drive `state` parameter (pure) |
| `public/js/charset.js` | BOM and `<meta charset>` detection (pure) |
| `public/js/drive.js` | Drive API v3 calls |
| `public/js/auth.js` | GIS token client and token cache |
| `public/js/viewer.js` | Sandboxed iframe setup |
| `public/js/config.js` | OAuth client ID and scopes |
| `public/_headers` | Cloudflare Pages response headers |
| `scripts/generate_icons.py` | Regenerates `public/icons/icon-*.png` |

## Development

```bash
bun install
bun run dev        # http://localhost:5173
bun run test       # unit tests
bun run test:e2e   # needs the dev server running and Google Chrome installed
```

`/__dev/sandbox-probe.html` on the dev server reports what a viewed file can and cannot access.

## Setup

### 1. Deploy `public/` to a static HTTPS host

Drive rejects `localhost` as an Open URL. Note the resulting origin, for example `https://drive-html-viewer.pages.dev`.

### 2. Google Cloud Console

1. Create a project.
2. APIs & Services > Library > Google Drive API > Enable.
3. Google Auth platform > Branding: app name and support email. Audience: External.
4. Google Auth platform > Data Access: add `.../auth/drive.file` and `.../auth/drive.install`.
5. Google Auth platform > Audience: either add yourself under Test users, or Publish app.
   In Testing status the authorization expires every 7 days.
6. Google Auth platform > Clients > Create client > Web application.
   Authorized JavaScript origins: the deployed origin, `http://localhost`, `http://localhost:5173`.
   No redirect URIs.
7. Put the client ID in `public/js/config.js` and redeploy.
8. APIs & Services > Enabled APIs & services > Google Drive API > Drive UI integration:

| Field | Value |
|---|---|
| Application name | HTML Viewer |
| Icons | `public/icons/icon-*.png` |
| Open URL | `https://<host>/` |
| Default MIME types | `text/html` |
| Default file extensions | `html`, `htm` |
| Automatically show OAuth consent screen | unchecked |
| Creating files, Importing | unchecked |
| Shared drives support | checked |

### 3. Install

Open `https://<host>/`, click **Connect to Google Drive**, grant both permissions.
Then in Drive: right-click an HTML file > Open with > HTML Viewer.

## Limitations

- Only self-contained HTML renders fully. Relative assets (`./style.css`, `img/a.png`) do not load:
  the `drive.file` scope grants access to the opened file only.
- The viewed file has no `localStorage`, `sessionStorage`, or cookies (opaque origin).
- Links the viewed file opens in a new tab stay sandboxed, so some sites may not work there.
- Each new tab needs one click to sign in unless popups are allowed for the site.
