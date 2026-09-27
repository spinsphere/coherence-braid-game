#!/usr/bin/env node
// Fills itch.io's "Create a new project" form in the already logged-in Chrome
// (launched with --remote-debugging-port=9333). Uploads the zip, the cover and
// the screenshots, sets every field from page-copy.md, and STOPS before
// "Save & view page" so a human reviews and saves. The full-page capture goes to the OS temp dir
// (override with --preview); it shows the logged-in dashboard, so do not commit it.
//
//   node submission/itch/fill-project.mjs [--video <youtube-url>] [--ai yes|no] [--preview <png>]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(HERE, "..", "assets");
const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const VIDEO = arg("--video", "");
const AI = arg("--ai", "yes");
const PREVIEW = arg("--preview", path.join(os.tmpdir(), "itch-form-preview.png")); // dashboard capture; keep out of the repo

const FIELDS = {
  title: "COHERENCE: Braid",
  slug: "coherence-braid",
  short_text: "You do not build a civilization. You ask it questions, and you braid it. Quantum braiding, exactly simulated.", // itch max 120 chars
  type: "html",
  genre: "puzzle",
  tags: ["quantum", "physics", "braid", "topology", "singleplayer", "short", "educational", "procedural-generation", "minimalist", "experimental"],
  community: "topic",
  published: "draft",
  embed: { width: 1280, height: 800 },
};
const ZIP = path.join(ASSETS, "coherence-braid-itch.zip");
const COVER = path.join(ASSETS, "cover-630x500.png");
const SHOTS = ["screenshot-1.png", "screenshot-2.png", "screenshot-3.png", "live-order-effect.png", "live-stuck.png"].map((f) => path.join(ASSETS, f)).filter((f) => fs.existsSync(f));
const DESCRIPTION = fs.readFileSync(path.join(HERE, "description.html"), "utf8");
for (const f of [ZIP, COVER]) if (!fs.existsSync(f)) throw new Error(`missing ${f}`);

const browser = await chromium.connectOverCDP("http://localhost:9333");
const ctx = browser.contexts()[0];
const page = ctx.pages().find((p) => p.url().includes("itch.io")) ?? ctx.pages()[0];
await page.bringToFront();
if (!page.url().includes("/game/new")) await page.goto("https://itch.io/game/new", { waitUntil: "domcontentloaded" });
await page.waitForSelector('input[name="game[title]"]', { timeout: 20000 });
const sleep = (ms) => page.waitForTimeout(ms);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// -- text fields
await page.fill('input[name="game[title]"]', FIELDS.title);
await page.fill('input[name="game[slug]"]', FIELDS.slug);
await page.fill('input[name="game[short_text]"]', FIELDS.short_text);
log("text fields set");

// -- selectize selects
const setSelectize = (name, value) => page.evaluate(([n, v]) => document.querySelector(`select[name="${n}"]`).selectize.setValue(v), [name, value]);
await setSelectize("game[type]", FIELDS.type);
await setSelectize("game[genre]", FIELDS.genre);
log("kind = HTML, genre = puzzle");

// -- pricing: no payments
await page.click(".payment_mode_disable_payments");

// -- description (Redactor editor)
await page.evaluate((html) => {
  const ta = document.querySelector('textarea[name="game[description]"]');
  try { jQuery(ta).redactor("code.set", html); } catch (e) { const ed = ta.closest(".redactor-box")?.querySelector("[contenteditable=true]"); if (ed) ed.innerHTML = html; }
  ta.value = html;
}, DESCRIPTION);
log("description set");

// -- tags
await page.evaluate((tags) => {
  const s = document.querySelector('input[name="game[tags]"]').selectize;
  for (const t of tags) { s.addOption({ value: t, text: t }); s.addItem(t, true); }
  s.refreshItems();
}, FIELDS.tags);
log("tags:", (await page.inputValue('input[name="game[tags]"]')) || "(see widget)");

// -- radios
await page.check(`input[name="ai_disclosure[ai_generated]"][value="${AI === "no" ? "no" : "yes"}"]`);
await page.check(`input[name="game[community_type]"][value="${FIELDS.community}"]`);
await page.check(`input[name="game[published]"][value="${FIELDS.published}"]`);
if (VIDEO) await page.fill('input[name="game[video_url]"]', VIDEO);
log("radios set; AI disclosure =", AI);

// -- uploads: zip
async function chooseFiles(buttonSelector, files) {
  const [chooser] = await Promise.all([page.waitForEvent("filechooser", { timeout: 15000 }), page.click(buttonSelector)]);
  await chooser.setFiles(files);
}
const uploadRows = () => page.locator(".game_edit_upload_list_widget .upload_row, .game_edit_upload_list_widget [class*=upload]").filter({ hasText: path.basename(ZIP) });
await chooseFiles(".upload_buttons button.button:has-text('Upload files')", ZIP);
log("zip upload started");
await page.waitForFunction((name) => {
  const w = document.querySelector(".game_edit_upload_list_widget");
  return w && w.textContent.includes(name) && !/uploading|\d+%/i.test(w.textContent);
}, path.basename(ZIP), { timeout: 180000 });
await sleep(1000);
// tick "This file will be played in the browser"
const playedInBrowser = page.locator("label").filter({ hasText: /played in the browser/i }).first();
if (await playedInBrowser.count()) {
  const cb = playedInBrowser.locator("input[type=checkbox]");
  if (await cb.count()) { if (!(await cb.isChecked())) await cb.check(); }
  else await playedInBrowser.click();
  log("ticked: played in the browser");
} else log("WARN: no 'played in the browser' checkbox found; check the upload row by hand");
await sleep(800);

// -- embed options (appear once kind = HTML and an HTML upload exists)
const embedInfo = await page.evaluate(() => [...document.querySelectorAll("input, select")].filter((e) => /embed|viewport|fullscreen|mobile|orientation|frame/i.test(e.name + " " + e.id + " " + e.className)).map((e) => `${e.tagName}|${e.type}|${e.name}|${e.value}|${e.checked ?? ""}`));
log("embed fields:", embedInfo.join("\n  "));
for (const [n, v] of [["game[embed_width]", FIELDS.embed.width], ["game[embed_height]", FIELDS.embed.height]]) {
  const el = page.locator(`input[name="${n}"]`);
  if (await el.count()) await el.fill(String(v));
}
for (const n of ["game[embed_fullscreen_button]", "game[embed_mobile]", "game[mobile_friendly]", "game[embed_fullscreen]"]) {
  const el = page.locator(`input[name="${n}"]`);
  if (await el.count() && !(await el.isChecked())) await el.check();
}

// -- cover
await chooseFiles("button.button:has-text('Upload Cover Image')", COVER);
await page.waitForFunction(() => (document.querySelector('input[name="game[cover_image_id]"]')?.value ?? "") !== "", null, { timeout: 120000 });
log("cover uploaded");

// -- screenshots
if (SHOTS.length) {
  await chooseFiles("button.add_screenshot_btn", SHOTS);
  await page.waitForFunction((n) => document.querySelectorAll(".game_edit_screenshots_uploader_widget img, .game_edit_screenshots_uploader_widget .screenshot").length >= n, SHOTS.length, { timeout: 180000 });
  await sleep(1500);
  log("screenshots uploaded:", SHOTS.length);
}

await page.screenshot({ path: PREVIEW, fullPage: true });
log("preview written:", PREVIEW);
log("STOPPED before Save. Review the Chrome window, then press 'Save & view page'.");
await browser.close();
