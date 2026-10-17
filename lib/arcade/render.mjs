import { FIGHTERS, MAPS, clamp } from "./data.mjs";

const ease = (t) => {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
};
const enemyPose = {
  jab: 1,
  heavy: 3,
  surge: 3,
  block: 4,
  parry: 5,
  recover: 6,
  "dodge-left": 7,
  "dodge-right": 7,
};
const ownPose = {
  jab: 3,
  heavy: 5,
  block: 1,
  parry: 2,
  recover: 0,
  "dodge-left": 0,
  "dodge-right": 0,
};
// Semantic fist anchors in the complete first-person illustrations, not limb joints.
const ownAnchors = [
  { x: 0.31, y: 0.74 },
  { x: 0.36, y: 0.48 },
  { x: 0.63, y: 0.48 },
  { x: 0.44, y: 0.31 },
  { x: 0.64, y: 0.43 },
  { x: 0.65, y: 0.34 },
];

export class ArenaRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.images = new Map();
    this.width = 0;
    this.height = 0;
    this.bounds = canvas.getBoundingClientRect();
    this.observer = new ResizeObserver((entries) => {
      this.bounds = entries[0].contentRect;
    });
    this.observer.observe(canvas);
    this.ready = this.load();
  }
  async load() {
    const paths = [
      ...FIGHTERS.flatMap((f) =>
        Array.from(
          { length: 8 },
          (_, i) => `/arcade/fighters/${f.id}/${i}.webp`,
        ),
      ),
      ...Array.from({ length: 6 }, (_, i) => `/arcade/player/${i}.webp`),
      ...Object.values(MAPS).map((m) => m.image),
    ];
    await Promise.all(
      paths.map(
        (src) =>
          new Promise((resolve) => {
            const im = new Image();
            im.onload = () => {
              this.images.set(src, im);
              resolve();
            };
            im.onerror = resolve;
            im.src = src;
          }),
      ),
    );
  }
  dispose() {
    this.observer.disconnect();
    this.images.clear();
  }
  resize() {
    const r = this.bounds,
      dpr = Math.min(devicePixelRatio || 1, 2);
    if (r.width === this.width && r.height === this.height && this.dpr === dpr)
      return;
    this.width = r.width;
    this.height = r.height;
    this.dpr = dpr;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  background(map) {
    const c = this.ctx,
      w = this.width,
      h = this.height,
      im = this.images.get(MAPS[map].image);
    c.fillStyle = MAPS[map].color;
    c.fillRect(0, 0, w, h);
    if (im) {
      const ratio = Math.max(w / im.width, h / im.height);
      c.drawImage(
        im,
        (w - im.width * ratio) / 2,
        (h - im.height * ratio) / 2,
        im.width * ratio,
        im.height * ratio,
      );
    }
    const tint = c.createLinearGradient(0, 0, 0, h);
    tint.addColorStop(0, "#14251b35");
    tint.addColorStop(0.6, "#14251b00");
    tint.addColorStop(1, "#14251b55");
    c.fillStyle = tint;
    c.fillRect(0, 0, w, h);
  }
  glow(x, y, r, strength, time, reduced) {
    const c = this.ctx;
    c.save();
    const haze = c.createRadialGradient(x, y, r * 0.3, x, y, r * 1.8);
    haze.addColorStop(0, `rgba(255,205,90,${strength * 0.25})`);
    haze.addColorStop(1, "rgba(255,205,90,0)");
    c.fillStyle = haze;
    c.beginPath();
    c.arc(x, y, r * 1.8, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = `rgba(255,218,118,${strength * 0.75})`;
    c.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + (reduced ? 0 : time * 0.002),
        radius = r * (1.05 + (i % 2) * 0.2);
      c.beginPath();
      c.moveTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
      c.lineTo(x + Math.cos(a) * (radius + 6), y + Math.sin(a) * (radius + 6));
      c.stroke();
    }
    c.restore();
  }
  enemy(engine, menu, stage, reduced) {
    const c = this.ctx,
      w = this.width,
      h = this.height,
      f = FIGHTERS[engine?.stage ?? stage],
      phase = engine?.phase,
      elapsed = engine ? engine.time - engine.phaseStart : 0,
      time = engine?.time ?? performance.now();
    let index = 0,
      flip = false;
    if (!menu && phase === "tell") {
      if (engine.intent === "heavy" || engine.intent === "surge") index = 2;
      else if (engine.intent === "jab")
        index = engine.duration - (time - engine.phaseStart) < 180 ? 1 : 0;
      else index = enemyPose[engine.intent] ?? 0;
    }
    if (!menu && phase === "impact") {
      index =
        elapsed < 290
          ? (enemyPose[engine.result.moves[1]] ?? 0)
          : elapsed < 430 && ["heavy", "surge"].includes(engine.result.moves[1])
            ? 2
            : 0;
    }
    const action = phase === "tell" ? engine?.intent : engine?.result?.moves[1];
    if (action?.startsWith("dodge")) flip = action === "dodge-left";
    else if ([1, 2, 3].includes(index)) flip = engine?.lane === "right";
    const im =
      this.images.get(`/arcade/fighters/${f.id}/${index}.webp`) ||
      this.images.get(`/arcade/fighters/${f.id}/0.webp`);
    if (!im) return;
    const top = menu ? h * 0.06 : Math.max(96, h * 0.13),
      height = menu ? Math.min(h * 1.04, w * 0.9) : h - top + h * 0.09,
      width = (height * im.width) / im.height,
      cx = menu ? w * 0.76 : w * 0.5;
    const hurt =
      !menu && phase === "impact" && engine.result.damage[1] && !reduced
        ? Math.sin(clamp(elapsed / 380, 0, 1) * Math.PI)
        : 0;
    const bob = reduced ? 0 : Math.sin(time * 0.0028) * (index === 6 ? 3 : 1.5);
    c.save();
    c.translate(cx + hurt * 7, top + bob + hurt * 3);
    c.rotate(hurt * 0.025);
    if (flip) c.scale(-1, 1);
    c.drawImage(im, -width / 2, 0, width, height);
    c.restore();
    if (
      !menu &&
      phase === "tell" &&
      ["heavy", "surge"].includes(engine.intent)
    ) {
      const sourceX = 0.2,
        sourceY = 0.3,
        x = cx + (flip ? 1 - sourceX : sourceX) * width - width / 2,
        y = top + sourceY * height;
      this.glow(x, y, width * 0.095, engine.progress, time, reduced);
      if (engine.intent === "surge") {
        c.save();
        c.strokeStyle = `rgba(251,207,100,${0.25 + engine.progress * 0.5})`;
        c.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          c.beginPath();
          c.ellipse(
            cx,
            top + height * 0.38,
            width * (0.45 + i * 0.06),
            height * (0.29 + i * 0.03),
            reduced ? 0 : Math.sin(time * 0.002 + i) * 0.06,
            0,
            Math.PI * 2,
          );
          c.stroke();
        }
        c.restore();
      }
    }
  }
  player(engine, reduced) {
    const c = this.ctx,
      w = this.width,
      h = this.height,
      phase = engine.phase,
      elapsed = engine.time - engine.phaseStart,
      impact = phase === "impact",
      action = impact ? engine.result.moves[0] : engine.pending || "idle";
    let index = ownPose[action] ?? 0;
    if (phase === "tell" && action === "heavy") index = 4;
    if (impact && elapsed > 350)
      index = action === "heavy" && elapsed < 450 ? 4 : 0;
    if (
      phase === "tell" &&
      engine.preparation &&
      engine.time - engine.preparation.at < 550
    )
      index = engine.preparation.action === "jab" ? 3 : 0;
    const im = this.images.get(`/arcade/player/${index}.webp`);
    if (!im) return;
    let targetY =
      index === 0
        ? h * (action === "recover" ? 0.95 : 0.87)
        : index === 1
          ? h * 0.67
          : index === 2
            ? h * 0.63
            : index === 4
              ? h * 0.85
              : h * 0.46;
    if (impact && engine.result.tags.includes("CLASH") && elapsed < 290)
      targetY = h * 0.52;
    const anchor = ownAnchors[index];
    // Uniform scale only. Keep the illustrated cut ends below the camera frame.
    const normal = Math.min(650, w * 0.78),
      required = ((h - targetY) / (1 - anchor.y)) * 1.05,
      size = Math.max(normal, required),
      height = (size * im.height) / im.width;
    let left = (w - size) / 2,
      top = targetY - anchor.y * height;
    const flip = engine.beat % 2 === 0 && [3, 4, 5].includes(index);
    const dodge =
      action === "dodge-left" ? -1 : action === "dodge-right" ? 1 : 0;
    const since = engine.time - (engine.inputAt || 0),
      slip =
        dodge *
        (reduced ? 8 : 18) *
        ease(since / 140) *
        (1 - ease((since - 500) / 220));
    left += slip;
    const shake =
      index === 4 && !reduced ? Math.sin(engine.time * 0.055) * 1.5 : 0;
    c.save();
    c.translate(left + size / 2 + shake, top);
    if (flip) c.scale(-1, 1);
    c.drawImage(im, -size / 2, 0, size, height);
    c.restore();
    if (index === 4) {
      const x = left + (flip ? 1 - anchor.x : anchor.x) * size,
        y = top + anchor.y * height;
      this.glow(x, y, size * 0.1, ease(since / 450), engine.time, reduced);
    }
  }
  effects(engine, reduced) {
    if (engine.phase !== "impact") return;
    const c = this.ctx,
      w = this.width,
      h = this.height,
      elapsed = engine.time - engine.phaseStart,
      r = engine.result,
      clash = r.tags.includes("CLASH");
    if (elapsed < 240 && (r.damage.some((v) => v) || clash)) {
      const x = w * 0.5,
        y = h * (clash ? 0.52 : 0.38);
      c.save();
      c.globalAlpha = 1 - elapsed / 240;
      c.strokeStyle = "#ffedaf";
      c.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        c.beginPath();
        c.moveTo(x + Math.cos(a) * 19, y + Math.sin(a) * 19);
        c.lineTo(
          x + Math.cos(a) * (34 + elapsed * 0.08),
          y + Math.sin(a) * (34 + elapsed * 0.08),
        );
        c.stroke();
      }
      c.restore();
    }
    if (elapsed < 1450)
      for (let i = 0; i < 2; i++) {
        if (!r.damage[i]) continue;
        c.save();
        c.globalAlpha = clamp(1 - (elapsed - 950) / 500, 0, 1);
        c.textAlign = "center";
        c.font = `900 ${Math.min(52, w * 0.12)}px Barlow Condensed,sans-serif`;
        c.strokeStyle = "#392820";
        c.lineWidth = 4;
        c.fillStyle = i === 0 ? "#ffd0a9" : "#fff1ad";
        const x = w * (i === 0 ? 0.27 : 0.67),
          y = h * (i === 0 ? 0.71 : 0.35) - (elapsed / 1450) * 44;
        c.strokeText("−" + r.damage[i], x, y);
        c.fillText("−" + r.damage[i], x, y);
        c.restore();
      }
    if (r.damage[0] && elapsed < 350) {
      c.save();
      c.globalAlpha = (1 - elapsed / 350) * 0.22;
      c.strokeStyle = "#cf6b3e";
      c.lineWidth = 8;
      c.strokeRect(4, 4, w - 8, h - 8);
      c.restore();
    }
  }
  draw(engine, { menu = false, stage = 0, reduced = false } = {}) {
    this.resize();
    if (!this.width || !this.height) return;
    const f = FIGHTERS[engine?.stage ?? stage],
      c = this.ctx,
      time = engine?.time ?? performance.now();
    this.background(f.map);
    c.save();
    const shake =
      engine?.phase === "impact" &&
      engine.result.damage[0] &&
      !reduced &&
      engine.time - engine.phaseStart < 160
        ? Math.sin(engine.time * 0.09) * 2
        : 0;
    c.translate(shake, 0);
    this.enemy(engine, menu, stage, reduced);
    if (!menu && engine) {
      this.player(engine, reduced);
      this.effects(engine, reduced);
    }
    c.restore();
    if (engine?.phase === "complete" && !reduced)
      for (let i = 0; i < 28; i++) {
        c.fillStyle = i % 2 ? "#f2c461" : "#e3e9b9";
        c.fillRect(
          (i * 139 + time * 0.025) % this.width,
          ((i * 73 + time * 0.04) % (this.height + 20)) - 20,
          4,
          9,
        );
      }
  }
}
