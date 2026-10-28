# Supplied 30 FPS tower artwork

All 17 tower families use the user's `Mossguard_17_Towers_30FPS.zip`. Each source
ID matches its catalog ID directly. Build cards, inspection portraits, and placed
defenses use the same supplied design; no family aliases or recolors are needed.

- Runtime images: `src/assets/towers/animated/runtime/` — 34 lossless WebP sheets, 1920 × 576, with 192 × 192 cells.
- Static portraits: `src/assets/towers/animated/portraits/` — 17 small first-idle-cell WebPs.
- Normalization measurements and checksums: `src/assets/towers/animated/normalization.json`.
- Original images: `src/assets/towers/animated/sheets/` — 34 transparent PNG sheets.
- Source metadata: `src/assets/towers/animated/manifest.json`.
- Review catalog: `src/assets/towers/animated/tower-catalog.png`.
- Source and output checksums: `src/assets/towers/animated/provenance.json`.
- Authorized-use record: `src/assets/towers/animated/USER_ASSET_NOTICE.txt`.

Each sheet is 2560 × 768 pixels: ten columns and three rows of 256 × 256 cells.
Both idle and attack contain 30 authored frames at 30 FPS. Idle loops; a genuine
attack starts its one-second clip, then returns to idle. Another attack restarts
the clip. Barracks use their troops' actual attack events to cue their banner clip.
The shared placement anchor is `(0.5, 0.82)`. Equipment and energy move inside the
cells while the foundation stays fixed. Projectiles begin at a measured outlet
for each family. Construction and upgrade feedback remain separate effects.

Idle follows the scene's presentation clock and attacks follow its combat clock;
both freeze on pause. Combat speed affects attack playback alongside simulation.
Reduced motion holds the first idle frame and disables decorative particles.
The existing enemy walking frames remain at 24 FPS.

The archive supplies one design per family, with **no separate tier or branch
artwork**. All levels use the matching clips. Size, level pips, branch badges, and
upgrade effects continue to show progression. Tier-specific reveal lanterns and
lenses from the older atlas are no longer visual claims of this artwork.

| Catalog ID | Supplied visual identity |
| --- | --- |
| `archer` | Stone watchtower with a bow and upright arrow. |
| `cannon` | Slanted cannon barrel on a geared mounting. |
| `mortar` | Upright bombard barrel. |
| `frost` | Large angular ice crystal and smaller shards. |
| `earth` | Cracked stone head. |
| `arcane` | Violet spire with a glowing core and orbit ring. |
| `tesla` | Electrical coil and blue terminal. |
| `venom` | Two green chemical flasks. |
| `prism` | Suspended two-color diamond prism. |
| `trap` | Low circular plate and raised spikes. |
| `sonic` | Angled horn with a violet outlet. |
| `barracks` | Green-roofed garrison, doorway, and banner. |
| `void` | Dark obelisk with a violet crack and orbit ring. |
| `solar` | Bright sun disk and rays. |
| `chrono` | Large clock face with moving hands. |
| `truesight` | Eye-shaped observatory. |
| `nexus` | Multi-element crystal and orbital rings. |

The source images and metadata were extracted byte-for-byte after checking ZIP
paths and symlinks. Runtime copies use ImageMagick Lanczos downsampling to 75%
and lossless WebP encoding. The 1920-pixel sheets fit a 2048-pixel WebGL texture
limit and reduce decoded tower-sheet pixels from 255 to 143 MiB. Small separate
portraits avoid decoding full sheets again in the DOM. The shared anchor, 30 FPS
clips, and artwork are retained. Original PNGs are tracked without runtime imports.

The supplied `earth_idle.png` is internally truncated despite a valid ZIP CRC.
Its 30 complete individual PNG frames were extracted from the same archive and
reassembled in their original row-major layout before normalization. All 30 cells
were compared with their original frames. Other sheets fully decoded without repair.
The repair inputs, commands, dimensions, and hashes are recorded in `normalization.json`. Pack documents were descriptive references; no bundled code,
generator, or preview was executed. No image generation or semantic artwork modification
was applied. There is no separate license file in the archive, so this integration
does not assign a new license to the supplied artwork.

The previous 51-frame SVG atlas and its original CC0 notice remain tracked as
historical source material. They are no longer loaded by the game. Their CC0
notice does not cover the supplied PNG pack. Maps, enemy art, walking cycles,
and audio keep their existing sources and notices.
