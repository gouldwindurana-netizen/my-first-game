# Painted 30 FPS tower artwork

All 17 tower families use the user's `Mossguard_17_Towers_Painted_30FPS (1).zip`,
painted forest-ruins revision 2, integrated on 2026-10-29. Each source ID matches
its catalog ID directly. Build cards, inspection portraits, and placed defenses
use the supplied painted design. Weathered stone, moss, timber, brass, and banners
match the existing fantasy maps.

- Runtime images: `src/assets/towers/animated/runtime/` — 34 lossless WebP sheets, 1920 × 576, with 192 × 192 cells.
- Static portraits: `src/assets/towers/animated/portraits/` — 17 small WebPs derived from the supplied placement icons.
- Original placement icons: `src/assets/towers/animated/icons/` — 17 transparent 256 × 256 PNGs.
- Original painted masters: `src/assets/towers/animated/masters/` — 17 PNGs retained as source artwork.
- Original animation sheets: `src/assets/towers/animated/sheets/` — 34 transparent PNGs.
- Source metadata: `src/assets/towers/animated/manifest.json`.
- Review catalog: `src/assets/towers/animated/tower-catalog.png`.
- Source checksums: `src/assets/towers/animated/provenance.json`.
- Normalization measurements and output checksums: `src/assets/towers/animated/normalization.json`.
- Authorized-use record: `src/assets/towers/animated/USER_ASSET_NOTICE.txt`.

Each source sheet is 2560 × 768 pixels: ten columns and three rows of 256 × 256
cells. Both idle and attack contain 30 frames at 30 FPS. Idle loops; a genuine
attack starts its one-second clip, then returns to idle. Another attack restarts
the clip. Barracks use their troops' actual attack events to cue their attack
clip. Visual playback does not change attack cooldowns, damage, or other combat
rules. The shared placement anchor is `(0.5, 0.8984375)`, the source ground point
`(128, 230)`. Construction and upgrade feedback remain separate effects.

The painted masonry stays stationary. Smooth light envelopes and cyclic elemental
motes, poison bubbles, electrical arcs, muzzle flashes, sonic waves, and quake
rings animate inside the cells. The pack composites these effects over stable
painted sprites; it does not supply individually repainted mechanical or character
motion, and it does not claim optical-flow interpolation. Idle and attack agree
at their loop boundary.

Idle follows the scene's presentation clock and attacks follow its combat clock;
both freeze on pause. Combat speed affects attack playback alongside simulation.
Reduced motion holds the first idle frame and disables decorative particles.
The existing enemy walking frames remain at 24 FPS.

The archive supplies one painted design per family, with **no separate tier or
branch artwork**. All levels use the matching clips. Size, level pips, branch
badges, and upgrade effects continue to show progression. Tier-specific reveal
lanterns and lenses from the older atlas are not additional drawings in this pack.

| Catalog ID | Supplied painted identity |
| --- | --- |
| `archer` | Crenellated stone watchtower and mounted crossbow. |
| `cannon` | Bronze-and-iron cannon on a stone bastion and oak carriage. |
| `mortar` | Short upward-tilted bronze mortar in a masonry emplacement. |
| `frost` | Mossy shrine and pale blue ice crystals. |
| `earth` | Stacked stone totem with a carved face, roots, and moss. |
| `arcane` | Ruined wizard tower, violet crystal, and ritual crown. |
| `tesla` | Copper coils, bronze braces, and blue-white electrical terminal. |
| `venom` | Alchemist tower with copper pipes and green poison vats. |
| `prism` | Stone pedestal, brass focusing frame, and opalescent prism. |
| `trap` | Low circular pressure trap with steel teeth and bronze mechanisms. |
| `sonic` | Stone-and-oak mounting with a curved bronze acoustic horn. |
| `barracks` | Stone military gatehouse with a wooden door, roof, and pennants. |
| `void` | Cracked charcoal obelisk, violet fissures, and dark orb. |
| `solar` | Stone shrine, bronze sun crown, and golden core. |
| `chrono` | Mossy clock tower, brass clock face, hourglass, and gears. |
| `truesight` | Stone lookout and eye lens in a brass arch. |
| `nexus` | Ancient stone tower and a cluster of colored arcane crystals. |

The source images and metadata were extracted byte-for-byte after checking ZIP
paths and symlinks. The 72 admitted source files comprise 34 sheets, 17 icons,
17 masters, the catalog, manifest, README, and art-direction text. The four bundled
JavaScript/HTML files were excluded. No bundled generator, integration script, or
preview was executed. The supplied README attributes the painted masters to image
generation using the user's map screenshot as a camera, lighting, and material
reference; the retained art-direction document records that source description.
No new image generation or semantic artwork modification was applied here.

Runtime copies use ImageMagick Lanczos downsampling to 75% and lossless WebP
encoding. The 1920-pixel sheets fit a 2048-pixel WebGL texture limit and reduce
decoded tower-sheet memory from 255 to 143 MiB. Small separate portraits derived
from the supplied icons avoid decoding full animation sheets again in the DOM.
The shared ground anchor, transparency, cell layout, and 30 FPS cadence are
retained. Original PNGs are tracked without runtime imports. Every PNG fully
decoded, including Earth idle; this painted revision requires no reconstructed
sheet. Commands, input/output hashes, and dimensions are recorded in the
normalization metadata.

The previous flat 30 FPS pack and its Earth-sheet repair remain in Git history.
The older 51-frame SVG atlas and its original CC0 notice remain tracked as
historical source material and are no longer loaded. That CC0 notice does not
cover the supplied painted pack. This archive has no separate license file, so
its authorized-use notice records the user's integration request without assigning
a new license. Maps, enemy art, walking cycles, and audio keep their existing
sources and notices.
