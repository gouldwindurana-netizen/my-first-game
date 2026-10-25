# Mossguard · Ruins of Eldervale

A playable, fantasy tower defense game built with **Phaser 3, TypeScript, and Vite**. Defend the ruined citadel in Eldervale through twelve increasingly difficult waves and the Hollow King finale.

## Test the HTML sample without installing anything

Download **[`samples/mossguard.html`](samples/mossguard.html)** (about 8.5 MiB). It contains the entire playable game, including its engine, styles, fonts, map, and license notices. There are no external runtime downloads.

On a desktop, save the file and open it in a modern browser. If you download it from GitHub, use **Download raw file**, rather than the GitHub code viewer. On a phone, use the hosted GitHub Pages site or a local web server: some Files/Quick Look apps display HTML instead of running JavaScript.

The cloud browser's administrator policy blocks direct `file://` navigation. The identical standalone HTML was verified in an offline opaque browser document with every HTTP request blocked: real building, arcane chain combat, rewards, pause, and background auto-pause passed with zero companion files or network requests. Direct file-protocol execution could not be tested in this managed browser.

## Publish on GitHub Pages

The repository includes [`.github/workflows/pages.yml`](.github/workflows/pages.yml). On a push to `main` it installs locked dependencies, runs simulation tests, builds the normal website and downloadable HTML, tests gameplay under a project subpath, and runs the platform suite in Chromium, Firefox, and WebKit before deployment.

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, select **GitHub Actions** as the source.
3. Open **Actions → Test and publish Mossguard**, then run the workflow on `main` if the initial run happened before Pages was enabled.
4. After a successful deployment, use the URL shown by the deployment job. The downloadable sample is at `mossguard.html` beside the hosted site's `index.html`.

The workflow cannot enable a new Pages site using `GITHUB_TOKEN` alone. Enabling Pages needs repository settings access. A Git push confirms code publication; it does not prove that the Pages workflow or deployment has completed.

## Web display and supplied assets

The battlefield now uses the available browser width instead of shrinking to fit the window height. On desktop, the field, bottom tower dock, and next-wave button fit inside the viewport; tower inspection scrolls independently. Tablets and phones use a full-width field with controls below. Important HUD values, prices, labels, and action buttons use readable sizes. High-DPI backing resolution keeps graphics sharp on Retina displays and larger desktop viewports.

Use **+ / −** to zoom the battlefield from 100% to 250%, drag to pan when zoomed or when the desktop field crops the map margins, and press **0** to reset the view. The fullscreen button expands the game when the browser supports it. Zoom, pan, resize, and fullscreen do not reset the match. Numbered foundation buttons also center the selected site while zoomed.

The user's `Mossguard_Design_and_Assets.zip` supplies the twelve tower-tier illustrations, four mapped enemy images, matching SVG icons, and WAV effects. The sheets use individually measured frames, not equal-grid slicing. [Asset integration notes](docs/ASSET_INTEGRATION.md) explain which assets are live and which remain design references. The supplied illustrations now have distinct procedural walking strides, tower recoil, orbiting magic, construction/upgrade bursts, hit flashes, and fading defeat reactions. Pause freezes these effects, 2× speed follows combat, and Reduced motion removes extra movement. This animates the original artwork without claiming authored frame-by-frame sprite strips.

## Mobile and other platforms

This is an HTML5 browser game for modern desktop and mobile browsers. It is not an APK, IPA, or native desktop installer. The hosted site is the easiest way to test on Android/iOS; the editable source can later be wrapped in a native webview if needed.

- 44px primary touch targets and numbered build-site controls avoid precise map taps.
- Phone portrait, landscape, rotation, and tablet layouts preserve the battlefield ratio.
- Safe-area padding supports notched screens, and page scrolling/zoom remain available outside the canvas.
- Background/visibility changes pause combat; resuming remains an explicit player action.
- Safari's prefixed audio constructor and older media-query listeners are supported; unsupported audio does not prevent play.
- Assets use relative paths, so the normal build works under `/my-first-game/` and other static-host subpaths.

Local browser checks were run in Chromium with emulated phone/tablet input and viewports. Firefox/WebKit checks are configured in CI; do not count them as passed until their workflow jobs actually finish. Physical Android/iPhone hardware was not available in the cloud environment.

## Build and serve

```sh
npm ci
npm run build
npm run serve -- --port 4173 --base /my-first-game/
```

`dist/` is ready for static hosting and includes both the website and `mossguard.html`. To test from another device on the same trusted LAN, use `npm run serve -- --host 0.0.0.0 --port 4173`, then open your computer's LAN address from the device.

`npm run build:web` builds just the normal website. `npm run build:html` regenerates the single-file sample after source edits. Do not edit the generated sample by hand. Run the normal build after regenerating it to refresh the copy in `dist/`.

For the platform suite, keep the static server running at `/my-first-game/` and run `npm run test:platforms`. Set `BROWSER=firefox` or `BROWSER=webkit` after installing that Playwright browser. `npm run test:browser`, `npm run test:view`, and `npm run test:animation` accept `GAME_URL` for the same subpath. The animation suite exercises construction, upgrades, combat reactions, pause, speed, and reduced motion through real UI input.

## Run

Requires Node.js 22.12+ (validated with Node 24).

```sh
npm ci
npm run dev -- --port 5173
```

`npm run build` type-checks and creates the production site in `dist/`. `npm run preview -- --port 4173` serves that build. No API keys, backend, accounts, or runtime CDN requests are needed. Fonts are bundled locally.

## Play

1. Choose a tower card in the bottom command bar, then click or tap a glowing stone foundation to build.
2. Send a wave. Towers automatically attack the enemy furthest along the path within range.
3. Click an existing tower to see its range, upgrade it (up to level III), or sell it for 70% of invested gold.
4. Combine ranger nests, ember cannons, frost shrines, and arcane spires. Survive all twelve waves before stronghold health reaches zero.

| Control | Action |
| --- | --- |
| 1 / 2 / 3 / 4 | Select ranger / cannon / frost / arcane |
| M | Toggle tactical route and tower ranges |
| Space | Start the next wave when ready |
| F, then click or tap | Cast Starfall during a wave |
| P | Pause or resume |
| Escape | Cancel placement/spell, or close the field guide |
| ? | Open the field guide |
| R | Restart after victory or defeat |

The sound button enables the optional WAV effects supplied in the asset pack. Audio is decoded after the first user gesture and cached for subsequent playback. The game pauses when its browser window loses focus. The field guide pauses the match and restores its previous pause state when closed.

## Mechanics

- **Ranger nest:** 70 gold, rapid attacks and long range. Armored brutes and the boss resist arrows.
- **Ember cannon:** 120 gold, slower explosive attacks with splash damage that ignores armor.
- **Frost shrine:** 90 gold, magic damage and a 45% slow lasting 2.2 seconds.
- **Arcane spire:** 100 gold, armor-piercing chain lightning. Hits 2 / 3 / 4 distinct nearby enemies at levels I / II / III, losing 35% damage per jump.
- **Starfall:** targeted 120-radius blast, 145 damage, 25-second recharge; no gold cost.
- **Economy:** earn gold per kill and wave cleared. Send the next wave within 12 seconds for up to 24 bonus gold.
- **Enemies:** scouts, fast runners, armored brutes, and a final boss. Brutes cost two health if they escape; the boss costs eight.
- **Progress:** a personal best is saved locally when a match ends. In-progress matches are not saved.

Fixed foundations and complementary tower roles take inspiration from *Kingdom Rush*. Slowing/damage combinations and escalating mixed waves draw on familiar *Bloons TD* conventions. No assets or code from those games are included.

The visual direction follows the user-provided concept art: a lush ruined citadel on terraced cliffs with waterfalls, blue banners, purple arcane magic, and a dark blue-and-gold command HUD. `src/assets/eldervale.webp` is a generated original environment illustration inspired by that reference. The enemy route and eight foundations align with the painted road and stone sites. Defense towers and enemies are interactive procedural illustrations, rather than baked into the map. The bottom command bar, tower inspection/upgrade panel, tactical minimap, and sound/reduced-motion settings are live controls. Tower/enemy sprites and most HUD icons now come from the supplied asset pack.

## Validate

```sh
npm test
npm run build
# With the dev server running in another terminal:
npm run test:browser
```

The 14 deterministic simulation tests cover purchases, upgrades, sales, invalid actions, armor, splash, slowing, arcane chain range/falloff/scaling, pause/speed, Starfall, wave transitions, a complete earned-gold campaign victory, defeat, and reset. The browser test covers arcane chain damage, settings pause restoration, reduced-motion controls, the tactical minimap, and actual mouse/touch controls on desktop and mobile; captures screenshots under ignored `artifacts/`; and checks for browser errors. It expects Chromium at `/usr/bin/chromium`, overridable with `CHROMIUM_PATH`; `GAME_URL` overrides the default local test address.

## Structure

- `src/game/model.ts` — renderer-independent combat, movement, economy, waves, and campaign state.
- `src/render/forest.ts` — legacy procedural illustrations retained as reference; the current renderer uses the supplied assets.
- `src/render/asset-views.ts` and `src/asset-art.ts` — supplied sprite frames and matching UI portraits.
- `src/assets/pack/` — supplied atlas artwork, WAV audio, SVG UI, frame metadata, and provenance.
- `src/audio.ts` — user-gesture audio decoding and bounded effect playback.
- `src/readability.css` — larger responsive interface and fullscreen layout.
- `src/assets/eldervale.webp` — the concept-inspired painted citadel battlefield.
- `src/render/scene.ts` — Phaser rendering, effects, and world input.
- `src/main.ts` — accessible DOM HUD, controls, guide, results, sound, and local best score.
- `src/style.css` — responsive forest-themed UI.

The Phaser scene uses Canvas 2D so it also runs well without a hardware WebGL context. The painted landscape uses one local texture; supplied tower/enemy sprites, projectiles, and spell effects remain separate. The production bundle includes the Phaser engine (~355 KB compressed). The map image is bundled with the site; no external image or font CDN requests are required.
