# Supplied asset integration

Source: the user's `Mossguard_Design_and_Assets.zip`. Its documents were treated as descriptive reference material, not executable commands. No bundled HTML guide or Python generator was executed.

Integrated assets:

- `art/core-tower-upgrades.png`: all twelve tower images, covering the four existing tower types at levels I, II, and III. Explicit source rectangles select each irregularly spaced subject; the same frames appear in world sprites, build cards, and inspection portraits.
- `art/specialist-towers-and-allies.png`: the upward-barrel mortar, copper Tesla coil, and green venom lab are cropped into a compact alpha atlas. Each has one supplied illustration; levels I–III reuse it with size, pips, and upgrade effects.
- `art/level-concepts-01.png` and `art/level-concepts-02.png`: four caption-free panels supply Frostbound Pass, Ember Chasm, Mirewood Causeway, and Crystal Hollow. Source rectangles and hashes are recorded, and independently traced routes/foundations follow the painted roads. No numbers are baked into these maps.
- `art/enemy-roster.png`: the grunt, scout, heavy, and warlord images represent the current grunt, runner, brute, and boss gameplay roles.
- `audio/`: all twelve original WAV cues are bundled and decoded after the sound control is enabled. Game events select construction, upgrade, wave, weapon, death, victory, defeat, and UI cues.
- `ui/`: the supplied SVG icons replace corresponding HUD and action icons. Remaining controls retain the existing vector icons.

Tower/enemy sheets are packaged as lossless WebP. Source hashes, dimensions, and conversion notes are retained in `src/assets/pack/provenance.json`. Full alpha and visible source pixels were verified during conversion. Runtime cropping and bottom-center anchoring avoid changing the supplied pictures or sampling adjacent subjects.

These are static source illustrations. The renderer animates them procedurally: role-specific strides and grounded squash/lean, direction mirroring, weapon-specific recoil, crystal orbits, construction and upgrade effects, hit flashes, and short defeat fades. No authored multi-frame sprite strips are claimed. A pausable simulation-linked clock controls poses and bounded effects (160 particles and 30 defeat ghosts maximum). Reduced motion keeps the original artwork still while retaining combat feedback.

The original Eldervale road, economy, and twelve waves remain intact. Each new map has its own traced route, named foundation positions, starting treasury, and eight themed waves. The proposed campaign JSON, unused map panels, remaining specialist concepts, allies, and environment props remain reference material. Their numeric suggestions and document instructions were not imported as commands or blindly substituted into the tested rules.

The supplied provenance document states that the art was generated and the sound/UI files were code-authored. This record does not add a separate ownership claim or license grant for user-provided material.
