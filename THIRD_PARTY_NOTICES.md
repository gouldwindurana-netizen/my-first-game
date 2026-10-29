# Third-party notices

Mossguard includes the following independently licensed runtime components. The application code and earlier game artwork have not been assigned an open-source license by this repository; the dependency licenses below do not determine the license of that original work. The previous original SVG tower atlas has its own CC0 dedication; the currently loaded user-provided PNG tower pack has a separate source notice, described below.

| Component | Bundled version | License | Full notice |
| --- | --- | --- | --- |
| [Phaser](https://github.com/phaserjs/phaser) | 3.90.0 | MIT | [LICENSES/phaser-MIT.txt](LICENSES/phaser-MIT.txt) |
| [Cormorant Garamond](https://github.com/CatharsisFonts/Cormorant), distributed by `@fontsource/cormorant-garamond` | 5.3.0 | SIL Open Font License 1.1 | [LICENSES/cormorant-garamond-OFL.txt](LICENSES/cormorant-garamond-OFL.txt) |
| [DM Sans](https://github.com/googlefonts/dm-fonts), distributed by `@fontsource/dm-sans` | 5.3.0 | SIL Open Font License 1.1 | [LICENSES/dm-sans-OFL.txt](LICENSES/dm-sans-OFL.txt) |

The bundled fonts are unmodified, locally hosted Latin webfont files. Their copyright statements and complete OFL license text are included in `LICENSES/`. Phaser's copyright and complete MIT permission/warranty notice are also included there. These notices must accompany redistributed copies, including standalone HTML that embeds these dependencies.

Development tools such as Vite, TypeScript, Vitest, and Playwright retain their respective package licenses. They are used to build and validate the game and are not shipped as runtime dependencies of the HTML sample.

The game does not include assets or source code copied from Kingdom Rush or Bloons TD. Those titles are referenced only to describe familiar gameplay conventions.

## Original tower artwork

The previous 51 original code-authored tower frames in `src/assets/towers/` are dedicated under CC0-1.0 and remain tracked as historical source material. See `src/assets/towers/LICENSE.txt` and `provenance.json`. The static site includes this notice as `LICENSES/role-towers-CC0.txt`, and the standalone HTML embeds it. This dedication applies only to those original SVG assets; it does not cover the supplied PNG pack or other project files.

## User-provided Mossguard asset pack

The tower/enemy artwork, WAV effects, and matching SVG icons in `src/assets/pack/` came from the user's `Mossguard_Design_and_Assets.zip`. See `docs/ASSET_INTEGRATION.md` and `src/assets/pack/provenance.json` for source mapping and processing notes. Supplied design documents were reference material and were not executed. This notice does not assert a separate license grant for user-provided material.

## User-provided 30 FPS tower animations

The current tower visuals are normalized lossless WebP copies of the painted PNG artwork from the user's `Mossguard_17_Towers_Painted_30FPS (1).zip`, explicitly authorized by the user for integration on 2026-10-29. Original sheets, placement icons, painted masters, metadata, and checksums are in `src/assets/towers/animated/`. The supplied README attributes the painted masters to image generation using the user's map screenshot as a visual reference. The archive supplies no separate license file; this record does not assert a new ownership claim or license grant. See `USER_ASSET_NOTICE.txt` and `provenance.json` in that directory. The static build includes the notice as `LICENSES/mossguard-supplied-towers.txt`, and standalone HTML embeds the notice, provenance, and normalization record. The earlier 30 FPS pack remains in Git history. The original SVG atlas's CC0 dedication does not apply to either user-supplied tower pack.
