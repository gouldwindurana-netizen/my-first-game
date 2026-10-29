# Combat and progression

Mossguard has 12 stages, 17 tower families, 68 specializations, and 40 enemy types. Every stage has 25 Easy, 50 Normal, 75 Hard, or 100 Hell waves and 14–16 named foundations on curated land. Each tower family uses the supplied painted forest-ruins design and 30-FPS idle and attack effect sheets. Matching portraits come from the supplied icons. Masonry stays stationary while light, particles, and firing effects animate. The pack has one appearance per family; tier size and badges identify upgrades. The campaign uses five map illustrations and four enemy walking families with role/status overlays, rather than forty unique enemy animation strips.

## Navigation

Start from the main menu to choose a stage, continue saved campaign progress, train skills, adjust settings, or read the guide. The Home button returns to the title screen and pauses the current defense; Resume keeps the existing towers, enemies, gold, and wave. Child dialogs opened from the main menu close back to it. Main-menu controls gate battlefield pointers and hotkeys.

The combat HUD keeps the stage, lives, gold, wave, menu, pause, and speed together above the battlefield. The command palette filters towers by All towers, Damage, Control, Support, or Premium, alongside the wave action, Scout report, and Starfall. It moves to the right on short landscape screens to give the map more height. A tower's inspection panel opens only when selected. Battle tools hold zoom/fullscreen, tactical ranges, battlefields, settings, Legacy/research, and the guide. The website header, repeated mission heading, footer, permanent minimap, and side rail are not part of the active combat layout. These choices are explained in [TD_REFERENCES.md](TD_REFERENCES.md); the external reference pages were unavailable to live inspection in this cloud session.

During placement, **Place on battlefield** collapses the named-site panel while keeping the selected tower ready for a map click. **Cancel** or Escape cancels placement. Pausing puts tower details and Battle tools away so Resume stays reachable; resuming restores the selected tower's details.

## Combat

First targets the furthest enemy along the route. Strongest uses current health; Fastest includes active slows and stuns. Last remains available as an extra priority. Physical attacks meet armor and physical resistance; elemental attacks meet their matching resistance. Negative resistance is a weakness. Before other damage modifiers, the multiplier is `(1 - physical armor) × (1 - resistance)`; elemental damage skips the armor factor. Armor shred reduces the physical armor term. Resistance is bounded from -75% to 90%. Direct shots require a clear segment past tree circles; mortar shells, ground quakes, sonic waves, melee, and path traps bypass that direct-fire check. Tactical view marks tree cover.

Counter advice is backed by the same catalog used for damage. For example, an Ember Imp takes 1.5× Ice damage but only 0.2× fire damage. A Rune Warden takes 1.3× physical damage and only 0.2× arcane damage. A Crystalwing takes 1.45× lightning damage and flies above cannon, mortar, Earth, traps, and soldiers. Tower matchup summaries and Scout reports identify useful targets, resistant enemies, and actual traits; support, splash, detection, and control can be useful even when their direct damage is low.

Slows, burn, poison, stun, roots, curse, armor shred, and knockback expire on simulation time. Control-immune enemies ignore movement control. Bats and Bone Dragons fly over melee and ground-only weapons. Arrow Tier II **Lantern Sentries** adds reveal for 55g, and Ice Tier II **Aurora Lens** adds it for 65g. Revealed enemies can be attacked by allied towers while inside detection coverage; these upgrades retain reveal after specialization. Base Magic (160g) and Prism (190g) offer immediate detection without training or gems. Sonic C **Echo Observatory** adds long-range sonar and pushback, replacing its duplicate support aura. Premium Truesight specializes in ghosts. Wraiths bypass melee blockers. Enemy support can heal, summon, regenerate, strengthen allies, chill soldiers, teleport, or disrupt towers. Tower wards absorb an ability hit before breaking.

## Troops and traps

Barracks soldiers walk to a rally point, pursue the nearest eligible ground enemy nearby, block and fight in melee, take retaliation, and return to their rally point. Fallen troops respawn after eight seconds. Select a barracks and choose **Set soldier rally point**, then click near the road.

Path traps snap to the road, need 24 units of separation, and have a maximum of eight active placements. Their four base charges do not regenerate. Select an exhausted trap to rearm for 63 gold (45% of its base cost). Upgrades preserve spent charges while adding any extra capacity. Named foundations offer nearby-road shortcuts; a trap never occupies a tower foundation. Towers and traps remain at their chosen positions. To change a layout, sell and rebuild; barracks rally orders only move soldiers.

## Tower upgrades

Build a base tower with gold. Each family now earns permanent practice XP, separate from the account XP spent on skills. Its upgrades research automatically at these cumulative thresholds; XP is never spent:

| Research | Family XP |
| --- | --- |
| Tier II | 12 |
| A specialization | 75 |
| B specialization | 105 |
| C specialization | 135 |
| D specialization | 180; purchase also requires Hell |

A genuine tower attack awards one practice XP. Each actively engaged tower earns another 0.5 XP per combat second; this includes eligible control, troop, reveal, and support participation. A family that participated in a successfully cleared wave gains eight XP once, regardless of how many copies were built. Idle, paused, disabled, exhausted traps, and weapons unable to engage a target do not train. Family XP is shared by that tower type across placements, levels, losses, and replays. It does not unlock premium families or spend account XP/gems.

Researched upgrades cost gold and have **no wave-number, completed-wave, or per-placement age requirement**. A newly placed tower can immediately buy tier II and a researched specialization if both purchases are affordable. Research also progresses during an active wave, so an upgrade can become available before a wave ends. A–C work in every difficulty; D additionally requires Hell. Arrow specialization prices are 190g/185g/205g/260g for A/B/C/D: the 300g training treasury cannot buy the base Arrow, tier II, and a full specialization immediately. The selected tower's XP panel opens **Tower mastery** to show all five milestones, effects, and gold costs. Premium gems unlock a family; using it earns its upgrade research.

| Family | Base / tier II gold | A | B | C | D · Hell |
| --- | --- | --- | --- | --- | --- |
| Arrow tower | 80 / 55 | Longbow Citadel | Rapid Archer | Sniper Post | Arrow Storm |
| Cannon | 100 / 75 | Piercing Rounds | Gatling Gun | Rail Cannon | Siege Engine |
| Mortar | 130 / 95 | Demolition Keep | Cluster Battery | Artillery Fort | Carpet Bomber |
| Ice shrine | 90 / 65 | Crystal Glacier | Cryo Sniper | Blizzard Core | Absolute Zero |
| Earth tower | 200 / 145 | Seismic Ravager | Landslide Tower | Tectonic Engine | World Breaker |
| Magic spire | 160 / 115 | Wizard Tower | Dark Sorcerer | Arcane Battery | Grand Mage |
| Tesla coil | 180 / 135 | Tesla Overlord | EMP Tower | Lightning Rod | Thunderlord |
| Poison lab | 150 / 105 | Miasma Silo | Plague Engine | Acid Tower | Viral Core |
| Prism beacon | 190 / 145 | Celestial Beacon | Divine Shield | Radiant Pillar | Archangel |
| Path trap | 140 / 100 | Entrapment Forge | Bomb Trap | Net Tower | Deathtrap |
| Sonic tower | 170 / 125 | Acoustic Annihilator | Frequency Tower | Echo Observatory | Dissonance Core |
| Barracks | 110 / 85 | Imperial Garrison | Shadow Rangers | Titan Guard | Elite Legion |
| Void obelisk · 45 gems | 190 / 120 | Event Horizon | Singularity | Oblivion Beam | True Void |
| Solar tower · 50 gems | 160 / 130 | Solar Wind | Nova Burst | Eclipse | Supernova |
| Chrono spire · 55 gems | 150 / 125 | Temporal Lock | Dilation Field | Paradox | Time Stop |
| Truesight watch · 40 gems | 130 / 100 | Piercing Sight | Wraith Hunter | Mind Spike | Omniscience |
| Nexus · 90 gems | 280 / 200 | Convergence | Starfall Nexus | Event Cascade | Genesis |

## Enemy guide

The in-game Legacy journal lists all forty enemies with armor, elemental defenses, movement roles, abilities, and recommended counters. Scout reports show upcoming groups and their counters. Base values below grow with wave and difficulty. Champion entries have 80% extra health.

| Enemy | Health | Speed | Armor | Lives leaked | Traits |
| --- | --- | --- | --- | --- | --- |
| Goblin | 52 | 48 | 0% | 1 | Ground |
| Goblin runner | 37 | 81 | 0% | 1 | Ground |
| Veil scout | 45 | 73 | 5% | 1 | Ground; stealth; Hidden until revealed or close to the keep. |
| Goblin raider | 82 | 59 | 12% | 1 | Ground; Can dodge direct attacks; area damage remains reliable. |
| Cave bat | 43 | 78 | 0% | 1 | Flying; Flies above melee troops and ground traps. |
| Heavy | 165 | 35 | 35% | 2 | Ground |
| Shieldbearer | 220 | 34 | 60% | 2 | Ground |
| Ogre | 390 | 29 | 20% | 3 | Ground |
| Troll | 330 | 32 | 15% | 3 | Ground; Regenerates health while not burning. |
| Stone Golem | 520 | 24 | 65% | 3 | Ground; control immune; Immune to roots, stuns, slows, and forced movement. |
| Juggernaut | 700 | 27 | 50% | 4 | Ground; control immune; Crowd-control immune armored vanguard. |
| Iron Sentinel | 580 | 30 | 70% | 3 | Ground |
| Shaman | 145 | 39 | 5% | 2 | Ground; Periodically heals nearby living enemies. |
| Necromancer | 190 | 34 | 5% | 2 | Ground; Periodically summons skeletons until silenced. |
| Storm Conduit | 210 | 38 | 10% | 2 | Ground; Storm surges briefly disrupt a nearby tower; silence prevents them. |
| Frost Wight | 240 | 36 | 15% | 2 | Ground; Chills nearby soldiers, reducing their attack rate. |
| Voidling | 150 | 49 | 5% | 2 | Ground; Teleports forward and splits into two goblins on death. |
| Skeleton | 72 | 46 | 20% | 1 | Ground |
| Dark Knight | 420 | 35 | 50% | 3 | Ground |
| Shadow Wraith | 190 | 63 | 15% | 2 | Ground; stealth; ghost; A hidden ghost that slips through melee blockers. |
| Warlord | 1050 | 30 | 40% | 5 | Ground; War cries strengthen nearby enemies unless silenced. |
| Hollow King | 1800 | 25 | 25% | 8 | Ground; control immune; A crowd-control immune stage boss. |
| Bone Dragon | 2400 | 30 | 30% | 10 | Flying; control immune; An airborne boss summons skeletons and attacks tower wards. |
| Hell Warden | 3200 | 24 | 45% | 12 | Ground; control immune; A fire-resistant boss teleports and suppresses unshielded towers. |

The sixteen added enemy identities enter through the following lessons. Their first appearance is followed by combinations that revisit the same counter rule. Higher difficulties also retain earlier enemy lessons.

| Added enemy | Earliest mode / wave | Typing and behavior | Ordinary counters |
| --- | --- | --- | --- |
| Rotling | Easy / 8 | Low-health ground swarm; weak to fire, sonic, and poison. | Cannon/Mortar splash, Tesla chains, Sonic waves. |
| Frostbound Stalker | Easy / 12 | Fast ground runner; 70% Ice resistance, 50% fire weakness, light armor. | Arrow volleys and blocking Barracks; Starfall provides fire. |
| Ember Imp | Easy / 14 | 80% fire resistance, 50% Ice weakness. | Ice shrine or Prism. |
| Ironbark Guardian | Easy / 16 | 65% physical armor, 50% poison weakness. | Poison lab and Magic spire. |
| Storm Sprite | Normal / 12 | Flying; 75% lightning resistance, 40% Ice weakness. | Ice, Arrow, or Prism anti-air; Earth cannot hit it. |
| Rotbound Carrier | Normal / 21 | 85% poison resistance; splits into three Rotlings unless silenced. | Frequency Tower (Sonic B), Mortar splash, and Starfall fire. |
| Rune Warden | Normal / 24 | 80% arcane resistance, 45% holy resistance, 30% physical weakness. | Arrow, Cannon, and Mortar. |
| Crystalwing | Normal / 28 | Flying; 55% arcane resistance, 45% lightning weakness. | Tesla or Arrow anti-air. |
| Siege Behemoth | Hard / 32 | Slow armored ground target; 50% Earth and 30% poison weaknesses. | Earth zones and Poison lab. |
| Cinder Gargoyle | Hard / 38 | Flying; 85% fire resistance, 50% Ice weakness. | Ice and Prism anti-air. |
| Moonveil Banshee | Hard / 44 | Hidden ghost; 80% physical resistance, 65% holy weakness. | Reveal with Magic/Arrow II/Ice II, then use Prism. |
| Null Priest | Hard / 50 | Heals its escorts; 65% arcane resistance, 45% sonic weakness. | Frequency Tower silence and physical Arrow/Cannon fire. |
| Mirror Knight | Hell / 56 | 85% arcane and 60% holy resistance; weak to Earth, physical, and poison. | Earth, Cannon, Poison lab, or Arrow. |
| Gravecap Witch | Hell / 62 | Summons Rotlings; 80% poison resistance, weak to fire/sonic/holy. | Frequency Tower silence and Mortar splash. |
| Rift Assassin | Hell / 68 | Hidden, dodging, teleporting runner; 40% Ice weakness. | Detection plus Ice area control or rooting trap upgrades. |
| Abyss Champion | Hell / 74 | Heavy armor and control immunity; weak to holy, void, and poison. | Prism and Poison lab; premium Void is optional. |

## Difficulty and waves

| Difficulty | Waves per stage | Health multiplier | Speed multiplier | Gold multiplier | Keep lives |
| --- | --- | --- | --- | --- | --- |
| Easy | 25 | 0.75× | 0.90× | 1.12× | 25 |
| Normal (Medium) | 50 | 1× | 1× | 1× | 20 |
| Hard | 75 | 1.35× | 1.08× | 0.97× | 18 |
| Hell | 100 | 1.80× | 1.16× | 0.93× | 15 |

For wave `w`, health growth is `1 + min(w - 1, 24) × 0.035 + max(0, w - 25) × 0.012`. It reaches 1.84× at wave 25 and 2.74× at wave 100, before regional/difficulty multipliers and the champion multiplier. Speed growth is `1 + min(0.20, (w - 1) × 0.003)`, reaching a 1.20× cap. These gentler long-wave curves avoid extrapolating the old short-campaign growth indefinitely.

Every stage has deterministic timed formations with regional flavor, small first sightings, recurring mixed groups, an empowered champion every fifth nonfinal wave, and a final boss assault. Base spawn lists contain no more than 44 entries; summoners and splitting enemies can add units during combat. Hell's final assault has two bosses. Gold comes from kills and wave clears; clear rewards grow with the wave number.

Easy and Normal start with four goblins that one base Arrow tower with good road coverage can defeat without skill ranks or Starfall. Hard and Hell use a stronger visible vanguard and add advanced enemy kinds later. Hidden scouts first arrive in wave four. All starting treasuries can reserve the 55g Arrow upgrade after buying an Arrow, or afford an immediate 160g Magic spire alongside it. If the Arrow/Ice research is incomplete, Magic remains an immediate gold-only detector. The Scout report shows traits, damage weaknesses/resistances, named counters, and the next hidden wave's costs and research readiness. Settings optionally sends the next wave three seconds after a clear; the default is manual. Stage and difficulty changes start a fresh defense; neither can discard an active wave.

## Saved progression

Victory awards one to three stars: three at 90% keep lives, two at 50%, one for any other victory. Progress is stored separately for each stage and difficulty. Account XP, family XP, gems, purchases, and ranks save in localStorage under `mossguard-progression-v2`. Existing stars, clear flags, skill ranks, purchases, and family XP remain intact. Saves from before family research retain their account progress and start that research without fabricated XP. Best-wave records now save and load values through 100 instead of truncating the longer campaigns. Family combat reports reconcile once per simulation second and flush before resets, menus, stage/difficulty changes, and normal page exit; the same report never awards XP twice. Legacy campaign best waves and clear flags migrate. If storage is unavailable, the same systems work for the current session. Active battles themselves are not saved.

First clears award XP and gems. Replays award smaller XP rewards; gems require a new difficulty clear or improved stars. A run ID prevents duplicate result awards. All 12 Normal three-star first clears yield 438 gems, while the five premium tower unlocks total 280. Gems are earned in game; there is no checkout.

The skill tree contains exactly 100 nodes across Damage, Range, Haste, Area, Control, Elemental, Critical, Economy, Fortify, and Grandmastery. Nodes have three ranks, with five at each branch's final node. The tree branches: the root feeds two paths, some nodes join both paths, and the final mastery node needs all three upper paths. Every linked prerequisite needs a rank. The whole-tree view connects the ten branch roots; branch views show every fork, join, rank, and lock state. Old linear-tree purchases migrate without resetting ranks. Bonuses use small per-rank gains and caps; purchases apply to a fresh defense. Resetting skills and capstones refunds 80% of their spent XP and preserves gem purchases.

| Capstone | XP cost | Effect |
| --- | --- | --- |
| Royal Arsenal | 1200 | +8% damage. A permanent reward for mastering aim and reach. |
| Stormheart | 1200 | +8% area and +5% control duration. |
| Elemental Crown | 1400 | +10% elemental damage. |
| Sunder the Crown | 1300 | +3% critical chance and +20% critical damage. |
| Golden Age | 1800 | +8% gold earnings and +30 starting gold. |
| The Unbroken | 1500 | +12% fortification strength and four keep lives. |
| Grandmaster’s Oath | 2500 | +4% damage, range, and attack speed. |

| Gem shop | Base gem cost | Maximum ranks | Effect |
| --- | --- | --- | --- |
| Void Spire | 45 | 1 | Permanently unlock Void and its four branches. |
| Solar Sanctum | 50 | 1 | Permanently unlock Solar and its four branches. |
| Chrono Shrine | 55 | 1 | Permanently unlock Chrono and its four branches. |
| Truesight Watch | 40 | 1 | Permanently unlock Truesight and its four branches. |
| Nexus Heart | 90 | 1 | Permanently unlock Nexus and its four branches. |
| Supply Cache | 22 | 5 | +15 starting gold per rank. Five permanent ranks. |
| Keep Charter | 25 | 4 | +1 keep life per rank. Four permanent ranks. |
| Field Journal | 20 | 4 | +5% stage XP per rank. Four permanent ranks. |
