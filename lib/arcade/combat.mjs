import { clamp } from "./data.mjs";
export const freshFighter = () => ({
  hp: 100,
  stamina: 100,
  guards: 0,
  exposed: 0,
  counter: 0,
});
export const isAttack = (a) => a === "jab" || a === "heavy" || a === "surge";
export function actionCost(action, other, actor) {
  if (action === "recover") return 0;
  if (action === "block") return 18 + Math.min(24, actor.guards * 8);
  if (action === "parry") return other === "heavy" ? 32 : 18;
  return (
    { jab: 12, heavy: 26, surge: 40, "dodge-left": 14, "dodge-right": 14 }[
      action
    ] ?? 0
  );
}
/** Pure resolution. RNG is injected once per exchange; render frames never decide hits. */
export function resolveExchange(
  a,
  b,
  chosenA,
  chosenB,
  { roll = 0.5, lane = "left", ready = true } = {},
) {
  const players = [{ ...a }, { ...b }],
    moves = [chosenA, chosenB],
    before = [a, b],
    notes = [],
    damage = [0, 0],
    tags = ["", ""];
  for (let i = 0; i < 2; i++) {
    let cost = actionCost(moves[i], moves[1 - i], players[i]);
    if (players[i].stamina < cost) {
      moves[i] = "recover";
      cost = 0;
      notes.push(`${i === 0 ? "You" : "Rival"} needed a breath`);
      tags[i] = "EXHAUSTED";
    }
    players[i].stamina = clamp(
      players[i].stamina - cost + (moves[i] === "recover" ? 38 : 0),
    );
    players[i].guards = moves[i] === "block" ? before[i].guards + 1 : 0;
    players[i].exposed = 0;
    players[i].counter = 0;
  }
  if (moves[0] === "heavy" && !ready) {
    moves[0] = "late";
    tags[0] = "POWER TOO LATE";
    notes.push("Start power earlier: it needs 450ms to charge");
  }
  const hit = (target, amount) => {
    damage[target] +=
      amount +
      (before[target].exposed ? 8 : 0) +
      (moves[target] === "recover" ? 6 : 0);
  };
  if (moves[0] === moves[1]) {
    tags[0] = tags[1] = isAttack(moves[0]) ? "CLASH" : "STALEMATE";
    notes.push(
      isAttack(moves[0])
        ? "Matched punches. No damage."
        : "Same move. No damage.",
    );
  } else
    for (let i = 0; i < 2; i++) {
      const j = 1 - i,
        attack = moves[i],
        defense = moves[j];
      if (!isAttack(attack)) continue;
      if (attack === "heavy" && defense === "jab") {
        tags[i] = "INTERRUPTED";
        continue;
      }
      const base = attack === "jab" ? 14 : attack === "surge" ? 34 : 24;
      const bonus = before[i].counter || 0;
      if (defense.startsWith("dodge-")) {
        const good =
          defense === (lane === "left" ? "dodge-right" : "dodge-left");
        if (good) {
          tags[j] = "CLEAN SLIP";
          players[j].counter = 8;
          notes.push(`${j === 0 ? "You" : "Rival"} slipped it. +8 next punch`);
          continue;
        }
        tags[j] = "WRONG SIDE";
        notes.push(
          `Move away from the punching hand: fist on your ${lane}, slip ${lane === "left" ? "right" : "left"}.`,
        );
      }
      if (defense === "block" && attack !== "surge") {
        const drain = attack === "heavy" ? 22 : 10;
        players[j].stamina = clamp(players[j].stamina - drain);
        if (players[j].stamina === 0) {
          hit(j, base + 8 + bonus);
          tags[j] = "GUARD BROKEN";
          players[j].exposed = 1;
          notes.push("Guard broke. The next hit hurts more.");
        } else {
          damage[j] += attack === "heavy" ? 8 + bonus : 0;
          tags[j] = attack === "heavy" ? "GUARD CHIPPED" : "BLOCKED";
        }
      } else if (defense === "parry" && attack !== "surge") {
        if (roll < 0.5) {
          hit(i, attack === "heavy" ? 26 : 18);
          players[j].stamina = clamp(players[j].stamina + 6);
          tags[j] = "PARRY LANDED";
          notes.push("Parry landed — 50% chance.");
        } else {
          hit(j, base + bonus);
          players[j].exposed = 1;
          tags[j] = "PARRY MISSED";
          notes.push("Parry missed — 50% chance. You are open next exchange.");
        }
      } else {
        hit(j, base + bonus);
        if (!tags[j])
          tags[j] = defense === "recover" ? "CAUGHT BREATHING" : "HIT";
        tags[i] =
          attack === "surge" ? "VOLTAGE HIT" : bonus ? "COUNTER HIT" : "LANDED";
        if (attack === "surge" && ["block", "parry"].includes(defense)) {
          tags[j] = "VOLTAGE BROKE THROUGH";
          notes.push(
            "Voltage ignores guard and parry. Slip opposite the glowing hand.",
          );
        }
      }
    }
  for (let i = 0; i < 2; i++) {
    if (
      moves[i] === "parry" &&
      !isAttack(moves[1 - i]) &&
      moves[0] !== moves[1]
    ) {
      players[i].exposed = 1;
      tags[i] = "PARRY WHIFF";
      notes.push("No punch to parry. Open next exchange.");
    }
    players[i].hp = clamp(players[i].hp - damage[i]);
  }
  return { players, moves, damage, tags, notes, roll };
}
