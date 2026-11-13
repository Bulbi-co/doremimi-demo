/*
 * The app's canvas (Doremimi/Controls/StageBackdrop.cs, BackdropMood.cs, BackdropArt.cs and
 * Doremimi.Core/Engine/BackdropField.cs; D34): a near-white base, three soft colour blobs stirring around the middle,
 * and 10-14 floating 2.5D notes. On the tabs it is calm scenery; in the game it follows the ladder, and a move between
 * levels sweeps the new colour across the screen with a burst of notes and a rush of pace.
 *
 * First pass of dossier ch. 10 P-12: the numbers are the app's (ch. 05 §11), the drawing is a 2D-canvas approximation
 * and has not been compared frame by frame with the app (O-15).
 */
import { seeded } from './rng.js';

const BASE = '#F7F6FB';
const NAVY = '#0A0A3C';
const C = { blue: '#2B9BFF', cyan: '#3FDAFF', yellow: '#FFCC00', orange: '#FF4D00', orchid: '#E85BE6', magenta: '#E0109E', mint: '#38E08C', indigo: '#14107A', steel: '#1C6FAA' };

/** BackdropMood.cs:29-99. Tabs take their wash's three stops; their pace never changes, so speed means nothing there. */
const tab = (a, b, c) => ({ tints: [a, b, c], notes: [a, b, C.indigo], alpha: 0.26, pace: 0.8, celebrates: false });
export const MOODS = {
  kesfet: tab(C.magenta, C.orchid, C.yellow),
  ogren: tab(C.cyan, C.mint, C.blue),
  oyunlar: tab(C.blue, C.cyan, C.orchid),
  daha: tab(C.orchid, C.blue, C.magenta),
  // Navigation revision (dossier ch. 11 OC-22): İzle takes Daha fazla's measured wash and Çal takes Oyunlar', so no
  // new contrast has to be measured for them; the logo's hub gets the one new, warm wash (PROPOSED: the cream of the
  // Doremimi nedir? card, its tints are warm; its notes skip yellow, which vanishes on the near-white base, as Yaz's do).
  izle: tab(C.orchid, C.blue, C.magenta),
  cal: tab(C.blue, C.cyan, C.orchid),
  doremimi: { ...tab(C.yellow, C.orange, C.magenta), notes: [C.orange, C.magenta, C.indigo] },
  // "the canvas should feel like a held breath. Yaz is three times as fast" (BackdropMood.cs:49-53).
  cevir: { tints: [C.orchid, C.blue, C.cyan], notes: [C.orchid, C.indigo, C.steel], alpha: 0.24, pace: 0.55, celebrates: true },
  sec: { tints: [C.cyan, C.blue, C.mint], notes: [C.blue, C.steel, C.indigo], alpha: 0.28, pace: 1.0, celebrates: true },
  // The yellow notes would vanish on the near-white base, so Yaz's notes are Orange, Magenta and Indigo.
  yaz: { tints: [C.yellow, C.orange, C.magenta], notes: [C.orange, C.magenta, C.indigo], alpha: 0.30, pace: 1.7, celebrates: true },
};

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const x = hex(a), y = hex(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const rgba = (h, a) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };
const smooth = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

// ───────────── note shapes (BackdropArt.cs:9-136), built once in unit space and centred, one unit tall

function head(p, x, y) { p.ellipse(x, y, 0.30, 0.215, -0.38, 0, Math.PI * 2); }
function glints(p, heads, stems) {
  for (const [x, y] of heads) p.ellipse(x - 0.10, y - 0.07, 0.10, 0.045, -0.50, 0, Math.PI * 2);
  for (const [x, top, bottom] of stems) p.rect(x + 0.012, top + 0.06, 0.026, bottom - top - 0.12);
}
function unit(build, glint, top, bottom, left, right) {
  const raw = new Path2D(); build(raw);
  const g = new Path2D(); glint(g);
  const h = bottom - top, s = 1 / h, cx = (left + right) / 2, cy = (top + bottom) / 2;
  const m = new DOMMatrix().scale(s, s).translate(-cx, -cy);
  const face = new Path2D(); face.addPath(raw, m);
  const shine = new Path2D(); shine.addPath(g, m);
  return { face, shine, w: (right - left) * s };
}
const SHAPES = {
  quaver: unit(p => { head(p, 0, 0); p.rect(0.20, -1.05, 0.11, 1.01); p.moveTo(0.31, -1.05); p.bezierCurveTo(0.58, -0.86, 0.64, -0.62, 0.50, -0.36); p.bezierCurveTo(0.52, -0.6, 0.44, -0.74, 0.31, -0.78); p.closePath(); },
    p => glints(p, [[0, 0]], [[0.20, -1.05, -0.04]]), -1.05, 0.22, -0.31, 0.62),
  crotchet: unit(p => { head(p, 0, 0); p.rect(0.20, -1.05, 0.11, 1.01); }, p => glints(p, [[0, 0]], [[0.20, -1.05, -0.04]]), -1.05, 0.22, -0.31, 0.31),
  beamed: unit(p => {
    head(p, 0, 0); head(p, 0.66, -0.10); p.rect(0.20, -1.05, 0.11, 1.01); p.rect(0.86, -1.14, 0.11, 1.0);
    // "a little steeper than the heads, as engravers draw it" (BackdropArt.cs:47-57)
    p.moveTo(0.20, -1.06); p.lineTo(0.96, -1.16); p.lineTo(0.96, -0.97); p.lineTo(0.20, -0.87); p.closePath();
  }, p => glints(p, [[0, 0], [0.66, -0.10]], [[0.20, -1.05, -0.04], [0.86, -1.14, -0.14]]), -1.16, 0.22, -0.31, 0.97),
};
const KINDS = ['quaver', 'beamed', 'crotchet'];

export class Backdrop {
  /**
   * @param canvas the element to draw into (it fills its parent)
   * @param opts.seed note layout seed (the shell uses 5, the game 3, as in the app)
   * @param opts.clearTop px from the top where the title band starts (status bar in embed mode)
   * @param opts.avoid optional () => {x, y, w, h} | null, in the canvas's own px: notes fade out before they reach it.
   *   The deck passes its phone frame, so the field never peeks out from behind the device (the Eylül deck keeps the
   *   area round its phone clean). Asked every frame, so it follows the device as it slides between layouts.
   */
  constructor(canvas, { seed = 5, mood = 'kesfet', clearTop = 0, reduced = false, avoid = null } = {}) {
    this.canvas = canvas;
    this.avoid = avoid;
    this.ctx = canvas.getContext('2d');
    this.clearTop = clearTop;
    this.reduced = reduced;
    this.mood = MOODS[mood];
    this.from = null; this.fade = 1;          // tab cross-fade (400 ms, motion.json backgroundFadeMs)
    this.sweep = null;                        // level change: { from, t }
    this.burst = [];
    this.pace = this.mood.pace; this.kick = 0;
    this.t = 0; this.last = 0; this.running = false;
    this.rand = seeded(seed * 7919 + 1);
    this.#resize();
    this.#seedNotes();
    new ResizeObserver(() => this.#resize()).observe(canvas);
    this.tick = now => this.#frame(now);
  }

  /** A tab change cross-fades; a level change in the game sweeps (only levels celebrate, BackdropMood.cs:69-70). */
  setMood(name, { celebrate = true, up = true } = {}) {
    const next = MOODS[name];
    if (!next || next === this.mood) return;
    const prev = this.mood;
    this.mood = next;
    if (this.reduced) { this.pace = next.pace; this.draw(); return; }
    if (celebrate && next.celebrates && prev.celebrates) {
      this.sweep = { from: prev, t: 0 };
      this.kick = up ? 1.4 : 0.7;
      this.#throwBurst(up);
    } else {
      this.from = prev; this.fade = 0;
    }
  }

  start() { if (this.running) return; this.running = true; this.last = performance.now(); requestAnimationFrame(this.tick); }
  stop() { this.running = false; }

  #resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height); this.dpr = dpr;
    this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr);
    if (this.notes && (!this.running || this.reduced)) this.draw();
  }

  /** BackdropField.cs:49-71: depth spread far→near, golden / plastic steps for the start, a clef or two mid-depth. */
  #seedNotes() {
    const r = this.rand.unit;
    const count = 10 + Math.floor(r() * 5);
    const clefs = new Set([Math.floor(count * 0.45)]);
    if (count >= 14) clefs.add(Math.floor(count * 0.7));
    this.notes = Array.from({ length: count }, (_, i) => {
      const depth = (i + 0.15 + 0.7 * r()) / count;
      return {
        i, depth, kind: clefs.has(i) ? 'clef' : KINDS[Math.floor(r() * 3)],
        fx: ((i * 0.618034 + 0.1 * r()) % 1), y: ((i * 0.754878 + 0.1 * r()) % 1) * this.h,
        size: (40 + depth * 64) * (0.9 + 0.2 * r()), phase: r() * Math.PI * 2,
      };
    });
  }

  #throwBurst(up) {
    const r = this.rand.unit;
    this.burst = Array.from({ length: 12 }, (_, i) => {
      const spreadA = up ? 1.2 : 1.8;
      const heading = (up ? -Math.PI / 2 : Math.PI / 2) + (r() * 2 - 1) * spreadA;
      const speed = (up ? 520 : 300) * (0.7 + 0.5 * r());
      return {
        x: this.w / 2 + Math.cos(heading) * 50, y: this.h * 0.55 + Math.sin(heading) * 30,
        vx: Math.cos(heading) * speed, vy: Math.sin(heading) * speed, spin: (r() * 2 - 1) * 2.5, a: 0,
        size: 44 + 30 * r(), kind: KINDS[Math.floor(r() * 3)], color: this.mood.notes[i % 3], age: 0,
      };
    });
  }

  #frame(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);  // clamp, so a background tab does not jump
    this.last = now;
    if (!this.reduced) this.step(dt);
    this.draw();
    requestAnimationFrame(this.tick);
  }

  step(dt) {
    // StageBackdrop.cs:279-281: ease toward the level's pace, rushed by the kick of a move.
    this.pace += (this.mood.pace - this.pace) * (1 - Math.exp(-1.2 * dt));
    this.kick *= Math.exp(-1.6 * dt);
    const pace = this.pace * (1 + this.kick);
    this.t += dt * pace;
    for (const n of this.notes) {
      n.y -= (9 + n.depth * 21) * pace * dt;
      if (n.y < -n.size) { n.y = this.h + n.size; n.fx = this.rand.unit(); }
    }
    if (this.from) { this.fade = Math.min(1, this.fade + dt / 0.4); if (this.fade >= 1) this.from = null; }
    if (this.sweep) { this.sweep.t += dt / 1.1; if (this.sweep.t >= 1) this.sweep = null; }
    for (const b of this.burst) {
      b.age += dt;
      const drag = Math.exp(-2.6 * dt);
      b.vx *= drag; b.vy = b.vy * drag - 30 * dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.spin * dt;
    }
    this.burst = this.burst.filter(b => b.age < 1.4);
  }

  // ───────────── drawing

  draw() {
    const { ctx, w, h, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = BASE;
    ctx.fillRect(0, 0, w, h);

    let crest = null;
    if (this.sweep) {
      const a = -0.32, ux = Math.cos(a), uy = Math.sin(a);
      const s = [0, w * ux, h * uy, w * ux + h * uy];
      const smin = Math.min(...s), smax = Math.max(...s), W = 0.7 * Math.max(w, h);
      crest = { ux, uy, W, c: smin - W / 2 + (smax - smin + W) * smooth(this.sweep.t) };
      this.#field(this.sweep.from, 1);
      ctx.save();
      // Behind the crest the canvas is the new level's, ahead of it the old one's, so the colour travels.
      const L = Math.hypot(w, h) * 2, c = crest.c;
      ctx.beginPath();
      const px = ux * c, py = uy * c, vx = -uy, vy = ux;
      ctx.moveTo(px + vx * L, py + vy * L); ctx.lineTo(px - vx * L, py - vy * L);
      ctx.lineTo(px - vx * L - ux * L, py - vy * L - uy * L); ctx.lineTo(px + vx * L - ux * L, py + vy * L - uy * L);
      ctx.closePath(); ctx.clip();
      ctx.fillStyle = BASE; ctx.fillRect(0, 0, w, h);
      this.#field(this.mood, 1);
      ctx.restore();
      const g = ctx.createLinearGradient(ux * (c - crest.W / 2), uy * (c - crest.W / 2), ux * (c + crest.W / 2), uy * (c + crest.W / 2));
      const [t0, t1] = this.mood.tints;
      g.addColorStop(0, rgba(t0, 0)); g.addColorStop(0.32, rgba(t0, 0.35)); g.addColorStop(0.5, 'rgba(255,255,255,0.55)');
      g.addColorStop(0.68, rgba(t1, 0.35)); g.addColorStop(1, rgba(t1, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    } else if (this.from) {
      this.#field(this.from, 1 - smooth(this.fade));
      this.#field(this.mood, smooth(this.fade));
    } else {
      this.#field(this.mood, 1);
    }

    const keepOut = this.avoid?.();
    for (const n of this.notes) {
      const t = this.t, d = n.depth;
      const x = n.fx * w + (8 + 14 * d) * Math.sin(0.45 * t + n.phase);
      const y = n.y + 6 * Math.sin(1.1 * t + 1.7 * n.phase);
      const top = this.clearTop + 92;
      let fade = smooth((y - top) / 150);
      if (keepOut) {
        // Distance from the note's centre to the rectangle; the note is gone while its body (~size) could touch it.
        const dx = Math.max(keepOut.x - x, 0, x - keepOut.x - keepOut.w), dy = Math.max(keepOut.y - y, 0, y - keepOut.y - keepOut.h);
        fade *= smooth((Math.hypot(dx, dy) - n.size) / 60);
      }
      if (fade <= 0) continue;
      let colors = this.mood.notes;
      if (crest && x * crest.ux + y * crest.uy > crest.c) colors = this.sweep.from.notes;
      else if (this.from && this.fade < 0.5) colors = this.from.notes;
      this.#note(n.kind, x, y, n.size * (0.8 + 0.2 * fade), colors[n.i % 3], 0.55 + d * 0.45, d,
        0.22 * Math.sin(0.33 * t + n.phase), 0.55 * Math.sin(0.27 * t + 0.6 * n.phase), fade);
    }
    for (const b of this.burst) {
      const pop = Math.min(1, b.age / 0.3), back = 1 + 2.6 * Math.pow(pop - 1, 3) + 1.6 * Math.pow(pop - 1, 2);
      const life = b.age / 1.4, alpha = life < 0.55 ? 1 : 1 - (life - 0.55) / 0.45;
      if (b.y < this.clearTop + 92) continue;
      this.#note(b.kind, b.x, b.y, b.size * back, b.color, 1, 1, b.a, 0, alpha);
    }
  }

  /** StageBackdrop.cs:339-358 and :462-475: three stretched blobs; each tint fades to itself at zero alpha. */
  #field(mood, strength) {
    const { ctx, w, h } = this, t = this.t;
    for (let i = 0; i < 3; i++) {
      const angle = i * 2 * Math.PI / 3 + 0.11 * t + 0.4 * Math.sin(0.07 * t + i);
      const orbit = 0.26 + 0.10 * Math.sin(0.17 * t + 1.7 * i);
      const cx = w * (0.5 + orbit * Math.cos(angle)), cy = h * (0.5 + 0.9 * orbit * Math.sin(angle));
      const r = Math.max(w, h) * (0.34 + 0.04 * Math.sin(0.19 * t + 2.3 * i));
      const a = mood.alpha * strength, tint = mood.tints[i];
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(angle + Math.PI / 2); ctx.scale(1.35, 0.8);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, rgba(tint, a)); g.addColorStop(0.35, rgba(tint, 0.78 * a)); g.addColorStop(0.7, rgba(tint, 0.32 * a)); g.addColorStop(1, rgba(tint, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  /** BackdropArt.cs:138-186 / StageBackdrop.cs:402-456: shadow, extruded side, lit face, sheen and glints. */
  #note(kind, x, y, size, color, presence, depth, tilt, turn, alpha) {
    const { ctx } = this;
    const show = c => mix(BASE, c, presence);  // far notes are opaque, mixed toward the canvas, not translucent
    const squash = 0.78 + 0.22 * Math.cos(turn);
    const e = size * (0.05 + 0.03 * depth), ex = e * (0.45 + 0.45 * Math.sin(turn + 0.6)), ey = 0.9 * e;
    const lift = size * (0.05 + 0.10 * depth);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y); ctx.rotate(tilt);
    const paint = (fill, dx = 0, dy = 0, scale = 1) => {
      ctx.save(); ctx.translate(dx, dy); ctx.scale(size * squash * scale, size * scale);
      if (kind === 'clef') {
        // The Noto Music treble clef, drawn 1.35x taller "or it read as a squiggle" (BackdropArt.cs:69-83).
        ctx.scale(1 / 1.35, 1);
        ctx.font = '1px "Noto Music"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = fill; ctx.save(); ctx.scale(1.0, 1.35); ctx.fillText('𝄞', 0, 0.05); ctx.restore();
      } else { ctx.fillStyle = fill; ctx.fill(SHAPES[kind].face); }
      ctx.restore();
    };
    const shadow = rgba(NAVY, (0.05 + 0.04 * depth) * presence);
    paint(shadow, 0.6 * lift, 1.4 * lift); paint(shadow, 0.6 * lift, 1.4 * lift, 1.05);
    const side = show(mix(color, NAVY, 0.42));
    const layers = Math.min(18, Math.max(1, Math.round(Math.hypot(ex, ey) * this.dpr)));
    for (let k = layers; k >= 1; k--) paint(side, ex * k / layers, ey * k / layers);
    const g = ctx.createLinearGradient(-0.4 * size, -0.5 * size, 0.4 * size, 0.5 * size);
    g.addColorStop(0, show(mix(color, '#FFFFFF', 0.38))); g.addColorStop(0.5, show(color)); g.addColorStop(1, show(mix(color, NAVY, 0.16)));
    paint(g);
    // "Wet-paint sheen … the reason the objects read as glossy toys"
    const sheen = ctx.createLinearGradient(-0.3 * size, -0.5 * size, 0.1 * size, 0.05 * size);
    sheen.addColorStop(0, `rgba(255,255,255,${(120 * presence / 255).toFixed(3)})`); sheen.addColorStop(1, 'rgba(255,255,255,0)');
    paint(sheen);
    if (kind !== 'clef') {
      ctx.save(); ctx.scale(size * squash, size); ctx.fillStyle = `rgba(255,255,255,${0.85 * presence})`; ctx.fill(SHAPES[kind].shine); ctx.restore();
    }
    ctx.restore();
  }
}
