import Phaser from 'phaser';

type Graphics = Phaser.GameObjects.Graphics;
type Point = { x: number; y: number };
const ROUTE: Point[] = [
  { x: -40, y: 170 }, { x: 200, y: 170 }, { x: 285, y: 245 },
  { x: 285, y: 390 }, { x: 415, y: 455 }, { x: 580, y: 455 },
  { x: 650, y: 370 }, { x: 650, y: 230 }, { x: 760, y: 175 },
  { x: 900, y: 235 }, { x: 900, y: 420 }, { x: 1025, y: 475 }, { x: 1140, y: 475 },
];
const CLEARINGS = [[170, 270], [365, 190], [410, 355], [540, 545], [565, 285], [760, 300], [820, 480], [1010, 320]];

function polygon(g: Graphics, color: number, coordinates: number[], alpha = 1) {
  const points: Point[] = [];
  for (let i = 0; i < coordinates.length; i += 2) points.push({ x: coordinates[i], y: coordinates[i + 1] });
  g.fillStyle(color, alpha).fillPoints(points, true);
}
function seedRandom(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
}
function lineDistance(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
function roadDistance(x: number, y: number) {
  return Math.min(...ROUTE.slice(1).map((b, i) => lineDistance({ x, y }, ROUTE[i], b)));
}
function rock(g: Graphics, x: number, y: number, scale = 1) {
  g.fillStyle(0x122c28, 0.4).fillEllipse(x + 4 * scale, y + 5 * scale, 28 * scale, 12 * scale);
  polygon(g, 0x52685b, [x - 13 * scale, y + 2 * scale, x - 9 * scale, y - 10 * scale, x + 3 * scale, y - 14 * scale, x + 13 * scale, y - 5 * scale, x + 14 * scale, y + 4 * scale, x, y + 8 * scale]);
  polygon(g, 0x8c9b7c, [x - 9 * scale, y - 10 * scale, x + 3 * scale, y - 14 * scale, x + 8 * scale, y - 7 * scale, x - 4 * scale, y - 3 * scale]);
  polygon(g, 0x647b60, [x - 13 * scale, y + 2 * scale, x - 9 * scale, y - 10 * scale, x - 4 * scale, y - 3 * scale, x, y + 8 * scale]);
  g.fillStyle(0x9aa75d, 0.8).fillEllipse(x - 5 * scale, y - 5 * scale, 13 * scale, 5 * scale);
}
function broadleaf(g: Graphics, x: number, y: number, s: number, variant: number) {
  g.fillStyle(0x102b27, 0.4).fillEllipse(x + 10 * s, y + 6 * s, 67 * s, 24 * s);
  polygon(g, 0x4d4b2d, [x - 5 * s, y + 1 * s, x - 3 * s, y - 39 * s, x + 5 * s, y - 42 * s, x + 7 * s, y + 2 * s]);
  g.lineStyle(2 * s, 0x817047, 0.8).lineBetween(x - s, y - 2 * s, x, y - 26 * s);
  const shades = variant > 0.5 ? [0x1c4b3b, 0x2a6046, 0x427751, 0x668c55] : [0x183e34, 0x24513c, 0x396949, 0x567f4c];
  g.fillStyle(shades[0]).fillEllipse(x, y - 33 * s, 66 * s, 53 * s);
  g.fillStyle(shades[1]).fillCircle(x - 17 * s, y - 39 * s, 23 * s).fillCircle(x + 17 * s, y - 40 * s, 24 * s).fillCircle(x + 1 * s, y - 57 * s, 24 * s);
  g.fillStyle(shades[2]).fillEllipse(x - 16 * s, y - 47 * s, 32 * s, 26 * s).fillEllipse(x + 9 * s, y - 57 * s, 34 * s, 29 * s);
  g.fillStyle(shades[3], 0.75).fillEllipse(x - 19 * s, y - 51 * s, 17 * s, 9 * s).fillEllipse(x + 4 * s, y - 64 * s, 22 * s, 9 * s);
  g.fillStyle(0xb6bf70, 0.35).fillCircle(x - 19 * s, y - 51 * s, 2.2 * s).fillCircle(x + 7 * s, y - 65 * s, 1.7 * s);
}
function pine(g: Graphics, x: number, y: number, s: number) {
  g.fillStyle(0x102922, 0.4).fillEllipse(x + 8 * s, y + 4 * s, 53 * s, 19 * s);
  g.fillStyle(0x5b5136).fillRect(x - 3 * s, y - 29 * s, 7 * s, 29 * s);
  polygon(g, 0x163d32, [x, y - 80 * s, x + 29 * s, y - 16 * s, x + 13 * s, y - 12 * s, x + 25 * s, y - 5 * s, x - 2 * s, y + 1 * s, x - 29 * s, y - 8 * s, x - 17 * s, y - 16 * s, x - 25 * s, y - 20 * s]);
  polygon(g, 0x2d6246, [x, y - 80 * s, x + 3 * s, y - 29 * s, x + 25 * s, y - 11 * s, x - 19 * s, y - 16 * s, x - 8 * s, y - 25 * s, x - 23 * s, y - 25 * s]);
  polygon(g, 0x3b7550, [x, y - 80 * s, x + 19 * s, y - 37 * s, x + 4 * s, y - 39 * s, x + 14 * s, y - 24 * s, x - 19 * s, y - 31 * s, x - 9 * s, y - 42 * s, x - 15 * s, y - 44 * s]);
  polygon(g, 0x679057, [x, y - 80 * s, x - 4 * s, y - 47 * s, x - 15 * s, y - 44 * s, x - 6 * s, y - 61 * s]);
}
function mushroom(g: Graphics, x: number, y: number, s: number) {
  g.fillStyle(0xd9cda6).fillRoundedRect(x - 1.5 * s, y - 2 * s, 3 * s, 8 * s, 1);
  g.fillStyle(0x9a5b3d).fillEllipse(x, y - 2 * s, 13 * s, 8 * s);
  g.fillStyle(0xd29b60).fillEllipse(x - 1 * s, y - 4 * s, 10 * s, 4 * s);
  g.fillStyle(0xf0d29a).fillCircle(x - 2 * s, y - 4 * s, 1.2 * s).fillCircle(x + 3 * s, y - 3 * s, 0.8 * s);
}

/** A deterministic, resolution-independent storybook battlefield. */
export function drawForest(scene: Phaser.Scene): void {
  const random = seedRandom(17046);
  const ground = scene.add.graphics().setDepth(-30);
  ground.fillStyle(0x284d39).fillRect(0, 0, 1100, 680);
  // Broad translucent stains suggest moss, glades, and the light breaking through a canopy.
  for (let i = 0; i < 280; i++) {
    const x = random() * 1100, y = random() * 680;
    ground.fillStyle([0x527346, 0x708447, 0x173f33, 0x3e6741][i % 4], 0.12 + random() * 0.13)
      .fillEllipse(x, y, 45 + random() * 160, 20 + random() * 100);
  }
  for (const [x, y] of CLEARINGS) {
    ground.fillStyle(0x6f8549, 0.12).fillEllipse(x, y + 3, 155, 98);
    ground.fillStyle(0x8a9752, 0.09).fillEllipse(x, y, 120, 75);
  }
  // Tiny stippling is baked into one static object rather than redrawn each frame.
  for (let i = 0; i < 3000; i++) {
    const x = random() * 1100, y = random() * 680;
    ground.fillStyle(i % 3 ? 0xb2b96d : 0x142e26, i % 3 ? 0.13 : 0.2).fillEllipse(x, y, 1 + random() * 3, 1 + random() * 2);
  }
  const road = scene.add.graphics().setDepth(-25);
  const strokeRoute = (width: number, color: number, yOffset = 0, alpha = 1) => {
    road.lineStyle(width, color, alpha);
    for (let i = 1; i < ROUTE.length; i++) road.lineBetween(ROUTE[i - 1].x, ROUTE[i - 1].y + yOffset, ROUTE[i].x, ROUTE[i].y + yOffset);
    road.fillStyle(color, alpha);
    for (const point of ROUTE) road.fillCircle(point.x, point.y + yOffset, width / 2);
  };
  strokeRoute(75, 0x112f27, 6, 0.28);
  strokeRoute(67, 0x536341);
  strokeRoute(59, 0x9b9661);
  strokeRoute(51, 0xc5af79);
  strokeRoute(36, 0xcfb982, -2, 0.55);
  // Broken cobbles, cart tracks and sandy path speckles.
  for (let i = 1; i < ROUTE.length; i++) {
    const a = ROUTE[i - 1], b = ROUTE[i];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const dx = (b.x - a.x) / length, dy = (b.y - a.y) / length;
    for (let d = 10; d < length; d += 13 + random() * 10) {
      const side = (random() - 0.5) * 43;
      const x = a.x + dx * d - dy * side, y = a.y + dy * d + dx * side;
      road.fillStyle(random() > 0.5 ? 0x8e895c : 0xeee0ac, 0.18 + random() * 0.18)
        .fillEllipse(x, y, 2 + random() * 8, 1 + random() * 4);
    }
    for (let d = 18; d < length; d += 31 + random() * 15) {
      const side = (random() > 0.5 ? 1 : -1) * (27 + random() * 4);
      const x = a.x + dx * d - dy * side, y = a.y + dy * d + dx * side;
      road.fillStyle(0x78794d, 0.8).fillEllipse(x + 1, y + 1, 7 + random() * 5, 5);
      road.fillStyle(0xc0bb86, 0.85).fillEllipse(x, y - 1, 6 + random() * 4, 4);
    }
  }
  const details = scene.add.graphics().setDepth(-22);
  // A small woodland spring, layered to keep water calm and visibly recessed.
  details.fillStyle(0x14372d, 0.65).fillEllipse(158, 516, 151, 91);
  details.fillStyle(0x63714e).fillEllipse(155, 508, 145, 86);
  details.fillStyle(0x244b47).fillEllipse(155, 505, 131, 74);
  details.fillStyle(0x376864).fillEllipse(151, 505, 115, 61);
  details.fillStyle(0x4b8780, 0.6).fillEllipse(142, 500, 86, 39);
  details.fillStyle(0x7fa79a, 0.35).fillEllipse(129, 494, 58, 15);
  details.lineStyle(1, 0xa5c4a8, 0.4).lineBetween(110, 499, 136, 499).lineBetween(143, 520, 175, 520).lineBetween(155, 489, 179, 489);
  for (let i = 0; i < 16; i++) {
    const a = random() * Math.PI * 2;
    const x = 155 + Math.cos(a) * 69, y = 507 + Math.sin(a) * 38;
    rock(details, x, y, 0.35 + random() * 0.3);
  }
  for (const [x, y] of [[116, 514], [176, 492], [180, 516]]) {
    details.fillStyle(0x90a763).fillEllipse(x, y, 12, 6);
    details.lineStyle(1, 0x4e7956).lineBetween(x, y, x + 4, y - 2);
  }
  for (let i = 0; i < 12; i++) {
    const x = 105 + random() * 104, y = 535 + random() * 10;
    details.lineStyle(1, 0x89a56b).lineBetween(x, y, x - 2, y - 8 - random() * 9);
  }
  // Ancient stones and a broken wall tell a little story without occupying build space.
  for (let i = 0; i < 5; i++) {
    const x = 432 + i * 22, y = 103 + Math.sin(i) * 7;
    details.fillStyle(0x153a2b, 0.4).fillEllipse(x + 4, y + 6, 28, 14);
    details.fillStyle(0x6c7e62).fillRoundedRect(x - 9, y - 17 - (i % 2) * 6, 21, 26 + (i % 2) * 6, 3);
    details.fillStyle(0x9aa487).fillRoundedRect(x - 9, y - 19 - (i % 2) * 6, 21, 7, 2);
    details.fillStyle(0x83975d).fillEllipse(x - 5, y - 15 - (i % 2) * 6, 16, 5);
    details.lineStyle(1, 0x4c6451).lineBetween(x - 7, y - 3, x + 9, y - 3);
  }
  // Small environmental details respect every gameplay clearing.
  for (let i = 0; i < 560; i++) {
    const x = 20 + random() * 1060, y = 25 + random() * 630;
    if (roadDistance(x, y) < 38 || CLEARINGS.some(([px, py]) => Math.hypot(x - px, y - py) < 45) || Math.hypot((x - 155) / 1.6, y - 510) < 55) continue;
    if (i % 19 === 0) rock(details, x, y, 0.3 + random() * 0.4);
    else if (i % 13 === 0) { mushroom(details, x, y, 0.6); mushroom(details, x + 8, y + 4, 0.4); }
    else {
      details.lineStyle(1, i % 2 ? 0x91a35b : 0x67854d, 0.7);
      details.lineBetween(x, y, x - 3, y - 5).lineBetween(x, y, x + 1, y - 7).lineBetween(x, y, x + 4, y - 3);
      if (i % 7 === 0) details.fillStyle(0xd9ca89, 0.8).fillCircle(x + 1, y - 7, 1.8);
    }
  }
  const trees: { x: number; y: number; s: number; pine: boolean; variant: number }[] = [];
  for (let i = 0; i < 240; i++) {
    const x = random() * 1180 - 40, y = random() * 790 - 20;
    const isBorder = x < 65 || x > 1050 || y < 110 || y > 640;
    if (!isBorder && random() > 0.29) continue;
    const s = (isBorder ? 0.9 : 0.65) + random() * 0.35;
    if (roadDistance(x, y - 22 * s) < 62 || CLEARINGS.some(([px, py]) => Math.hypot(x - px, y - 30 * s - py) < 82)) continue;
    if (Math.hypot((x - 155) / 1.6, y - 510) < 65 || (x > 414 && x < 550 && y < 142 && y > 70)) continue;
    trees.push({ x, y, s, pine: random() > 0.58, variant: random() });
  }
  // Deliberate corner clusters create a lush frame without covering the path.
  for (let i = 0; i < 24; i++) {
    const x = (i < 12 ? i * 31 - 20 : 760 + (i - 12) * 33), y = 52 + random() * 26;
    trees.push({ x, y, s: 1 + random() * 0.3, pine: i % 3 === 0, variant: random() });
  }
  trees.sort((a, b) => a.y - b.y);
  const canopy = scene.add.graphics().setDepth(-15);
  for (const tree of trees) {
    if (tree.pine) pine(canopy, tree.x, tree.y, tree.s);
    else broadleaf(canopy, tree.x, tree.y, tree.s, tree.variant);
  }
  const gate = scene.add.graphics().setDepth(-10);
  gate.fillStyle(0x112f2a, 0.5).fillEllipse(1067, 489, 85, 34);
  gate.fillStyle(0x6e8067).fillEllipse(1064, 482, 76, 30);
  gate.fillStyle(0x98a183).fillEllipse(1062, 477, 70, 25);
  for (const x of [1040, 1085]) {
    gate.fillStyle(0x526c5d).fillRoundedRect(x - 8, 423, 17, 55, 3);
    gate.fillStyle(0x8e9d7e).fillRect(x - 8, 423, 8, 51);
    gate.fillStyle(0xabb18a).fillRoundedRect(x - 12, 419, 25, 9, 3);
    gate.lineStyle(1, 0x405c4b).lineBetween(x - 7, 440, x + 8, 440).lineBetween(x - 7, 459, x + 8, 459);
    gate.fillStyle(0x5d8a58).fillEllipse(x - 5, 427, 24, 9);
  }
  polygon(gate, 0x52795a, [1027, 421, 1032, 410, 1064, 394, 1096, 411, 1100, 421]);
  polygon(gate, 0x8d9d6e, [1030, 415, 1064, 396, 1097, 415, 1064, 405]);
  gate.fillStyle(0x83d3a0, 0.08).fillEllipse(1063, 446, 47, 63);
  gate.fillStyle(0x83d3a0, 0.13).fillEllipse(1063, 449, 31, 47);
  polygon(gate, 0x8ce0b0, [1063, 424, 1074, 443, 1063, 462, 1053, 443]);
  polygon(gate, 0xccecc2, [1063, 424, 1063, 447, 1053, 443]);
  gate.lineStyle(1, 0xf4e3a1, 0.75).strokeCircle(1063, 443, 16);
  // Corners gently vignetted, preserving a bright and inviting central playfield.
  const shade = scene.add.graphics().setDepth(-9);
  for (let i = 0; i < 6; i++) {
    shade.lineStyle(12, 0x102a24, 0.045).strokeRect(i * 12, i * 8, 1100 - i * 24, 680 - i * 16);
  }
}

/** Layered stone miniatures, with their feet at the gameplay anchor. */
export function drawTower(g: Graphics, x: number, y: number, kind: 'archer' | 'cannon' | 'frost' | 'arcane', level: number, time: number): void {
  const arcane = kind === 'arcane';
  const glow = arcane ? 0xb77cff : 0x7bdfff;
  const wall = (left: number, right: number, top: number, bottom: number, tint = 0x9daba8) => {
    const middle = (left + right) / 2;
    polygon(g, tint, [left, top, middle, top + 8, middle, bottom + 7, left, bottom]);
    polygon(g, 0x506675, [middle, top + 8, right, top, right, bottom, middle, bottom + 7]);
    polygon(g, 0xb9c0ad, [left, top, middle, top - 7, right, top, middle, top + 8]);
    g.lineStyle(1, 0x364d5d, 0.65);
    for (let yy = top + 10, row = 0; yy < bottom - 2; yy += 8, row++) {
      g.lineBetween(left + 1, yy, middle, yy + 7).lineBetween(middle, yy + 7, right - 1, yy);
      const split = (row % 2 ? 0.65 : 0.32) * (middle - left);
      g.lineBetween(left + split, yy + split / 2 - 7, left + split, yy + split / 2);
      g.lineBetween(middle + split, yy + 7 - split / 2, middle + split, yy - split / 2 + 14);
    }
    g.lineStyle(1, 0xd3c9a1, 0.6).lineBetween(left + 1, top + 1, left + 1, bottom - 1);
  };
  const diamond = (xx: number, yy: number, w: number, h: number, color: number, alpha = 1) => {
    polygon(g, color, [xx, yy - h / 2, xx + w / 2, yy, xx, yy + h / 2, xx - w / 2, yy], alpha);
  };
  // Broken, moss-rimmed foundation and beveled stone plinth.
  g.fillStyle(0x04111e, 0.52).fillEllipse(x + 9, y + 10, 79, 31);
  g.fillStyle(0x3d5752).fillEllipse(x - 1, y + 3, 67, 31);
  g.fillStyle(0x6f8072).fillEllipse(x - 2, y - 1, 65, 29);
  g.lineStyle(1, 0xb0b393, 0.8).strokeEllipse(x - 2, y - 3, 62, 26);
  polygon(g, 0x425765, [x - 28, y - 3, x, y + 9, x + 28, y - 3, x + 28, y + 4, x, y + 16, x - 28, y + 4]);
  diamond(x, y - 3, 58, 26, 0x9ca695);
  g.lineStyle(1, 0xc8c8a8, 0.8).lineBetween(x - 26, y - 3, x, y + 8).lineBetween(x, y + 8, x + 26, y - 3);
  for (let i = 0; i < 4; i++) {
    g.lineStyle(1, 0x4e665f, 0.6).lineBetween(x - 21 + i * 13, y + 2 + (i < 2 ? i * 2 : (3 - i) * 2), x - 21 + i * 13, y + 9 + (i < 2 ? i * 2 : (3 - i) * 2));
  }
  g.fillStyle(0x7b9256, 0.8).fillEllipse(x - 23, y + 5, 12, 4).fillEllipse(x + 21, y + 7, 9, 3);
  if (kind === 'archer') {
    // Tall octagonal keep with a functioning-looking battlement, not a green hut.
    wall(x - 18, x + 18, y - 51, y - 5);
    g.fillStyle(0x203442).fillRoundedRect(x - 5, y - 18, 9, 22, 4);
    g.lineStyle(1, 0xcac7a6, 0.8).strokeRoundedRect(x - 6, y - 19, 11, 23, 4);
    g.fillStyle(0x1d3442).fillRect(x - 12, y - 40, 3, 9).fillRect(x + 9, y - 36, 3, 10);
    // Corbelled crown and its sunlit walkway.
    polygon(g, 0x6e838a, [x - 25, y - 54, x, y - 44, x + 25, y - 54, x + 20, y - 44, x, y - 35, x - 21, y - 44]);
    diamond(x, y - 57, 51, 25, 0xb9bca8);
    diamond(x, y - 57, 34, 15, 0x3b525c);
    g.lineStyle(2, 0x737e72, 0.9).lineBetween(x - 17, y - 56, x, y - 49).lineBetween(x, y - 49, x + 17, y - 56);
    // Each merlon has a light face and a dark side.
    for (const [dx, dy] of [[-23, -56], [-9, -63], [8, -64], [22, -57], [8, -49], [-9, -49]]) {
      g.fillStyle(0xb5bfaf).fillRect(x + dx - 3, y + dy - 9, 7, 10);
      g.fillStyle(0x657c85).fillRect(x + dx + 3, y + dy - 8, 3, 10);
      g.fillStyle(0xd1ceac).fillRect(x + dx - 3, y + dy - 10, 7, 2);
    }
    // Hanging blue pennants tie the tower to the citadel faction.
    polygon(g, 0x235d8b, [x + 7, y - 38, x + 17, y - 42, x + 16, y - 17, x + 12, y - 20, x + 8, y - 14]);
    g.lineStyle(1, 0xa5bcd0, 0.8).lineBetween(x + 11, y - 38, x + 11, y - 22);
    diamond(x + 12, y - 30, 5, 8, 0xc3b881);
    g.lineStyle(2, 0x798477).lineBetween(x - 2, y - 63, x - 2, y - 86);
    polygon(g, 0x3c769e, [x - 1, y - 85, x + 16, y - 79, x + 4, y - 74, x - 1, y - 75]);
    g.lineStyle(1, 0xb6c6c5, 0.7).lineBetween(x + 1, y - 83, x + 11, y - 79);
    // Brass crossbow is readable even at small battlefield scale.
    g.lineStyle(2.5, 0xd2b773).lineBetween(x - 11, y - 60, x + 8, y - 68);
    g.lineStyle(1.4, 0xd4bb7c).beginPath().arc(x - 2, y - 63, 10, -2.7, -0.25).strokePath();
    g.lineStyle(0.8, 0xf1e0a5).lineBetween(x - 11, y - 67, x + 7, y - 66);
  } else if (kind === 'cannon') {
    wall(x - 23, x + 23, y - 26, y - 6);
    diamond(x, y - 31, 55, 28, 0xb1b4a0);
    diamond(x, y - 31, 43, 20, 0x5e7073);
    // Iron chassis, toothed wheel, bronze-lined mortar.
    polygon(g, 0x354958, [x - 16, y - 33, x - 11, y - 48, x + 8, y - 51, x + 19, y - 34, x + 5, y - 25]);
    g.fillStyle(0x233848).fillCircle(x - 14, y - 29, 10).fillCircle(x + 12, y - 28, 10);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.lineStyle(3, 0xa08e5a).lineBetween(x - 14 + Math.cos(a) * 6, y - 29 + Math.sin(a) * 6, x - 14 + Math.cos(a) * 10, y - 29 + Math.sin(a) * 10);
    }
    g.fillStyle(0x9b8c5b).fillCircle(x - 14, y - 29, 6).fillCircle(x + 12, y - 28, 6);
    g.fillStyle(0x354b58).fillCircle(x - 14, y - 29, 3).fillCircle(x + 12, y - 28, 3);
    polygon(g, 0x75623f, [x - 17, y - 42, x + 9, y - 69, x + 29, y - 56, x + 3, y - 28]);
    polygon(g, 0xc1a36a, [x - 17, y - 42, x + 9, y - 69, x + 18, y - 63, x - 8, y - 35]);
    polygon(g, 0x958052, [x - 8, y - 35, x + 18, y - 63, x + 29, y - 56, x + 3, y - 28]);
    for (let i = 0; i < 2; i++) {
      const dx = -7 + i * 11, dy = -43 - i * 12;
      g.lineStyle(3.2, 0xe0c68c).lineBetween(x + dx, y + dy, x + dx + 15, y + dy + 9);
    }
    g.fillStyle(0xcbbb89).fillEllipse(x + 19, y - 63, 24, 18);
    g.fillStyle(0x2d414d).fillEllipse(x + 19, y - 64, 17, 12);
    g.fillStyle(0x101e2c).fillEllipse(x + 20, y - 65, 11, 7);
    g.lineStyle(1, 0xe1d4a0, 0.8).beginPath().arc(x + 19, y - 63, 10, Math.PI, Math.PI * 2).strokePath();
    g.fillStyle(0x263943).fillCircle(x - 30, y - 4, 5).fillCircle(x - 25, y - 11, 5).fillCircle(x - 20, y - 4, 5);
    g.fillStyle(0xb99c69).fillRect(x + 18, y - 12, 6, 5);
  } else {
    // The glow is additive-looking but deliberately restrained over daylight terrain.
    g.fillStyle(glow, 0.05 + Math.sin(time * 2) * 0.015).fillCircle(x, y - 42, 47);
    wall(x - 17, x + 17, y - 38, y - 4, arcane ? 0x9b92aa : 0xa7bdc1);
    diamond(x, y - 40, 43, 21, arcane ? 0xc6b2b4 : 0xd1d1bb);
    polygon(g, arcane ? 0x7c6a91 : 0x7598aa, [x - 19, y - 43, x - 13, y - 67, x - 8, y - 57, x - 10, y - 37]);
    polygon(g, arcane ? 0x514c70 : 0x4b718d, [x + 19, y - 43, x + 13, y - 67, x + 8, y - 57, x + 10, y - 37]);
    g.lineStyle(1.5, 0xc3ac78).lineBetween(x - 14, y - 62, x - 12, y - 44).lineBetween(x + 14, y - 62, x + 12, y - 44);
    g.fillStyle(0x203448).fillRoundedRect(x - 5, y - 22, 9, 20, 4);
    g.lineStyle(1, 0xd2b576, 0.9).strokeRoundedRect(x - 6, y - 23, 11, 22, 4);
    diamond(x, y - 13, 5, 8, glow);
    // Gold astral collar at the crystal seat.
    diamond(x, y - 46, 38, 19, 0x3b4963);
    g.lineStyle(2, 0xc4a76d).lineBetween(x - 20, y - 46, x, y - 36).lineBetween(x, y - 36, x + 20, y - 46);
    const cy = y - 57 + Math.sin(time * 1.8) * 1.5;
    polygon(g, arcane ? 0x9453ce : 0x389cbd, [x, cy - 30, x + 14, cy - 7, x + 9, cy + 11, x, cy + 21, x - 9, cy + 11, x - 14, cy - 7]);
    polygon(g, arcane ? 0xd2adff : 0xa1e8f1, [x, cy - 30, x - 2, cy - 2, x, cy + 21, x - 9, cy + 11, x - 14, cy - 7]);
    polygon(g, arcane ? 0x7140a9 : 0x367394, [x - 2, cy - 2, x + 14, cy - 7, x + 9, cy + 11, x, cy + 21]);
    polygon(g, 0xe4e9f2, [x, cy - 30, x - 2, cy - 2, x - 8, cy - 8], 0.85);
    g.lineStyle(1, arcane ? 0xecd5ff : 0xd7fbff, 0.8).lineBetween(x - 13, cy - 7, x - 2, cy - 2).lineBetween(x - 2, cy - 2, x + 13, cy - 7);
    if (arcane) {
      // The orbital ring identifies arcane chain lightning in crowded scenes.
      const orbit = cy - 2 + Math.sin(time) * 3;
      g.lineStyle(1.7, 0xbe8bfa, 0.75).strokeEllipse(x, orbit, 54, 17);
      g.lineStyle(1, 0xf3d1ff, 0.8).beginPath().arc(x, orbit, 23, Math.PI * 0.1, Math.PI * 0.75).strokePath();
      for (let i = 0; i < 3; i++) {
        const a = time * 0.6 + (i / 3) * Math.PI * 2;
        diamond(x + Math.cos(a) * 27, orbit + Math.sin(a) * 8.5, 5, 9, 0xead4ff, 0.9);
      }
      g.lineStyle(1, 0xc8a2ef, 0.6).lineBetween(x - 23, y - 15, x - 26, y - 23).lineBetween(x - 26, y - 23, x - 21, y - 28);
    } else {
      // Smaller ice shards and a delicate snowflake rune.
      polygon(g, 0x8cdde9, [x - 29, y - 13, x - 24, y - 42, x - 16, y - 24, x - 22, y - 9]);
      polygon(g, 0xdaf8f0, [x - 29, y - 13, x - 24, y - 42, x - 24, y - 20]);
      polygon(g, 0x5db4d2, [x + 23, y - 10, x + 29, y - 34, x + 35, y - 15, x + 28, y - 5]);
      g.lineStyle(1.5, 0xc0f5f5, 0.9).lineBetween(x - 5, y - 13, x + 5, y - 13).lineBetween(x, y - 19, x, y - 7).lineBetween(x - 4, y - 17, x + 4, y - 9).lineBetween(x - 4, y - 9, x + 4, y - 17);
    }
  }
  // Gold sockets upgrade in a way that is visible on every tower silhouette.
  for (let i = 0; i < level; i++) {
    const sx = x - (level - 1) * 5 + i * 10;
    diamond(sx, y + 5, 5, 6, 0x273d50);
    diamond(sx, y + 4, 3, 4, level === 3 ? 0xf7d590 : 0xc6af76);
  }
}

/** Friendly-readable enemy silhouettes with a distinct shape per enemy role. */
export function drawEnemy(g: Graphics, x: number, y: number, kind: string, time: number): void {
  const s = kind === 'boss' ? 1.7 : kind === 'brute' ? 1.25 : kind === 'runner' ? 0.75 : 0.95;
  const bob = Math.sin(time * (kind === 'runner' ? 17 : 10) + x * 0.03) * 1.5;
  const yy = y + bob;
  g.fillStyle(0x23372b, 0.4).fillEllipse(x + 3, y + 6, 25 * s, 10 * s);
  const body = kind === 'boss' ? 0x75483e : kind === 'brute' ? 0x716c55 : kind === 'runner' ? 0xa77748 : 0x718652;
  g.fillStyle(0x343f2d).fillEllipse(x - 5 * s, yy + 2 * s, 7 * s, 9 * s).fillEllipse(x + 5 * s, yy + 2 * s, 7 * s, 9 * s);
  g.fillStyle(body).fillEllipse(x, yy - 8 * s, 24 * s, 27 * s);
  polygon(g, body, [x - 6 * s, yy - 15 * s, x - 20 * s, yy - 24 * s, x - 15 * s, yy - 8 * s]);
  polygon(g, body, [x + 6 * s, yy - 15 * s, x + 20 * s, yy - 24 * s, x + 15 * s, yy - 8 * s]);
  g.fillStyle(kind === 'boss' ? 0xa86e50 : 0x9ba873).fillEllipse(x - 2 * s, yy - 14 * s, 19 * s, 15 * s);
  g.fillStyle(0x26382b).fillEllipse(x - 5 * s, yy - 13 * s, 4 * s, 5 * s).fillEllipse(x + 4 * s, yy - 13 * s, 4 * s, 5 * s);
  g.fillStyle(0xefe1a1).fillCircle(x - 4.4 * s, yy - 13.5 * s, 1.2 * s).fillCircle(x + 4.5 * s, yy - 13.5 * s, 1.2 * s);
  g.fillStyle(0x4a5536).fillEllipse(x, yy - 6 * s, 10 * s, 6 * s);
  if (kind === 'brute' || kind === 'boss') {
    polygon(g, 0x959a80, [x - 15 * s, yy - 7 * s, x - 10 * s, yy - 15 * s, x - 4 * s, yy - 7 * s, x - 6 * s, yy + 1 * s, x - 15 * s, yy + 1 * s]);
    polygon(g, 0x4d6253, [x + 5 * s, yy - 8 * s, x + 10 * s, yy - 15 * s, x + 16 * s, yy - 7 * s, x + 15 * s, yy + 2 * s, x + 7 * s, yy + 2 * s]);
    g.lineStyle(3 * s, 0x66523a).lineBetween(x + 18 * s, yy - 12 * s, x + 19 * s, yy + 8 * s);
    g.fillStyle(0x7d7f63).fillEllipse(x + 18 * s, yy - 14 * s, 12 * s, 18 * s);
  }
  if (kind === 'runner') {
    polygon(g, 0xb65d3f, [x - 8 * s, yy - 20 * s, x - 4 * s, yy - 31 * s, x, yy - 24 * s, x + 6 * s, yy - 30 * s, x + 9 * s, yy - 20 * s]);
    g.lineStyle(2, 0xe0c08a).lineBetween(x - 14 * s, yy - 3 * s, x - 25 * s, yy + 1 * s);
  }
  if (kind === 'boss') {
    polygon(g, 0xb8995d, [x - 10 * s, yy - 23 * s, x - 13 * s, yy - 34 * s, x - 4 * s, yy - 30 * s, x, yy - 39 * s, x + 5 * s, yy - 30 * s, x + 12 * s, yy - 34 * s, x + 9 * s, yy - 23 * s]);
    g.fillStyle(0xeac083).fillCircle(x, yy - 30 * s, 2 * s);
  }
}
