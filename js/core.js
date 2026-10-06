'use strict';
// ===== 像素突击队 · 核心：常量、工具、音频、输入、像素美术 =====
const W = 480, H = 272, TS = 16, ROWS = 17, GY = 13;
const G = 0.32, RUN = 1.7, JUMP = 6.8, MAXFALL = 7;
const cv = document.getElementById('game'), ctx = cv.getContext('2d');
cv.width = W; cv.height = H; ctx.imageSmoothingEnabled = false;
const ui = document.getElementById('ui'), uctx = ui.getContext('2d');
let UK = 1;
const FONT_CN = '"PingFang SC","Microsoft YaHei","Noto Sans CJK SC","Noto Sans SC","Source Han Sans SC","Noto Serif CJK SC",sans-serif';

function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  let s = Math.min(vw / W, vh / H);
  if (s >= 3) s = Math.floor(s);
  const cw = Math.floor(W * s), ch = Math.floor(H * s);
  const top = vh > vw ? Math.max(0, Math.floor((vh - ch) * 0.25)) : Math.floor((vh - ch) / 2);
  for (const c of [cv, ui]) {
    c.style.width = cw + 'px'; c.style.height = ch + 'px';
    c.style.left = Math.floor((vw - cw) / 2) + 'px'; c.style.top = top + 'px';
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  ui.width = Math.max(W, Math.round(cw * dpr)); ui.height = Math.max(H, Math.round(ch * dpr));
  UK = ui.width / W;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
resize();

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rnd = n => (Math.random() * n) | 0;
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function snap8(dx, dy) {
  const ang = Math.atan2(dy, dx), i = Math.round(ang / (Math.PI / 4));
  const a = i * Math.PI / 4; let x = Math.round(Math.cos(a) * 1000) / 1000, y = Math.round(Math.sin(a) * 1000) / 1000;
  return [x, y];
}
function hash2(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return (h ^ (h >>> 16)) >>> 0; }

// ===== 音频（全部用 WebAudio 合成，无外部素材）=====
const AU = { ctx: null, master: null, noise: null, muted: false };
function audioInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const a = new AC(); AU.ctx = a; AU.master = a.createGain(); AU.master.gain.value = AU.muted ? 0 : 0.6; AU.master.connect(a.destination);
    const len = a.sampleRate * 0.6, b = a.createBuffer(1, len, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; AU.noise = b;
    Music.start();
  } catch (e) { }
}
function setMuted(m) { AU.muted = m; if (AU.master) AU.master.gain.value = m ? 0 : 0.6; }
function tone(type, f0, f1, dur, vol, delay = 0) {
  const a = AU.ctx; if (!a || AU.muted) return; const t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain(); o.type = type;
  o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(AU.master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, freq = 1500, delay = 0) {
  const a = AU.ctx; if (!a || !AU.noise || AU.muted) return; const t = a.currentTime + delay;
  const s = a.createBufferSource(); s.buffer = AU.noise; const f = a.createBiquadFilter(); f.type = 'lowpass';
  f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(60, t + dur);
  const g = a.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(AU.master); s.start(t); s.stop(t + dur + 0.02);
}
let lastShot = 0;
const SFX = {
  shoot(w) { const n = performance.now(); if (n - lastShot < 55) return; lastShot = n;
    if (w === 'L') tone('sawtooth', 1400, 300, 0.12, 0.035); else if (w === 'M') { noise(0.15, 0.08, 900); tone('square', 200, 80, 0.15, 0.03); }
    else if (w === 'S') tone('square', 700, 250, 0.07, 0.035); else tone('square', 950, 450, 0.05, 0.03); },
  eshoot() { tone('square', 400, 200, 0.08, 0.025); },
  jump() { tone('square', 280, 620, 0.12, 0.04); },
  coin() { tone('square', 988, 988, 0.06, 0.035); tone('square', 1319, 1319, 0.16, 0.035, 0.06); },
  stomp() { tone('triangle', 500, 90, 0.14, 0.12); },
  hit() { noise(0.05, 0.05, 3000); },
  kill() { noise(0.12, 0.08, 2000); tone('square', 300, 60, 0.12, 0.03); },
  boom() { noise(0.45, 0.22, 1200); tone('sine', 120, 30, 0.4, 0.15); },
  bump() { tone('triangle', 160, 100, 0.07, 0.12); },
  brk() { noise(0.18, 0.12, 2500); },
  power() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone('square', f, f, 0.08, 0.035, i * 0.06)); },
  weapon() { [440, 660, 880, 1320].forEach((f, i) => tone('square', f, f * 1.01, 0.07, 0.035, i * 0.05)); },
  hurt() { tone('sawtooth', 500, 80, 0.35, 0.06); },
  die() { [660, 520, 400, 300, 200].forEach((f, i) => tone('square', f, f * 0.9, 0.12, 0.04, i * 0.1)); },
  secret() { [784, 740, 622, 440, 415, 659, 831, 1047].forEach((f, i) => tone('square', f, f, 0.09, 0.03, i * 0.08)); },
  oneup() { [659, 784, 1319, 1047, 1175, 1568].forEach((f, i) => tone('square', f, f, 0.08, 0.035, i * 0.07)); },
  alarm() { for (let i = 0; i < 4; i++) { tone('square', 880, 440, 0.25, 0.03, i * 0.3); } },
  select() { tone('square', 660, 880, 0.06, 0.03); },
  clear() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone('square', f, f, 0.14, 0.04, i * 0.13)); },
  check() { [523, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.1, 0.08, i * 0.08)); },
};

// ===== 背景音乐：简单芯片音序器 =====
const SONGS = {
  title: { bpm: 112, bass: [45, 0, 52, 0, 45, 0, 52, 0, 43, 0, 50, 0, 41, 0, 48, 0], lead: [69, 0, 0, 72, 0, 0, 76, 0, 74, 0, 72, 0, 71, 0, 67, 0, 69, 0, 0, 72, 0, 0, 76, 0, 79, 0, 77, 0, 76, 0, 0, 0] },
  jungle: { bpm: 138, bass: [45, 0, 45, 57, 45, 0, 43, 55, 41, 0, 41, 53, 43, 0, 43, 55], lead: [69, 0, 72, 0, 76, 0, 74, 72, 69, 0, 67, 0, 69, 0, 0, 0, 65, 0, 69, 0, 72, 0, 71, 69, 67, 0, 71, 0, 74, 0, 0, 0] },
  cave: { bpm: 116, bass: [38, 0, 0, 38, 0, 0, 45, 0, 41, 0, 0, 41, 0, 0, 40, 0], lead: [62, 0, 65, 0, 69, 0, 68, 0, 65, 0, 62, 0, 0, 0, 61, 0, 62, 0, 65, 0, 69, 0, 72, 0, 71, 0, 69, 0, 0, 0, 0, 0] },
  sky: { bpm: 140, bass: [43, 0, 50, 0, 43, 0, 50, 0, 48, 0, 55, 0, 50, 0, 57, 0], lead: [79, 0, 74, 0, 71, 0, 74, 76, 79, 0, 81, 0, 79, 0, 74, 0, 76, 0, 72, 0, 69, 0, 72, 74, 76, 0, 74, 0, 72, 0, 71, 0] },
  boss: { bpm: 156, bass: [40, 40, 52, 40, 40, 52, 40, 51, 39, 39, 51, 39, 38, 38, 50, 38], lead: [64, 0, 63, 0, 64, 0, 67, 0, 66, 0, 63, 0, 0, 0, 59, 0] },
};
const Music = {
  song: null, step: 0, next: 0, timer: null,
  play(name) { if (this.song === SONGS[name]) return; this.song = SONGS[name]; this.step = 0; if (AU.ctx) this.next = AU.ctx.currentTime + 0.05; },
  start() { if (this.timer) return; if (AU.ctx) this.next = AU.ctx.currentTime + 0.05; this.timer = setInterval(() => this.tick(), 25); },
  tick() {
    const a = AU.ctx; if (!a || !this.song || AU.muted || document.hidden) { if (a) this.next = a.currentTime + 0.05; return; }
    const s = this.song, dt = 60 / s.bpm / 4;
    if (this.next < a.currentTime - 0.2) this.next = a.currentTime + 0.02;
    while (this.next < a.currentTime + 0.12) {
      const b = s.bass[this.step % s.bass.length], l = s.lead[this.step % s.lead.length];
      const t = this.next - a.currentTime;
      if (b) tone('triangle', mf(b), mf(b), dt * 1.6, 0.09, t);
      if (l) tone('square', mf(l), mf(l), dt * 1.4, 0.022, t);
      this.next += dt; this.step++;
    }
  }
};
const mf = n => 440 * Math.pow(2, (n - 69) / 12);

// ===== 输入：键盘 / 鼠标 / 触屏 =====
const keys = {};
const input = { left: 0, right: 0, up: 0, down: 0, jump: 0, fire: 0, jumpP: 0, pauseP: 0, confirmP: 0, backP: 0, navL: 0, navR: 0, retryP: 0 };
const touch = { jx: 0, jy: 0, jump: 0, fire: 0, auto: false };
let mouseDown = false, isTouch = false;
const GAME_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyJ', 'KeyK', 'KeyX', 'KeyZ'];
window.addEventListener('keydown', e => {
  const k = e.code; if (GAME_KEYS.includes(k)) e.preventDefault();
  audioInit();
  if (e.repeat) return;
  keys[k] = true;
  if (k === 'Space' || k === 'KeyK' || k === 'KeyZ') input.jumpP = 1;
  if (k === 'KeyP' || k === 'Escape') input.pauseP = 1;
  if (k === 'Enter' || k === 'Space' || k === 'KeyJ' || k === 'KeyK') input.confirmP = 1;
  if (k === 'Escape' || k === 'Backspace') input.backP = 1;
  if (k === 'ArrowLeft' || k === 'KeyA') input.navL = 1;
  if (k === 'ArrowRight' || k === 'KeyD') input.navR = 1;
  if (k === 'KeyR') input.retryP = 1;
  if (k === 'KeyM') toggleMute();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseDown = false; });
function pollInput() {
  input.left = !!(keys.ArrowLeft || keys.KeyA || touch.jx < -0.38);
  input.right = !!(keys.ArrowRight || keys.KeyD || touch.jx > 0.38);
  input.up = !!(keys.ArrowUp || keys.KeyW || touch.jy < -0.38);
  input.down = !!(keys.ArrowDown || keys.KeyS || touch.jy > 0.38);
  input.jump = !!(keys.Space || keys.KeyK || keys.KeyZ || touch.jump);
  input.fire = !!(keys.KeyJ || keys.KeyX || mouseDown || touch.fire || touch.auto);
}
function clearEdges() { input.jumpP = input.pauseP = input.confirmP = input.backP = input.navL = input.navR = input.retryP = 0; }

// 触屏控件
function setupTouch() {
  const stick = document.getElementById('stick'), knob = document.getElementById('knob');
  let sid = null;
  const upd = e => {
    const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, rad = r.width / 2;
    let dx = (e.clientX - cx) / rad, dy = (e.clientY - cy) / rad; const m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; }
    if (m < 0.3) { touch.jx = 0; touch.jy = 0; } else { touch.jx = dx; touch.jy = dy; }
    knob.style.transform = `translate(${dx * rad * 0.6}px,${dy * rad * 0.6}px)`;
  };
  stick.addEventListener('pointerdown', e => { e.preventDefault(); audioInit(); sid = e.pointerId; stick.setPointerCapture(sid); upd(e); });
  stick.addEventListener('pointermove', e => { if (e.pointerId === sid) upd(e); });
  const end = e => { if (e.pointerId !== sid) return; sid = null; touch.jx = touch.jy = 0; knob.style.transform = ''; };
  stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
  const btn = (id, on, off) => {
    const el = document.getElementById(id);
    el.addEventListener('pointerdown', e => { e.preventDefault(); audioInit(); el.setPointerCapture(e.pointerId); el.classList.add('on'); on(); });
    const up = e => { el.classList.remove('on'); off && off(); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  };
  btn('btnJump', () => { touch.jump = 1; input.jumpP = 1; }, () => { touch.jump = 0; });
  btn('btnFire', () => { touch.fire = 1; }, () => { touch.fire = 0; });
  btn('btnAuto', () => { touch.auto = !touch.auto; document.getElementById('btnAuto').classList.toggle('lit', touch.auto); });
  btn('btnPause', () => { input.pauseP = 1; });
  btn('btnMute', () => { toggleMute(); });
  document.getElementById('touch').addEventListener('contextmenu', e => e.preventDefault());
}
function toggleMute() { setMuted(!AU.muted); if (typeof save !== 'undefined') { save.muted = AU.muted; writeSave(); } const b = document.getElementById('btnMute'); if (b) b.textContent = AU.muted ? '🔇' : '🔊'; }
setupTouch();
if (window.matchMedia && matchMedia('(pointer: coarse)').matches) isTouch = true;
window.addEventListener('touchstart', () => { isTouch = true; }, { passive: true });

// ===== 像素美术：程序化生成贴图 =====
function mk(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; fn(g, w, h); return c; }
function P(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }

const THEMES = {
  kitchen: {
    wall: ['#f6e7c8', '#efd9b0', '#e2c48f'], wallLine: '#d8b97e', far: '#c98a5a', farHi: '#dca070', near: '#8a5a3a', nearHi: '#a8744c', glow: '#fff6d8',
    top: ['#f4f1ea', '#d9d4c8', '#b9b2a2'], fill: ['#b0703c', '#9a5e30', '#c8864e', '#7a4824'],
    brick: ['#e8b45a', '#a8742a', '#fbd88a'], stone: ['#c9d1da', '#8e98a4', '#eef2f6', '#6a7480'],
    pillar: ['#e2343c', '#a81e26', '#ff8a8a', '#701018'], pillarCap: '#d8d8d8', used: ['#9a8a7a', '#6a5a4a', '#baa898'], plate: ['#ffffff', '#dfe7ee', '#9fb0c0'], lava: false, music: 'jungle', label: '厨房'
  },
  fridge: {
    wall: ['#cfeefa', '#bde4f5', '#a6d6ec'], wallLine: '#93c6df', far: '#8fc3dc', farHi: '#b6e2f2', near: '#6aa6c8', nearHi: '#e9fbff', glow: '#ffffff',
    top: ['#ffffff', '#d8f4ff', '#a8dcf0'], fill: ['#7fb8d8', '#6aa6c8', '#9ccbe4', '#4f88ac'],
    brick: ['#bff0ff', '#6cc4e0', '#ffffff'], stone: ['#b8c4d0', '#7d8a98', '#e6eef6', '#56616e'],
    pillar: ['#f8f8f2', '#c8d0d8', '#ffffff', '#3a7ac0'], pillarCap: '#3a7ac0', used: ['#8aa0b0', '#5a7080', '#aac0d0'], plate: ['#e8fbff', '#bfe6f5', '#7fb8d8'], lava: false, music: 'cave', label: '冰箱'
  },
  oven: {
    wall: ['#3a1a14', '#4a2018', '#5a2a1c'], wallLine: '#2a120e', far: '#6a2a18', farHi: '#ff6a2a', near: '#2a1410', nearHi: '#ff9a3a', glow: '#ffb050',
    top: ['#c8ccd2', '#9aa0a8', '#6a7078'], fill: ['#4a4e56', '#3a3e46', '#5a5e66', '#2a2e36'],
    brick: ['#d89850', '#8a5420', '#f8c890'], stone: ['#8a8e96', '#5a5e66', '#b8bcc4', '#3a3e46'],
    pillar: ['#ffcc33', '#d89a10', '#fff0a0', '#8a5a00'], pillarCap: '#8a5a00', used: ['#6a5a50', '#4a3a30', '#8a7a70'], plate: ['#d8d8d8', '#a8a8a8', '#6a6a6a'], lava: true, music: 'sky', label: '烤箱'
  }
};

function makeTiles(th) {
  const t = {};
  t.fill = [1, 2, 3].map(s => mk(16, 16, g => { const r = rng(s * 77); P(g, 0, 0, 16, 16, th.fill[0]);
    for (let y = 3; y < 16; y += 5) P(g, 0, y, 16, 1, th.fill[1]);
    for (let i = 0; i < 6; i++) P(g, r() * 15 | 0, r() * 15 | 0, 2 + (r() * 3 | 0), 1, th.fill[2]);
    if (s === 2) { P(g, 6, 7, 4, 2, th.fill[3]); P(g, 7, 7, 2, 1, th.fill[2]); } }));
  t.top = [4, 5].map(s => mk(16, 16, g => { const r = rng(s * 31); P(g, 0, 0, 16, 16, th.fill[0]);
    for (let y = 8; y < 16; y += 5) P(g, 0, y, 16, 1, th.fill[1]);
    P(g, 0, 0, 16, 5, th.top[0]); P(g, 0, 4, 16, 1, th.top[2]); P(g, 0, 5, 16, 1, th.fill[3]);
    for (let i = 0; i < 4; i++) P(g, r() * 15 | 0, 1 + (r() * 3 | 0), 2, 1, th.top[1]); P(g, 0, 0, 16, 1, '#ffffff'); }));
  // 饼干砖
  t.brick = mk(16, 16, g => { P(g, 0, 0, 16, 16, th.brick[1]); P(g, 1, 1, 14, 14, th.brick[0]); P(g, 1, 1, 14, 1, th.brick[2]); P(g, 1, 1, 1, 14, th.brick[2]);
    [[4, 4], [11, 4], [7, 8], [4, 11], [11, 11]].forEach(([x, y]) => { P(g, x, y, 2, 2, th.brick[1]); }); });
  // 礼物盒（神秘方块）
  t.q = [0, 1, 2, 3].map(f => mk(16, 16, g => {
    const box = ['#e83a6a', '#f04a7a', '#ff6a94', '#f04a7a'][f];
    P(g, 0, 2, 16, 14, '#7a1030'); P(g, 1, 3, 14, 12, box); P(g, 1, 3, 14, 1, '#ff9ab8');
    P(g, 7, 2, 2, 14, '#ffe14a'); P(g, 0, 7, 16, 2, '#ffe14a'); P(g, 7, 2, 2, 1, '#fff6b0');
    P(g, 3, 0, 4, 2, '#ffe14a'); P(g, 9, 0, 4, 2, '#ffe14a'); P(g, 5, 1, 2, 1, '#c8a010'); P(g, 9, 1, 2, 1, '#c8a010');
    P(g, 3, 11, 2, 1, '#fff'); P(g, 4, 10, 1, 3, '#fff'); if (f === 2) { P(g, 12, 4, 1, 1, '#fff'); P(g, 2, 12, 1, 1, '#fff'); }
  }));
  // 幸运饼干方块
  t.cookie = [0, 1, 2, 3].map(f => mk(16, 16, g => {
    P(g, 0, 0, 16, 16, '#5a3010'); P(g, 1, 1, 14, 14, '#7a4818');
    const c1 = '#f0b84a', c2 = '#c88a28', c3 = '#ffe0a0';
    P(g, 3, 5, 10, 6, c1); P(g, 2, 7, 12, 3, c1); P(g, 4, 4, 8, 1, c3); P(g, 3, 10, 10, 1, c2); P(g, 7, 5, 2, 6, c2);
    P(g, 9 + (f % 2), 9, 5, 2, '#ffffff'); P(g, 10 + (f % 2), 10, 3, 1, '#e83a3a');
    if (f === 1 || f === 3) P(g, 2, 2, 1, 1, '#fff6b0');
  }));
  t.used = mk(16, 16, g => { P(g, 0, 0, 16, 16, th.used[1]); P(g, 1, 1, 14, 14, th.used[0]); P(g, 1, 1, 14, 1, th.used[2]); P(g, 4, 7, 8, 2, th.used[1]); });
  // 不锈钢块
  t.stone = mk(16, 16, g => { P(g, 0, 0, 16, 16, th.stone[0]); P(g, 0, 0, 16, 1, th.stone[2]); P(g, 0, 0, 1, 16, th.stone[2]);
    P(g, 0, 15, 16, 1, th.stone[3]); P(g, 15, 0, 1, 16, th.stone[3]); P(g, 3, 3, 6, 1, th.stone[2]); P(g, 3, 3, 1, 4, th.stone[2]);
    [[2, 2], [13, 2], [2, 13], [13, 13]].forEach(([x, y]) => P(g, x, y, 1, 1, th.stone[1])); });
  // 汽水罐/调味瓶柱子
  const pil = (left, topcap) => mk(16, 16, g => {
    const p = th.pillar; P(g, 0, 0, 16, 16, p[0]);
    if (left) { P(g, 0, 0, 1, 16, p[3]); P(g, 2, 0, 2, 16, p[2]); } else { P(g, 15, 0, 1, 16, p[3]); P(g, 11, 0, 3, 16, p[1]); }
    P(g, 0, 8, 16, 3, '#ffffff'); P(g, 0, 9, 16, 1, p[1]);
    if (topcap) { P(g, 0, 0, 16, 4, th.pillarCap); P(g, 0, 0, 16, 1, '#ffffff'); P(g, 0, 3, 16, 1, '#555'); if (left) P(g, 5, 1, 6, 1, '#888'); }
  });
  t.pL = pil(true, false); t.pR = pil(false, false); t.pLT = pil(true, true); t.pRT = pil(false, true);
  // 漂浮餐盘（单向平台）
  t.cloud = mk(16, 16, g => { const c = th.plate; P(g, 0, 1, 16, 4, c[0]); P(g, 0, 0, 16, 1, c[1]); P(g, 2, 2, 12, 1, c[1]); P(g, 0, 5, 16, 1, c[2]); P(g, 3, 6, 10, 1, c[2]); });
  // 叉子尖刺
  t.spike = mk(16, 16, g => { for (let i = 0; i < 2; i++) { const x = i * 8 + 1; P(g, x + 2, 11, 2, 5, '#9aa4ae'); P(g, x, 9, 6, 2, '#c8d0d8');
    for (let k = 0; k < 4; k++) P(g, x + k * 2 - (k > 1 ? 1 : 0), 3, 1, 6, '#eef4fa'); P(g, x, 3, 6, 1, '#ffffff'); } P(g, 0, 15, 16, 1, '#4b525c'); });
  // 烤架闸门
  t.gate = mk(16, 16, g => { P(g, 0, 0, 16, 16, '#2a2c34'); for (let x = 1; x < 16; x += 5) { P(g, x, 0, 3, 16, '#5d6270'); P(g, x, 0, 1, 16, '#8c93a3'); } P(g, 0, 7, 16, 2, '#ff6a2a'); });
  return t;
}

function makeBG(th, key) {
  const per = (x, k) => Math.sin(x / 512 * Math.PI * 2 * k);
  // 墙面：瓷砖
  const sky = mk(W, H, g => { P(g, 0, 0, W, H, th.wall[0]);
    for (let y = 0; y < H; y += 24) for (let x = 0; x < W; x += 24) { if (((x + y) / 24) % 2 === 0) P(g, x, y, 24, 24, th.wall[1]); P(g, x, y, 24, 1, th.wallLine); P(g, x, y, 1, 24, th.wallLine); }
    P(g, 0, H - 70, W, 70, th.wall[2]); });
  let far, near, deco;
  if (key === 'kitchen') {
    // 远景：吊柜 + 窗户
    far = mk(512, H, g => { P(g, 0, 0, 512, 46, th.far); P(g, 0, 44, 512, 4, th.near);
      for (let x = 0; x < 512; x += 64) { P(g, x + 2, 4, 60, 36, th.farHi); P(g, x + 30, 18, 4, 10, th.near); }
      P(g, 300, 70, 110, 70, '#7ad0f2'); P(g, 300, 70, 110, 4, '#fff'); P(g, 352, 70, 6, 70, '#fff'); P(g, 300, 104, 110, 4, '#fff'); P(g, 296, 140, 118, 6, th.near);
      P(g, 320, 84, 14, 8, '#ffffff'); P(g, 372, 116, 20, 6, '#ffffff'); });
    // 近景：巨型瓶罐、锅铲剪影
    near = mk(512, H, g => { const r = rng(3);
      for (let i = 0; i < 7; i++) { const x = i * 74 + (r() * 20 | 0), hh = 50 + r() * 50 | 0, w = 26 + r() * 16 | 0, y = H - 64 - hh;
        P(g, x, y, w, hh, th.near); P(g, x + 4, y - 8, w - 8, 8, th.nearHi); P(g, x + 3, y + 6, 3, hh - 12, th.nearHi); P(g, x + 6, y + 18, w - 12, 12, th.glow); }
      P(g, 150, 60, 6, 120, '#6a4a34'); P(g, 138, 40, 30, 24, '#9aa4ae'); P(g, 420, 50, 4, 130, '#6a4a34'); P(g, 412, 30, 20, 26, '#c8d0d8'); });
    deco = mk(512, H, g => { const r = rng(9); for (let i = 0; i < 10; i++) { const x = r() * 500 | 0, y = 60 + r() * 120 | 0; P(g, x, y, 2, 2, 'rgba(255,255,255,0.6)'); } });
  } else if (key === 'fridge') {
    far = mk(512, H, g => { for (let y = 40; y < H; y += 70) { P(g, 0, y, 512, 4, '#ffffff'); P(g, 0, y + 4, 512, 2, '#7fb8d8'); }
      P(g, 220, 0, 70, 18, '#ffffe0'); P(g, 230, 18, 50, 4, '#ffffff'); });
    near = mk(512, H, g => { const r = rng(4); const cols = ['#ffef9a', '#ff9aa8', '#b8f0a0', '#ffffff', '#ffc070'];
      for (let i = 0; i < 9; i++) { const x = i * 56 + (r() * 16 | 0), hh = 30 + r() * 60 | 0, w = 20 + r() * 16 | 0, c = cols[i % 5];
        P(g, x, H - 60 - hh, w, hh, c); P(g, x + 2, H - 60 - hh + 4, 3, hh - 8, '#ffffff'); P(g, x, H - 60 - hh + hh / 2 | 0, w, 6, th.near); } });
    deco = mk(512, H, g => { const r = rng(11); for (let i = 0; i < 50; i++) P(g, r() * 512 | 0, r() * H | 0, 1, 1, '#ffffff'); });
  } else {
    far = mk(512, H, g => { for (let y = 30; y < H; y += 80) { for (let x = 0; x < 512; x += 2) P(g, x, y + Math.round(per(x, 16) * 3), 2, 3, th.farHi); } });
    near = mk(512, H, g => { for (let x = 0; x < 512; x += 16) { P(g, x, 0, 2, H, th.near); } P(g, 0, 120, 512, 3, th.near); P(g, 0, 200, 512, 3, th.near); });
    deco = mk(512, H, g => { const r = rng(13); for (let i = 0; i < 40; i++) P(g, r() * 512 | 0, r() * H | 0, 1, 2, r() < .5 ? '#ffb050' : '#ff6a2a'); });
  }
  return { sky, far, near, deco };
}
const ART = {};
for (const k in THEMES) { ART[k] = { tiles: makeTiles(THEMES[k]), bg: makeBG(THEMES[k], k) }; }

// 3x5 像素字母（武器图标）
const FONT = { S: ['111', '100', '111', '001', '111'], L: ['100', '100', '100', '100', '111'], R: ['110', '101', '110', '101', '101'], M: ['101', '111', '111', '101', '101'], N: ['101', '111', '111', '111', '101'] };
function drawLetter(g, ch, x, y, c) { const f = FONT[ch]; if (!f) return; g.fillStyle = c; for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) if (f[r][k] === '1') g.fillRect(x + k, y + r, 1, 1); }
const WEAPONS = {
  N: { name: '骨头弹', c: '#ffffff', say: '' },
  S: { name: '番茄酱喷射', c: '#ff3a3a', say: '番茄酱喷射！滋滋滋~' },
  L: { name: '辣椒激光', c: '#ff7a1a', say: '辣椒激光！嘶哈嘶哈~' },
  R: { name: '爆米花机枪', c: '#ffe680', say: '爆米花机枪！嘭嘭嘭嘭！' },
  M: { name: '法棍火箭', c: '#e0a050', say: '法棍火箭！法式浪漫！' } };
