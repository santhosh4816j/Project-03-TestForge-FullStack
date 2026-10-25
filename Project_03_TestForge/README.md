# TestForge — Project 03 / 20

Local-first automated QA orchestration platform. Node.js 20+ required.

## Start (Windows PowerShell)
```powershell
npm.cmd install
npm.cmd run browser:install
npm.cmd start
```
Open **http://localhost:4003**. `npm.cmd run dev` starts with auto-reload.

## Features
- Build API test cases: GET/POST/PUT/PATCH/DELETE, expected status, optional JSON body and headers, JSON property assertions.
- Browser test cases: URL navigation, title assertions, optional CSS selector visibility (Chromium via Playwright).
- Suite runs, per-case results, timings, response previews, execution logs and history.
- Export a run as JSON, and use a self-contained HTML test report.
- Concurrency-limited execution; timeout protection; local persisted data.
- Sample cases test the built-in demo service at `http://localhost:4003/demo/...`.
- Built-in dashboard, case editor, history and reports.
- Automated Node unit tests.

## Security / limitations
This is a local development tool, not a public multi-tenant hosted service. API and browser target URLs are restricted to localhost / 127.0.0.1 to reduce SSRF risk. Do not expose the server on a public network. It does not run arbitrary uploaded code. No cloud keys or paid APIs required. Playwright browser binaries must be installed separately. API-only testing works without the browser binaries.

Data stored at `data/store.json` (created on first launch). The backend binds to 127.0.0.1 port 4003.
