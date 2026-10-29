# Tower-defense design references

This update uses a representative comparison across six tower-defense franchises,
including Bloons TD5 and TD6. It does not claim to survey every tower-defense game.
The goal is to make Mossguard's controls and enemy matchups understandable while
retaining its own fantasy setting, supplied art, and combat rules.

## Evidence and source boundary

On 28 October 2026, requests for the publisher-managed Steam descriptions and the
official developer pages below were rejected by the cloud network proxy with
`403 Forbidden`. No current external screenshot or page content was inspected.
The comparisons below describe familiar design patterns from general game
knowledge, not a verified account of the latest release of each game. The links
are reference locators, not evidence that those pages were accessible in this run.
No reference-game images, interface assets, code, characters, or text were copied.

| Reference | Publisher/store locator | Pattern informing Mossguard |
| --- | --- | --- |
| Bloons TD5 | [Steam](https://store.steampowered.com/app/306020/) | Keep lives, cash, round count, build selection, and round controls easy to find. Inspect upgrades through the selected tower. |
| Bloons TD6 | [Steam](https://store.steampowered.com/app/960090/) · [Ninja Kiwi](https://ninjakiwi.com/Games/Mobile/Bloons-TD-6.html) | Give special enemy properties recognizable counters and keep progression separate from the current defense's purchase currency. |
| Kingdom Rush | [Steam](https://store.steampowered.com/app/246420/) · [Ironhide](https://www.ironhidegames.com/Games/kingdom-rush) | Use clear build sites, contextual tower commands, readable ranges, and complementary physical, magical, artillery, and troop roles. |
| Defense Grid: The Awakening | [Steam](https://store.steampowered.com/app/18500/) · [Hidden Path](https://www.hiddenpath.com/games/defense-grid-the-awakening/) | Make coverage and placement the main activity; keep strategic controls compact and predictable around the playfield. |
| GemCraft: Chasing Shadows | [Steam](https://store.steampowered.com/app/296490/) · [Game in a Bottle](https://www.gameinabottle.com/) | Let long defenses develop through varied wave formations and preparation decisions, rather than only increasing enemy health. |
| Infinitode 2 | [Steam](https://store.steampowered.com/app/937310/) · [Developer site](https://infinitode.prineside.com/) | Explain tower effectiveness against enemy classes and distinguish persistent research from battle construction costs. |
| Element TD 2 | [Steam](https://store.steampowered.com/app/1018830/) · [Developer site](https://www.eletd.com/games/element-td-2/) | Make elemental strengths and weaknesses consistent enough to plan a mixed defense before the next group arrives. |

## Changes selected for this update

These are implementation goals for this work, not a claim that all mechanics of
the reference games have been reproduced. The current rules and exact prices are
documented in [GAMEPLAY.md](GAMEPLAY.md).

1. **One combat HUD.** Lives, battle gold, wave count, pause, speed, and the menu
   belong in one compact strip. The website header, repeated chapter heading,
   footer shortcuts, empty command card, and permanent minimap should not compete
   with the battlefield. Secondary tools belong in menus or a tactical toggle.
2. **Contextual building and upgrading.** A compact tower palette starts placement;
   selecting a built tower opens its commands, range, upgrades, sale value, and
   targeting. Closing inspection returns the space to the battlefield. Permanent
   tower research and gold determine upgrade availability; a wave-number lock does
   not belong in this interaction.
3. **A useful scout report.** Preview enemy counts, meaningful traits, actual
   strengths or weaknesses, and named available counters. A warning should explain
   what the player can buy, not require recognition of an unfamiliar enemy name.
   Detection advice must include ordinary gold options even when premium Truesight
   is locked.
4. **Enemy typing with consequences.** Armor favors elemental damage; clustered
   light enemies favor splash; fast enemies reward control and coverage; flyers
   require anti-air; regenerators reward sustained damage or burn; support units
   reward priority targeting and silence. Elemental resistances and weaknesses
   must affect damage in the model, and the interface must describe the same rules.
5. **Long waves with a readable learning curve.** Each stage has 25 Easy, 50 Normal,
   75 Hard, or 100 Hell waves. Early formations teach ordinary counters before
   mixing them. Hard and Hell add more advanced enemy kinds and combinations, not
   merely larger health multipliers. Mini-bosses and final bosses provide clear
   milestones. Easy and Normal retain the opening one-Arrow defense.
6. **Room for a mixed defense.** More named foundations create coverage and
   composition choices over the longer defense. Clear sites and usable range
   indicators matter more than decorative controls; sites retain their names and
   have no numeric map labels. Phone controls must remain reachable without
   covering the road with permanent text panels.

## Deliberately outside this update

Full route-building/mazing, copied radial menus, hero-control systems, gem fusion,
daily challenges, competitive rankings, alternate currencies, endless mode, and a
recreation of another game's exact elemental wheel are separate design work.
Adding all of them would obscure the requested improvements to wave length,
counterplay, upgrade freedom, and the combat interface.

## Acceptance checks

- All twelve stages produce the requested wave count for every difficulty, with
  predictable generation, bounded groups, and a final boss.
- Enemy variety and combinations grow by wave and difficulty; a resistance or
  weakness shown in the scout report agrees with actual damage behavior.
- Every required enemy mechanic has an ordinary available counter and a plausible
  preparation budget; premium unlocks are optional.
- A researched tower can be upgraded whenever the player can afford it, including
  a newly placed tower, without first clearing a particular numbered wave.
- Normal play shows the battlefield, a compact critical HUD, a build palette, and
  the wave action. Inspection and secondary information are disclosed on demand.
- Desktop, laptop, portrait phone, landscape phone, and fullscreen preserve readable
  controls, usable touch targets, and access to the visible map.
