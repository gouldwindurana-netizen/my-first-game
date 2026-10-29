/** Existing walking bodies gain readable equipment, aura, and size identities. */
export interface EnemyAppearance {
  mark: string;
  tint: number;
  color: number;
  scale: number;
  emblem: 'thorn' | 'frost' | 'fire' | 'storm' | 'armor' | 'poison' | 'rune' | 'crystal' | 'specter';
}
const APPEARANCES: Record<string,EnemyAppearance> = {
  swarmmite:{mark:'ROT',tint:0x9dcf6e,color:0xb0d477,scale:.82,emblem:'thorn'},
  frostwolf:{mark:'FS',tint:0xa6deee,color:0xbceaff,scale:1,emblem:'frost'},
  emberimp:{mark:'EM',tint:0xffaf85,color:0xffb178,scale:.88,emblem:'fire'},
  stormsprite:{mark:'SP',tint:0xa8c9ff,color:0xaaceff,scale:.88,emblem:'storm'},
  mossbeetle:{mark:'IB',tint:0xa4b79c,color:0xc5b88c,scale:1.08,emblem:'armor'},
  plaguecarrier:{mark:'PC',tint:0xbbce7b,color:0xc9dd82,scale:1.04,emblem:'poison'},
  arcanewarden:{mark:'AW',tint:0xc3a6e7,color:0xd4b1f8,scale:1.08,emblem:'rune'},
  crystaldrone:{mark:'CW',tint:0xb2edf0,color:0xc8fbff,scale:.94,emblem:'crystal'},
  siegebeast:{mark:'SG',tint:0xc0b6a4,color:0xe4c59d,scale:1.18,emblem:'armor'},
  cinderdrake:{mark:'CG',tint:0xffa67b,color:0xffbe8a,scale:1.08,emblem:'fire'},
  banshee:{mark:'BN',tint:0xdac5ff,color:0xe0c9ff,scale:1,emblem:'specter'},
  nullpriest:{mark:'NP',tint:0xb89ac9,color:0xcdb1e4,scale:1.04,emblem:'rune'},
  mirrorknight:{mark:'MK',tint:0xe2eff4,color:0xf1f7ff,scale:1.1,emblem:'crystal'},
  plaguewitch:{mark:'PW',tint:0xbcdf9a,color:0xd4ed9f,scale:1.04,emblem:'poison'},
  riftassassin:{mark:'AS',tint:0xb4b0dc,color:0xd4c1ee,scale:.98,emblem:'specter'},
  abysschampion:{mark:'AC',tint:0xb79acb,color:0xe2b9eb,scale:1.2,emblem:'armor'},
};
export function enemyAppearance(kind:string):EnemyAppearance|undefined { return APPEARANCES[kind]; }
