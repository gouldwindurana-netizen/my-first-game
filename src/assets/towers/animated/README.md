# Mossguard — 17 tower animation assets

New stylized vector designs matched to the 17 base tower identities in the supplied mossguard.html. These are an asset pack, not a modified game. Upgrade branches and tier variants are not separate designs in this pack.

Open preview.html after extracting the entire ZIP. It works locally without a web server. Choose idle/attack, pause, scrub, or slow down playback. tower-catalog.png shows all designs.

## Contents
- 34 transparent PNG sprite sheets: idle + attack for every tower.
- 1,020 individual transparent PNG frames.
- Editable SVG sheets and 17 individual SVG designs.
- manifest.json with IDs, paths, dimensions, frame timing, and anchor.
- phaser-integration.js with preload, animation registration, and sprite helpers.
- source/build_assets.py to reproduce the assets (Python, Pillow, Inkscape).

## Timing and layout
Every animation contains 30 frames sampled at 30 FPS, lasting exactly one second. Sheets are 10 columns × 3 rows, row-major, 2560 × 768 pixels; each frame is 256 × 256. Frame duration is 1/30 second. Playback index is floor(elapsedSeconds * 30). Idle wraps modulo 30; attack plays once and returns to idle. Attack is deliberately looped in the preview for inspection.

Animation is generated from smoothly interpolated transform/effect keyframes (smoothstep), with continuous cyclic rotations for orbiting elements. This is geometric interpolation, not optical-flow interpolation of painted images. The foundation remains fixed; mechanical recoil, floating crystals, flags, clock hands, energy pulses and orbiting particles animate as appropriate. Start/end poses match at t=0 and t=1; frame 30 is omitted to avoid duplicating the loop boundary.

All towers use a shared placement anchor: (128, 209.92), normalized (0.5, 0.82). Recommended game display width: 80–112 pixels, adjusted to your map. Supplied shadows are translucent; the surrounding canvas is fully transparent. PNGs use straight alpha.

## Integration
Load phaser-integration.js before using its helpers. Call preloadMossguardTowers in scene.preload, createMossguardTowerAnimations in scene.create, then addMossguardTower(scene, 'archer', x, y). Trigger the attack animation from your existing attack event. Keep all simulation, cooldowns and targeting in your existing game code. The source HTML is a compiled bundle, so no automatic replacement of its internal renderers is included.

## Regeneration
Run `python source/build_assets.py` from this extracted folder. It requires Pillow and the Inkscape CLI in PATH. The SVGs are the editable artwork masters; PNGs are their raster exports.
