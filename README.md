# Mossguard

A playable fantasy tower defense game built with Phaser 3, TypeScript, and Vite: **12 stages, 17 tower families, 68 specializations, 24 enemy types, four difficulties, and saved progression**.

## Play the HTML sample

Download [`samples/mossguard.html`](samples/mossguard.html) using GitHub's **Download raw file**, save it, and open it in a modern desktop browser. The single file includes the engine, artwork, audio, fonts, and license notices, with no external runtime downloads. On phones, use a static web host; some file preview apps show HTML without running it.

The managed cloud browser blocks direct `file://` navigation. The same inline sample is tested in an offline browser document with HTTP blocked. This verifies embedded resources and gameplay without bypassing that browser policy.

## Main menu and campaign navigation

The game opens on a dedicated title screen. **Play campaign** opens stage and difficulty selection; **Continue campaign** finds the next unsecured stage, and **Resume defense** returns to the battle already running in this session. Skills, settings, and the field guide are available before starting. The Home button, pause screen, settings, and Mossguard crest return to the main menu. Menus pause the defense and preserve towers, enemies, and gold. Active battles are still session-only; saved campaign progress persists across reloads.

## Combat

- Target First, Strongest, Fastest, or Last. Trees block direct fire; mortars and ground/sonic effects offer alternatives.
- Physical damage meets armor. Elemental damage meets resistance and weakness.
- Hidden enemies have ordinary gold counters: Arrow II **Lantern Sentries** costs a 55g upgrade; Ice II **Aurora Lens** costs 65g. Both reveal targets to nearby allies. Magic spires detect immediately for 160g. The scout report previews threats, prices, and training requirements; premium Truesight is optional.
- Slows, burn, poison, stun, roots, knockback, curse, and armor shred affect combat. Some enemies resist control, dodge, split, heal, summon, regenerate, teleport, fly, or hide.
- Barracks soldiers physically move to a rally point, block and fight ground enemies, return when idle, and respawn after defeat.
- Finite-use traps snap to the road. Rearm them with gold; they do not consume tower foundations.
- Earn upgrades through wave clears: tier II needs the first cleared wave and a clear since construction; a specialization needs three cleared waves and a clear since tier II. An early tower can reach maximum tier within the first level, but cannot max out immediately. A/B/C branches are available normally; D requires Hell.
- Each family also earns permanent **tower XP** by fighting, controlling enemies, fielding troops, or supporting combat. Research unlocks automatically at 12 XP for tier II and 75/105/135/180 XP for A/B/C/D. Tower XP is never spent; gold still buys each upgrade, and field-training wave requirements still apply. Open **Tower mastery** in the Legacy journal or the selected tower's XP panel.
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

Each stage has timed groups, mini-bosses, and a final boss. Easy and Normal (Medium) start every stage with a small patrol that one base Arrow tower can defeat from a good early site. Hard and Hell use stronger visible openings and reward skill investment, mixed damage, and strategic coverage. Hidden groups arrive after the first clear so ordinary detection can be trained first. Easy, Normal, Hard, and Hell change enemy health/speed, gold income, and keep lives. Stage or difficulty changes start a fresh defense and are unavailable during an active wave.

Victory earns 1–3 stars by lives remaining: three at 90%, two at 50%, one for any other win. Stage records are saved separately by difficulty.

## Legacy, skills, and shop

Open **Legacy & shop** on desktop, **Battlefields → Skill tree & shop**, or the matching settings button.

- Spend earned XP on a connected 100-node tree across ten branches, with three to five ranks per node. Each branch has real forks and joins; connecting lines show requirements, and selecting a node explains its ranks and XP cost.
- Seven capstones provide later XP sinks.
- Earn gems from first clears and improved stars. Unlock Void, Solar, Chrono, Truesight, and Nexus, or buy permanent supply/keep/XP upgrades.
- First three-star clears across Normal award 438 gems; the five premium families together cost 280. Replays award smaller XP rewards without repeated clear gem farming.
- Purchases apply at your next fresh defense. Resetting skills and capstones returns 80% of spent XP and keeps shop purchases.

Progress, stars, XP, gems, ranks, and purchases save in localStorage. Old campaign records migrate. Denied or malformed storage falls back to a playable session. Active battles are not saved. Gems are earned in play; there is no checkout.

## Display and existing artwork

Every map preserves its original aspect ratio and fits completely at 100%. Zoom from 100% to 250%, drag to pan, and press **0** to fit again. Fullscreen and resizing preserve battle state. The field, dock, and wave action stay within desktop, laptop, tablet, and phone viewports; portrait inspection uses a dismissible drawer. Maps have 7–11 named foundations, adding 32 build opportunities across the twelve stages. Placement is permanent: towers and traps cannot relocate; sell and rebuild to change a layout. Sites have no numeric labels.

The 12 stages reuse five existing high-resolution environment illustrations with different wave scripts and economies. All 17 tower families use the new user-provided **30-FPS idle and attack animations**, with matching static portraits. The pack has no separate tier or specialization drawings; size and badges distinguish upgrades. Runtime sheets use 192-pixel cells to reduce decoded image memory and fit 2048-pixel texture limits, with original source files retained. Enemies keep their existing 24-fps walking cycles and seamless scenery loops. Pause and reduced-motion settings are respected.

[Tower artwork](docs/TOWER_ART.md) documents the supplied animation sheets, normalization, and repaired Earth idle sheet. [Asset integration](docs/ASSET_INTEGRATION.md) records source crops, map restorations, walking provenance, and art limitations. [Expansion roadmap](docs/EXPANSION_ROADMAP.md) separates remaining ideas from implemented systems.

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
GAME_URL=http://127.0.0.1:4173/my-first-game/ npm run test:menu
GAME_URL=http://127.0.0.1:4173/my-first-game/ npm run test:mastery
GAME_URL=http://127.0.0.1:4173/my-first-game/ npm run test:tower-clips
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
