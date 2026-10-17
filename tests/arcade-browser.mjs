import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const base = process.env.TEST_URL || "http://127.0.0.1:3005";
await mkdir("artifacts/arcade", { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const report = {
  layouts: [],
  poses: [],
  campaign: [],
  errors: [],
  cloudTraffic: [],
  audio: [],
};
try {
  for (const [name, width, height] of [
    ["desktop", 1440, 900],
    ["tablet", 768, 1024],
    ["mobile", 390, 844],
    ["short", 360, 640],
    ["landscape", 844, 390],
    ["small", 320, 568],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      reducedMotion: name === "short" ? "reduce" : "no-preference",
    });
    page.on("pageerror", (e) => report.errors.push(e.message));
    page.on("request", (r) => {
      if (/\/api\/(rooms|ws)|socket\.io/.test(r.url()))
        report.cloudTraffic.push(r.url());
    });
    page.on("websocket", (s) => {
      if (!s.url().includes("/_next/")) report.cloudTraffic.push(s.url());
    });
    await page.goto(base, { waitUntil: "networkidle" });
    await page
      .getByRole("button", { name: "ENTER THE ARCADE", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "ENTER THE ARCADE", exact: true })
      .isEnabled();
    await page.screenshot({ path: `artifacts/arcade/${name}-menu.png` });
    await page
      .getByLabel("YOUR CORNER NAME", { exact: true })
      .fill("MainlandMike");
    await page
      .getByRole("button", { name: "ENTER THE ARCADE", exact: true })
      .click();
    await page.waitForFunction(
      () => window.__YABA_TEST__?.engine?.phase === "tell",
    );
    // Real keyboard input and normal animation clock, before any deterministic fixtures.
    await page.keyboard.press("j");
    await page.waitForFunction(
      () => window.__YABA_TEST__.engine.pending === "jab",
    );
    await page.waitForFunction(
      () => window.__YABA_TEST__.engine.phase === "impact",
    );
    await expect(page.locator(".exchange-result")).toBeVisible();
    await page.getByRole("button", { name: "Pause game" }).click();
    await expect(page.getByText("The fight is paused.")).toBeVisible();
    const before = await page.evaluate(() => window.__YABA_TEST__.engine.time);
    await page.waitForTimeout(130);
    assert.equal(
      await page.evaluate(() => window.__YABA_TEST__.engine.time),
      before,
    );
    await page.getByRole("button", { name: "BACK TO IT" }).click();
    await page.evaluate(() => {
      const e = window.__YABA_TEST__.engine;
      e.beginBeat();
      e.paused = true;
      e.intent = "heavy";
      e.pending = null;
      e.time = e.phaseStart + 300;
      window.__YABA_TEST__.refresh();
    });
    await page.waitForTimeout(60);
    await page.screenshot({ path: `artifacts/arcade/${name}-fight.png` });
    const metrics = await page.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
      scroll: document.documentElement.scrollWidth,
      controls: [...document.querySelectorAll("[data-action]")].map((b) => ({
        action: b.dataset.action,
        width: b.getBoundingClientRect().width,
        height: b.getBoundingClientRect().height,
        bottom: b.getBoundingClientRect().bottom,
        right: b.getBoundingClientRect().right,
      })),
    }));
    assert.equal(metrics.scroll, width);
    for (const control of metrics.controls) {
      assert.ok(control.width >= 44, `${name} ${control.action} width`);
      assert.ok(
        control.bottom <= height + 1,
        `${name} ${control.action} below screen`,
      );
      assert.ok(control.right <= width + 1);
    }
    report.layouts.push({ name, ...metrics });
    await page.close();
  }
  const savedPage = await browser.newPage({
    viewport: { width: 360, height: 640 },
  });
  await savedPage.addInitScript(() => {
    localStorage.setItem(
      "yf-arcade-v2",
      JSON.stringify({ version: 2, stage: 3, level: 4, history: ["jab"] }),
    );
    localStorage.setItem("yf-name", "ReturningFighter");
  });
  await savedPage.goto(base);
  await savedPage.getByRole("button", { name: "CONTINUE" }).waitFor();
  await savedPage.screenshot({
    path: "artifacts/arcade/short-continue-menu.png",
  });
  assert.ok(
    await savedPage.evaluate(
      () =>
        document.querySelector(".menu-secondary").getBoundingClientRect()
          .bottom <
        document.querySelector(".roster-strip").getBoundingClientRect().top,
    ),
    "saved menu must not collide with roster",
  );
  await savedPage.getByRole("button", { name: "Hard", exact: true }).click();
  await savedPage.getByRole("button", { name: "CONTINUE" }).click();
  await savedPage.waitForFunction(
    () => window.__YABA_TEST__?.engine?.stage === 3,
  );
  assert.equal(
    await savedPage.evaluate(() => window.__YABA_TEST__.engine.level),
    8,
    "selected difficulty must apply to Continue",
  );
  await savedPage.close();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  page.on("pageerror", (e) => report.errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().includes("/arcade/") && r.status() >= 400)
      report.errors.push(`Missing artwork: ${r.status()} ${r.url()}`);
  });
  const api = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/")) api.push(r.url());
  });
  await page.goto(base);
  await page
    .getByRole("button", { name: "ENTER THE ARCADE", exact: true })
    .click();
  await page.waitForFunction(() => window.__YABA_TEST__?.engine);
  for (const move of [
    "jab",
    "heavy",
    "block",
    "parry",
    "recover",
    "dodge-left",
    "dodge-right",
  ]) {
    await page.evaluate((move) => {
      const e = window.__YABA_TEST__.engine;
      e.paused = true;
      e.players = [
        { hp: 100, stamina: 100, guards: 0, exposed: 0, counter: 0 },
        { hp: 100, stamina: 100, guards: 0, exposed: 0, counter: 0 },
      ];
      e.setPhase("commit", 850);
      e.intent = move;
      e.pending = move;
      e.inputAt = e.time - 270;
      e.remainingAtInput = 550;
      e.time = e.phaseStart + 300;
      if (["jab", "heavy"].includes(move)) {
        e.result = {
          moves: [move, move],
          damage: [0, 0],
          tags: ["CLASH", "CLASH"],
          notes: ["Matched punches. No damage."],
        };
        e.setPhase("impact", 1450);
        e.time = e.phaseStart + 95;
      }
      window.__YABA_TEST__.refresh();
    }, move);
    await page.waitForTimeout(70);
    const shot = await page.screenshot({
      path: `artifacts/arcade/pose-${move}.png`,
    });
    report.poses.push({
      move,
      sha256: createHash("sha256").update(shot).digest("hex"),
    });
  }
  assert.equal(new Set(report.poses.map((p) => p.sha256)).size, 7);
  await page.setViewportSize({ width: 390, height: 844 });
  for (let stage = 0; stage < 7; stage++) {
    await page.evaluate((stage) => {
      const e = window.__YABA_TEST__.engine;
      e.stage = stage;
      e.beginBeat();
      e.paused = true;
      e.intent = "block";
      e.pending = "block";
      e.time = e.phaseStart + 300;
      window.__YABA_TEST__.refresh();
    }, stage);
    await page.waitForTimeout(60);
    await page.screenshot({
      path: `artifacts/arcade/fighter-${stage}-guard.png`,
    });
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => {
    const e = window.__YABA_TEST__.engine;
    e.stage = 6;
    e.beat = 3;
    e.players.forEach((p) => (p.stamina = 100));
    e.beginBeat();
    e.paused = true;
    e.time = e.phaseStart + 2200;
    window.__YABA_TEST__.refresh();
  });
  await page.waitForTimeout(70);
  await page.screenshot({ path: "artifacts/arcade/boss-voltage.png" });
  await expect(page.getByText(/VOLTAGE.*GUARD/)).toBeVisible();
  // Drive the actual browser simulation through the ladder with rule-aware inputs.
  // This verifies transitions and finite play, not human difficulty or retention.
  const campaign = await page.evaluate(() => {
    const e = window.__YABA_TEST__.engine;
    e.stage = 0;
    e.history = [];
    e.practice = false;
    e.level = 4;
    e.seed = 72;
    e.retry();
    e.paused = false;
    const rows = [];
    for (let stage = 0; stage < 7; stage++) {
      let ticks = 0;
      while (!["fightOver", "complete"].includes(e.phase) && ticks++ < 5000) {
        if (e.phase === "tell" && !e.pending) {
          const st = e.players[0].stamina;
          if (e.intent === "surge") {
            if (!e.prepared) e.act("recover");
            e.act(e.lane === "left" ? "dodge-right" : "dodge-left");
          } else if (e.intent === "jab")
            e.act(
              st >= 14
                ? e.lane === "left"
                  ? "dodge-right"
                  : "dodge-left"
                : "recover",
            );
          else
            e.act(
              e.intent === "heavy" && st >= 12
                ? "jab"
                : e.intent === "parry"
                  ? "recover"
                  : st >= 26
                    ? "heavy"
                    : st >= 12
                      ? "jab"
                      : "recover",
            );
        }
        e.update(100);
      }
      rows.push({
        stage: e.stage,
        phase: e.phase,
        won: e.won,
        score: [...e.score],
        ticks,
      });
      if (!e.won) break;
      if (stage < 6) e.next();
    }
    e.paused = true;
    window.__YABA_TEST__.refresh();
    return rows;
  });
  report.campaign = campaign;
  assert.equal(
    campaign.length,
    7,
    "rule-aware play should reach all seven fights",
  );
  assert.equal(campaign.at(-1).phase, "complete");
  await page.waitForTimeout(70);
  await page.screenshot({ path: "artifacts/arcade/campaign-victory.png" });
  await expect(page.getByText("MAINLAND CHAMPION.")).toBeVisible();
  await page.getByRole("button", { name: "BACK TO THE YARD" }).click();
  await expect(page.getByRole("button", { name: "CONTINUE" })).toBeHidden();
  assert.deepEqual(
    api,
    [],
    "arcade must not call account, room or matchmaking APIs",
  );
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.locator(".settings-form input[type=range]").first().focus();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.cloudTraffic, []);
  await page.close();
  await writeFile(
    "artifacts/arcade/browser-report.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    "PASS: six responsive layouts, saved continuation/difficulty, real input, pause, seven distinct two-sided poses, charged boss, full seven-fight clear, and zero arcade API/gameplay WebSocket traffic.",
  );
} finally {
  await browser.close();
}
