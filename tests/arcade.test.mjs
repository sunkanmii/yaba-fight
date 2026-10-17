import { test } from "node:test";
import assert from "node:assert/strict";
import {
  freshFighter,
  resolveExchange,
  actionCost,
} from "../lib/arcade/combat.mjs";
import {
  ArcadeEngine,
  chooseIntent,
  validateSave,
  unlockedStage,
  ROUND_EXCHANGES,
} from "../lib/arcade/engine.mjs";
import { FIGHTERS } from "../lib/arcade/data.mjs";
import { slipMotion } from "../lib/arcade/render.mjs";
const resolve = (a, b, opts = {}) =>
  resolveExchange(freshFighter(), freshFighter(), a, b, opts);
test("adaptive rivals only select moves they can afford", () => {
  for (const fighter of FIGHTERS)
    for (let stamina = 0; stamina <= 100; stamina += 5)
      for (let r = 0; r < 20; r++) {
        const actor = { ...freshFighter(), stamina, guards: 2 };
        const action = chooseIntent(
          fighter,
          ["jab", "jab", "block"],
          10,
          actor,
          () => r / 20,
        );
        assert.ok(actionCost(action, "heavy", actor) <= stamina);
      }
});
for (const move of [
  "jab",
  "heavy",
  "block",
  "parry",
  "recover",
  "dodge-left",
  "dodge-right",
])
  test(`matching ${move} does not remove health`, () => {
    assert.deepEqual(resolve(move, move).damage, [0, 0]);
  });
test("jab interrupts power without trading health", () => {
  const r = resolve("jab", "heavy");
  assert.deepEqual(r.damage, [0, 14]);
  assert.equal(r.tags[1], "INTERRUPTED");
});
test("parry threshold is exactly 50% and power costs more", () => {
  assert.deepEqual(
    resolve("parry", "heavy", { roll: 0.499999 }).damage,
    [0, 26],
  );
  const missed = resolve("parry", "heavy", { roll: 0.5 });
  assert.deepEqual(missed.damage, [24, 0]);
  assert.equal(missed.players[0].exposed, 1);
  assert.equal(actionCost("parry", "heavy", freshFighter()), 32);
  assert.equal(actionCost("parry", "jab", freshFighter()), 18);
});
test("the opposite slip avoids a punch without a timing gate", () => {
  for (const lane of ["left", "right"]) {
    const opposite = lane === "left" ? "dodge-right" : "dodge-left";
    const good = resolve(opposite, "heavy", { lane, remaining: 700 });
    assert.equal(good.damage[0], 0);
    assert.equal(good.players[0].counter, 8);
    assert.equal(
      resolve(opposite, "heavy", { lane, remaining: 999999 }).damage[0],
      0,
    );
    assert.ok(
      resolve("dodge-" + lane, "heavy", { lane, remaining: 400 }).damage[0] > 0,
    );
  }
});
test("power chips guard and a tired guard breaks", () => {
  assert.equal(resolve("block", "heavy").damage[0], 8);
  assert.equal(actionCost("block", "jab", { guards: 2 }), 34);
  const r = resolveExchange(
    { ...freshFighter(), stamina: 40 },
    freshFighter(),
    "block",
    "heavy",
  );
  assert.equal(r.tags[0], "GUARD BROKEN");
  assert.equal(r.players[0].stamina, 0);
  assert.equal(r.players[0].exposed, 1);
  assert.equal(r.damage[0], 32);
});
test("counter is consumed and missed-parry exposure increases next damage", () => {
  const a = { ...freshFighter(), counter: 8 };
  assert.equal(
    resolveExchange(a, freshFighter(), "jab", "recover").damage[1],
    28,
  );
  const e = { ...freshFighter(), exposed: 1 };
  assert.equal(
    resolveExchange(e, freshFighter(), "block", "heavy").damage[0],
    8,
  );
  assert.equal(
    resolveExchange(e, freshFighter(), "recover", "jab").damage[0],
    28,
  );
});
test("late power cannot land and an exhausted fighter recovers", () => {
  assert.equal(resolve("heavy", "recover", { ready: false }).damage[1], 0);
  const r = resolveExchange(
    { ...freshFighter(), stamina: 0 },
    freshFighter(),
    "heavy",
    "jab",
  );
  assert.equal(r.moves[0], "recover");
  assert.equal(r.players[0].stamina, 38);
});
test("boss voltage ignores guard/parry but can be slipped", () => {
  assert.equal(resolve("block", "surge").damage[0], 34);
  assert.equal(resolve("parry", "surge", { roll: 0 }).damage[0], 34);
  assert.equal(
    resolve("dodge-right", "surge", { lane: "left", remaining: 500 }).damage[0],
    0,
  );
});
test("AI learns from first observed move and does not inspect pending input", () => {
  const actor = freshFighter();
  let changes = 0;
  for (let n = 0; n < 100; n++) {
    const r = n / 100;
    const base = chooseIntent(FIGHTERS[0], [], 10, actor, () => r),
      adapted = chooseIntent(FIGHTERS[0], ["heavy"], 10, actor, () => r);
    if (base !== adapted) changes++;
  }
  assert.ok(changes > 10);
  const a = new ArcadeEngine({ seed: 1 }),
    b = new ArcadeEngine({ seed: 1 });
  a.beginBeat();
  b.beginBeat();
  a.act("heavy");
  b.act("jab");
  assert.equal(a.intent, b.intent);
  assert.equal(a.seed, b.seed);
});
test("pause freezes the clock; boss waits for a choice then charges for 3600ms", () => {
  const e = new ArcadeEngine({ stage: 6, seed: 3 });
  e.paused = true;
  e.update(100);
  assert.equal(e.time, 0);
  e.paused = false;
  e.beat = 3;
  e.beginBeat();
  assert.equal(e.intent, "surge");
  for (let i = 0; i < 1200; i++) e.update(100);
  assert.equal(e.phase, "tell");
  e.act(e.lane === "left" ? "dodge-right" : "dodge-left");
  assert.equal(e.duration, 3600);
  for (let i = 0; i < 35; i++) e.update(100);
  assert.equal(e.phase, "commit");
  e.update(100);
  assert.equal(e.phase, "impact");
  e.retry();
  assert.equal(e.bossCharge, false);
  assert.equal(e.beat, 0);
});
test("boss preparation leaves an untimed directional dodge available", () => {
  const e = new ArcadeEngine({ stage: 6 });
  e.beat = 3;
  e.beginBeat();
  e.players[0].stamina = 20;
  assert.equal(e.act("recover"), true);
  assert.equal(
    e.players[0].stamina,
    58,
    "boss preparation restores the same 38 shown on Breathe",
  );
  assert.equal(e.pending, null);
  for (let i = 0; i < 30; i++) e.update(100);
  assert.equal(e.act(e.lane === "left" ? "dodge-right" : "dodge-left"), true);
  for (let i = 0; i < 36; i++) e.update(100);
  assert.equal(e.result.damage[0], 0);
});
test("campaign has seven fights and final completion does not carry special", () => {
  const e = new ArcadeEngine({ seed: 2 });
  for (let stage = 0; stage < 7; stage++) {
    assert.equal(e.stage, stage);
    e.round = 3;
    e.score = [2, 0];
    e.setPhase("roundOver", 1);
    e.update(2);
    if (stage < 6) {
      assert.equal(e.phase, "fightOver");
      assert.equal(e.next(), true);
      assert.equal(e.bossCharge, false);
    } else assert.equal(e.phase, "complete");
  }
});
test("actively played mirror fights terminate and all resource bounds hold", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const e = new ArcadeEngine({ seed, level: 10 });
    let i = 0;
    while (!["fightOver", "complete"].includes(e.phase) && i++ < 4000) {
      if (e.phase === "tell" && !e.pending)
        e.act(e.intent === "surge" ? "block" : e.intent);
      e.update(100);
      for (const p of e.players) {
        assert.ok(p.hp >= 0 && p.hp <= 100);
        assert.ok(p.stamina >= 0 && p.stamina <= 100);
      }
    }
    assert.ok(i < 4000);
  }
});
test("invalid or corrupted save cannot select an out-of-range fighter", () => {
  assert.equal(validateSave({ version: 2, stage: 7, level: 4 }), null);
  assert.equal(validateSave({ version: 2, stage: 1, level: 11 }), null);
  assert.deepEqual(
    validateSave({
      version: 2,
      stage: 1,
      level: 4,
      history: ["script", "jab"],
    }),
    { version: 2, stage: 1, level: 4, history: ["jab"], wins: 0 },
  );
});

test("decision time never attacks or advances while a player is thinking", () => {
  for (let level = 1; level <= 10; level++) {
    const e = new ArcadeEngine({ level });
    e.beginBeat();
    const before = JSON.stringify(e.players);
    for (let n = 0; n < 1200; n++) e.update(100);
    assert.equal(e.phase, "tell");
    assert.equal(e.beat, 1);
    assert.equal(JSON.stringify(e.players), before);
    assert.equal(e.act("heavy"), true);
    assert.equal(e.phase, "commit");
    for (let n = 0; n < 9; n++) e.update(100);
    assert.equal(e.phase, "impact");
    assert.notEqual(e.result.moves[0], "late");
  }
});
test("each round separates the round announcement from Fight and input", () => {
  const e = new ArcadeEngine();
  for (let round = 1; round <= 3; round++) {
    e.round = round;
    e.startRound();
    e.drain();
    for (let n = 0; n < 29; n++) e.update(100);
    assert.equal(e.phase, "intro");
    assert.deepEqual(e.drain(), []);
    e.update(100);
    assert.equal(e.phase, "ready");
    assert.equal(e.drain()[0].type, "fight");
    for (let n = 0; n < 12; n++) e.update(100);
    assert.equal(e.phase, "tell");
  }
});
test("round score limit is thirty exchanges rather than twelve", () => {
  const e = new ArcadeEngine();
  e.players[1].hp = 90;
  e.beat = 12;
  e.setPhase("impact", 1);
  e.update(2);
  assert.equal(e.phase, "tell");
  e.beat = ROUND_EXCHANGES;
  e.setPhase("impact", 1);
  e.update(2);
  assert.equal(e.phase, "roundOver");
});
test("slips move immediately, stay through contact, then return to stance", () => {
  for (const [action, direction] of [
    ["dodge-left", -1],
    ["dodge-right", 1],
  ]) {
    const e = new ArcadeEngine();
    e.beginBeat();
    e.act(action);
    e.update(100);
    e.update(100);
    assert.equal(Math.sign(slipMotion(e)), direction);
    for (let n = 0; n < 7; n++) e.update(100);
    assert.equal(e.phase, "impact");
    assert.equal(slipMotion(e), direction);
    for (let n = 0; n < 4; n++) e.update(100);
    assert.equal(slipMotion(e), direction);
    for (let n = 0; n < 4; n++) e.update(100);
    assert.equal(Math.abs(slipMotion(e)), 0);
  }
});
test("fresh saves lock six rivals; reached checkpoints and earned unlocks survive", () => {
  assert.equal(unlockedStage(null, null), 0);
  assert.equal(unlockedStage("invalid", null), 0);
  assert.equal(unlockedStage("99", null), 0);
  assert.equal(unlockedStage("2", null), 2);
  assert.equal(unlockedStage(null, { version: 2, stage: 3, level: 4 }), 3);
  assert.equal(unlockedStage("4", { version: 2, stage: 1, level: 4 }), 4);
  assert.equal(unlockedStage(null, null, true), 6);
});
