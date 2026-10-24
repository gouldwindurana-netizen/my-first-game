# Supplied asset integration

Source: the user's `Mossguard_Design_and_Assets.zip`. Its documents were treated as descriptive reference material, not executable commands. No bundled HTML guide or Python generator was executed.

Integrated assets:

- `art/core-tower-upgrades.png`: all twelve tower images, covering the four existing tower types at levels I, II, and III. Explicit source rectangles select each irregularly spaced subject; the same frames appear in world sprites, build cards, and inspection portraits.
- `art/enemy-roster.png`: the grunt, scout, heavy, and warlord images represent the current grunt, runner, brute, and boss gameplay roles.
- `audio/`: all twelve original WAV cues are bundled and decoded after the sound control is enabled. Game events select construction, upgrade, wave, weapon, death, victory, defeat, and UI cues.
- `ui/`: the supplied SVG icons replace corresponding HUD and action icons. Remaining controls retain the existing vector icons.

Tower/enemy sheets are packaged as lossless WebP. Source hashes, dimensions, and conversion notes are retained in `src/assets/pack/provenance.json`. Full alpha and visible source pixels were verified during conversion. Runtime cropping and bottom-center anchoring avoid changing the supplied pictures or sampling adjacent subjects.

These are static source illustrations. Movement uses position, direction mirroring, and a subtle procedural bob; authored multi-frame animations are not claimed.

The level paintings, proposed campaign JSON, specialist towers, allies, and environment props remain design references. This update retains the tested road, foundations, economy, and 12-wave campaign. The supplied map concepts and blueprint routes describe different layouts; they have not been substituted into the active level.

The supplied provenance document states that the art was generated and the sound/UI files were code-authored. This record does not add a separate ownership claim or license grant for user-provided material.
