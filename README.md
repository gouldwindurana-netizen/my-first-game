# Mossguard

A playable fantasy tower defense game built with Phaser 3, TypeScript, and Vite: **12 stages, 17 tower families, 68 specializations, 24 enemy types, four difficulties, and saved progression**.

## Play the HTML sample

Download [`samples/mossguard.html`](samples/mossguard.html) using GitHub's **Download raw file**, save it, and open it in a modern desktop browser. The single file includes the engine, artwork, audio, fonts, and license notices, with no external runtime downloads. On phones, use a static web host; some file preview apps show HTML without running it.

The managed cloud browser blocks direct `file://` navigation. The same inline sample is tested in an offline browser document with HTTP blocked. This verifies embedded resources and gameplay without bypassing that browser policy.

## Combat

- Target First, Strongest, Fastest, or Last. Trees block direct fire; mortars and ground/sonic effects offer alternatives.
- Physical damage meets armor. Elemental damage meets resistance and weakness.
- Slows, burn, poison, stun, roots, knockback, curse, and armor shred affect combat. Some enemies resist control, dodge, split, heal, summon, regenerate, teleport, fly, or hide.
- Barracks soldiers physically move to a rally point, block and fight ground enemies, return when idle, and respawn after defeat.
- Finite-use traps snap to the road. Rearm them with gold; they do not consume tower foundations.
- Upgrade to tier II, then choose a permanent A/B/C specialization. Hell difficulty also permits D.
- Use the **?** scout report to see next-wave types and counts. Automatic waves are optional in settings.

[Full combat, tower, enemy, and progression rules](docs/GAMEPLAY.md) document actual prices and effects.

## Campaign

| Stage | Waves | Setting artwork |
| --- | --- | --- |
| Verdant Vale | 6 | Forest river ruins |
| Windward Plateau | 8 | Frozen pass |
| Toxic Swamp | 8 | Wetland causeway |
| Frostpeak | 8 | Frozen pass |
| Storm Highlands | 8 | Frozen pass |
| Crystal Caverns | 10 | Crystal hollow |
| Ember Wastes | 10 | Lava chasm |
| Dark Chasm | 10 | Lava chasm |
| Ancient Sanctum | 10 | Crystal hollow |
| The Void Rift | 10 | Crystal hollow |
| Moonlit Citadel | 10 | Forest river ruins |
| Final Reckoning | 12 | Forest river ruins |

All 110 waves use scripted groups and spacing; each stage has mini-bosses and ends in a boss. Easy, Normal, Hard, and Hell change enemy health/speed, gold income, and keep lives. Stage or difficulty changes start a fresh defense and are unavailable during an active wave.

Victory earns 1–3 stars by lives remaining: three at 90%, two at 50%, one for any other win. Stage records are saved separately by difficulty.

## Legacy, skills, and shop

Open **Legacy & shop** on desktop, **Battlefields → Skill tree & shop**, or the matching settings button.

- Spend earned XP on 100 nodes across ten branches, with three to five ranks per node.
- Seven capstones provide later XP sinks.
- Earn gems from first clears and improved stars. Unlock Void, Solar, Chrono, Truesight, and Nexus, or buy permanent supply/keep/XP upgrades.
- First three-star clears across Normal award 438 gems; the five premium families together cost 280. Replays award smaller XP rewards without repeated clear gem farming.
- Purchases apply at your next fresh defense. Resetting skills and capstones returns 80% of spent XP and keeps shop purchases.

Progress, stars, XP, gems, ranks, and purchases save in localStorage. Old campaign records migrate. Denied or malformed storage falls back to a playable session. Active battles are not saved. Gems are earned in play; there is no checkout.

## Display and existing artwork

Every map preserves its original aspect ratio and fits completely at 100%. Zoom from 100% to 250%, drag to pan, and press **0** to fit again. Fullscreen and resizing preserve battle state. The field, dock, and wave action stay within desktop, laptop, tablet, and phone viewports; portrait inspection uses a dismissible drawer. Tower sites have names and no numeric labels.

The 12 stages reuse five existing high-resolution environment illustrations with different wave scripts and economies. All 17 towers and 24 enemies currently reuse the supplied tower art and four walking families, distinguished by badges, colors, and role/status indicators. Unique new animations are reserved for the next pass. The existing 24-fps interpolated walking and seamless scenery loops remain intact. Pause and reduced-motion settings are respected.

[Asset integration](docs/ASSET_INTEGRATION.md) records original source crops, generated map restorations, walking provenance, and current art limitations. [Expansion roadmap](docs/EXPANSION_ROADMAP.md) separates remaining ideas from implemented systems.

## Run and test

Requires Node.js 22.12+; development is validated with Node 24.

```sh
npm ci
npm run dev -- --port 5173
npm test
npm run build
node scripts/serve.mjs --port 4173 --base /my-first-game/
```

In another terminal:

```sh
GAME_URL=http://127.0.0.1:4173/my-first-game/ npm run test:expansion
GAME_URL=http://127.0.0.1:4173/my-first-game/ npm run test:view
GAME_URL=http://127.0.0.1:4173/my-first-game/ npm run test:fit
PLATFORM_BASE=http://127.0.0.1:4173/my-first-game/ npm run test:platforms
```

Additional suites cover browser combat, campaign navigation, animation, walking, strategy, and environments. Browser checks use real controls and detached read-only diagnostics. Chromium is expected at `/usr/bin/chromium`, overridable with `CHROMIUM_PATH`. Platform checks support installed Playwright Firefox and WebKit through `BROWSER`. Mobile profiles emulate touch and viewport sizes; they are not physical-device certification.

## Controls

| Input | Action |
| --- | --- |
| 1–9 | Select the first nine tower families |
| Mouse/touch dock | Select any unlocked tower family |
| Space | Send next wave |
| P | Pause/resume |
| F | Aim Starfall |
| M | Tactical ranges and tree cover |
| U | Tier II upgrade, or focus a specialization choice |
| X / Delete | Sell selected defense |
| + / − / 0 | Zoom in / out / fit |
| Escape | Close a dialog or cancel placement/rally |

## Publish on GitHub Pages

[`.github/workflows/pages.yml`](.github/workflows/pages.yml) builds the site and inline sample, runs unit and browser checks, and deploys on pushes to `main`. Enable **Settings → Pages → GitHub Actions** for the repository. A successful Git push confirms source publication, while the Actions deployment status determines when the hosted site updates.

This is an HTML5 browser game, not an APK, IPA, or native desktop installer. No backend, accounts, runtime API keys, or CDN dependencies are required. The Canvas renderer also works without hardware WebGL.
