'use strict';
// ===== 渲染：世界、角色、界面 =====
let CAM = 0;
const pcv = document.createElement('canvas'); pcv.width = 28; pcv.height = 36; const pg = pcv.getContext('2d');

function heroPal(star) {
  if (star) { const k = (game.time >> 2) % 3; return [{ meat: '#ff3a3a', hi: '#ff9a7a', dk: '#a01010' }, { meat: '#ffb020', hi: '#ffe080', dk: '#a06000' }, { meat: '#ff5a2a', hi: '#ffc080', dk: '#8a2000' }][k]; }
  return { meat: '#c8702a', hi: '#eaa050', dk: '#7a3c12' };
}
// 在小画布上绘制鸡腿侠（朝右），返回精灵高度
function paintHero(p, aim, dead) {
  pg.clearRect(0, 0, 28, 36);
  const O = (x, y, w, h, c) => { pg.fillStyle = c; pg.fillRect(8 + x, 10 + y, w, h); };
  const pal = heroPal(p.star > 0), bone = '#f6eedc', boneDk = '#c9bb9a', band = '#e8343a', ink = '#2a1206';
  const run = p.onGround && Math.abs(p.vx) > 0.3, fr = run ? Math.floor(p.anim / 5) % 4 : 0;
  const gc = { N: ['#f6eedc', '#c9bb9a'], S: ['#e8343a', '#ffffff'], L: ['#e83a1a', '#4ac040'], R: ['#ff4a4a', '#ffffff'], M: ['#d8a050', '#a06a28'] }[p.weapon] || ['#ccc', '#888'];
  let sy, H;
  if (p.crouch) {
    H = 14; sy = 5;
    O(1, 0, 10, 1, pal.dk); O(0, 1, 12, 8, pal.meat); O(1, 9, 10, 1, pal.dk); O(2, 1, 3, 2, pal.hi);
    O(0, 2, 12, 2, band); O(-3, 2, 3, 1, band); O(6, 4, 2, 2, '#fff'); O(9, 4, 2, 2, '#fff'); O(7, 5, 1, 1, ink); O(10, 5, 1, 1, ink); O(7, 7, 3, 1, ink);
    O(5, 10, 3, 2, bone); O(2, 12, 4, 2, bone); O(7, 12, 4, 2, bone); O(2, 13, 9, 1, boneDk);
  } else {
    H = 22; sy = 9; const bob = run && fr % 2 ? 1 : 0;
    O(3, 0 + bob, 6, 1, pal.dk); O(2, 1 + bob, 8, 1, pal.meat); O(1, 2 + bob, 10, 10, pal.meat); O(0, 3 + bob, 1, 8, pal.dk); O(11, 3 + bob, 1, 8, pal.dk);
    O(2, 12 + bob, 8, 1, pal.meat); O(3, 13 + bob, 6, 1, pal.dk);
    O(3, 1 + bob, 3, 2, pal.hi); O(2, 4 + bob, 1, 4, pal.hi); O(4, 10 + bob, 1, 1, pal.dk); O(9, 11 + bob, 1, 1, pal.dk); O(3, 8 + bob, 1, 1, pal.dk);
    O(1, 3 + bob, 10, 2, band); const tf = (game.time >> 3) % 2; O(-2, 3 + bob + tf, 3, 1, band); O(-4, 4 + bob - tf, 3, 1, band);
    if (dead) { O(6, 6 + bob, 2, 2, ink); O(9, 6 + bob, 2, 2, ink); O(6, 6 + bob, 1, 1, '#fff'); O(10, 7 + bob, 1, 1, '#fff'); O(6, 10 + bob, 5, 2, ink); }
    else { O(6, 6 + bob, 2, 2, '#fff'); O(9, 6 + bob, 2, 2, '#fff'); O(7, 7 + bob, 1, 1, ink); O(10, 7 + bob, 1, 1, ink); O(5, 5 + bob, 3, 1, ink); O(9, 5 + bob, 3, 1, ink); O(7, 10 + bob, 3, 1, ink); O(7, 9 + bob, 1, 1, ink); }
    O(5, 14, 3, 5, bone); O(7, 14, 1, 5, boneDk);
    if (!p.onGround) { O(2, 18, 4, 2, bone); O(7, 18, 4, 2, bone); O(2, 19, 9, 1, boneDk); }
    else if (run) { const k = fr; if (k === 0) { O(1, 19, 4, 3, bone); O(8, 19, 4, 3, bone); } else if (k === 2) { O(3, 19, 4, 3, bone); O(6, 18, 4, 3, bone); } else { O(2, 19, 4, 3, bone); O(7, 19, 4, 3, bone); } O(1, 21, 11, 1, boneDk); }
    else { O(2, 19, 4, 3, bone); O(7, 19, 4, 3, bone); O(2, 21, 4, 1, boneDk); O(7, 21, 4, 1, boneDk); }
  }
  if (p.armor) { O(1, -3, 10, 2, '#9aa4ae'); O(0, -1, 12, 1, '#5a6470'); O(5, -5, 2, 2, '#2a2a2a'); O(2, -3, 3, 1, '#e6ecf2'); }
  if (dead) return H;
  // 手臂 + 武器
  const arm = pal.dk, ax = aim[0], ay = aim[1];
  if (ay === 0) { O(9, sy, 3, 1, arm); O(11, sy - 1, 7, 3, gc[0]); O(11, sy - 1, 7, 1, gc[1]); if (p.flash) O(18, sy - 2, 3, 5, '#fff6a0'); }
  else if (ax === 0 && ay < 0) { O(8, sy - 3, 1, 3, arm); O(8, sy - 12, 3, 9, gc[0]); O(8, sy - 12, 1, 9, gc[1]); if (p.flash) O(7, sy - 16, 5, 3, '#fff6a0'); }
  else if (ax === 0) { O(8, sy + 1, 1, 3, arm); O(7, sy + 4, 3, 9, gc[0]); O(7, sy + 4, 1, 9, gc[1]); }
  else if (ay < 0) { O(9, sy - 1, 2, 1, arm); O(10, sy - 3, 3, 3, gc[0]); O(12, sy - 5, 3, 3, gc[0]); O(14, sy - 7, 3, 3, gc[1]); if (p.flash) O(16, sy - 10, 3, 3, '#fff6a0'); }
  else { O(9, sy + 1, 2, 1, arm); O(10, sy + 1, 3, 3, gc[0]); O(12, sy + 3, 3, 3, gc[0]); O(14, sy + 5, 3, 3, gc[1]); if (p.flash) O(16, sy + 8, 3, 3, '#fff6a0'); }
  return H;
}
function drawHero(p, sx, sy0, scale, flipV, facing, dead) {
  const aim = flipV ? [Math.abs(p.aimV[0]), -p.aimV[1]] : [Math.abs(p.aimV[0]), p.aimV[1]];
  const Hs = paintHero(p, aim, dead);
  const s = scale, cx = sx, bottom = sy0;
  const dw = 28 * s, dh = 36 * s, dx = Math.round(cx - 14 * s), dy = Math.round(bottom - (10 + Hs) * s);
  ctx.save();
  if (facing < 0) { ctx.translate(Math.round(cx * 2), 0); ctx.scale(-1, 1); }
  if (flipV) { const c = bottom - Hs * s / 2; ctx.translate(0, Math.round(c * 2)); ctx.scale(1, -1); }
  ctx.drawImage(pcv, dx, dy, dw, dh);
  ctx.restore();
}
function drawPlayer() {
  const p = player; if (!p.dead && p.inv > 0 && (game.time >> 2) % 2) return;
  const s = p.size === 'giant' ? 2 : p.size === 'tiny' ? 0.5 : 1;
  const cx = p.x + p.w / 2 - CAM;
  if (p.dead) { drawHero(p, cx, p.y + p.h, s, true, p.facing, true); return; }
  if (p.g < 0) drawHero(p, cx, p.y + p.h, s, true, p.facing);
  else drawHero(p, cx, p.y + p.h, s, false, p.facing);
}

// ---------- 背景与瓦片 ----------
function drawLayer(c, f, y = 0) { const o = ((Math.round(CAM * f) % 512) + 512) % 512; ctx.drawImage(c, -o, y); if (512 - o < W) ctx.drawImage(c, 512 - o, y); }
function drawBG() {
  const th = THEMES[game.L.theme], art = ART[game.L.theme];
  ctx.drawImage(art.bg.sky, 0, 0);
  drawLayer(art.bg.far, 0.15); drawLayer(art.bg.deco, 0.25); ctx.globalAlpha = 0.6; drawLayer(art.bg.near, 0.45); ctx.globalAlpha = 1;
  if (th.lava) { const y = H - 14; ctx.fillStyle = '#ff9a1a'; ctx.fillRect(0, y, W, 14); ctx.fillStyle = '#ffd84a'; for (let x = 0; x < W; x += 8) ctx.fillRect(x + ((game.time >> 3) % 8), y + (((x >> 3) + (game.time >> 4)) % 2), 4, 2); }
}
function drawTiles() {
  const L = game.L, art = ART[L.theme].tiles, x0 = Math.max(0, Math.floor(CAM / TS)), x1 = Math.min(L.w - 1, x0 + Math.ceil(W / TS) + 1);
  const p = player, pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
  const qf = Math.floor(game.time / 10) % 4;
  for (let ty = 0; ty < ROWS; ty++) for (let tx = x0; tx <= x1; tx++) {
    const t = L.tiles[ty * L.w + tx]; if (!t || t === T.HIDDEN) continue;
    let px = tx * TS - CAM, py = ty * TS;
    for (const b of bumps) if (b.tx === tx && b.ty === ty) py -= Math.sin(b.t / 10 * Math.PI) * 5;
    let img;
    switch (t) {
      case T.GROUND: { const up = ty > 0 ? L.tiles[(ty - 1) * L.w + tx] : 0; img = (up !== T.GROUND) ? art.top[hash2(tx, 1) % 2] : art.fill[hash2(tx, ty) % 3]; } break;
      case T.BRICK: img = art.brick; break;
      case T.Q: img = art.q[qf]; break;
      case T.COOKIE: img = art.cookie[qf]; break;
      case T.USED: img = art.used; break;
      case T.STONE: img = art.stone; break;
      case T.FAKE: img = art.stone; if (Math.abs(tx * TS + 8 - pcx) < 56 && Math.abs(ty * TS + 8 - pcy) < 40) { ctx.globalAlpha = 0.35; } break;
      case T.PILLAR: { const left = tx === 0 || L.tiles[ty * L.w + tx - 1] !== T.PILLAR || (tx > 1 && L.tiles[ty * L.w + tx - 2] === T.PILLAR && L.tiles[ty * L.w + tx - 1] === T.PILLAR && pillarRight(L, tx - 1, ty));
        const top = ty === 0 || L.tiles[(ty - 1) * L.w + tx] !== T.PILLAR; img = left ? (top ? art.pLT : art.pL) : (top ? art.pRT : art.pR); } break;
      case T.SPIKE: img = art.spike; break;
      case T.CLOUD: img = art.cloud; break;
      case T.GATE: img = art.gate; break;
    }
    if (img) ctx.drawImage(img, Math.round(px), Math.round(py));
    ctx.globalAlpha = 1;
  }
}
function pillarRight(L, tx, ty) { let n = 0; while (tx - n >= 0 && L.tiles[ty * L.w + tx - n] === T.PILLAR) n++; return n % 2 === 0; }

function drawFlips() {
  for (const z of game.L.flips) {
    const x = z.x - CAM; if (x > W || x + z.w < 0) continue;
    ctx.fillStyle = 'rgba(170,90,255,0.16)'; ctx.fillRect(x, 48, z.w, H - 48);
    ctx.fillStyle = 'rgba(220,170,255,0.55)';
    for (let i = 0; i < z.w; i += 24) for (let j = 0; j < 4; j++) { const yy = H - ((game.time * 1.2 + j * 60 + i * 3) % (H - 40)); const xx = x + i + 10;
      ctx.fillRect(xx, yy, 2, 6); ctx.fillRect(xx - 2, yy + 2, 6, 1); ctx.fillRect(xx - 1, yy + 1, 4, 1); }
  }
}
function drawMovers() {
  for (const m of movers) { const x = Math.round(m.x - CAM), y = Math.round(m.y); if (x > W || x + m.w < 0) continue;
    ctx.fillStyle = '#6a3e1e'; ctx.fillRect(x, y, m.w, 8); ctx.fillStyle = '#c8894a'; ctx.fillRect(x + 1, y, m.w - 2, 6); ctx.fillStyle = '#e8b070'; ctx.fillRect(x + 1, y, m.w - 2, 1);
    ctx.fillStyle = '#8a5a2a'; for (let i = 6; i < m.w - 4; i += 9) ctx.fillRect(x + i, y + 2, 5, 1); ctx.fillStyle = '#3a2210'; ctx.fillRect(x + m.w - 6, y + 2, 3, 3); }
}
function drawCoins() {
  const f = Math.floor(game.time / 6) % 4, ws = [8, 6, 2, 6];
  for (const c of coins) { if (c.taken) continue; const x = Math.round(c.x - CAM); if (x < -10 || x > W) continue; coinSprite(x, c.y, ws[f]); }
}
function coinSprite(x, y, w) { const ox = x + (8 - w) / 2 | 0; ctx.fillStyle = '#a86a00'; ctx.fillRect(ox, y, w, 12); ctx.fillStyle = '#ffd84a'; ctx.fillRect(ox + (w > 2 ? 1 : 0), y + 1, Math.max(1, w - 2), 10); if (w > 4) { ctx.fillStyle = '#fff6b0'; ctx.fillRect(ox + 2, y + 2, 1, 6); ctx.fillStyle = '#c88a00'; ctx.fillRect(ox + w / 2 | 0, y + 3, 1, 6); } }
function drawFlags() {
  for (const f of flags) { const x = Math.round(f.x - CAM); if (x < -20 || x > W + 10) continue; const gy = groundYAt(f.x + 2);
    ctx.fillStyle = '#6a7480'; ctx.fillRect(x, gy - 40, 2, 40);
    if (f.on) { const w = (game.time >> 3) % 2; ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 2, gy - 40, 12, 6); ctx.fillRect(x + 3 + w, gy - 46, 10, 6); ctx.fillStyle = '#dfe6ec'; ctx.fillRect(x + 2, gy - 35, 12, 1); }
    else { ctx.fillStyle = '#8a8a8a'; ctx.fillRect(x + 2, gy - 40, 10, 7); } }
}

// ---------- 道具 ----------
function drawFood(x, y, i) {
  const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
  if (i === 0) { R(1, 4, 10, 7, '#fff8ee'); R(2, 2, 8, 2, '#fff8ee'); R(4, 1, 4, 1, '#e8dcc8'); R(5, 2, 2, 3, '#e8dcc8'); R(1, 10, 10, 1, '#d8c8b0'); }
  else if (i === 1) { R(2, 5, 8, 7, '#e8343a'); R(3, 1, 1, 5, '#ffd84a'); R(5, 0, 1, 6, '#ffe680'); R(7, 1, 1, 5, '#ffd84a'); R(9, 2, 1, 4, '#ffe680'); R(4, 7, 4, 2, '#ffd84a'); }
  else if (i === 2) { R(1, 5, 10, 6, '#ffffff'); R(1, 3, 10, 3, '#ff8a4a'); R(2, 4, 8, 1, '#ffc0a0'); R(1, 7, 10, 2, '#1a3a1a'); }
  else if (i === 3) { R(1, 2, 10, 8, '#ff7ab8'); R(4, 5, 4, 2, 'rgba(0,0,0,0)'); R(2, 3, 2, 1, '#fff'); R(6, 3, 1, 1, '#7ad0ff'); R(8, 7, 1, 1, '#ffe14a'); ctx.clearRect(0, 0, 0, 0); R(4, 5, 4, 2, '#c8864e'); }
  else { R(1, 4, 10, 6, '#3ab040'); R(2, 4, 8, 4, '#ff4a5a'); R(4, 5, 1, 1, '#111'); R(7, 6, 1, 1, '#111'); R(1, 9, 10, 1, '#1a7a20'); }
}
function drawPickup(k) {
  const x = Math.round(k.x - CAM), y = Math.round(k.y + (k.static ? Math.sin(game.time * 0.08 + k.x) * 1.5 : 0));
  if (x < -16 || x > W + 4) return;
  if (k.ttl && k.ttl < 120 && (game.time >> 2) % 2) return;
  const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
  if (k.kind === 'coinpop') { coinSprite(x, y, [8, 6, 2, 6][Math.floor(k.t / 3) % 4]); return; }
  if (k.kind === 'food') { drawFood(x, y, k.food); return; }
  if (k.kind === 'fruit') { R(1, 5, 10, 4, '#9aa4ae'); R(0, 8, 12, 2, '#5a6470'); R(5, 2, 2, 3, '#2a2a2a'); R(2, 5, 3, 1, '#e6ecf2'); return; }
  if (k.kind === 'star') { const c = (game.time >> 2) % 2 ? '#ff3a2a' : '#ff7a2a'; R(1, 3, 10, 6, c); R(0, 5, 12, 2, c); R(2, 4, 8, 1, '#ffd84a'); R(3, 7, 1, 1, '#fff'); R(7, 6, 1, 1, '#fff'); return; }
  if (k.kind === 'life') { R(2, 0, 8, 7, '#c8702a'); R(3, 1, 2, 2, '#eaa050'); R(5, 7, 2, 3, '#f6eedc'); R(3, 9, 6, 3, '#f6eedc'); R(1, 2, 10, 1, '#e8343a'); return; }
  const wp = WEAPONS[k.kind]; if (!wp) return;
  const b = (game.time >> 3) % 2;
  R(1, 0, 10, 12, '#3a2a1a'); R(2, 1, 8, 10, wp.c); R(2, 1, 8, 2, '#ffffff'); R(3, 0, 6, 1, '#8a6a4a');
  drawLetter(ctx, k.kind, x + 4, y + 5, '#2a1a0a'); if (b) R(10, 1, 1, 1, '#fff');
}

// ---------- 敌人 ----------
function drawEnemy(e) {
  const x = Math.round(e.x - CAM), y = Math.round(e.y); if (x < -40 || x > W + 40) return;
  const f = e.dir < 0 ? -1 : 1, w = e.w;
  const efl = e.flash > 0 && (game.time % 4) < 2;
  const R = (a, b, ww, h, c) => { ctx.fillStyle = efl ? '#ffffff' : c; ctx.fillRect(f > 0 ? x + a : x + w - a - ww, y + b, ww, h); };
  const t = e.t;
  switch (e.type) {
    case 'slime': { const sq = Math.round(Math.sin(t * 0.2) * 1); const lv = game.lvl, c = ['#4fd17f', '#ff8ac0', '#ffb04a'][lv] || '#4fd17f', c2 = ['#9ff7c0', '#ffd0e6', '#ffe0a0'][lv];
      R(1 - sq, 2 + sq, 12 + sq * 2, 9 - sq, c); R(0, 4 + sq, 14, 6 - sq, c); R(2, 1 + sq, 10, 1, c2); R(3, 3 + sq, 2, 2, '#ffffff'); R(4, 5 + sq, 2, 2, '#123'); R(9, 5 + sq, 2, 2, '#123'); R(6, 8, 3, 1, '#123'); } break;
    case 'spiky': { R(1, 3, 12, 8, '#8a4a20'); R(2, 3, 10, 2, '#a86a3a'); for (let i = 0; i < 5; i++) { R(1 + i * 3, 0, 1, 3, '#5a3010'); R(1 + i * 3, 0, 1, 1, '#f0d0a0'); }
      R(0, 2, 1, 2, '#5a3010'); R(13, 2, 1, 2, '#5a3010'); R(8, 5, 2, 2, '#fff'); R(11, 5, 2, 2, '#fff'); R(9, 6, 1, 1, '#000'); R(12, 6, 1, 1, '#000'); R(7, 4, 3, 1, '#2a1000'); R(9, 9, 3, 1, '#2a1000');
      R(3, 11 - (t >> 3) % 2, 2, 1, '#2a1000'); R(9, 11 - ((t >> 3) + 1) % 2, 2, 1, '#2a1000'); } break;
    case 'hopper': { R(1, 2, 10, 9, '#fff8ee'); R(0, 4, 12, 5, '#fff8ee'); R(2, 1, 8, 1, '#fff8ee'); R(1, 10, 10, 2, '#e6dccb'); R(2, 3, 2, 1, '#ffffff');
      R(6, 5, 1, 2, '#222'); R(9, 5, 1, 2, '#222'); R(5, 7, 1, 1, '#ff9ab0'); R(10, 7, 1, 1, '#ff9ab0'); R(7, 8, 2, 1, '#c0392b'); } break;
    case 'soldier': { const bob = (t >> 3) % 2; R(2, 0 + bob, 4, 4, '#d8a050'); R(8, 1 - bob, 4, 3, '#d8a050'); R(2, 0 + bob, 4, 1, '#f0c880'); R(8, 1 - bob, 4, 1, '#f0c880');
      R(0, 3, 14, 11, '#c8d0d8'); R(0, 3, 14, 1, '#ffffff'); R(1, 4, 1, 9, '#eef2f6'); R(0, 13, 14, 1, '#7a848e'); R(2, 3, 4, 1, '#3a3a3a'); R(8, 3, 4, 1, '#3a3a3a');
      R(14, 6, 2, 2, '#333'); R(7, 6, 2, 2, '#fff'); R(10, 6, 2, 2, '#fff'); R(8, 7, 1, 1, '#000'); R(11, 7, 1, 1, '#000'); R(6, 5, 3, 1, '#222'); R(10, 5, 3, 1, '#222'); R(8, 10, 4, 1, '#222');
      R(2, 14, 2, 2, '#333'); R(10, 14, 2, 2, '#333'); } break;
    case 'turret': { const glow = e.ding > 0 ? '#ffe14a' : '#3a5050'; if (e.ding > 0) e.ding--;
      ctx.fillStyle = e.flash ? '#fff' : '#e8e8e8'; ctx.fillRect(x, y, 16, 14); ctx.fillStyle = e.flash ? '#fff' : '#8a8a8a'; ctx.fillRect(x, y + 13, 16, 1); ctx.fillRect(x + 15, y, 1, 14);
      ctx.fillStyle = glow; ctx.fillRect(x + 2, y + 2, 9, 9); ctx.fillStyle = '#fff'; ctx.fillRect(x + 3, y + 3, 2, 1);
      const ex = Math.round(e.aim[0] * 1.5), ey = Math.round(e.aim[1] * 1.5); ctx.fillStyle = '#ff3a3a'; ctx.fillRect(x + 4 + ex, y + 5 + ey, 2, 2); ctx.fillRect(x + 8 + ex, y + 5 + ey, 2, 2);
      ctx.fillStyle = '#b0b0b0'; ctx.fillRect(x + 12, y + 2, 2, 10); ctx.fillStyle = '#444'; ctx.fillRect(x + 12, y + 3 + (t >> 4) % 6, 2, 2); } break;
    case 'flyer': { const sp = (t >> 1) % 4; R(0, 4, 5, 2, '#e84a6a'); R(0, 4, 5, 1, '#ff8aa0'); R(1, 2, 2, 2, '#fff'); R(2, 3, 1, 1, '#000');
      const ww = [8, 5, 2, 5][sp]; ctx.fillStyle = e.flash ? '#fff' : '#d8e0e8'; const bx = f > 0 ? x + 5 : x + w - 5 - 9;
      ctx.fillRect(bx, y + 1, 9, 1); ctx.fillRect(bx, y + 8, 9, 1); ctx.fillRect(bx + 8, y + 1, 1, 8); ctx.fillRect(bx + 4 - (ww >> 1) + 4, y, Math.max(1, ww), 10); ctx.fillStyle = '#9aa4ae'; ctx.fillRect(bx + 4 + 2, y + 2, 1, 6); } break;
    case 'capsule': { const fl = (t >> 2) % 2; ctx.fillStyle = '#fff'; ctx.fillRect(x + 2, y + 1, 12, 9); ctx.fillStyle = '#e8343a'; ctx.fillRect(x + 2, y + 4, 12, 2); ctx.fillStyle = '#c8c8c8'; ctx.fillRect(x + 2, y + 9, 12, 1);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 3, y + (fl ? 0 : 3), 5, 2); ctx.fillRect(x + 14, y + (fl ? 0 : 3), 5, 2); drawLetter(ctx, e.weapon, x + 7, y + 3, '#2a1a0a'); } break;
  }
}
function drawBoss(b) {
  const x = Math.round(b.x - CAM), y = Math.round(b.y), fl = b.flash > 0 && (game.time % 6) < 2;
  const R = (a, c, w, h, col) => { ctx.fillStyle = fl ? '#ffffff' : col; ctx.fillRect(x + a, y + c, w, h); };
  const t = b.t;
  if (b.type === 'cooker') {
    const lid = b.state === 'walk' && b.timer < 12 ? -4 : 0;
    R(2, 9, 52, 25, '#f4f0ea'); R(0, 12, 56, 18, '#f4f0ea'); R(2, 9, 52, 2, '#ffffff'); R(2, 32, 52, 2, '#c8c0b4'); R(4, 14, 3, 14, '#ffffff');
    R(1, 2 + lid, 54, 8, '#ff9ab8'); R(4, 0 + lid, 48, 3, '#ff9ab8'); R(4, 0 + lid, 48, 1, '#ffd0e0'); R(22, -3 + lid, 12, 3, '#555');
    R(14, 15, 28, 12, '#2a3a4a'); const blink = (t >> 5) % 8 === 0; R(17, 18, 8, blink ? 1 : 3, '#ff3a3a'); R(31, 18, 8, blink ? 1 : 3, '#ff3a3a'); R(16, 16, 9, 1, '#ff3a3a'); R(31, 16, 9, 1, '#ff3a3a');
    R(22, 23, 12, 2, '#ff3a3a'); R(8, 34, 6, 0, '#000'); R(26, 28, 4, 3, '#8ad0ff');
    if (t % 20 === 0) particles.push({ x: b.x + 28, y: b.y - 4 + lid, vx: (Math.random() - .5) * 0.5, vy: -0.8, c: '#ffffff', life: 40, grav: -0.01, sz: 3 });
  } else if (b.type === 'blender') {
    const sw = Math.sin(t * 0.2) * 3;
    R(4, 0, 32, 30, '#c8b8ff'); R(6, 2, 28, 26, '#e8e0ff'); R(6, 12 + Math.round(sw / 2), 28, 16, '#a040ff'); R(6, 12 + Math.round(sw / 2), 28, 2, '#d090ff');
    R(12, 16, 5, 4, '#ffffff'); R(23, 16, 5, 4, '#ffffff'); R(14, 17, 2, 2, '#ff1a6a'); R(25, 17, 2, 2, '#ff1a6a'); R(11, 14, 6, 1, '#300050'); R(23, 14, 6, 1, '#300050');
    R(15, 23, 10, 2, '#300050'); const bl = (t >> 1) % 2; R(bl ? 10 : 14, 26, 20 - (bl ? 0 : 8), 1, '#ddd'); R(7, 2, 2, 20, '#ffffff');
    R(2, 30, 36, 10, '#3a3a44'); R(2, 30, 36, 1, '#6a6a74'); R(8, 34, 4, 3, '#ff3a3a'); R(18, 34, 4, 3, '#3aff7a'); R(28, 34, 4, 3, '#ffd84a'); R(0, -2, 40, 3, '#3a3a44');
    if (t % 6 === 0) particles.push({ x: b.x + Math.random() * 40, y: b.y + 40, vx: 0, vy: 0.6, c: '#c070ff', life: 25, grav: 0, sz: 2 });
  } else {
    R(0, 4, 60, 72, '#e8f0f6'); R(0, 4, 60, 2, '#ffffff'); R(58, 4, 2, 72, '#9aa8b4'); R(0, 26, 60, 2, '#9aa8b4'); R(4, 10, 3, 12, '#9aa8b4'); R(4, 32, 3, 30, '#9aa8b4');
    R(14, 0, 32, 5, '#ffd84a'); R(14, -4, 4, 4, '#ffd84a'); R(28, -5, 4, 5, '#ffd84a'); R(42, -4, 4, 4, '#ffd84a'); R(29, -3, 2, 2, '#ff3a3a');
    const charging = b.state === 'charge' && (t >> 2) % 2;
    R(16, 36, 10, 8, charging ? '#7affff' : '#3a8aff'); R(36, 36, 10, 8, charging ? '#7affff' : '#3a8aff'); R(18, 38, 4, 4, '#ffffff'); R(38, 38, 4, 4, '#ffffff');
    R(14, 33, 12, 2, '#223'); R(36, 33, 12, 2, '#223'); R(20, 52, 22, 4, '#223'); R(22, 56, 4, 3, '#fff'); R(36, 56, 4, 3, '#fff');
    R(46, 10, 6, 6, '#ff6a6a'); R(10, 62, 8, 6, '#7ad07a'); R(40, 64, 6, 6, '#ffb04a');
    if (b.state === 'charge' || b.state === 'fire') {
      const floor = GY * TS, band = b.beam === 'low' ? [floor - 12, floor - 2] : [floor - 26, floor - 16];
      const lx = game.L.arenaX * TS - CAM, rx = x;
      if (b.state === 'charge') { if ((t >> 2) % 2) { ctx.fillStyle = 'rgba(120,255,255,0.8)'; ctx.fillRect(lx, (band[0] + band[1]) / 2 | 0, rx - lx, 1); } }
      else { ctx.fillStyle = '#9affff'; ctx.fillRect(lx, band[0], rx - lx, band[1] - band[0]); ctx.fillStyle = '#ffffff'; ctx.fillRect(lx, band[0] + 3, rx - lx, band[1] - band[0] - 6); if (t % 3 === 0) puff(b.x - Math.random() * 300, band[0] + 4, '#e0ffff', 2, 1, 0, 12); }
    }
  }
}

// ---------- 子弹 / 粒子 ----------
function drawBullets() {
  for (const b of bullets) { const x = Math.round(b.x - CAM), y = Math.round(b.y);
    switch (b.kind) {
      case 'N': ctx.fillStyle = '#fffaf0'; ctx.fillRect(x - 2, y - 1, 4, 2); ctx.fillRect(x - 3, y - 2, 2, 4); ctx.fillRect(x + 1, y - 2, 2, 4); break;
      case 'S': ctx.fillStyle = '#e8141e'; ctx.fillRect(x - 2, y - 2, 4, 4); ctx.fillStyle = '#ff6a6a'; ctx.fillRect(x - 1, y - 2, 1, 1); break;
      case 'R': ctx.fillStyle = '#fffbe8'; ctx.fillRect(x - 2, y - 2, 4, 4); ctx.fillRect(x - 3, y - 1, 6, 2); ctx.fillStyle = '#ffd84a'; ctx.fillRect(x - 1, y, 2, 1); break;
      case 'L': { const s = Math.hypot(b.vx, b.vy), ux = b.vx / s, uy = b.vy / s; for (let i = 0; i < 6; i++) { ctx.fillStyle = i < 2 ? '#fff6a0' : i < 4 ? '#ff7a1a' : '#e8141e'; ctx.fillRect(Math.round(x - ux * i * 3) - 2, Math.round(y - uy * i * 3) - 2, 4, 4); } } break;
      case 'M': { const s = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / s, uy = b.vy / s; for (let i = 0; i < 5; i++) { ctx.fillStyle = i === 0 ? '#c8864e' : '#e0a858'; ctx.fillRect(Math.round(x - ux * i * 2.5) - 2, Math.round(y - uy * i * 2.5) - 2, 4, 4); if (i % 2) { ctx.fillStyle = '#fff0c0'; ctx.fillRect(Math.round(x - ux * i * 2.5) - 1, Math.round(y - uy * i * 2.5) - 1, 2, 1); } } } break;
    } }
  for (const b of ebullets) { const x = Math.round(b.x - CAM), y = Math.round(b.y), r = b.r;
    switch (b.kind) {
      case 'toast': ctx.fillStyle = '#8a5a20'; ctx.fillRect(x - 4, y - 4, 8, 8); ctx.fillStyle = '#e8b870'; ctx.fillRect(x - 3, y - 3, 6, 6); ctx.fillStyle = '#5a3010'; ctx.fillRect(x - 1, y - 1, 1, 1); ctx.fillRect(x + 1, y, 1, 1); break;
      case 'zap': ctx.fillStyle = (game.time >> 1) % 2 ? '#ffe14a' : '#7affff'; ctx.fillRect(x - 3, y - 1, 6, 2); ctx.fillRect(x - 1, y - 3, 2, 6); break;
      case 'rice': ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 4, y - 3, 8, 6); ctx.fillRect(x - 3, y - 4, 6, 8); ctx.fillStyle = '#1a3a1a'; ctx.fillRect(x - 4, y + 1, 8, 2); break;
      case 'wave': ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(x - 5, y - 2, 10, 7); ctx.fillRect(x - 3, y - 6, 6, 5); ctx.fillStyle = '#d0e8ff'; ctx.fillRect(x - 5, y + 3, 10, 2); break;
      case 'juice': ctx.fillStyle = '#a040ff'; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.fillStyle = '#e0b0ff'; ctx.fillRect(x - r + 1, y - r + 1, 2, 2); break;
      case 'ice': ctx.fillStyle = '#bff8ff'; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - r + 1, y - r + 1, 3, 2); ctx.fillStyle = '#5ac8e0'; ctx.fillRect(x - r, y + r - 1, r * 2, 1); break;
      default: ctx.fillStyle = '#ff4a8a'; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.fillStyle = '#ffd0e0'; ctx.fillRect(x - 1, y - 1, 2, 2);
    } }
}
function drawParticles() {
  for (const p of particles) { const x = Math.round(p.x - CAM), y = Math.round(p.y);
    if (p.ring) { const k = 1 - p.life / p.max, r = Math.round(p.ring * k); ctx.fillStyle = p.c; ctx.fillRect(x - r, y - 1, r * 2, 2); ctx.fillRect(x - 1, y - r, 2, r * 2); ctx.fillRect(x - r * 0.7, y - r * 0.7, r * 1.4, r * 1.4); continue; }
    if (p.squash) { ctx.fillStyle = p.squash === 'slime' ? '#4fd17f' : p.squash === 'soldier' ? '#c8d0d8' : p.squash === 'hopper' ? '#fff8ee' : '#d8e0e8'; ctx.fillRect(x, y, p.w, 4); continue; }
    ctx.fillStyle = p.c; ctx.fillRect(x, y, p.sz || 1, p.sz || 1); }
}

// ---------- 界面文字 ----------
function txt(s, x, y, size, color, align = 'left', stroke = '#1a0e08') {
  uctx.font = `bold ${size}px ${FONT_CN}`; uctx.textAlign = align; uctx.textBaseline = 'middle';
  if (stroke) { uctx.lineJoin = 'round'; uctx.lineWidth = Math.max(2, size / 3.5); uctx.strokeStyle = stroke; uctx.strokeText(s, x, y); }
  uctx.fillStyle = color; uctx.fillText(s, x, y);
}
function rrect(x, y, w, h, r, fill, line) { uctx.beginPath(); uctx.moveTo(x + r, y); uctx.arcTo(x + w, y, x + w, y + h, r); uctx.arcTo(x + w, y + h, x, y + h, r); uctx.arcTo(x, y + h, x, y, r); uctx.arcTo(x, y, x + w, y, r); uctx.closePath(); if (fill) { uctx.fillStyle = fill; uctx.fill(); } if (line) { uctx.lineWidth = 1.5; uctx.strokeStyle = line; uctx.stroke(); } }
function button(label, x, y, w, h, act, hl) {
  rrect(x, y + 2, w, h, 6, 'rgba(0,0,0,0.35)'); rrect(x, y, w, h, 6, hl ? '#ffcf3a' : '#fff4dc', '#5a2a10');
  txt(label, x + w / 2, y + h / 2 + 0.5, 11, '#5a2a10', 'center', null); uiButtons.push({ x, y, w, h, act });
}
function drawHUD() {
  const p = player;
  rrect(4, 4, 150, 40, 6, 'rgba(30,14,6,0.55)');
  txt('分数 ' + String(game.score).padStart(6, '0'), 10, 13, 10, '#ffffff');
  txt('金币×' + game.coins, 10, 27, 9, '#ffd84a'); txt('鸡腿×' + Math.max(0, game.lives), 56, 27, 9, '#ffb070');
  txt(WEAPONS[p.weapon].name, 96, 27, 8, WEAPONS[p.weapon].c);
  // 饱食度
  const hw = 70, hx = 10, hy = 36, hv = game.hunger / 100;
  uctx.fillStyle = '#2a1206'; uctx.fillRect(hx + 28, hy - 3, hw + 2, 6);
  uctx.fillStyle = hv >= 0.8 ? '#5ae05a' : hv > 0.3 ? '#ffb030' : ((game.time >> 3) % 2 ? '#ff3030' : '#801010'); uctx.fillRect(hx + 29, hy - 2, hw * hv, 4);
  txt('饱食度', hx, hy, 7, '#ffe0c0');
  const tag = hv >= 0.8 ? '吃饱了！攻速↑移速↑' : hv <= 0 ? '饿晕了…快吃东西！' : '';
  if (tag) txt(tag, hx + 104, hy, 7, hv >= 0.8 ? '#9aff9a' : '#ff8080');
  let ix = 160;
  if (p.armor) { rrect(ix, 6, 40, 14, 4, 'rgba(30,14,6,0.55)'); txt('锅盖', ix + 20, 13, 8, '#bfe6ff', 'center'); ix += 44; }
  if (p.star > 0) { rrect(ix, 6, 56, 14, 4, 'rgba(30,14,6,0.55)'); txt('辣条 ' + Math.ceil(p.star / 60) + 's', ix + 28, 13, 8, '#ff7a5a', 'center'); ix += 60; }
  if (p.fx) { const n = { giant: '巨大化', tiny: '迷你鸡腿', flip: '重力反转', slip: '黄油地板' }[p.fx.type]; rrect(ix, 6, 70, 14, 4, 'rgba(90,20,120,0.7)'); txt(n + ' ' + Math.ceil(p.fx.t / 60) + 's', ix + 35, 13, 8, '#f0d0ff', 'center'); }
  // 连击
  if (game.combo >= 2 && game.comboT > 0) { const s = 14 + Math.min(game.combo, 8); txt('连击 ×' + game.combo, W / 2, 30, s, '#ff7aa8', 'center'); }
  // 秘密
  const L = game.L; txt('秘密 ' + game.found.size + '/' + L.secrets.length, isTouch ? W - 80 : W - 8, 13, 8, '#e0c0ff', 'right');
  if (!isTouch) txt(AU.muted ? 'M:开声音' : 'M:静音', W - 8, 25, 7, '#ffffffaa', 'right');
  // 首领血条
  if (game.boss) { const b = game.boss, bw = 200, bx = W / 2 - bw / 2, by = H - 16; rrect(bx - 4, by - 12, bw + 8, 22, 5, 'rgba(30,14,6,0.6)');
    txt(BOSSNAME[b.type], W / 2, by - 5, 8, '#ffd0d0', 'center'); uctx.fillStyle = '#400'; uctx.fillRect(bx, by + 1, bw, 5); uctx.fillStyle = b.hp < b.maxhp / 2 ? '#ff3a3a' : '#ff8a3a'; uctx.fillRect(bx, by + 1, bw * b.hp / b.maxhp, 5); }
  // 飘字
  for (const f of floats) { const a = Math.min(1, f.life / 20); uctx.globalAlpha = a; txt(f.text, f.x - CAM, f.y, f.big ? 10 : 8, f.c, 'center'); uctx.globalAlpha = 1; }
  // 横幅
  const live = game.state === 'playing';
  if (game.banner && live) { const b = game.banner, k = Math.min(1, (b.max - b.t) / 12, b.t / 15); uctx.globalAlpha = k;
    rrect(W / 2 - 150, 66, 300, b.sub ? 44 : 28, 8, 'rgba(30,14,6,0.7)'); txt(b.text, W / 2, 80, 15, '#ffe14a', 'center'); if (b.sub) txt(b.sub, W / 2, 98, 9, '#ffffff', 'center'); uctx.globalAlpha = 1; }
  // 操作提示
  if (game.hintT > 0 && game.lvl === 0 && live) { uctx.globalAlpha = Math.min(1, game.hintT / 60);
    const s = isTouch ? '左下摇杆：移动+8方向瞄准　右下：跳 / 射　「连发」自动射击' : '←→/AD 移动　↑↓/WS 瞄准（8方向）　空格/K 跳　J/鼠标左键 射击　P 暂停';
    rrect(20, H - 50, W - 40, 32, 6, 'rgba(30,14,6,0.6)'); txt(s, W / 2, H - 40, 8, '#ffffff', 'center'); txt('踩果冻会弹得更高 · 顶礼物盒/幸运饼干 · 吃掉落的食物保持饱食度', W / 2, H - 27, 7.5, '#ffe0a0', 'center'); uctx.globalAlpha = 1; }
}

// ---------- 菜单界面 ----------
const SECRET_TOTAL = LEVELS.map(l => l.make().secrets.length);
const BOSS_OF = ['cooker', 'blender', 'fridgeking'];
function bigHero(x, y, s) { const fake = Object.assign({}, player, { onGround: true, vx: 0, crouch: false, star: 0, armor: false, flash: 0, aimV: [0.7071, -0.7071], weapon: 'S', dead: false, inv: 0 }); const H0 = paintHero(fake, [0.7071, -0.7071]); ctx.drawImage(pcv, x, y, 28 * s, 36 * s); }
function drawMenus() {
  const st = game.state;
  if (st === 'title') {
    uctx.fillStyle = 'rgba(40,16,4,0.35)'; uctx.fillRect(0, 0, W, H);
    const wob = Math.sin(game.time * 0.05) * 3;
    txt('鸡腿侠', W / 2 + 40, 70 + wob, 44, '#ffcf3a', 'center', '#5a1a08');
    txt('大战厨房电器军团', W / 2 + 40, 112, 18, '#ffffff', 'center', '#5a1a08');
    txt('一只愤怒的鸡腿 vs 一整个想把它煮了的厨房', W / 2 + 40, 136, 9, '#ffe0c0', 'center');
    if ((game.time >> 5) % 2 === 0) txt(isTouch ? '点击屏幕开始' : '按 回车 / 空格 / 点击 开始', W / 2 + 40, 196, 12, '#ffffff', 'center');
    txt('原创像素小游戏 · 本地存档 · 无广告', W / 2, H - 12, 7, '#ffffffaa', 'center');
    bigHero(28, 70 + wob, 4);
  } else if (st === 'select' || st === 'resume') {
    uctx.fillStyle = 'rgba(40,16,4,0.5)'; uctx.fillRect(0, 0, W, H);
    txt('选择关卡', W / 2, 24, 18, '#ffcf3a', 'center', '#5a1a08');
    const cw = 136, gap = 12, x0 = W / 2 - (cw * 3 + gap * 2) / 2;
    for (let i = 0; i < LEVELS.length; i++) {
      const x = x0 + i * (cw + gap), y = 48, locked = i + 1 > save.unlocked, sel = game.sel === i;
      rrect(x, y + 3, cw, 150, 8, 'rgba(0,0,0,0.4)'); rrect(x, y, cw, 150, 8, locked ? '#5a4a40' : sel ? '#fff0c8' : '#f4e2c0', sel ? '#ff8a1a' : '#5a2a10');
      if (sel) { uctx.lineWidth = 3; uctx.strokeStyle = '#ff8a1a'; uctx.stroke(); }
      const nm = LEVELS[i].name.split(' · ');
      txt(nm[0], x + cw / 2, y + 16, 10, locked ? '#bba' : '#8a3a10', 'center', null);
      txt(nm[1], x + cw / 2, y + 34, 13, locked ? '#ddd' : '#3a1a08', 'center', null);
      if (locked) { txt('🔒 未解锁', x + cw / 2, y + 80, 12, '#eee', 'center', null); txt('先打败上一关首领', x + cw / 2, y + 100, 8, '#ccc', 'center', null); }
      else {
        txt('首领：' + BOSSNAME[BOSS_OF[i]], x + cw / 2, y + 58, 8.5, '#a02a10', 'center', null);
        txt('最高分 ' + (save.best[i] || 0), x + cw / 2, y + 80, 9, '#3a1a08', 'center', null);
        txt('秘密 ' + ((save.secrets[i] || []).length) + ' / ' + SECRET_TOTAL[i], x + cw / 2, y + 98, 9, '#6a2a9a', 'center', null);
        txt(save.cleared[i] ? '✔ 已通关' : '未通关', x + cw / 2, y + 116, 9, save.cleared[i] ? '#2a8a2a' : '#8a6a5a', 'center', null);
        if (save.resume && save.resume.lvl === i) txt('有检查点存档', x + cw / 2, y + 134, 8, '#c0602a', 'center', null);
      }
      uiButtons.push({ x, y, w: cw, h: 150, act: () => { if (game.state !== 'select') return; game.sel = i; chooseLevel(i); } });
    }
    txt(isTouch ? '点击关卡开始' : '←→ 选择　回车 开始　（进度自动保存在本机浏览器）', W / 2, 222, 9, '#ffffff', 'center');
    txt(isTouch ? '左摇杆移动/瞄准 · 右侧「跳」「射」 · 「连发」自动开火' : '移动 ←→/AD · 瞄准 ↑↓/WS（8方向，可空中斜射） · 跳 空格/K · 射击 J/鼠标', W / 2, 240, 8, '#ffe0c0', 'center');
    txt('武器：番茄酱喷射 · 辣椒激光 · 爆米花机枪 · 法棍火箭（死亡会掉落）', W / 2, 256, 8, '#ffcf9a', 'center');
    if (st === 'resume') {
      uiButtons.length = 0;
      uctx.fillStyle = 'rgba(0,0,0,0.5)'; uctx.fillRect(0, 0, W, H); rrect(W / 2 - 130, 80, 260, 110, 10, '#fff4dc', '#5a2a10');
      txt('发现检查点存档', W / 2, 104, 14, '#5a2a10', 'center', null);
      button('从检查点继续', W / 2 - 118, 140, 112, 28, () => { startLevel(save.resume.lvl, save.resume); }, game.resumeSel === 0);
      button('重新开始', W / 2 + 6, 140, 112, 28, () => { save.resume = null; writeSave(); startLevel(game.sel); }, game.resumeSel === 1);
    }
  } else if (st === 'paused') {
    uctx.fillStyle = 'rgba(0,0,0,0.55)'; uctx.fillRect(0, 0, W, H);
    txt('暂停中', W / 2, 70, 22, '#ffcf3a', 'center'); txt('鸡腿侠正在喝口水…', W / 2, 96, 10, '#ffffff', 'center');
    button('继续游戏', W / 2 - 60, 116, 120, 26, () => { game.state = 'playing'; }, true);
    button('重新开始本关', W / 2 - 60, 148, 120, 26, () => startLevel(game.lvl));
    button('返回选关', W / 2 - 60, 180, 120, 26, () => toSelect());
    button(AU.muted ? '开启声音' : '关闭声音', W / 2 - 60, 212, 120, 26, () => toggleMute());
  } else if (st === 'gameover') {
    uctx.fillStyle = 'rgba(60,10,0,0.6)'; uctx.fillRect(0, 0, W, H);
    txt(game.overMsg || '你被烤焦了！', W / 2, 76, 24, '#ff8a3a', 'center', '#3a0a00'); txt('游戏结束 · 本局分数 ' + game.score, W / 2, 110, 11, '#ffffff', 'center');
    txt('厨房电器们开了个派对庆祝。', W / 2, 128, 9, '#ffd0b0', 'center');
    if (game.overT > 40) { button('再来一次（复活成生鸡腿）', W / 2 - 90, 150, 180, 28, () => startLevel(game.lvl), true); button('返回选关', W / 2 - 90, 186, 180, 28, () => toSelect()); }
  } else if (st === 'clear') {
    uctx.fillStyle = 'rgba(20,10,0,0.55)'; uctx.fillRect(0, 0, W, H);
    txt('关卡完成！', W / 2, 54, 26, '#ffcf3a', 'center', '#5a1a08');
    txt(BOSSNAME[BOSS_OF[game.lvl]] + ' 已被拆成零件', W / 2, 82, 10, '#ffffff', 'center');
    const info = game.clearInfo || {};
    txt('分数 ' + game.score + (info.isBest ? '  新纪录！' : ''), W / 2, 106, 13, '#ffffff', 'center');
    txt('金币 ' + game.coins + '　　秘密 ' + game.found.size + ' / ' + (info.total || 0) + '　　用时 ' + Math.floor(game.levelTicks / 60) + ' 秒', W / 2, 126, 10, '#ffe0c0', 'center');
    if (game.menuT > 40) {
      if (game.lvl + 1 < LEVELS.length) button('下一关', W / 2 - 60, 150, 120, 28, () => nextAfterClear(), true);
      else txt('全部通关！你是真正的鸡腿之王！', W / 2, 162, 12, '#7dff7a', 'center');
      button('返回选关', W / 2 - 60, 186, 120, 28, () => toSelect());
    }
  }
}

// ---------- 主渲染 ----------
let touchShown = null;
function render() {
  const sh = game.shake > 0 ? (Math.random() - .5) * game.shake : 0;
  CAM = Math.round(game.camX + sh);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (game.L) {
    drawBG(); drawFlips(); drawTiles(); drawMovers(); drawCoins(); drawFlags();
    if (game.state !== 'title' && game.state !== 'select' && game.state !== 'resume') {
      for (const k of pickups) drawPickup(k);
      for (const e of enemies) { if (!e.active) continue; if (e.boss) drawBoss(e); else drawEnemy(e); }
      drawPlayer(); drawBullets(); drawParticles();
    }
  }
  uctx.setTransform(1, 0, 0, 1, 0, 0); uctx.clearRect(0, 0, ui.width, ui.height); uctx.setTransform(UK, 0, 0, UK, 0, 0);
  uiButtons = [];
  if (game.state === 'playing' || game.state === 'paused' || game.state === 'gameover' || game.state === 'clear') drawHUD();
  drawMenus();
  const show = isTouch && game.state === 'playing';
  if (show !== touchShown) { document.getElementById('touch').style.display = show ? 'block' : 'none'; touchShown = show; }
}

// ---------- 主循环（固定 60Hz 逻辑）----------
let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(100, now - last); last = now;
  const step = 1000 / 60; let n = 0;
  while (acc >= step && n < 5) { pollInput(); update(); clearEdges(); acc -= step; n++; }
  if (n === 5) acc = 0;
  render();
  requestAnimationFrame(frame);
}
loadLevel(0); game.state = 'title'; Music.play('title');
window.__game = { game, player, startLevel, loadLevel, get enemies() { return enemies; }, get movers() { return movers; } };
requestAnimationFrame(frame);
