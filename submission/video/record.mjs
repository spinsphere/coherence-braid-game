#!/usr/bin/env node
// Records the gameplay video for the itch.io / jam submission.
//
//   node submission/video/record.mjs <base-url> <out-dir>
//
// <base-url> is a served static export of the game (see submission/README.md).
// Writes <out-dir>/raw.webm plus live screenshots. Convert with ffmpeg
// afterwards (submission/video/encode.sh). Uses the installed Google Chrome
// through Playwright; no browser download is needed.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const [base, outDir] = process.argv.slice(2);
if (!base || !outDir) {
  console.error("usage: record.mjs <base-url> <out-dir>");
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });
const W = 1920;
const H = 1080;

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, recordVideo: { dir: outDir, size: { width: W, height: H } } });
const page = await ctx.newPage();

// ---------------------------------------------------------------- overlays
// A caption bar, a fake cursor and full-screen cards are injected into the
// page so they are part of the recording. Nothing here touches the game.
await page.addInitScript(() => {
  const css = `
    #cap { position: fixed; left: 50%; bottom: 36px; transform: translateX(-50%); max-width: 72%; z-index: 9000;
      background: rgba(11,16,32,.86); border: 1px solid #2a3563; color: #e8ecf7; border-radius: 14px;
      padding: 14px 22px; font: 500 26px/1.35 system-ui, -apple-system, "Segoe UI", sans-serif; text-align: center;
      opacity: 0; transition: opacity .35s; pointer-events: none; box-shadow: 0 10px 40px rgba(0,0,0,.5); }
    #cap.on { opacity: 1; }
    #cur { position: fixed; z-index: 9500; width: 26px; height: 26px; left: 0; top: 0; pointer-events: none;
      transition: transform .45s cubic-bezier(.4,0,.2,1); transform: translate(-100px,-100px); }
    #cur svg { display: block; filter: drop-shadow(0 2px 3px rgba(0,0,0,.6)); }
    #ring { position: fixed; z-index: 9400; width: 44px; height: 44px; border-radius: 50%; border: 3px solid #f2c98a;
      pointer-events: none; opacity: 0; transform: translate(-50%,-50%) scale(.4); }
    #ring.go { animation: ring .5s ease-out; }
    @keyframes ring { 0% { opacity: .9; transform: translate(-50%,-50%) scale(.4);} 100% { opacity: 0; transform: translate(-50%,-50%) scale(1.4);} }
    #card { position: fixed; inset: 0; z-index: 9800; background: #0b1020; color: #e8ecf7; display: flex; align-items: center; justify-content: center;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif; opacity: 0; transition: opacity .5s; pointer-events: none; }
    #card.on { opacity: 1; }
    #card .in { max-width: 1200px; text-align: center; padding: 40px; }
    #card h1 { font-size: 84px; font-weight: 600; letter-spacing: -0.02em; margin: 0; line-height: 1.05; }
    #card h1 span { color: #9aa5cc; }
    #card p { font-size: 30px; color: #c9d0e6; margin: 22px 0 0; line-height: 1.4; }
    #card p.small { font-size: 22px; color: #9aa5cc; }
    #card p.accent { color: #f2c98a; }
    #card .mono { font-family: ui-monospace, "DejaVu Sans Mono", monospace; }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  const mount = () => {
    document.head.appendChild(style);
    const cap = document.createElement("div"); cap.id = "cap";
    const cur = document.createElement("div"); cur.id = "cur";
    cur.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2 L4 20 L9 15 L12.5 22 L15.5 20.5 L12 13.5 L19 13.5 Z" fill="#fff" stroke="#0b1020" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    const ring = document.createElement("div"); ring.id = "ring";
    const card = document.createElement("div"); card.id = "card";
    document.body.append(cap, cur, ring, card);
  };
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
  window.__cap = (t) => { const c = document.getElementById("cap"); if (!t) { c.classList.remove("on"); return; } c.textContent = t; c.classList.add("on"); };
  window.__cur = (x, y) => { document.getElementById("cur").style.transform = `translate(${x}px,${y}px)`; };
  window.__ring = (x, y) => { const r = document.getElementById("ring"); r.style.left = x + "px"; r.style.top = y + "px"; r.classList.remove("go"); void r.offsetWidth; r.classList.add("go"); };
  window.__card = (html) => { const c = document.getElementById("card"); if (!html) { c.classList.remove("on"); return; } c.innerHTML = `<div class="in">${html}</div>`; c.classList.add("on"); };
});

const sleep = (ms) => page.waitForTimeout(ms);
const cap = (t) => page.evaluate((t) => window.__cap(t), t);
const card = (html) => page.evaluate((h) => window.__card(h), html);
let shotN = 0;
const shot = (name) => page.screenshot({ path: path.join(outDir, `live-${String(++shotN).padStart(2, "0")}-${name}.png`) });

/** Move the fake cursor to the element, then click it. */
async function click(locator, { settle = 700, hold = 250 } = {}) {
  await locator.first().waitFor({ state: "visible", timeout: 15000 });
  const box = await locator.first().boundingBox();
  if (!box) throw new Error("no box for locator");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.evaluate(([x, y]) => window.__cur(x, y), [x, y]);
  await sleep(settle);
  await page.evaluate(([x, y]) => window.__ring(x, y), [x, y]);
  await locator.first().click();
  await sleep(hold);
}
const btn = (name, exact = true) => page.getByRole("button", { name, exact });
const dialog = () => page.locator(".modal-root");
const waitDialog = (text, timeout = 15000) => dialog().filter({ hasText: text }).first().waitFor({ state: "visible", timeout });

/** Press Stuck? and let the solver play until the level is won. */
async function stuckUntilWon(maxMoves = 12, captionOnce = null) {
  for (let i = 0; i < maxMoves; i++) {
    if (await dialog().filter({ hasText: "The level is won" }).count()) return;
    await click(btn("Stuck?"));
    await waitDialog("Stuck?");
    if (captionOnce && i === 0) {
      await cap(captionOnce);
      await sleep(3500);
      await shot("stuck");
    } else await sleep(900);
    const doIt = btn("Do it for me");
    if (await doIt.count()) await click(doIt);
    else { await click(btn("Close")); return; }
    await sleep(1400);
  }
}

// ------------------------------------------------------------------ scenes
await page.goto(base, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await sleep(300);

// 1. title card
await card(`<h1>COHERENCE<span>:</span> Braid</h1><p>You do not build a civilization.<br>You ask it questions, and you braid it.</p><p class="small">Global Quantum Game Jam 2026 · theme: quantum braiding</p>`);
await sleep(5500);
await card(null);
await sleep(600);

// 2. title screen
await cap("Nine levels, about twenty minutes. Plays in the browser, on a phone or a desktop.");
await sleep(3500);
await cap("Every cohort is a qubit. The civilization is a density matrix, simulated exactly.");
await sleep(3500);
await cap(null);

// 3. tutorial, three pages
await click(btn("How to play"));
await waitDialog("How to play");
await sleep(3200);
await click(btn("Next"));
await sleep(3200);
await click(btn("Next"));
await sleep(3400);
await shot("tutorial-braid");
await click(btn("Skip"));
await sleep(600);

// 4. level 1: the river, order effects
await click(btn("Play"));
await waitDialog("Order effects");
await sleep(3800);
await click(btn("Begin"));
await cap("Asking is a projective measurement. The founding state already knows what the river is.");
await sleep(800);
await click(page.getByRole("button", { name: /^Ask the Elders/ }));
await sleep(2600);
await cap("The neighbour question is incompatible with it: now a fair coin, drawn by the Born rule.");
await click(page.getByRole("button", { name: /The neighbour/ }).first());
await sleep(1600);
await click(page.getByRole("button", { name: /^Ask the Elders/ }));
await waitDialog("The order you did not choose");
await cap("Same questions, same people, the other order: different statistics. An order effect.");
await sleep(5500);
await shot("order-effect");
await click(btn("Continue"));
await waitDialog("The level is won");
await cap(null);
await sleep(2600);
await click(btn("Next level"));

// 5. level 2: the crossing, facts travel along the braid
await waitDialog("Braiding makes facts travel");
await sleep(3600);
await click(btn("Begin"));
await cap("Braiding conserves parity: a fact has to exist before it can travel. Ask the Elders first.");
await sleep(500);
await click(page.getByRole("button", { name: /The neighbour/ }).first());
await sleep(700);
await click(page.getByRole("button", { name: /^Ask the Elders/ }));
await sleep(2400);
await click(btn("BRAID"));
await cap("σ₂ is an exchange: it entangles the Elders and the Smiths, and the fact travels along the braid.");
await sleep(1200);
await click(page.getByRole("button", { name: /^σ₂(?!⁻)/ }).first());
await sleep(2600);
await cap(null);
await stuckUntilWon(8, "Stuck? explains where you are, names the next crossing and why, and can make the move for you.");
await waitDialog("The level is won");
await cap("The Smiths were never asked. They are certain anyway: the fact travelled along the braid.");
await sleep(4200);
await cap(null);
await click(btn("Levels"));

// 6. level 5: the unasked, interference
await page.getByRole("button", { name: "open every level" }).click();
await sleep(600);
await click(page.getByRole("button", { name: /Level 5/ }));
await waitDialog("Interference");
await sleep(3600);
await click(btn("Begin"));
await click(btn("BRAID"));
await cap("Braid only, ask no one. Quantum p(ENTER) climbs while the classical mixture stays at 0.50. The gap is interference.");
for (const k of ["σ₂", "σ₃", "σ₄", "σ₅"]) {
  await click(page.getByRole("button", { name: new RegExp(`^${k}(?!⁻)`) }).first(), { settle: 600, hold: 1500 });
}
await shot("interference");
await waitDialog("The level is won");
await cap("Three cohorts certain of a welcome, and no one was asked. That certainty only exists while the question stays unasked.");
await sleep(4500);
await cap(null);
await click(btn("Levels"));

// 7. level 8: the federation, a Bell test
await click(page.getByRole("button", { name: /Level 8/ }));
await waitDialog("A Bell test");
await sleep(3600);
await click(btn("Begin"));
await click(btn("BRAID"));
await cap("Two civilizations meet at a cut. Only σ₄ crosses it. First undo the opening exchange with σ₂⁻¹.");
await click(btn("under (σ⁻¹)"));
await click(page.getByRole("button", { name: /^σ₂⁻¹/ }).first(), { hold: 1400 });
await click(btn("over (σ)"));
await cap("σ₄ makes the Smiths and the Traders a maximally entangled pair. Live S reads 2√2.");
await click(page.getByRole("button", { name: /^σ₄(?!⁻)/ }).first(), { hold: 1800 });
await cap("Nothing agreed in advance can pass a Bell test. Run it.");
await click(btn("Run the Bell test"));
await waitDialog("The Bell test");
await cap("S computed exactly from ρ, sampled over 200 shots, and shown beside Moth Quantum's own CHSH witness.");
await sleep(6500);
await shot("bell-test");
await click(btn("Continue"));
await waitDialog("The level is won");
await cap(null);
await sleep(2800);
await click(btn("Levels"));

// 8. extras: deep time, eject to QASM, certificate, map
await click(page.getByRole("button", { name: /Level 9/ }));
await waitDialog("Sandbox");
await sleep(2600);
await click(btn("Begin"));
await cap("Deep Time: five cohorts, six eras, no goal but staying one thing. Collapse leaves a myth the next civilization begins by braiding.");
await click(btn("BRAID"));
for (const k of ["σ₂", "σ₅", "σ₄"]) await click(page.getByRole("button", { name: new RegExp(`^${k}(?!⁻)`) }).first(), { settle: 500, hold: 900 });
await sleep(800);
await cap("The diagram is the actual braid word of your civilization. Eject it as an OpenQASM 3 circuit.");
await click(btn("Eject to QASM"));
await waitDialog("OpenQASM 3");
await sleep(4200);
await shot("qasm");
await click(btn("Close"));
await cap("The only randomness is the Born rule. Its first draws come from Moth Quantum's engines, with the certificate shown verbatim.");
await click(btn("Entropy certificate"));
await waitDialog("Entropy certificate");
await sleep(4500);
await shot("certificate");
await click(btn("Close"));
await cap("Map: the whole journey, from the river to the Federation, and where you are on it.");
await click(btn("Map"));
await sleep(4000);
await shot("map");
await cap(null);

// 9. end card
await card(`<h1>COHERENCE<span>:</span> Braid</h1><p class="accent">Design &amp; development by soliax (Wandering Consciousness)</p><p class="small">Quantum randomness and CHSH witness: Moth Quantum · coin-toss-v1, comet-qrng-v1, labyrinth-v1</p><p class="small">Ising-anyon braid representation · density matrix simulated exactly · all art procedural SVG</p><p class="small mono">x.com/WanderingIshiki · github.com/spinsphere/coherence-braid-game</p><p class="small">Global Quantum Game Jam 2026 · plays in the browser on itch.io</p>`);
await sleep(7000);

const video = page.video();
await ctx.close();
const raw = await video.path();
fs.renameSync(raw, path.join(outDir, "raw.webm"));
await browser.close();
console.log("wrote", path.join(outDir, "raw.webm"));
