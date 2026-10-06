'use strict';
// ===== 关卡数据 =====
const T = { AIR: 0, GROUND: 1, BRICK: 2, Q: 3, USED: 4, STONE: 5, PILLAR: 6, HIDDEN: 7, SPIKE: 8, CLOUD: 9, FAKE: 10, GATE: 11, COOKIE: 12 };
const SOLID = new Uint8Array(16); [1, 2, 3, 4, 5, 6, 8, 11, 12].forEach(i => SOLID[i] = 1);

function Builder(w, theme) {
  const L = { w, theme, tiles: new Uint8Array(w * ROWS), contents: {}, spawns: [], coins: [], movers: [], checkpoints: [], secrets: [], items: [], hiddenSecret: {}, multi: {}, flips: [] };
  const b = {
    L,
    set(x, y, t) { if (x >= 0 && x < w && y >= 0 && y < ROWS) L.tiles[y * w + x] = t; },
    get(x, y) { return (x >= 0 && x < w && y >= 0 && y < ROWS) ? L.tiles[y * w + x] : 0; },
    ground(x0, x1, top = GY) { for (let x = x0; x <= x1; x++) for (let y = top; y < ROWS; y++) b.set(x, y, T.GROUND); },
    row(x0, x1, y, t) { for (let x = x0; x <= x1; x++) b.set(x, y, t); },
    rect(x0, y0, x1, y1, t) { for (let y = y0; y <= y1; y++) b.row(x0, x1, y, t); },
    blk(x, y, t, content, secret) { b.set(x, y, t); if (content) L.contents[x + ',' + y] = content; if (secret) { L.hiddenSecret[x + ',' + y] = secret; L.secrets.push({ id: secret }); } },
    pillar(x, h, top = GY) { for (let y = top - h; y < top; y++) { b.set(x, y, T.PILLAR); b.set(x + 1, y, T.PILLAR); } },
    coins(x0, x1, y) { for (let x = x0; x <= x1; x++) L.coins.push({ x: x * TS + 4, y: y * TS + 2 }); },
    arc(x0, n, y) { for (let i = 0; i < n; i++) { const t = i / (n - 1 || 1); L.coins.push({ x: (x0 + i) * TS + 4, y: (y - Math.round(Math.sin(t * Math.PI) * 2)) * TS + 2 }); } },
    en(type, x, feetRow = GY, extra) { L.spawns.push(Object.assign({ type, x: x * TS, y: feetRow * TS }, extra || {})); },
    mover(x, y, wt, axis, range, speed = 0.02) { L.movers.push({ x: x * TS, y: y * TS, w: wt * TS, axis, range: range * TS, speed }); },
    cap(x, y, weapon) { L.spawns.push({ type: 'capsule', x: x * TS, y: y * TS, weapon }); },
    item(kind, x, feetRow) { L.items.push({ kind, x: x * TS + 2, y: feetRow * TS - 12 }); },
    cp(x) { L.checkpoints.push(x * TS); },
    flip(x0, x1) { L.flips.push({ x: x0 * TS, y: 0, w: (x1 - x0 + 1) * TS, h: ROWS * TS }); },
    secret(x0, y0, x1, y1, id) { L.secrets.push({ id, zone: { x: x0 * TS, y: y0 * TS, w: (x1 - x0 + 1) * TS, h: (y1 - y0 + 1) * TS } }); },
  };
  return b;
}

// ---------- 第一关：手工设计 ----------
function level1() {
  const b = Builder(232, 'kitchen'), L = b.L;
  L.name = '第一关 · 厨房台面'; L.boss = 'cooker';
  b.cp(3);
  b.ground(0, 40);
  b.blk(10, 9, T.Q, 'coin');
  b.blk(14, 9, T.BRICK); b.blk(15, 9, T.Q, 'power'); b.blk(16, 9, T.BRICK); b.blk(17, 9, T.Q, 'coin'); b.blk(18, 9, T.BRICK);
  b.blk(16, 5, T.COOKIE, 'cookie');
  b.arc(21, 5, 10);
  b.en('slime', 24); b.en('slime', 30);
  b.pillar(33, 2);
  b.en('soldier', 38);
  b.coins(41, 43, 10);
  // B
  b.ground(44, 70);
  b.cap(46, 6, 'S');
  b.blk(49, 9, T.HIDDEN, 'life', 's1');
  b.row(52, 54, 10, T.STONE); b.en('turret', 53, 10);
  b.en('slime', 58);
  b.blk(60, 9, T.BRICK); b.blk(61, 9, T.BRICK, 'multi'); b.blk(62, 9, T.Q, 'coin'); b.blk(63, 9, T.BRICK); b.blk(64, 9, T.COOKIE, 'cookie');
  b.en('hopper', 63); b.en('slime', 67);
  // C 移动平台过深坑
  b.mover(72, 11, 3, 'h', 5, 0.018);
  b.coins(73, 78, 8);
  b.en('flyer', 77, 7);
  // D 石堡 + 隐藏房间
  b.ground(81, 112);
  b.rect(86, 11, 86, 12, T.STONE);
  b.blk(88, 9, T.STONE);
  b.rect(90, 7, 101, 12, T.STONE); b.rect(90, 10, 100, 12, T.FAKE);
  b.coins(92, 99, 11); b.coins(92, 98, 12);
  b.item('R', 99, 13);
  b.secret(91, 10, 100, 12, 's2');
  b.en('slime', 96, 7);
  b.cp(104);
  b.en('soldier', 107); b.en('flyer', 110, 6);
  // E 升降台 + 云端秘道
  b.ground(113, 140);
  b.mover(115, 11, 3, 'v', 6, 0.016);
  b.row(119, 136, 5, T.CLOUD);
  b.coins(120, 135, 4);
  b.blk(133, 1, T.Q, 'star');
  b.item('L', 127, 5);
  b.secret(119, 2, 136, 5, 's3');
  b.blk(120, 9, T.BRICK); b.blk(121, 9, T.BRICK); b.blk(122, 9, T.Q, 'coin'); b.blk(123, 9, T.BRICK); b.blk(124, 9, T.Q, 'power'); b.blk(125, 9, T.BRICK);
  b.en('slime', 121); b.en('spiky', 126); b.en('hopper', 131); b.en('soldier', 136);
  b.coins(141, 143, 10);
  // F
  b.ground(144, 168);
  b.pillar(148, 2); b.en('soldier', 152); b.pillar(156, 3); b.en('turret', 156.5, 10);
  b.en('slime', 160); b.en('slime', 162);
  b.blk(164, 9, T.BRICK); b.blk(165, 9, T.Q, 'L'); b.blk(166, 9, T.BRICK);
  // 重力反转区：天花板上行走越过叉子深坑
  b.rect(165, 0, 179, 2, T.STONE); b.flip(167, 177); b.coins(168, 176, 3); b.item('food', 172, 3.75);
  b.ground(176, 231);
  b.en('hopper', 180); b.en('flyer', 182, 7);
  b.cp(183);
  b.blk(186, 9, T.COOKIE, 'cookie'); b.blk(187, 9, T.BRICK); b.blk(188, 9, T.Q, 'M'); b.blk(189, 9, T.BRICK);
  b.en('soldier', 194); b.en('spiky', 197);
  // 首领竞技场
  L.arenaX = 202;
  b.rect(231, 0, 231, 12, T.STONE);
  b.row(207, 209, 9, T.STONE); b.row(224, 226, 9, T.STONE);
  return L;
}

// ---------- 第二、三关：模板片段 + 固定种子生成 ----------
function genLevel(o) {
  const R = rng(o.seed), b = Builder(o.w, o.theme), L = b.L;
  L.name = o.name; L.boss = o.boss;
  const pick = a => a[(R() * a.length) | 0];
  const en = () => pick(o.pool);
  const wpn = () => pick(['S', 'L', 'R', 'M', 'S', 'R']);
  let sid = 0; const nid = () => 'g' + (sid++);
  const segs = {
    flat(x) { b.ground(x, x + 11); b.en(en(), x + 5); b.en(en(), x + 9); if (R() < .6) b.arc(x + 2, 4, 10); if (R() < .35) b.cap(x + 2, 5, wpn()); return x + 12; },
    gap(x) { const g = R() < .5 ? 4 : 3; b.ground(x, x + 4); if (g === 4) b.row(x + 6, x + 7, 11, T.STONE); b.coins(x + 5, x + 4 + g, 9); b.ground(x + 5 + g, x + 9 + g); b.en(en(), x + 8 + g); return x + 10 + g; },
    blocks(x) { b.ground(x, x + 13); for (let i = 0; i < 5; i++) { if (i % 2) b.blk(x + 4 + i, 9, T.Q, pick(['coin', 'coin', 'power', wpn()])); else b.blk(x + 4 + i, 9, T.BRICK, R() < .2 ? 'multi' : null); }
      if (R() < .6) b.blk(x + 6, 5, T.COOKIE, 'cookie'); b.en(en(), x + 11); b.en(en(), x + 2); return x + 14; },
    pillars(x) { b.ground(x, x + 15); b.pillar(x + 3, 2); b.pillar(x + 8, 3); b.en('turret', x + 8.5, GY - 3); b.pillar(x + 13, 2); b.en(en(), x + 11); b.coins(x + 3, x + 4, 9); return x + 16; },
    mover(x) { b.ground(x, x + 2); b.mover(x + 4, 11, 3, 'h', 4, 0.02); b.coins(x + 5, x + 10, 8); b.ground(x + 12, x + 15); b.en('flyer', x + 8, 6); return x + 16; },
    stairs(x) { b.ground(x, x + 15); for (let i = 0; i < 4; i++) b.rect(x + 2 + i, GY - 1 - i, x + 2 + i, GY - 1, T.STONE);
      b.rect(x + 6, GY - 4, x + 7, GY - 1, T.STONE); for (let i = 0; i < 4; i++) b.rect(x + 8 + i, GY - 4 + i, x + 8 + i, GY - 1, T.STONE);
      b.en(en(), x + 6.5, GY - 4); b.en(en(), x + 13); b.coins(x + 5, x + 8, 7); return x + 16; },
    spikes(x) { b.ground(x, x + 15); b.row(x + 4, x + 6, GY - 1, T.SPIKE); b.row(x + 10, x + 11, GY - 1, T.SPIKE);
      b.blk(x + 4, 9, T.BRICK); b.blk(x + 5, 9, T.Q, 'coin'); b.blk(x + 6, 9, T.BRICK); b.en(en(), x + 8); b.en(en(), x + 14); return x + 16; },
    hill(x) { b.ground(x, x + 1); b.ground(x + 2, x + 13, GY - 3); b.ground(x + 14, x + 15); b.en('turret', x + 7, GY - 3); b.en('soldier', x + 11, GY - 3); b.coins(x + 3, x + 6, 8); return x + 16; },
    secretRoom(x) { b.ground(x, x + 17); b.rect(x + 3, 11, x + 3, 12, T.STONE); b.blk(x + 5, 9, T.STONE);
      b.rect(x + 7, 7, x + 14, 12, T.STONE); b.rect(x + 7, 10, x + 13, 12, T.FAKE); b.coins(x + 9, x + 13, 11); b.coins(x + 9, x + 12, 12);
      b.item(wpn(), x + 13, 13); b.secret(x + 8, 10, x + 13, 12, nid()); b.en(en() === 'turret' ? 'slime' : 'slime', x + 11, 7);
      b.blk(x + 16, 9, T.HIDDEN, 'life', nid()); return x + 18; },
    flip(x) { b.ground(x, x + 3); b.rect(x + 1, 0, x + 14, 2, T.STONE); b.flip(x + 3, x + 12); b.coins(x + 5, x + 11, 3); b.item('food', x + 8, 3.75); b.ground(x + 12, x + 16); b.en(en(), x + 15); return x + 17; },
    highPath(x) { b.ground(x, x + 23); b.mover(x + 2, 11, 3, 'v', 6, 0.016); b.row(x + 6, x + 21, 5, T.CLOUD); b.coins(x + 7, x + 20, 4);
      b.item(wpn(), x + 14, 5); b.secret(x + 6, 2, x + 21, 5, nid());
      b.en(en(), x + 9); b.en(en(), x + 14); b.en(en(), x + 19); b.blk(x + 10, 9, T.BRICK); b.blk(x + 11, 9, T.Q, 'coin'); b.blk(x + 12, 9, T.BRICK); return x + 24; },
  };
  b.ground(0, 14); b.cp(3); b.blk(8, 9, T.Q, 'power'); b.en('slime', 12);
  let x = 15, lastCp = 0, bag = [];
  const end = o.w - 30 - 14;
  while (x < end) {
    if (!bag.length) { bag = o.bag.slice(); for (let i = bag.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; [bag[i], bag[j]] = [bag[j], bag[i]]; } }
    const s = bag.pop();
    if (x + 26 > end && (s === 'highPath' || s === 'secretRoom')) continue;
    if (x - lastCp > 60) { b.cp(x + 1); lastCp = x; }
    x = segs[s](x);
  }
  b.ground(x, o.w - 1);
  b.blk(x + 3, 9, T.BRICK); b.blk(x + 4, 9, T.Q, wpn()); b.blk(x + 5, 9, T.BRICK); b.en(en(), x + 8);
  L.arenaX = o.w - 30;
  b.rect(o.w - 1, 0, o.w - 1, 12, T.STONE);
  b.row(L.arenaX + 5, L.arenaX + 7, 9, T.STONE); b.row(L.arenaX + 22, L.arenaX + 24, 9, T.STONE);
  return L;
}
const LEVELS = [
  { name: '第一关 · 厨房台面', make: level1 },
  { name: '第二关 · 冰箱冷冻层', make: () => genLevel({ seed: 2027, w: 250, theme: 'fridge', name: '第二关 · 冰箱冷冻层', boss: 'blender', pool: ['slime', 'spiky', 'hopper', 'soldier', 'flyer', 'soldier'], bag: ['flat', 'gap', 'blocks', 'pillars', 'mover', 'stairs', 'spikes', 'hill', 'flip', 'secretRoom', 'highPath'] }) },
  { name: '第三关 · 烤箱地狱', make: () => genLevel({ seed: 777, w: 270, theme: 'oven', name: '第三关 · 烤箱地狱', boss: 'fridgeking', pool: ['soldier', 'soldier', 'flyer', 'spiky', 'hopper', 'flyer'], bag: ['flat', 'gap', 'mover', 'mover', 'blocks', 'pillars', 'spikes', 'hill', 'stairs', 'gap', 'flip', 'secretRoom', 'highPath'] }) },
];
