# Mossguard — Painted forest ruins / revision 2

17 redesigned tower sprites matching the supplied map's weathered medieval ruins, moss, ivy, aged timber and brass, and blue-and-gold banners. Replaces the previous flat vector artwork.

## Preview
Extract the full ZIP and open preview.html. Choose idle or attack, pause, scrub the 30 frames, or slow playback. tower-catalog.png shows the full collection.

## Contents
- 17 transparent painted PNG masters, up to 424 × 432 pixels.
- 17 transparent 256 × 256 placement sprites in icons/.
- 34 PNG animation sheets: idle + attack for each tower, 30 frames per sheet.
- 1,020 animation frames contained in the sheets; source/export-frames.cjs can export individual PNGs.
- manifest.json, Phaser helpers, and animation build source.

## Animation and placement
256 × 256 frames, 10 columns × 3 rows, row-major. Exactly 30 FPS, 1 second per sequence. Idle loops; attack plays once and returns to idle. The preview repeats attack for inspection. Foundation anchor is (128,230), normalized (0.5,0.8984375).

Masonry stays stationary. Animations use smoothly interpolated light and attack-effect envelopes, with cyclic elemental motes, poison bubbles, electrical arcs, muzzle flashes, sonic waves, and quake rings. These are effect animations composited over stable painted sprites, not individually repainted mechanical or character animation. No optical-flow interpolation is claimed. Idle and attack agree at the loop boundary.

Render at about 80–112 pixels wide and adjust to the map's placement pads. Trap is deliberately much lower. Keep the existing game's attack cooldowns and damage logic separate from visual playback.

## Phaser
Include phaser-integration.js. Call preloadMossguardTowers(this) in preload(), createMossguardTowerAnimations(this) in create(), and addMossguardTower(this, 'archer', x, y). From your firing event, call sprite.play('mg-archer-attack'). Change the ID for other towers. Serve the asset folder from the URL supplied to the loader.

This ZIP contains replacement assets; it does not modify the compiled mossguard.html. Base towers only; upgrade branches are not separate artworks.

## Rebuild / export
Node.js with @napi-rs/canvas and sharp is required for regeneration. Run `node source/build.cjs` to rebuild from masters. Run `node source/export-frames.cjs` to extract all frames. The preview itself needs no dependencies or server.

## Artwork production
Painted tower masters were created with the built-in image-generation tool using the supplied game screenshot as camera, lighting and material reference. Each of the 17 tower identities received its own generation request. See source/art-direction.txt for the prompt specification. The animation source preserves the generated alpha channel and normalizes each silhouette to a shared ground anchor.
