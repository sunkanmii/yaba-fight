import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(...args) {
        super(...args);
        window.__audioContext = this;
        window.__audioProbe = this.createAnalyser();
        window.__audioProbe.fftSize = 2048;
      }
    };
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (destination, ...args) {
      const result = connect.call(this, destination, ...args);
      if (destination instanceof AudioDestinationNode)
        connect.call(this, window.__audioProbe);
      return result;
    };
  });
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:3005");
  assert.equal(await page.evaluate(() => !!window.__audioContext), false);
  await page
    .getByRole("button", { name: "ENTER THE ARCADE", exact: true })
    .click();
  await page.waitForTimeout(2100);
  const energy = () =>
    page.evaluate(() => {
      const a = window.__audioProbe,
        data = new Float32Array(a.fftSize);
      a.getFloatTimeDomainData(data);
      return Math.sqrt(data.reduce((n, x) => n + x * x, 0) / data.length);
    });
  assert.ok(
    (await energy()) > 0.00001,
    "music should be audible after a gesture",
  );
  await page.getByRole("button", { name: "Pause game" }).click();
  await expect
    .poll(() => page.evaluate(() => window.__audioContext.state))
    .toBe("suspended");
  await page.keyboard.press("j");
  await page.waitForTimeout(150);
  assert.equal(
    await page.evaluate(() => window.__audioContext.state),
    "suspended",
    "paused key cannot resume audio",
  );
  await page.getByRole("button", { name: "RETURN TO MENU" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Play the original percussion soundtrack").uncheck();
  await page.getByLabel("Mute all audio").check();
  await page.getByRole("button", { name: "TEST VICTORY SOUND" }).click();
  await page.waitForTimeout(120);
  assert.ok(
    (await energy()) < 0.00001,
    "master mute must silence samples and music",
  );
  await page.getByLabel("Mute all audio").uncheck();
  await page.getByRole("button", { name: "TEST VICTORY SOUND" }).click();
  await page.waitForTimeout(100);
  assert.ok(
    (await energy()) > 0.00001,
    "victory effects must be audible without music",
  );
  const ranges = page.locator(".settings-form input[type=range]");
  await ranges.nth(0).fill("0");
  await page.waitForTimeout(600);
  assert.ok((await energy()) < 0.00001, "effects zero must mute sample tails");
  await page.getByLabel("Play the original percussion soundtrack").check();
  await page.waitForTimeout(900);
  await expect.poll(energy, { timeout: 2500 }).toBeGreaterThan(0.00001);
  const clips = await page.evaluate(async () => {
    const names = [
        "jab",
        "heavy",
        "guard",
        "bell",
        "victory",
        "fight",
        "winner",
        "round1",
        "round2",
        "round3",
      ],
      ctx = window.__audioContext;
    return Promise.all(
      names.map(async (name) => {
        const response = await fetch("/audio/arcade/" + name + ".ogg");
        const b = await ctx.decodeAudioData(await response.arrayBuffer());
        const data = b.getChannelData(0);
        return {
          name,
          duration: b.duration,
          sampleRate: b.sampleRate,
          energy: Math.sqrt(
            data.reduce((sum, x) => sum + x * x, 0) / data.length,
          ),
        };
      }),
    );
  });
  for (const clip of clips) {
    assert.ok(clip.duration > 0 && clip.duration < 8);
    assert.ok(clip.energy > 0.001);
  }
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect
    .poll(() => page.evaluate(() => window.__audioContext.state))
    .toBe("suspended");
  await page.keyboard.press("j");
  assert.equal(
    await page.evaluate(() => window.__audioContext.state),
    "suspended",
  );
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/arcade/audio-report.json",
    JSON.stringify(clips, null, 2),
  );
  console.log(
    "PASS: gesture-only audio, independent levels, master mute, audible victory, 10 decoded licensed clips, and pause/hidden suspension.",
  );
} finally {
  await browser.close();
}
