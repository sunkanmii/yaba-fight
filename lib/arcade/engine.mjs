import { FIGHTERS, clamp } from "./data.mjs";
import { freshFighter, resolveExchange, actionCost } from "./combat.mjs";
export const ROUND_EXCHANGES = 30;
export const ROUND_ANNOUNCE_MS = 3000;
export const FIGHT_ANNOUNCE_MS = 1200;
export function unlockedStage(value, checkpoint, cleared = false) {
  const n = Number(value);
  return Math.max(
    Number.isInteger(n) && n >= 0 && n < 7 ? n : 0,
    validateSave(checkpoint)?.stage ?? 0,
    cleared ? 6 : 0,
  );
}
const choices = [
  "jab",
  "heavy",
  "block",
  "parry",
  "recover",
  "dodge-left",
  "dodge-right",
];
export function chooseIntent(fighter, history, level, actor, rng) {
  const weights = [
    ...fighter.weights,
    level > 4 ? (level - 4) * 0.25 : 0,
    level > 4 ? (level - 4) * 0.25 : 0,
  ];
  const recent = history.slice(-12),
    counts = {};
  for (const a of recent) counts[a] = (counts[a] || 0) + 1;
  const dominant = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  // Learning starts on the first observed input. Only past exchanges are provided.
  const learning = recent.length
    ? ((level * 0.5 + 1) * counts[dominant]) / recent.length
    : 0;
  if (dominant === "heavy") weights[0] += learning * 2;
  if (dominant === "jab") weights[2] += learning;
  if (dominant === "block") weights[1] += learning * 2;
  if (dominant === "recover" || dominant?.startsWith("dodge"))
    weights[0] += learning;
  if (dominant === "parry") weights[4] += learning;
  if (actor.stamina < 30) weights[4] += 18;
  for (let i = 0; i < choices.length; i++)
    if (actor.stamina < actionCost(choices[i], "heavy", actor)) weights[i] = 0;
  let n = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) {
    n -= weights[i];
    if (n < 0) return choices[i];
  }
  return "recover";
}
export function validateSave(value) {
  return value &&
    value.version === 2 &&
    Number.isInteger(value.stage) &&
    value.stage >= 0 &&
    value.stage < 7 &&
    Number.isInteger(value.level) &&
    value.level >= 1 &&
    value.level <= 10
    ? {
        version: 2,
        stage: value.stage,
        level: value.level,
        history: Array.isArray(value.history)
          ? value.history
              .filter(
                (a) =>
                  choices.includes(a) ||
                  a === "dodge-left" ||
                  a === "dodge-right",
              )
              .slice(-128)
          : [],
        wins: clamp(Number(value.wins) || 0, 0, 21),
      }
    : null;
}
export class ArcadeEngine {
  constructor({
    stage = 0,
    level = 4,
    history = [],
    seed = Date.now(),
    practice = false,
  } = {}) {
    this.seed = seed >>> 0;
    this.history = history.slice(-128);
    this.stage = clamp(stage, 0, 6);
    this.level = clamp(level, 1, 10);
    this.practice = practice;
    this.events = [];
    this.time = 0;
    this.phaseStart = 0;
    this.duration = 1;
    this.intent = "block";
    this.paused = false;
    this.round = 1;
    this.score = [0, 0];
    this.wins = 0;
    this.serial = 0;
    this.startRound();
  }
  random() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  get fighter() {
    return FIGHTERS[this.stage];
  }
  get progress() {
    if (this.phase === "tell")
      return Math.min((this.time - this.phaseStart) / 900, 1);
    return clamp((this.time - this.phaseStart) / this.duration, 0, 1);
  }
  emit(type, data = {}) {
    this.events.push({ type, ...data });
  }
  drain() {
    return this.events.splice(0);
  }
  setPhase(phase, duration) {
    this.phase = phase;
    this.phaseStart = this.time;
    this.duration = duration;
    this.serial++;
  }
  startRound() {
    this.players = [freshFighter(), freshFighter()];
    this.beat = 0;
    this.pending = null;
    this.result = null;
    this.intent = "block";
    this.lane = "left";
    this.bossCharge = false;
    this.preparation = null;
    this.setPhase("intro", ROUND_ANNOUNCE_MS);
    this.emit("round");
  }
  beginBeat() {
    this.beat++;
    this.pending = null;
    this.prepared = false;
    this.preparation = null;
    this.result = null;
    this.inputAt = 0;
    this.lane = this.random() < 0.5 ? "left" : "right";
    this.intent =
      this.fighter.special &&
      (this.beat === 1 || this.beat % this.fighter.special.every === 0) &&
      this.players[1].stamina >= 40
        ? "surge"
        : chooseIntent(
            this.fighter,
            this.history,
            Math.min(10, this.level + this.stage * 0.4),
            this.players[1],
            () => this.random(),
          );
    this.bossCharge = this.intent === "surge";
    // Reading is player-paced at every difficulty. Nothing attacks while waiting.
    this.setPhase("tell", Infinity);
    this.emit(this.bossCharge ? "surge" : "tell");
  }
  act(action) {
    if (this.paused || this.phase !== "tell" || !choices.includes(action))
      return false;
    // One optional preparation before choosing a response to the boss's charge.
    if (
      this.bossCharge &&
      ["jab", "recover"].includes(action) &&
      !this.prepared
    ) {
      if (action === "recover")
        this.players[0].stamina = clamp(this.players[0].stamina + 38);
      else if (this.players[0].stamina >= 12) {
        this.players[0].stamina -= 12;
        this.players[1].hp = clamp(this.players[1].hp - 6);
      } else return false;
      this.prepared = true;
      this.preparation = { action, at: this.time };
      this.emit("prepare", { action });
      this.emit("notice", {
        text:
          action === "recover"
            ? "Breath restored. Choose your defence when ready."
            : "Armoured charge: jab chips 6. Choose your defence when ready.",
      });
      return true;
    }
    if (this.pending) return false;
    if (
      this.bossCharge &&
      this.prepared &&
      ["jab", "recover"].includes(action)
    ) {
      this.emit("notice", { text: "Preparation used. Choose your defence." });
      return false;
    }
    if (
      this.players[0].stamina < actionCost(action, this.intent, this.players[0])
    ) {
      this.emit("notice", { text: "Not enough stamina. Take a breath." });
      return false;
    }
    this.pending = action;
    this.inputAt = this.time;
    this.emit("input", { action });
    this.setPhase(
      "commit",
      this.bossCharge ? this.fighter.special.charge : 850,
    );
    return true;
  }
  resolve() {
    const action = this.pending || "recover";
    this.result = resolveExchange(
      this.players[0],
      this.players[1],
      action,
      this.intent,
      {
        roll: this.random(),
        lane: this.lane,
        ready: true,
      },
    );
    this.players = this.result.players;
    this.history.push(action);
    this.history = this.history.slice(-128);
    if (this.beat > ROUND_EXCHANGES) {
      const drain = (this.beat - ROUND_EXCHANGES) * 5;
      this.players.forEach((p, i) => {
        p.hp = clamp(p.hp - drain);
        this.result.damage[i] += drain;
      });
      this.result.notes.push(
        `Overtime: both lose ${drain} health. Keep moving.`,
      );
    }
    this.bossCharge = false;
    this.setPhase("impact", 1450);
    this.emit("impact", { result: this.result });
  }
  update(dt) {
    if (this.paused || ["fightOver", "complete"].includes(this.phase)) return;
    this.time += clamp(dt, 0, 100);
    if (this.phase === "tell") return;
    if (this.time - this.phaseStart < this.duration) return;
    if (this.phase === "intro") {
      this.setPhase("ready", FIGHT_ANNOUNCE_MS);
      this.emit("fight");
    } else if (this.phase === "ready") this.beginBeat();
    else if (this.phase === "commit") this.resolve();
    else if (this.phase === "impact") {
      const [a, b] = this.players;
      const timed = this.beat >= ROUND_EXCHANGES && a.hp !== b.hp;
      if (a.hp === 0 || b.hp === 0 || timed) {
        this.roundWinner = a.hp === b.hp ? -1 : a.hp > b.hp ? 0 : 1;
        if (this.roundWinner >= 0) this.score[this.roundWinner]++;
        this.setPhase("roundOver", 2100);
        this.emit(this.roundWinner === 0 ? "roundWin" : "roundLose");
      } else this.beginBeat();
    } else if (this.phase === "roundOver") {
      if (this.round >= 3 || this.score.some((v) => v === 2)) {
        this.won = this.score[0] > this.score[1];
        this.setPhase(
          this.won && this.stage === 6 && !this.practice
            ? "complete"
            : "fightOver",
          1,
        );
        this.emit(this.won ? "win" : "lose");
      } else {
        this.round++;
        this.startRound();
      }
    }
  }
  next() {
    if (this.phase !== "fightOver" || !this.won || this.practice) return false;
    this.stage++;
    this.score = [0, 0];
    this.round = 1;
    this.startRound();
    return true;
  }
  retry() {
    this.score = [0, 0];
    this.round = 1;
    this.startRound();
  }
  checkpoint() {
    return {
      version: 2,
      stage: this.stage,
      level: this.level,
      history: this.history,
      wins: this.wins,
    };
  }
  snapshot() {
    return {
      stage: this.stage,
      level: this.level,
      phase: this.phase,
      round: this.round,
      score: [...this.score],
      players: this.players.map((p) => ({ ...p })),
      intent: this.intent,
      lane: this.lane,
      pending: this.pending,
      result: this.result,
      won: this.won,
      beat: this.beat,
      bossCharge: this.bossCharge,
      prepared: this.prepared,
    };
  }
}
