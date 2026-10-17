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
} from "../lib/arcade/engine.mjs";
import { FIGHTERS } from "../lib/arcade/data.mjs";
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
test("only the opposite, timely slip avoids a punch", () => {
  for (const lane of ["left", "right"]) {
    const opposite = lane === "left" ? "dodge-right" : "dodge-left";
    const good = resolve(opposite, "heavy", { lane, remaining: 700 });
    assert.equal(good.damage[0], 0);
    assert.equal(good.players[0].counter, 8);
    assert.ok(
      resolve(opposite, "heavy", { lane, remaining: 701 }).damage[0] > 0,
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
test("pause freezes the clock; boss charge lasts 3600ms and resets per round", () => {
  const e = new ArcadeEngine({ stage: 6, seed: 3 });
  e.paused = true;
  e.update(100);
  assert.equal(e.time, 0);
  e.paused = false;
  e.beat = 3;
  e.beginBeat();
  assert.equal(e.intent, "surge");
  assert.equal(e.duration, 3600);
  for (let i = 0; i < 35; i++) e.update(100);
  assert.equal(e.phase, "tell");
  e.update(100);
  assert.equal(e.phase, "impact");
  e.retry();
  assert.equal(e.bossCharge, false);
  assert.equal(e.beat, 0);
});
test("boss preparation leaves the late dodge available", () => {
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
  for (let i = 0; i < 6; i++) e.update(100);
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
test("idle/mirror fights terminate and all resource bounds hold", () => {
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
