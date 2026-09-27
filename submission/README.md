# Submission kit: COHERENCE: Braid → Global Quantum Game Jam 2026

Everything for the itch.io page and the jam entry lives in this folder. Nothing here touches the
game source; the build used for the zip is a snapshot of the working tree (commit in
`assets/BUILD_COMMIT`). Rebuild the zip after the last code change (step 1 below).

## Deadlines (verified on the jam page, 2026-09-27 00:50 Finland time; you are already joined to the jam)

| What | When (Finland, UTC+3) | When (NZ, UTC+13) |
|---|---|---|
| Development stops (jam schedule) | Sun 27 Sep 13:00 | Sun 27 Sep 23:00 |
| Submission deadline (jam schedule) | Sun 27 Sep 15:00 | Mon 28 Sep 01:00 |
| Presentations, 3 min per team (Twitch) | Sun 27 Sep 16:00 | Mon 28 Sep 02:00 |
| itch.io submission window actually closes | Mon 28 Sep 23:59 (page timestamp `2026-09-28 20:59:59` is UTC; the logged-in page shows it as "September 29th at 9:59 AM" NZ time) | Tue 29 Sep 09:59 |

The jam's own schedule is the one to aim for. The itch window is the hard stop.

## What the jam requires on the page (from the jam page and the README doc)

- Playable game on this jam's itch page, browser-playable strongly preferred.
- Gameplay video (YouTube or Vimeo link in the "Gameplay video or trailer" field).
- Screenshots.
- Creator names / credits.
- A stated connection to quantum physics (the page copy has a section for physics and one for the theme).
- Follow the IGDA Finland code of conduct.
- Not on the page but asked for in the jam README: a 3-minute presentation slot on Sunday 16:00 (Twitch, via Discord). The video doubles as that presentation.

The jam README (Google Doc) could not be read by the fetch tool (it 400s on export). If it lists
extra submission questions, paste them to me and I will fill them from `itch/page-copy.md`.


## What the jam's "Submit game to jam" dialog says (read 2026-09-27 from the logged-in page)

- "All games should be published under the **MIT license** and you should credit all the team members and
  their roles in the process. Please prefer **real names** for crediting."
- "Remember to add a **video of the gameplay**" (help doc: max 2 to 3 minutes, YouTube or Vimeo, link on the itch page).
- Only **public** projects can be picked in the dialog; a draft is not listed.

Consequences:
- DONE: `LICENSE` (MIT) is at the repo root and `package.json` has `"license": "MIT"`. The itch description states MIT and names the team.
- Credits use "soliax (Wandering Consciousness)". If you want a real name on the page, add it to the Credits
  paragraph of the description before making it public.

## Files

| Path | What |
|---|---|
| `itch/page-copy.md` | Every form field with its value, plus the full description ready to paste. |
| `assets/coherence-braid-itch.zip` | The HTML5 build (`index.html` at root, 42 files, ~380 KB). |
| `assets/cover-630x500.png` | Cover image, itch's recommended size. |
| `assets/screenshot-{1,2,3}.png` | Press renders (1280 × 800). |
| `assets/live-*.png` | Live captures from the video run (order effect, Stuck?, interference, Bell test, QASM, certificate, map). |
| `assets/coherence-braid-trailer.mp4` | The gameplay video, 1920 × 1080, 2:48, captions burned in. Not committed (17 MB); it is on YouTube at https://youtu.be/B_tO41rcZ_4 and `video/record.mjs` regenerates it. |
| `video/record.mjs`, `video/encode.sh`, `video/youtube.md` | How the video is made, and the YouTube title/description. |
| `itch/fill-project.mjs` | Fills the itch "Create a new project" form in the logged-in Chrome (stops before Save). |
| `tools/` | Butler notes (`butler` is installed at `~/.local/bin/butler`, v15.31.0). |

## The order of operations

1. **Freeze the code.** When the other agent is done: `npm test && npm run build:itch` in the repo, then
   copy `coherence-braid-itch.zip` over `submission/assets/coherence-braid-itch.zip`, and re-run
   `submission/video/record.mjs` only if the UI changed in a way the video should show.
2. **YouTube.** DONE: https://youtu.be/B_tO41rcZ_4 (uploaded 2026-09-27 from `assets/coherence-braid-trailer.mp4`).
3. **Log in to itch.io** in the Chrome window I opened (plain Chrome, profile in the scratchpad, CDP on
   port 9333). Cloudflare accepted it; if it challenges again, solve it once in that window.
4. **Create the project.** DONE on 2026-09-27 (NZ 11:12): the draft exists at
   https://itch.io/game/edit/5058770 with every field filled, the zip uploaded and marked "played in the
   browser", embed 1280 × 800 with fullscreen and mobile, cover and five screenshots uploaded, AI disclosure = Yes,
   community = comments, visibility = draft. `assets/itch-form-preview.png` is the full-page capture.
   Not yet pressed: **Save & view page**. Press it in the Chrome window (or tell me to), then paste the
   YouTube URL into "Gameplay video or trailer", save again, and set Visibility to **Public**.
   (`itch/fill-project.mjs` is the script that did the first pass; itch auto-saves a new project on the
   first upload, which is why the slug and uploads needed a second pass on the edit page.)
5. **Submit to the jam.** On https://itch.io/jam/quantum-game-jam-2026 press "Submit your project",
   pick COHERENCE: Braid, answer any jam questions (text in `itch/page-copy.md`), submit.
6. **Discord.** Post the itch link in the jam's submissions channel (Game-Set-Quanta server) and note the
   presentation slot. Butler is optional: after the page exists, later builds can be pushed with
   `butler push out wanderingconsciousness/coherence-braid:html` (see `tools/butler.md`).

## Decisions for you

- **AI disclosure** on the itch form: I recommend **Yes**. The repository's commits carry
  `Co-Authored-By: Claude` lines, so "No" would be false. The other entries in this jam tick it too.
- **Tags**: ten proposed in `itch/page-copy.md`; swap freely.
- **Slug**: `coherence-braid` (project URL `wanderingconsciousness.itch.io/coherence-braid`). If itch says
  it is taken, `coherence-braid-game`.
- **Vercel deploy** is optional and not required for the jam; the itch build needs no network.

## Verified so far

- Static export builds from the current working tree; the game runs from a nested path like itch's
  (`/deep/nested/game/`), title → tutorial → level 1 ask all work in headless Chrome; no failed requests.
- Zip: `index.html` at the root, 42 files, longest path 59 chars (itch limits: 1000 files, 240 chars, 500 MB).
- Butler v15.31.0 runs (`~/.local/bin/butler -V`); not logged in yet (needs you: `butler login`).
- The Claude-in-Chrome extension is not connected in this session, so itch automation goes through the
  plain Chrome window over CDP instead.
