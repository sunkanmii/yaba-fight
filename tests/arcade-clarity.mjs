import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.TEST_URL || "http://127.0.0.1:3005";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Fixtures are local-only");
await mkdir("artifacts/clarity", { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const report = { voices: [], errors: [], traffic: [] };
try {
  for (const [name, width, height] of [
    ["desktop", 1280, 800],
    ["mobile", 390, 844],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on("pageerror", (e) => report.errors.push(e.message));
    page.on("request", (r) => {
      if (r.url().includes("/api/")) report.traffic.push(r.url());
    });
    await page.goto(base, { waitUntil: "networkidle" });
    await expect(page.locator(".roster-strip button:disabled")).toHaveCount(6);
    await page.screenshot({ path: `artifacts/clarity/${name}-locks.png` });
    await page.getByRole("button", { name: "PRACTICE", exact: true }).click();
    await expect(page.locator(".practice-grid button:disabled")).toHaveCount(6);
    await page.getByRole("button", { name: "Close dialog" }).click();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(
      page.getByRole("button", { name: /TEST VICTORY/ }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Close dialog" }).click();
    await page.getByRole("button", { name: "HOW TO FIGHT" }).click();
    await expect(
      page.getByText("There is no decision timer.", { exact: false }),
    ).toBeVisible();
    await page.screenshot({ path: `artifacts/clarity/${name}-guide.png` });
    await page.getByRole("button", { name: "Close dialog" }).click();
    await page
      .getByRole("button", { name: "ENTER THE ARCADE", exact: true })
      .click();
    await page.waitForFunction(
      () => window.__YABA_TEST__?.engine?.phase === "tell",
    );
    const before = await page.evaluate(() =>
      JSON.stringify(window.__YABA_TEST__.engine.players),
    );
    await page.waitForTimeout(2600);
    assert.equal(
      await page.evaluate(() => window.__YABA_TEST__.engine.phase),
      "tell",
    );
    assert.equal(
      await page.evaluate(() =>
        JSON.stringify(window.__YABA_TEST__.engine.players),
      ),
      before,
    );
    await expect(page.locator(".attack-clock,.attack-telegraph")).toHaveCount(
      0,
    );
    for (const lane of ["left", "right"]) {
      await page.evaluate((lane) => {
        const e = window.__YABA_TEST__.engine;
        e.intent = "jab";
        e.lane = lane;
        e.pending = null;
        e.setPhase("tell", Infinity);
        window.__YABA_TEST__.refresh();
      }, lane);
      await page.waitForTimeout(160);
      await page.screenshot({
        path: `artifacts/clarity/${name}-jab-${lane}.png`,
      });
    }
    // Right-side fist -> actual left button input. Hold the dodge through contact.
    await page.locator("[data-action=dodge-left]").click();
    await page.waitForTimeout(210);
    assert.equal(
      await page.evaluate(() => window.__YABA_TEST__.engine.phase),
      "commit",
    );
    await page.screenshot({ path: `artifacts/clarity/${name}-slip-left.png` });
    await page.waitForFunction(
      () => window.__YABA_TEST__.engine.phase === "impact",
    );
    await expect(page.getByText("CLEAN SLIP", { exact: true })).toBeVisible();
    await page.screenshot({
      path: `artifacts/clarity/${name}-slip-contact.png`,
    });
    assert.equal(
      await page.evaluate(() => window.__YABA_TEST__.engine.result.damage[0]),
      0,
    );
    assert.equal(
      await page.evaluate(() => window.__YABA_TEST__.engine.players[0].counter),
      8,
    );
    await page.waitForFunction(
      () => window.__YABA_TEST__.engine.phase === "tell",
    );
    await page.evaluate(() => {
      const e = window.__YABA_TEST__.engine;
      e.intent = "jab";
      e.lane = "left";
      e.pending = null;
      window.__YABA_TEST__.refresh();
    });
    await page.locator("[data-action=dodge-right]").click();
    await page.waitForTimeout(210);
    await page.screenshot({ path: `artifacts/clarity/${name}-slip-right.png` });
    await page.waitForFunction(
      () => window.__YABA_TEST__.engine.phase === "impact",
    );
    assert.equal(
      await page.evaluate(() => window.__YABA_TEST__.engine.result.damage[0]),
      0,
    );
    // A real round-over transition unlocks exactly the next rival, surviving reload.
    await page.evaluate(() => {
      const e = window.__YABA_TEST__.engine;
      e.round = 3;
      e.score = [2, 0];
      e.setPhase("roundOver", 1);
    });
    await page
      .getByRole("button", { name: "BACK TO THE YARD", exact: true })
      .click();
    await expect(page.locator(".roster-strip button:disabled")).toHaveCount(5);
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator(".roster-strip button:disabled")).toHaveCount(5);
    await page
      .getByRole("button", { name: "NEW ARCADE RUN", exact: true })
      .click();
    await page.getByRole("button", { name: "Pause game" }).click();
    await page
      .getByRole("button", { name: "RETURN TO MENU", exact: true })
      .click();
    await expect(page.locator(".roster-strip button:disabled")).toHaveCount(5);
    await page.close();
  }
  const audioPage = await browser.newPage();
  await audioPage.addInitScript(() => {
    window.__voiceStarts = [];
    const names = new WeakMap();
    const fetchOriginal = window.fetch;
    window.fetch = async (...args) => {
      const r = await fetchOriginal(...args),
        url = String(args[0]);
      if (url.includes("/audio/arcade/")) {
        const original = r.arrayBuffer.bind(r);
        r.arrayBuffer = async () => {
          const a = await original();
          names.set(a, url.split("/").pop().replace(".ogg", ""));
          return a;
        };
      }
      return r;
    };
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      async decodeAudioData(data) {
        const b = await super.decodeAudioData(data);
        b.__clipName = names.get(data);
        return b;
      }
    };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (when, ...args) {
      if (this.buffer?.__clipName)
        window.__voiceStarts.push({
          name: this.buffer.__clipName,
          start: when ?? this.context.currentTime,
          duration: this.buffer.duration,
        });
      return start.call(this, when, ...args);
    };
  });
  await audioPage.goto(base);
  await audioPage
    .getByRole("button", { name: "ENTER THE ARCADE", exact: true })
    .click();
  for (let round = 1; round <= 3; round++) {
    if (round > 1)
      await audioPage.evaluate((round) => {
        const e = window.__YABA_TEST__.engine;
        e.round = round;
        e.startRound();
      }, round);
    await audioPage.waitForFunction(
      (round) =>
        window.__YABA_TEST__?.engine?.round === round &&
        window.__YABA_TEST__.engine.phase === "tell",
      round,
    );
    await audioPage.waitForTimeout(1500);
  }
  const starts = await audioPage.evaluate(() => window.__voiceStarts);
  for (let round = 1; round <= 3; round++) {
    const index = starts.findIndex((s) => s.name === "round" + round);
    assert.ok(index >= 0);
    const announcement = starts[index],
      fight = starts.slice(index + 1).find((s) => s.name === "fight");
    assert.ok(fight);
    const gap = fight.start - announcement.start - announcement.duration;
    assert.ok(gap >= 1.249, `Round ${round} has only ${gap}s breathing space`);
    report.voices.push({ round, gap, announcement, fight });
  }
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.traffic, []);
  await writeFile(
    "artifacts/clarity/report.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    "PASS: no decision deadline, visual jab tells, actual left/right slips, held contact dodge, progression locks/reload/new-run, no testing button and >=1.25s measured silence before Fight in all three rounds.",
    report.voices.map((v) => ({ round: v.round, gap: v.gap })),
  );
} finally {
  await browser.close();
}
