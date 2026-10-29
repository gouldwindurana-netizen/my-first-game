# Mossguard expansion roadmap

The current gameplay expansion implements the later combat, troop, campaign, and progression request. [GAMEPLAY.md](GAMEPLAY.md) describes the shipped rules; remaining items below are planned work.

## Implemented

- Main menu with session resume and campaign navigation; connected branching skill tree with preserved saved ranks.
- Compact combat HUD, a filtered tower palette, contextual tower inspection, Scout counter information, and secondary tools behind a menu. [TD_REFERENCES.md](TD_REFERENCES.md) records the bounded design comparison and external-source access limits.
- Supplied 30-FPS idle and attack clips for all seventeen tower families, with matching static portraits, mobile-sized runtime sheets, and a recovered Earth idle sheet.
- Permanent family XP and automatic upgrade research, a seventeen-family research journal, combat/support/troop credit, and duplicate-safe saves separate from skill XP. Researched upgrades require gold and have no wave-number or per-placement age locks.
- Ordinary Arrow/Ice detection upgrades, visible opening patrols, affordable nongem counters, and scout-report preparation advice.
- Sixteen named build sites on every stage; permanent tower placement; one-Arrow Easy/Normal opening waves on every stage.
- Seventeen tower families, five earned-gem unlocks, and A/B/C specializations plus Hell-only D branches.
- Physical and elemental damage, armor, resistances, weaknesses, tree-blocked direct fire, and targeted/area/piercing/chain attacks.
- Slow, burn, poison, stun, root, knockback, curse, armor shred, reveal, silence, and tower support auras.
- Barracks soldiers with movement, rally points, nearest-enemy engagement, melee blocking, retaliation, returning, and respawn.
- Limited-use road traps and rearming, with permanent placement.
- Forty enemy types with model-backed weaknesses, resistances, and recommended tower counters. Advanced Hard/Hell types add warded troops, aerial fire beasts, hidden spirits, healers, summoners, assassins, and control-immune champions.
- Twelve stages with 25/50/75/100 waves per stage on Easy/Normal/Hard/Hell, deterministic regional formations, introductory lessons, fifth-wave champions, final boss assaults, optional automatic waves, and Scout previews.
- Saved per-difficulty stars, account/family XP, gems, and best waves through 100; 100 ranked skill nodes across ten branches; seven capstones; and a permanent gem shop. Existing stars, purchases, and ranks are preserved.
- Four original articulated walking families with 24-fps interpolated frames; five proportional high-resolution map illustrations with periodic interpolated scenery.
- Responsive fullscreen, named foundation controls without numeric labels, targeting, research-and-gold upgrades, speed controls, unit preview, and automated balance/browser checks.

## Next visual pass

Tower families now use the supplied thirty-frame idle/attack sheets. The pack has no separate tier or branch art, so upgrades use size and badge cues. Forty enemy identities and the troops still share four existing walking families, with role/status overlays; this update does not ship forty distinct enemy animations. Planned visual work includes dedicated tier/specialization drawings, distinct troop/enemy art, additional walk/attack/defeat cycles, and unique artwork for the twelve stage themes.

## Other planned ideas

- Elemental combination reactions, adjacency bonuses, expanded spells, and movable hero commanders.
- Configurable tower loadouts, per-wave damage reports, route arrows, build undo, and fuller touch previews.
- Multi-phase boss telegraphs and biome events such as fog, bridges, vents, weather, and terrain hazards.
- Relic choices, endless mode, seeded daily challenges, achievements, further tower-mastery rewards, cosmetics, and prestige.
- Music/ambience, more audio/performance/accessibility settings, versioned save import/export, and installable offline PWA support.

Future features need matching rules, useful controls, art, and reproducible checks before they are described as playable.
