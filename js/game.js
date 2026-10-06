'use strict';
// ===== 游戏逻辑 =====
const SAVE_KEY = 'pixelRaiders.save.v1';
let save = { unlocked: 1, best: [0, 0, 0], secrets: [[], [], []], cleared: [false, false, false], muted: false, resume: null };
function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && typeof s === 'object') save = Object.assign(save, s); } catch (e) { } }
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { } }
loadSave(); setMuted(!!save.muted); { const b = document.getElementById('btnMute'); if (b) b.textContent = AU.muted ? '🔇' : '🔊'; }

const game = { hunger: 100, state: 'title', lvl: 0, L: null, camX: 0, score: 0, coins: 0, lives: 3, combo: 0, comboT: 0, cpX: 0, found: new Set(), arena: false, boss: null,
  banner: null, shake: 0, time: 0, clearT: 0, sel: 0, hintT: 0, startTime: 0, levelTicks: 0, menuT: 0, overT: 0, resumeSel: 0 };
let enemies = [], bullets = [], ebullets = [], pickups = [], particles = [], floats = [], movers = [], coins = [], bumps = [], flags = [];
let uiButtons = [];
const player = { x: 0, y: 0, w: 10, h: 22, vx: 0, vy: 0, onGround: false, facing: 1, aimV: [1, 0], weapon: 'N', armor: false, star: 0, inv: 0, cd: 0, dead: false, deadT: 0,
  coyote: 0, jbuf: 0, crouch: false, anim: 0, plat: null, jumping: false, flash: 0, g: 1, size: 'normal', wantSize: 'normal', fx: null, deathMsg: '' };
const DIMS = { normal: { w: 10, h: 22 }, giant: { w: 20, h: 42 }, tiny: { w: 6, h: 11 } };
const DEATH_MSGS = ['你被烤焦了！', '你被做成了炸鸡块', '外酥里嫩，享年 3 分钟', '鸡腿侠，卒。', '今晚加餐：鸡腿', '被厨房电器联手红烧了'];
const FORTUNES = ['签文：今日宜开火，忌被烤', '签文：你的下一顿饭就在前方', '签文：小心微波炉', '签文：多吃蔬菜（才怪）', '签文：大吉（油炸版）', '签文：鸡腿永不言弃', '签文：今天的你格外香脆'];
const FOODS = ['包子', '薯条', '寿司', '甜甜圈', '西瓜'];

function tileAt(tx, ty) { const L = game.L; if (tx < 0 || tx >= L.w) return T.STONE; if (ty < 0 || ty >= ROWS) return 0; return L.tiles[ty * L.w + tx]; }
function setTile(tx, ty, t) { const L = game.L; if (tx >= 0 && tx < L.w && ty >= 0 && ty < ROWS) L.tiles[ty * L.w + tx] = t; }
function solidRect(x, y, w, h) { for (let ty = Math.floor(y / TS); ty <= Math.floor((y + h - 0.01) / TS); ty++) for (let tx = Math.floor(x / TS); tx <= Math.floor((x + w - 0.01) / TS); tx++) if (SOLID[tileAt(tx, ty)]) return true; return false; }

// 通用 AABB-瓦片碰撞
function moveBody(b, isPlayer) {
  const r = { l: 0, r: 0, u: 0, d: 0, bump: null };
  b.x += b.vx;
  const ty0 = Math.floor(b.y / TS), ty1 = Math.floor((b.y + b.h - 0.01) / TS);
  if (b.vx > 0) { const tx = Math.floor((b.x + b.w - 0.01) / TS); for (let ty = ty0; ty <= ty1; ty++) if (SOLID[tileAt(tx, ty)]) { b.x = tx * TS - b.w; r.r = 1; break; } }
  else if (b.vx < 0) { const tx = Math.floor(b.x / TS); for (let ty = ty0; ty <= ty1; ty++) if (SOLID[tileAt(tx, ty)]) { b.x = (tx + 1) * TS; r.l = 1; break; } }
  const prevBottom = b.y + b.h;
  b.y += b.vy;
  const tx0 = Math.floor(b.x / TS), tx1 = Math.floor((b.x + b.w - 0.01) / TS);
  if (b.vy > 0) {
    const ty = Math.floor((b.y + b.h - 0.01) / TS);
    for (let tx = tx0; tx <= tx1; tx++) { const t = tileAt(tx, ty); if (SOLID[t] || (t === T.CLOUD && prevBottom <= ty * TS + 0.5)) { b.y = ty * TS - b.h; r.d = 1; break; } }
  } else if (b.vy < 0) {
    const ty = Math.floor(b.y / TS); let best = null, bd = 99;
    for (let tx = tx0; tx <= tx1; tx++) { const t = (ty < 0 && isPlayer) ? T.STONE : tileAt(tx, ty); if (SOLID[t] || (t === T.HIDDEN && isPlayer)) { const d = Math.abs(tx * TS + 8 - (b.x + b.w / 2)); if (d < bd) { bd = d; best = [tx, ty]; } } }
    if (best) { b.y = (best[1] + 1) * TS; r.u = 1; r.bump = best; }
  }
  return r;
}

// ----- 粒子与提示 -----
function puff(x, y, c, n = 8, sp = 2, grav = 0.1, life = 30) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = Math.random() * sp; particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.5, c, life: life * (0.6 + Math.random() * 0.4), grav, sz: Math.random() < .5 ? 2 : 1 }); } }
function explosion(x, y, big) { const n = big ? 26 : 14; puff(x, y, '#ffffff', 4, 1, 0, 10); puff(x, y, '#ffd84a', n, big ? 3.5 : 2.5, 0.02, 28); puff(x, y, '#ff7a2a', n, big ? 2.5 : 1.8, 0.02, 34); puff(x, y, '#5a5a5a', n / 2, 1.2, -0.03, 40);
  particles.push({ x, y, vx: 0, vy: 0, c: '#fff6c0', life: 8, grav: 0, ring: big ? 22 : 12, max: 8 }); }
function floatText(x, y, text, c = '#ffffff', big) { floats.push({ x, y, text, c, life: 50, big }); }
function banner(text, t = 120, sub) { game.banner = { text, t, max: t, sub }; }

// ----- 计分 / 连击 -----
function addKill(score, x, y) {
  if (game.comboT > 0) game.combo++; else game.combo = 1;
  game.comboT = 150;
  const mult = Math.min(game.combo, 8), gain = score * mult;
  game.score += gain;
  floatText(x, y, '+' + gain, mult > 1 ? '#ffd84a' : '#ffffff');
  if (game.combo >= 2) floatText(x, y - 10, '连击 ×' + game.combo, '#ff7aa8', true);
}
function addCoin(x, y) { game.coins++; game.score += 50; SFX.coin(); if (game.coins % 100 === 0) { game.lives++; SFX.oneup(); floatText(x, y - 12, '1UP!', '#7dff7a', true); } }
function foundSecret(id) { if (game.found.has(id)) return; game.found.add(id); game.score += 1000; SFX.secret(); banner('发现秘密厨房！', 110, '+1000 · 偷吃没人知道'); }

// ----- 敌人 -----
const EDEF = {
  slime: { w: 14, h: 11, hp: 1, stomp: true, score: 100 },
  spiky: { w: 14, h: 11, hp: 3, stomp: false, score: 200 },
  hopper: { w: 12, h: 12, hp: 1, stomp: true, score: 150 },
  soldier: { w: 14, h: 16, hp: 2, stomp: true, score: 200 },
  turret: { w: 16, h: 14, hp: 5, stomp: false, score: 500 },
  flyer: { w: 14, h: 10, hp: 1, stomp: true, score: 200, fly: true },
  capsule: { w: 16, h: 10, hp: 1, stomp: false, score: 0, fly: true, harmless: true },
};
function makeEnemy(sp) { const d = EDEF[sp.type];
  return { type: sp.type, w: d.w, h: d.h, hp: d.hp, stomp: d.stomp, score: d.score, fly: !!d.fly, harmless: !!d.harmless, x: sp.x + (TS - d.w) / 2, y: sp.y - d.h, vx: 0, vy: 0,
    dir: -1, t: rnd(100), timer: 60 + rnd(60), active: false, onGround: false, flash: 0, weapon: sp.weapon, baseY: sp.y - d.h, aim: [-1, 0], remove: false }; }
function enemyShoot(x, y, vx, vy, o) { ebullets.push(Object.assign({ x, y, vx, vy, r: 3, grav: 0, kind: 'orb', life: 400 }, o || {})); }
function gravityMove(e, edgeTurn, edgeStop) {
  e.vy = Math.min(e.vy + G, MAXFALL);
  if (edgeTurn && e.onGround && e.vx) {
    const ahead = e.vx > 0 ? e.x + e.w + 1 : e.x - 1, tx = Math.floor(ahead / TS), ty = Math.floor((e.y + e.h + 2) / TS), t = tileAt(tx, ty);
    if (!SOLID[t] && t !== T.CLOUD) { if (edgeStop) e.vx = 0; else { e.dir *= -1; e.vx = -e.vx; } }
  }
  const r = moveBody(e, false);
  e.onGround = !!r.d; if (r.d || r.u) e.vy = 0;
  if ((r.l || r.r) && !edgeStop) e.dir *= -1;
  return r;
}
function updateEnemy(e) {
  e.t++; if (e.flash > 0) e.flash--;
  const p = player, pcx = p.x + p.w / 2, pcy = p.y + p.h / 2, ecx = e.x + e.w / 2, ecy = e.y + e.h / 2, dx = pcx - ecx, dy = pcy - ecy;
  const live = !p.dead;
  switch (e.type) {
    case 'slime': case 'spiky': e.vx = e.dir * (e.type === 'slime' ? 0.45 : 0.6); gravityMove(e, true); break;
    case 'hopper':
      if (e.onGround) { e.vx = 0; if (--e.timer <= 0) { e.vy = -5.2; e.vx = (Math.sign(dx) || -1) * 1.1; e.dir = Math.sign(e.vx); e.timer = 50 + rnd(40); } }
      { const r = gravityMove(e, false); if (r.l || r.r) e.vx = -e.vx; } break;
    case 'soldier': {
      e.dir = dx < 0 ? -1 : 1; const dist = Math.abs(dx);
      e.vx = (dist > 130 && dist < 260) ? e.dir * 0.4 : 0;
      gravityMove(e, true, true);
      if (live && dist < 230 && Math.abs(dy) < 140 && --e.timer <= 0) { e.timer = 100 + rnd(50); const a = snap8(dx, dy); e.aim = a; enemyShoot(ecx + a[0] * 8, e.y + 4 + a[1] * 8, a[0] * 2.1, a[1] * 2.1, { kind: 'toast', r: 4 }); SFX.eshoot(); }
    } break;
    case 'turret': {
      const a = snap8(dx, Math.min(dy, 0)); e.aim = a;
      if (live && Math.abs(dx) < 250 && --e.timer <= 0) { e.timer = 115; enemyShoot(ecx + a[0] * 10, ecy - 2 + a[1] * 10, a[0] * 2, a[1] * 2, { kind: 'zap', r: 3 }); SFX.eshoot(); e.ding = 12; }
    } break;
    case 'flyer': {
      e.vx = (dx < 0 ? -1 : 1) * 0.9; e.x += e.vx; e.dir = Math.sign(e.vx);
      if (Math.abs(dx) < 80 && dy > 0) e.baseY = Math.min(e.baseY + 0.5, GY * TS - 36); else e.baseY += 0;
      e.y = e.baseY + Math.sin(e.t * 0.06) * 18;
    } break;
    case 'capsule': e.x += 1.5; e.y = e.baseY + Math.sin(e.t * 0.07) * 14; if (e.x > game.camX + W + 40) e.remove = true; break;
  }
  if (e.y > ROWS * TS + 32) e.remove = true;
}
function damageEnemy(e, dmg) {
  if (e.boss) return damageBoss(e, dmg);
  e.hp -= dmg; e.flash = 6; SFX.hit();
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e, stomped) {
  if (e.remove) return; e.remove = true;
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  if (e.type === 'capsule') { explosion(cx, cy, false); SFX.boom(); pickups.push(makePickup(e.weapon, cx - 6, cy - 6, 0, -3)); return; }
  if (stomped) { SFX.stomp(); particles.push({ x: e.x, y: e.y + e.h - 4, vx: 0, vy: 0, c: '#000', life: 20, grav: 0, squash: e.type, w: e.w }); puff(cx, e.y + e.h, '#ffffff', 6, 1.5); }
  else { SFX.kill(); explosion(cx, cy, e.type === 'turret'); }
  addKill(e.score, cx, e.y);
  if (Math.random() < 0.3) { const k = makePickup('food', cx - 6, e.y - 4, 0, -3); k.ttl = 600; pickups.push(k); }
}

// ----- 首领 -----
const BOSS_SAY = { cooker: '“今晚就把你煮成鸡腿饭！”', blender: '“嗡嗡嗡——榨成鸡腿汁！”', fridgeking: '“冷藏！冷冻！永久保鲜！”' };
const BOSSNAME = { cooker: '电饭煲大魔王', blender: '附魔榨汁机', fridgeking: '冰箱之王' };
function makeBoss(type) {
  const ax = game.L.arenaX * TS, floor = GY * TS;
  const b = { boss: true, type, active: true, t: 0, timer: 100, cycle: 0, flash: 0, vx: 0, vy: 0, dir: -1, state: 'intro', remove: false, dying: 0, hit: 0 };
  if (type === 'cooker') Object.assign(b, { w: 56, h: 34, x: ax + 380, y: floor - 34, hp: 80 });
  if (type === 'blender') Object.assign(b, { w: 40, h: 40, x: ax + 300, y: -50, hp: 110, t2: 0 });
  if (type === 'fridgeking') Object.assign(b, { w: 60, h: 76, x: ax + W - 16 - 72, y: floor - 76, hp: 150, baseX: ax + W - 16 - 72 });
  b.maxhp = b.hp; return b;
}
function damageBoss(b, dmg) {
  if (b.dying || b.state === 'intro') return;
  b.hp -= dmg; b.flash = 3; SFX.hit();
  if (b.hp <= 0) { b.hp = 0; b.dying = 150; SFX.boom(); ebullets.length = 0; game.score += 5000; floatText(b.x + b.w / 2, b.y, '+5000', '#ffd84a', true); }
}
function updateBoss(b) {
  b.t++; if (b.flash > 0) b.flash--;
  const p = player, pcx = p.x + p.w / 2, pcy = p.y + p.h / 2, bcx = b.x + b.w / 2, bcy = b.y + b.h / 2;
  const ax = game.L.arenaX * TS, floor = GY * TS, ph2 = b.hp < b.maxhp / 2;
  if (b.dying) {
    b.dying--; if (b.dying % 6 === 0) { explosion(b.x + Math.random() * b.w, b.y + Math.random() * b.h, true); SFX.boom(); game.shake = 6; }
    if (b.dying === 0) { b.remove = true; game.boss = null; explosion(bcx, bcy, true); explosion(bcx - 15, bcy, true); explosion(bcx + 15, bcy, true); game.clearT = 120; Music.play('title'); }
    return;
  }
  const alive = !p.dead;
  if (b.type === 'cooker') {
    if (b.state === 'intro') { if (--b.timer <= 0) { b.state = 'walk'; b.timer = 70; } return; }
    b.vy = Math.min(b.vy + G, MAXFALL);
    if (b.state === 'walk') {
      b.vx = b.dir * (ph2 ? 1.1 : 0.7);
      if (b.x < ax + 30) b.dir = 1; if (b.x + b.w > ax + W - 30) b.dir = -1;
      if (--b.timer <= 0 && alive) {
        b.cycle++;
        if (b.cycle % 3 === 0) { b.state = 'jump'; b.vy = -6.5; b.vx = clamp((pcx - bcx) / 50, -2, 2); }
        else { const n = ph2 ? 5 : 3; for (let i = 0; i < n; i++) enemyShoot(bcx, b.y + 4, clamp((pcx - bcx) / 70 + (i - (n - 1) / 2) * 0.7, -3.2, 3.2), -4.2 - Math.random() * 0.8, { grav: 0.12, r: 4, kind: 'rice' }); SFX.eshoot(); b.timer = ph2 ? 55 : 80; }
      }
    }
    const r = moveBody(b, false); if (r.l || r.r) b.dir *= -1;
    if (r.d) { b.vy = 0; if (b.state === 'jump') { b.state = 'walk'; b.timer = 60; game.shake = 10; SFX.boom();
      enemyShoot(b.x, floor - 6, -2.6, 0, { kind: 'wave', r: 5 }); enemyShoot(b.x + b.w, floor - 6, 2.6, 0, { kind: 'wave', r: 5 }); b.vx = 0; } }
  } else if (b.type === 'blender') {
    if (b.state === 'intro') { b.y += (50 - b.y) * 0.03; if (--b.timer <= 0) { b.state = 'float'; b.timer = 60; } return; }
    if (b.state === 'float') {
      b.t2 += 0.012 * (ph2 ? 1.4 : 1);
      const tx = ax + W / 2 + Math.sin(b.t2) * 170 - b.w / 2, ty = 34 + Math.sin(b.t2 * 2) * 22;
      b.x += (tx - b.x) * 0.05; b.y += (ty - b.y) * 0.05;
      if (--b.timer <= 0 && alive) {
        b.cycle++;
        if (b.cycle % 4 === 0) { b.state = 'dive'; b.tx = clamp(pcx, ax + 30, ax + W - 30); b.ty = floor - 26; SFX.alarm(); }
        else if (b.cycle % 4 === 2) { if (enemies.filter(e => e.type === 'flyer').length < 4) for (let i = 0; i < 2; i++) { const e = makeEnemy({ type: 'flyer', x: bcx - 8 + (i ? 20 : -20), y: b.y + b.h + 12 }); e.active = true; enemies.push(e); } }
        else { const ang = Math.atan2(pcy - bcy, pcx - bcx), n = ph2 ? 5 : 3; for (let i = 0; i < n; i++) { const a = ang + (i - (n - 1) / 2) * 0.22; enemyShoot(bcx, bcy, Math.cos(a) * 2.4, Math.sin(a) * 2.4, { r: 4, kind: 'juice' }); } SFX.eshoot(); }
        b.timer = ph2 ? 50 : 75;
      }
    } else if (b.state === 'dive') {
      const dx = b.tx - bcx, dy = b.ty - bcy, d = Math.hypot(dx, dy);
      if (d < 4) { b.state = 'rise'; for (let i = 0; i < 10; i++) { const a = Math.PI + i / 9 * Math.PI; enemyShoot(bcx, bcy, Math.cos(a) * 2, Math.sin(a) * 2, { r: 3, kind: 'juice' }); } game.shake = 6; SFX.boom(); }
      else { const s = Math.min(d, ph2 ? 4.5 : 3.5); b.x += dx / d * s; b.y += dy / d * s; }
    } else if (b.state === 'rise') { b.y -= 1.6; if (b.y < 40) { b.state = 'float'; b.timer = 50; } }
  } else if (b.type === 'fridgeking') {
    if (b.state === 'intro') { if (--b.timer <= 0) { b.state = 'idle'; b.timer = 60; } return; }
    b.x = b.baseX + Math.sin(b.t * 0.012) * 26;
    if (b.state === 'idle') {
      if (--b.timer <= 0 && alive) {
        b.cycle++; const c = b.cycle % 5;
        if (c === 1 || c === 3) { const n = ph2 ? 4 : 3; for (let i = 0; i < n; i++) enemyShoot(b.x + 10, b.y + 14, -(1.2 + i * 0.9 + Math.random() * 0.4), -4.5, { grav: 0.12, r: 5, kind: 'ice' }); SFX.eshoot(); b.timer = ph2 ? 50 : 70; }
        else if (c === 2 || c === 4) { b.state = 'charge'; b.beam = (c === 2) ? 'low' : 'mid'; b.timer = ph2 ? 45 : 60; SFX.alarm(); }
        else { const e = makeEnemy({ type: 'soldier', x: ax + 40 + rnd(120), y: 40 }); e.active = true; e.y = 20; enemies.push(e); if (ph2) { const a = snap8(pcx - b.x, pcy - (b.y + 20)); enemyShoot(b.x, b.y + 20, a[0] * 2.6, a[1] * 2.6, { r: 4 }); } b.timer = 50; }
      }
    } else if (b.state === 'charge') { if (--b.timer <= 0) { b.state = 'fire'; b.timer = 36; SFX.boom(); game.shake = 4; } }
    else if (b.state === 'fire') {
      const band = b.beam === 'low' ? [floor - 12, floor - 2] : [floor - 26, floor - 16];
      if (!p.dead && p.x < b.x && p.y < band[1] && p.y + p.h > band[0]) hurtPlayer();
      if (--b.timer <= 0) { b.state = 'idle'; b.timer = 40; }
    }
  }
}

// ----- 道具 -----
function makePickup(kind, x, y, vx = 0, vy = 0, rise = 0) {
  const k = { kind, x, y, w: 12, h: 12, vx, vy, t: 0, rise, remove: false, food: rnd(FOODS.length) };
  if (kind === 'fruit') k.vx = 0.8; if (kind === 'life') k.vx = 0.9; if (kind === 'star') { k.vx = 1.2; }
  return k;
}
function updatePickup(k) {
  k.t++;
  if (k.rise > 0) { k.rise--; k.y -= 0.75; return; }
  if (k.kind === 'coinpop') { k.vy += 0.4; k.y += k.vy; if (k.t > 26) { k.remove = true; puff(k.x + 4, k.y + 6, '#ffe680', 4, 1, 0, 12); } return; }
  if (k.static) return;
  if (k.ttl && --k.ttl <= 0) { k.remove = true; return; }
  k.vy = Math.min(k.vy + 0.25, 5);
  const vx = k.vx, r = moveBody(k, false);
  if (r.l || r.r) k.vx = -vx;
  if (r.d) { k.vy = k.kind === 'star' ? -4.5 : 0; }
  if (r.u) k.vy = 0;
  if (k.y > ROWS * TS) k.remove = true;
}
function collectPickup(k) {
  const p = player, cx = k.x + 6, cy = k.y;
  k.remove = true;
  if (k.kind === 'fruit') { if (p.armor) { game.score += 1000; floatText(cx, cy, '+1000', '#ffd84a'); } else { p.armor = true; floatText(cx, cy, '锅盖护甲！稳如老狗', '#7ad0ff', true); } SFX.power(); }
  else if (k.kind === 'star') { p.star = 600; floatText(cx, cy, '辣条无敌！谁碰谁倒', '#ff5a3a', true); SFX.power(); }
  else if (k.kind === 'life') { game.lives++; floatText(cx, cy, '备用鸡腿 +1', '#7dff7a', true); SFX.oneup(); }
  else if (k.kind === 'food') { game.hunger = Math.min(100, game.hunger + 35); game.score += 100; floatText(cx, cy, '嗷呜~' + FOODS[k.food] + '！', '#ffb070', true); SFX.coin(); }
  else if (WEAPONS[k.kind]) { p.weapon = k.kind; floatText(cx, cy - 8, WEAPONS[k.kind].say, WEAPONS[k.kind].c, true); SFX.weapon(); game.score += 300; }
}
function spawnContent(c, tx, ty) {
  if (c === 'cookie') { cookieEffect(tx, ty); return; }
  if (c === 'coin' || c === 'multi') { pickups.push({ kind: 'coinpop', x: tx * TS + 4, y: ty * TS - 12, w: 8, h: 12, vx: 0, vy: -5, t: 0, rise: 0 }); addCoin(tx * TS + 8, ty * TS); return; }
  const kind = c === 'power' ? 'fruit' : c;
  pickups.push(makePickup(kind, tx * TS + 2, ty * TS + 2, 0, 0, 18));
  SFX.power();
}
function bump(tx, ty) {
  const t = tileAt(tx, ty), key = tx + ',' + ty, L = game.L, c = L.contents[key];
  let bounce = true;
  if (t === T.BRICK) {
    if (c === 'multi') { L.multi[key] = (L.multi[key] || 0) + 1; spawnContent('coin', tx, ty); if (L.multi[key] >= 8) { setTile(tx, ty, T.USED); delete L.contents[key]; } }
    else if (c) { spawnContent(c, tx, ty); setTile(tx, ty, T.USED); delete L.contents[key]; }
    else { breakBrick(tx, ty); bounce = false; }
  } else if (t === T.Q || t === T.HIDDEN || t === T.COOKIE) {
    if (t === T.HIDDEN && L.hiddenSecret[key]) foundSecret(L.hiddenSecret[key]);
    spawnContent(c || (t === T.COOKIE ? 'cookie' : 'coin'), tx, ty); setTile(tx, ty, T.USED); delete L.contents[key];
  } else { SFX.bump(); bounce = false; }
  if (bounce) { bumps.push({ tx, ty, t: 10 }); SFX.bump(); }
  for (const e of enemies) if (e.active && !e.boss && !e.fly && !e.remove && Math.abs(e.y + e.h - ty * TS) < 3 && e.x + e.w > tx * TS && e.x < tx * TS + TS) killEnemy(e, false);
  for (const cn of coins) if (!cn.taken && cn.x > tx * TS - 4 && cn.x < tx * TS + TS && cn.y + 12 > ty * TS - 16 && cn.y < ty * TS) { cn.taken = true; addCoin(cn.x, cn.y); }
}
function breakBrick(tx, ty) {
  setTile(tx, ty, T.AIR); SFX.brk(); game.score += 50;
  const th = THEMES[game.L.theme];
  for (let i = 0; i < 4; i++) particles.push({ x: tx * TS + 4 + (i % 2) * 8, y: ty * TS + 4 + (i >> 1) * 8, vx: (i % 2 ? 1.5 : -1.5), vy: (i >> 1 ? -3 : -5), c: th.brick[0], life: 60, grav: 0.3, sz: 4 });
}

// ----- 玩家 -----
function hurtPlayer() {
  const p = player; if (p.dead || p.inv > 0 || p.star > 0 || game.clearT > 0) return;
  if (p.size === 'giant') return;
  if (p.armor) { p.armor = false; p.inv = 100; SFX.hurt(); floatText(p.x + 5, p.y, '锅盖飞了！', '#7ad0ff'); puff(p.x + 5, p.y + 10, '#7ad0ff', 10, 2); return; }
  killPlayer();
}
function killPlayer(msg) {
  const p = player; if (p.dead) return;
  endFx(true); p.deathMsg = msg || DEATH_MSGS[rnd(DEATH_MSGS.length)]; floatText(p.x + 5, p.y - 6, p.deathMsg, '#ffb070', true);
  p.dead = true; p.deadT = 100; p.vy = -5; p.vx = 0; SFX.die(); game.combo = 0; game.comboT = 0;
  p.weapon = 'N'; p.armor = false; p.star = 0;
}
function afterDeath() {
  game.lives--;
  if (game.lives < 0) { game.state = 'gameover'; game.overT = 0; game.overMsg = player.deathMsg || DEATH_MSGS[0]; Music.play('title'); save.resume = null; writeSave(); return; }
  respawn();
}
function groundYAt(px) { const tx = Math.floor(px / TS); for (let ty = 0; ty < ROWS; ty++) { if (SOLID[tileAt(tx, ty)] || tileAt(tx, ty) === T.CLOUD) return ty * TS; } return GY * TS; }
function respawn() {
  const p = player;
  Object.assign(p, { dead: false, vx: 0, vy: 0, w: 10, h: 22, crouch: false, inv: 120, plat: null, facing: 1, onGround: false, jumping: false, g: 1, size: 'normal', wantSize: 'normal', fx: null });
  game.hunger = Math.max(game.hunger, 60);
  p.x = game.cpX + 3; p.y = groundYAt(p.x + 5) - p.h;
  ebullets.length = 0;
  if (!game.arena) game.camX = clamp(p.x - W * 0.3, 0, game.L.w * TS - W);
}
function playerShoot() {
  const p = player, a = p.aimV, cx = p.x + p.w / 2; let ox, oy;
  const sc = p.size === 'giant' ? 2 : p.size === 'tiny' ? 0.5 : 1, my = p.y + p.h * (p.g > 0 ? 0.45 : 0.55);
  if (a[1] === 0) { ox = cx + a[0] * 10 * sc; oy = p.crouch ? p.y + 6 : my; }
  else if (a[0] === 0) { ox = cx + p.facing * 2 * sc; oy = a[1] < 0 ? p.y - 4 : p.y + p.h + 2; }
  else { ox = cx + a[0] * 9 * sc; oy = my + a[1] * 7 * sc; }
  const B = (vx, vy, dmg, kind, o) => bullets.push(Object.assign({ x: ox, y: oy, vx, vy, dmg, kind, life: 80, hits: null }, o || {}));
  switch (p.weapon) {
    case 'N': B(a[0] * 5, a[1] * 5, 1, 'N'); p.cd = 11; break;
    case 'R': B(a[0] * 6.5 + (Math.random() - .5) * 0.3, a[1] * 6.5 + (Math.random() - .5) * 0.3, 1, 'R'); p.cd = 5; break;
    case 'S': { const base = Math.atan2(a[1], a[0]); for (const da of [-0.32, -0.16, 0, 0.16, 0.32]) B(Math.cos(base + da) * 4.6, Math.sin(base + da) * 4.6, 1, 'S', { life: 55 }); p.cd = 15; } break;
    case 'L': B(a[0] * 8, a[1] * 8, 3, 'L', { pierce: true, hits: new Set() }); p.cd = 18; break;
    case 'M': B(a[0] * 1.5, a[1] * 1.5, 4, 'M', { acc: 0.25, ax: a[0], ay: a[1], boom: true, life: 120 }); p.cd = 26; break;
  }
  if (game.hunger >= 80) p.cd = Math.max(3, Math.round(p.cd * 0.75));
  p.flash = 4; SFX.shoot(p.weapon);
}
function trySize(sz) {
  const p = player, d = DIMS[sz];
  const nx = p.x + p.w / 2 - d.w / 2, ny = p.g > 0 ? p.y + p.h - d.h : p.y;
  if (solidRect(nx, ny, d.w, d.h)) return false;
  p.x = nx; p.y = ny; p.w = d.w; p.h = d.h; p.size = sz; p.crouch = false; return true;
}
const FX_TEXT = { giant: '巨大化！我就是鸡腿巨人！', tiny: '缩小了…变成鸡翅尖了', flip: '重力反转！头好晕~', slip: '地板被抹了黄油！', rain: '天降外卖！', coins: '发财了！金币雨！' };
function cookieEffect(tx, ty) {
  const p = player, kinds = ['giant', 'tiny', 'flip', 'slip', 'rain', 'coins'], k = kinds[rnd(kinds.length)];
  puff(tx * TS + 8, ty * TS - 4, '#f0b84a', 10, 2);
  endFx(false);
  banner(FX_TEXT[k], 130, FORTUNES[rnd(FORTUNES.length)]); SFX.secret();
  if (k === 'rain') { for (let i = 0; i < 6; i++) { const f = makePickup('food', game.camX + 40 + Math.random() * (W - 80), -20 - i * 14, 0, 0); f.ttl = 700; pickups.push(f); } return; }
  if (k === 'coins') { for (let i = 0; i < 10; i++) { pickups.push({ kind: 'coinpop', x: tx * TS + 4 + (i - 5) * 6, y: ty * TS - 12, w: 8, h: 12, vx: 0, vy: -4 - Math.random() * 3, t: -i * 2, rise: 0 }); addCoin(tx * TS + 8, ty * TS); } return; }
  p.fx = { type: k, t: 600 };
  if (k === 'giant') p.wantSize = 'giant';
  if (k === 'tiny') p.wantSize = 'tiny';
}
function endFx(silent) {
  const p = player; if (!p.fx) return;
  if (p.fx.type === 'giant' || p.fx.type === 'tiny') p.wantSize = 'normal';
  p.fx = null; if (!silent) floatText(p.x + p.w / 2, p.y - 6, '效果结束', '#ffffff');
}
function updatePlayer() {
  const p = player, L = game.L;
  if (p.dead) { p.deadT--; p.vy += 0.25; p.y += p.vy; if (p.deadT <= 0) afterDeath(); return; }
  if (game.clearT > 0) { p.vx *= 0.8; }
  // 效果计时 / 体型 / 重力
  if (p.fx && --p.fx.t <= 0) endFx(false);
  if (p.size !== p.wantSize) trySize(p.wantSize);
  const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
  const inFlip = L.flips.some(z => pcx > z.x && pcx < z.x + z.w);
  const ng = (inFlip !== !!(p.fx && p.fx.type === 'flip')) ? -1 : 1;
  if (ng !== p.g) { if (p.crouch) { p.y -= 22 - p.h; p.h = 22; p.crouch = false; } p.g = ng; p.onGround = false; p.plat = null; p.jumping = false; SFX.jump(); }
  const g = p.g;
  // 饥饿值
  game.hunger = Math.max(0, game.hunger - 0.024);
  const full = game.hunger >= 80, starving = game.hunger <= 0;
  const runMul = (full ? 1.12 : 1) * (starving ? 0.7 : 1) * (p.size === 'tiny' ? 1.1 : 1);
  const jumpMul = (starving ? 0.88 : 1) * (p.size === 'tiny' ? 1.15 : 1);
  const ax = game.clearT > 0 ? 0 : (input.right ? 1 : 0) - (input.left ? 1 : 0), ay = game.clearT > 0 ? 0 : (input.down ? 1 : 0) - (input.up ? 1 : 0);
  if (p.plat) { p.x += p.plat.dx; p.y += p.plat.dy; if (solidRect(p.x, p.y, p.w, p.h)) { p.x -= p.plat.dx; } }
  const wantCrouch = p.onGround && ay > 0 && ax === 0 && g > 0 && p.size === 'normal';
  if (wantCrouch !== p.crouch) {
    if (wantCrouch) { p.y += p.h - 14; p.h = 14; p.crouch = true; }
    else if (!solidRect(p.x, p.y + p.h - 22, p.w, 22 - p.h + 1)) { p.y -= 22 - p.h; p.h = 22; p.crouch = false; }
  }
  const target = p.crouch ? 0 : ax * RUN * runMul;
  const slip = p.fx && p.fx.type === 'slip';
  p.vx += (target - p.vx) * (p.onGround ? (slip ? 0.025 : 0.3) : 0.16); if (Math.abs(p.vx) < 0.05 && !slip) p.vx = 0;
  if (ax) p.facing = ax;
  if (input.jumpP && game.clearT <= 0) p.jbuf = 7; else if (p.jbuf > 0) p.jbuf--;
  if (p.onGround) p.coyote = 6; else if (p.coyote > 0) p.coyote--;
  if (p.jbuf > 0 && p.coyote > 0) {
    if (p.crouch) { p.y -= 22 - p.h; p.h = 22; p.crouch = false; }
    p.vy = -JUMP * jumpMul * g; p.jbuf = 0; p.coyote = 0; p.onGround = false; p.plat = null; p.jumping = true; SFX.jump();
  }
  if (p.jumping && !input.jump && p.vy * g < -2.8) p.vy = -2.8 * g;
  if (p.vy * g >= 0) p.jumping = false;
  p.vy = clamp(p.vy + G * g, -MAXFALL, MAXFALL);
  const prevBottom = p.y + p.h;
  const r = moveBody(p, true);
  if (r.l || r.r) p.vx = slip ? -p.vx * 0.3 : 0;
  p.onGround = false; p.plat = null;
  if (g > 0) {
    if (r.u) { p.vy = Math.max(p.vy, 0.5); p.jumping = false; if (r.bump) { bump(r.bump[0], r.bump[1]); if (p.size === 'giant') { const bx = r.bump[0] + (p.x + p.w / 2 > r.bump[0] * TS + 8 ? 1 : -1); if (tileAt(bx, r.bump[1]) === T.BRICK && !L.contents[bx + ',' + r.bump[1]]) breakBrick(bx, r.bump[1]); } } }
    if (r.d) { p.vy = 0; p.onGround = true; }
    if (p.vy >= 0) for (const m of movers) {
      if (p.x + p.w > m.x + 1 && p.x < m.x + m.w - 1 && prevBottom <= m.y + 1.5 + Math.max(0, -m.dy) && p.y + p.h >= m.y) { p.y = m.y - p.h; p.vy = 0; p.onGround = true; p.plat = m; break; }
    }
  } else {
    if (r.u) { p.vy = 0; p.onGround = true; }
    if (r.d) { p.vy = Math.min(p.vy, -0.5); p.jumping = false; }
  }
  if (p.x < 0) p.x = 0;
  // 叉子尖刺
  { const x0 = Math.floor((p.x + 1) / TS), x1 = Math.floor((p.x + p.w - 1) / TS), y0 = Math.floor((p.y - 1) / TS), y1 = Math.floor((p.y + p.h + 1) / TS);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (tileAt(tx, ty) === T.SPIKE) { if (!p.armor && p.inv <= 0 && p.star <= 0 && p.size !== 'giant') p.deathMsg = '被叉子叉走了！'; hurtPlayer(); if (!p.dead) { p.vy = -4.5 * g; p.onGround = false; } } }
  if (p.y > ROWS * TS + 8) { killPlayer('掉进了下水道…'); p.vy = -3; return; }
  // 8 方向瞄准（屏幕方向）
  let a;
  if (ay < 0) a = ax ? [ax * 0.7071, -0.7071] : [0, -1];
  else if (ay > 0) { if (!p.onGround || g < 0) a = ax ? [ax * 0.7071, 0.7071] : [0, 1]; else a = ax ? [ax * 0.7071, 0.7071] : [p.facing, 0]; }
  else a = [p.facing, 0];
  p.aimV = a;
  if (p.cd > 0) p.cd--;
  if (input.fire && p.cd <= 0 && game.clearT <= 0) playerShoot();
  if (p.inv > 0) p.inv--; if (p.star > 0) p.star--; if (p.flash > 0) p.flash--;
  p.anim += Math.abs(p.vx) > 0.3 ? 1 : 0;
}

// ----- 关卡流程 -----
function loadLevel(i) {
  game.lvl = i; game.L = LEVELS[i].make();
  const L = game.L;
  enemies = L.spawns.map(makeEnemy); bullets = []; ebullets = []; particles = []; floats = []; bumps = [];
  pickups = L.items.map(it => makePickup(it.kind, it.x, it.y)); pickups.forEach(k => { k.vx = 0; k.static = true; });
  coins = L.coins.map(c => ({ x: c.x, y: c.y, taken: false }));
  movers = L.movers.map(m => Object.assign({}, m, { bx: m.x, by: m.y, t: 0, dx: 0, dy: 0 }));
  flags = L.checkpoints.map((x, k) => ({ x, on: k === 0 }));
  game.arena = false; game.boss = null; game.clearT = 0; game.banner = null; game.combo = 0; game.comboT = 0;
}
function startLevel(i, resume) {
  loadLevel(i);
  const L = game.L;
  game.score = 0; game.coins = 0; game.lives = 3; game.hunger = 100; game.found = new Set(); game.cpX = L.checkpoints[0];
  Object.assign(player, { weapon: 'N', armor: false, star: 0 });
  if (resume) {
    game.score = resume.score; game.coins = resume.coins; game.lives = resume.lives; game.found = new Set(resume.found); game.cpX = resume.cp;
    player.weapon = resume.weapon || 'N';
    flags.forEach(f => { if (f.x <= resume.cp) f.on = true; });
    // 已拿取的金币 / 已发现的隐藏砖不恢复，保持简单
    enemies = enemies.filter(e => e.x > resume.cp + 120 || e.type === 'capsule' && e.x > resume.cp);
  }
  respawn(); player.inv = 60;
  game.state = 'playing'; game.levelTicks = 0; game.hintT = 420;
  banner(L.name, 150, isTouch ? '左摇杆移动/瞄准 · 右侧按钮跳跃/射击' : '方向键/WASD 移动瞄准 · 空格跳 · J 射击');
  Music.play(THEMES[L.theme].music);
}
function saveResume() { save.resume = { lvl: game.lvl, cp: game.cpX, score: game.score, coins: game.coins, lives: game.lives, found: [...game.found], weapon: player.weapon }; writeSave(); }
function levelClear() {
  const i = game.lvl, L = game.L;
  save.cleared[i] = true; save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, i + 2));
  const isBest = game.score > (save.best[i] || 0); save.best[i] = Math.max(save.best[i] || 0, game.score);
  const s = new Set(save.secrets[i] || []); game.found.forEach(x => s.add(x)); save.secrets[i] = [...s];
  save.resume = null; writeSave();
  game.state = 'clear'; game.menuT = 0; game.clearInfo = { isBest, total: L.secrets.length };
  SFX.clear();
}

// ----- 主更新 -----
function update() {
  game.time++;
  if (game.state === 'playing') {
    if (input.pauseP) { game.state = 'paused'; input.pauseP = 0; return; }
    updatePlay();
  } else updateMenus();
}
function updatePlay() {
  const L = game.L, p = player;
  game.levelTicks++;
  if (game.hintT > 0) game.hintT--;
  if (game.comboT > 0 && --game.comboT === 0) game.combo = 0;
  for (const m of movers) { m.t += m.speed; const off = (1 - Math.cos(m.t)) / 2 * m.range; const nx = m.axis === 'h' ? m.bx + off : m.bx, ny = m.axis === 'v' ? m.by - off : m.by; m.dx = nx - m.x; m.dy = ny - m.y; m.x = nx; m.y = ny; }
  updatePlayer();
  // 镜头
  if (game.arena) { const tx = L.arenaX * TS; game.camX += (tx - game.camX) * 0.08; if (Math.abs(tx - game.camX) < 0.5) game.camX = tx; }
  else if (!p.dead) { if (p.x - game.camX > W * 0.45) game.camX = p.x - W * 0.45; if (p.x - game.camX < W * 0.3) game.camX = p.x - W * 0.3; game.camX = clamp(game.camX, 0, L.w * TS - W); }
  const cam = game.camX;
  // 检查点
  for (const f of flags) if (!f.on && p.x > f.x && !p.dead) { f.on = true; if (f.x > game.cpX) { game.cpX = f.x; SFX.check(); banner('到达检查点', 80, '进度已自动保存（腌制中）'); saveResume(); } }
  // 进入首领区
  if (!game.arena && L.arenaX && p.x > (L.arenaX + 3) * TS && !p.dead) {
    game.arena = true; for (let y = 0; y <= GY - 1; y++) setTile(L.arenaX, y, T.GATE);
    game.cpX = (L.arenaX + 3) * TS; game.boss = makeBoss(L.boss); enemies.push(game.boss);
    enemies = enemies.filter(e => e.boss || e.x > L.arenaX * TS);
    banner('警告！' + BOSSNAME[L.boss] + ' 开机了！', 140, BOSS_SAY[L.boss]); SFX.alarm(); Music.play('boss');
  }
  // 秘密区域
  for (const s of L.secrets) if (s.zone && !game.found.has(s.id) && overlap(p, s.zone)) foundSecret(s.id);
  // 敌人
  for (const e of enemies) {
    if (!e.active) {
      if (e.x < cam + W + 24 && e.x + e.w > cam - 24) { e.active = true; if (e.type === 'capsule') { e.x = cam - 20; e.baseY = e.y; } }
      else continue;
    }
    if (e.boss) updateBoss(e); else updateEnemy(e);
    if (!e.boss && e.x < cam - 260) e.remove = true;
    if (e.remove || p.dead || e.harmless || e.dying) continue;
    const pb = { x: p.x + 1, y: p.y + 1, w: p.w - 2, h: p.h - 1 };
    if (overlap(pb, e)) {
      if ((p.star > 0 || p.size === 'giant') && !e.boss) { killEnemy(e, false); continue; }
      if (e.stomp && p.g > 0 && p.vy > 0 && p.y + p.h - p.vy <= e.y + 6) { const jelly = e.type === 'slime'; killEnemy(e, true); p.vy = jelly ? (input.jump ? -9 : -7.5) : (input.jump ? -7 : -4.5); p.jumping = input.jump; if (jelly) floatText(e.x + 7, e.y - 4, 'Duang~', '#9affc0', true); continue; }
      if (e.boss && e.state === 'intro') continue;
      if (p.size === 'giant') continue;
      hurtPlayer();
    }
  }
  enemies = enemies.filter(e => !e.remove);
  // 玩家子弹
  for (const b of bullets) {
    if (b.acc) { b.vx += b.ax * b.acc; b.vy += b.ay * b.acc; const s = Math.hypot(b.vx, b.vy); if (s > 6) { b.vx *= 6 / s; b.vy *= 6 / s; } if (game.time % 2 === 0) particles.push({ x: b.x, y: b.y, vx: -b.vx * 0.2, vy: -b.vy * 0.2, c: '#bbb', life: 14, grav: -0.02, sz: 2 }); }
    b.x += b.vx; b.y += b.vy; b.life--;
    if (b.life <= 0 || b.x < cam - 20 || b.x > cam + W + 20 || b.y < -40 || b.y > H + 20) { b.dead = true; continue; }
    const t = tileAt(Math.floor(b.x / TS), Math.floor(b.y / TS));
    if (SOLID[t]) { b.dead = true; if (b.boom) rocketBoom(b.x - b.vx * 0.5, b.y - b.vy * 0.5); else puff(b.x, b.y, '#fff6a0', 3, 1, 0, 8); continue; }
    const hb = { x: b.x - 3, y: b.y - 3, w: 6, h: 6 };
    for (const e of enemies) {
      if (!e.active || e.remove || e.dying) continue;
      if (b.hits && b.hits.has(e)) continue;
      if (overlap(hb, e)) {
        if (b.boom) { b.dead = true; rocketBoom(b.x, b.y); break; }
        damageEnemy(e, b.dmg); puff(b.x, b.y, '#ffffff', 3, 1.2, 0, 8);
        if (b.pierce) b.hits.add(e); else { b.dead = true; break; }
      }
    }
  }
  bullets = bullets.filter(b => !b.dead);
  // 敌方子弹
  const pb = { x: p.x + 2, y: p.y + 3, w: p.w - 4, h: p.h - 4 };
  for (const b of ebullets) {
    b.vy += b.grav; b.x += b.vx; b.y += b.vy; b.life--;
    if (b.life <= 0 || b.x < cam - 40 || b.x > cam + W + 40 || b.y > H + 20 || b.y < -80) { b.dead = true; continue; }
    if (b.kind !== 'wave' && SOLID[tileAt(Math.floor(b.x / TS), Math.floor(b.y / TS))]) { b.dead = true; puff(b.x, b.y, '#ff9a6a', 3, 1, 0, 10); continue; }
    if (b.kind === 'wave' && SOLID[tileAt(Math.floor(b.x / TS), Math.floor(b.y / TS))]) { b.dead = true; continue; }
    if (!p.dead && overlap(pb, { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 })) { b.dead = true; hurtPlayer(); }
  }
  ebullets = ebullets.filter(b => !b.dead);
  // 道具 / 金币
  for (const k of pickups) { updatePickup(k); if (!k.remove && k.kind !== 'coinpop' && k.rise <= 0 && !p.dead && overlap(p, k)) collectPickup(k); }
  pickups = pickups.filter(k => !k.remove);
  if (!p.dead) for (const c of coins) if (!c.taken && p.x < c.x + 8 && p.x + p.w > c.x && p.y < c.y + 12 && p.y + p.h > c.y) { c.taken = true; addCoin(c.x, c.y); puff(c.x + 4, c.y + 6, '#ffe680', 4, 1, 0, 12); }
  for (const pt of particles) { pt.x += pt.vx; pt.y += pt.vy; pt.vy += pt.grav; pt.life--; }
  particles = particles.filter(pt => pt.life > 0);
  for (const f of floats) { f.y -= 0.5; f.life--; }
  floats = floats.filter(f => f.life > 0);
  for (const bp of bumps) bp.t--; bumps = bumps.filter(bp => bp.t > 0);
  if (game.banner && --game.banner.t <= 0) game.banner = null;
  if (game.shake > 0) game.shake--;
  if (game.clearT > 0 && --game.clearT === 0) levelClear();
}
function rocketBoom(x, y) {
  explosion(x, y, true); SFX.boom(); game.shake = 5;
  for (const e of enemies) { if (!e.active || e.remove || e.dying) continue; const dx = e.x + e.w / 2 - x, dy = e.y + e.h / 2 - y; if (Math.hypot(dx, dy) < 28 + Math.max(e.w, e.h) / 2) damageEnemy(e, 4); }
  for (let ty = Math.floor((y - 20) / TS); ty <= Math.floor((y + 20) / TS); ty++) for (let tx = Math.floor((x - 20) / TS); tx <= Math.floor((x + 20) / TS); tx++)
    if (tileAt(tx, ty) === T.BRICK && !game.L.contents[tx + ',' + ty] && Math.hypot(tx * TS + 8 - x, ty * TS + 8 - y) < 26) breakBrick(tx, ty);
}

// ----- 菜单逻辑 -----
function updateMenus() {
  game.menuT++;
  if (game.state === 'title') { game.camX = (game.time * 0.4) % (game.L.w * TS - W); if (input.confirmP || input.jumpP) { game.state = 'select'; SFX.select(); } }
  else if (game.state === 'select') {
    game.camX = (game.time * 0.4) % (game.L.w * TS - W);
    if (input.navL) { game.sel = (game.sel + LEVELS.length - 1) % LEVELS.length; SFX.select(); }
    if (input.navR) { game.sel = (game.sel + 1) % LEVELS.length; SFX.select(); }
    if (input.confirmP) chooseLevel(game.sel);
    if (input.backP) game.state = 'title';
  } else if (game.state === 'resume') {
    if (input.navL || input.navR) game.resumeSel ^= 1;
    if (input.confirmP) { if (game.resumeSel === 0) startLevel(save.resume.lvl, save.resume); else { save.resume = null; writeSave(); startLevel(game.sel); } }
    if (input.backP) game.state = 'select';
  } else if (game.state === 'paused') {
    if (input.pauseP || input.confirmP) game.state = 'playing';
    if (input.retryP) startLevel(game.lvl);
    if (input.backP && !input.pauseP) toSelect();
  } else if (game.state === 'gameover') { game.overT++; if (game.overT > 40) { if (input.confirmP || input.retryP) startLevel(game.lvl); if (input.backP) toSelect(); } }
  else if (game.state === 'clear') {
    for (const pt of particles) { pt.x += pt.vx; pt.y += pt.vy; pt.vy += pt.grav; pt.life--; } particles = particles.filter(pt => pt.life > 0);
    if (game.menuT > 40) { if (input.confirmP) nextAfterClear(); if (input.backP) toSelect(); }
  }
}
function chooseLevel(i) {
  if (i + 1 > save.unlocked) { SFX.bump(); return; }
  audioInit(); SFX.select(); game.sel = i;
  if (save.resume && save.resume.lvl === i) { game.state = 'resume'; game.resumeSel = 0; return; }
  startLevel(i);
}
function nextAfterClear() { if (game.lvl + 1 < LEVELS.length) { game.sel = game.lvl + 1; startLevel(game.lvl + 1); } else toSelect(); }
function toSelect() { game.state = 'select'; loadLevel(game.sel); Music.play('title'); }

// ----- 指针点击（菜单按钮）-----
ui.addEventListener('pointerdown', e => {
  audioInit();
  const r = ui.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
  if (game.state === 'playing') { if (e.button === 0 && e.pointerType === 'mouse') mouseDown = true; return; }
  for (const b of uiButtons) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { b.act(); return; }
  if (game.state === 'title') { game.state = 'select'; SFX.select(); }
});
window.addEventListener('pointerup', e => { if (e.pointerType === 'mouse') mouseDown = false; });
ui.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('visibilitychange', () => { if (document.hidden && game.state === 'playing') game.state = 'paused'; });
