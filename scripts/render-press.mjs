#!/usr/bin/env node
// Screenshot the /press route into press/cover-630x500.png and
// press/screenshot-{1,2,3}.png. Needs a production build (`npm run build`).
// Starts `next start` on a spare port unless --base <url> is given.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "press");
fs.mkdirSync(OUT, { recursive: true });

const argBase = process.argv.indexOf("--base");
let base = argBase >= 0 ? process.argv[argBase + 1] : null;
let server = null;

async function waitFor(url, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("Playwright is not installed. Run `npm install` (it is a devDependency) or open /press in a browser and screenshot #cover and #shot-1..3 by hand.");
  process.exit(1);
}

if (!base) {
  const port = Number(process.env.PRESS_PORT || 3123);
  try {
    await fetch(`http://localhost:${port}/`);
    console.error(`Port ${port} is already in use; pass --base <url> for a running server or set PRESS_PORT.`);
    process.exit(1);
  } catch {
    /* free */
  }
  server = spawn("npx", ["next", "start", "-p", String(port)], { cwd: ROOT, stdio: "ignore", detached: true });
  base = `http://localhost:${port}`;
  if (!(await waitFor(base + "/press", 30000))) {
    console.error("The server did not come up. Did you run `npm run build`?");
    stopServer();
    process.exit(1);
  }
}

function stopServer() {
  if (!server) return;
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    server.kill();
  }
}

const launchOpts = {};
for (const candidate of [process.env.PW_CHROMIUM, "/opt/pw-browsers/chromium"]) {
  if (candidate && fs.existsSync(candidate)) {
    launchOpts.executablePath = candidate;
    break;
  }
}
let browser;
try {
  browser = await chromium.launch(launchOpts);
} catch (e) {
  console.error("Chromium could not be launched. Try `npx playwright install chromium`, or screenshot /press by hand.");
  console.error(String(e.message || e).split("\n")[0]);
  stopServer();
  process.exit(1);
}
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
await page.goto(base + "/press", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const targets = [
  ["#cover", "cover-630x500.png"],
  ["#shot-1", "screenshot-1.png"],
  ["#shot-2", "screenshot-2.png"],
  ["#shot-3", "screenshot-3.png"],
];
for (const [sel, file] of targets) {
  const el = page.locator(sel);
  await el.screenshot({ path: path.join(OUT, file) });
  console.log(`wrote press/${file}`);
}
await browser.close();
stopServer();
