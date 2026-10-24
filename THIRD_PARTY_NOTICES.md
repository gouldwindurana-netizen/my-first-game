# Third-party notices

Mossguard includes the following independently licensed runtime components. The application code and generated game artwork have not been assigned an open-source license by this repository; the dependency licenses below do not determine the license of that original work.

| Component | Bundled version | License | Full notice |
| --- | --- | --- | --- |
| [Phaser](https://github.com/phaserjs/phaser) | 3.90.0 | MIT | [LICENSES/phaser-MIT.txt](LICENSES/phaser-MIT.txt) |
| [Cormorant Garamond](https://github.com/CatharsisFonts/Cormorant), distributed by `@fontsource/cormorant-garamond` | 5.3.0 | SIL Open Font License 1.1 | [LICENSES/cormorant-garamond-OFL.txt](LICENSES/cormorant-garamond-OFL.txt) |
| [DM Sans](https://github.com/googlefonts/dm-fonts), distributed by `@fontsource/dm-sans` | 5.3.0 | SIL Open Font License 1.1 | [LICENSES/dm-sans-OFL.txt](LICENSES/dm-sans-OFL.txt) |

The bundled fonts are unmodified, locally hosted Latin webfont files. Their copyright statements and complete OFL license text are included in `LICENSES/`. Phaser's copyright and complete MIT permission/warranty notice are also included there. These notices must accompany redistributed copies, including standalone HTML that embeds these dependencies.

Development tools such as Vite, TypeScript, Vitest, and Playwright retain their respective package licenses. They are used to build and validate the game and are not shipped as runtime dependencies of the HTML sample.

The game does not include assets or source code copied from Kingdom Rush or Bloons TD. Those titles are referenced only to describe familiar gameplay conventions.

## User-provided Mossguard asset pack

The tower/enemy artwork, WAV effects, and matching SVG icons in `src/assets/pack/` came from the user's `Mossguard_Design_and_Assets.zip`. See `docs/ASSET_INTEGRATION.md` and `src/assets/pack/provenance.json` for source mapping and processing notes. Supplied design documents were reference material and were not executed. This notice does not assert a separate license grant for user-provided material.
