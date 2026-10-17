import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const base = process.env.TEST_URL || "http://127.0.0.1:8799";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Account UI tests are local-only.");
const b = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const p = await b.newPage({ viewport: { width: 390, height: 844 } }),
  suffix = Date.now().toString(36),
  password = "Ui-test-only-7371";
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
try {
  await p.goto(base);
  await p.getByRole("button", { name: "Account", exact: true }).click();
  await p.getByRole("button", { name: "Create account", exact: true }).click();
  await p.getByLabel("Fighter username", { exact: true }).fill("Ui_" + suffix);
  await p
    .getByLabel("Email", { exact: true })
    .fill("qa-ui-" + suffix + "@example.com");
  await p.getByLabel("Password", { exact: true }).fill(password);
  await p.getByRole("button", { name: "Claim my name", exact: true }).click();
  await expect(
    p.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
  await p.screenshot({ path: "artifacts/arcade/account-profile.png" });
  await p.getByRole("button", { name: "Close dialog" }).click();
  await p.getByRole("button", { name: "SPONSOR A WALL", exact: true }).click();
  await p.getByLabel("Brand or business").fill("Disposable UI test");
  await p
    .getByLabel("Preferred dates and campaign")
    .fill("Local QA. Deleted with test account.");
  await p
    .getByRole("button", { name: "Request this space", exact: true })
    .click();
  await expect(p.getByText("Request saved.", { exact: true })).toBeVisible();
  await p.screenshot({ path: "artifacts/arcade/sponsor-receipt.png" });
  await p.getByRole("button", { name: "Close dialog" }).click();
  await p.getByRole("button", { name: "Account", exact: true }).click();
  await p.getByRole("button", { name: "Delete account", exact: true }).click();
  await p.getByLabel("Confirm your password").fill(password);
  await p
    .getByRole("button", { name: "Permanently delete account", exact: true })
    .click();
  await expect(
    p.getByRole("button", { name: "Create account", exact: true }),
  ).toBeVisible();
  await p.getByRole("button", { name: "Close dialog" }).click();
  await p
    .getByRole("button", { name: "ENTER THE ARCADE", exact: true })
    .click();
  const cdp = await p.context().newCDPSession(p);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const frames = await p.evaluate(
    () =>
      new Promise((resolve) => {
        const values = [];
        let last = performance.now();
        function tick(now) {
          values.push(now - last);
          last = now;
          if (values.length < 100) requestAnimationFrame(tick);
          else {
            values.shift();
            values.sort((a, b) => a - b);
            resolve({
              median: values[Math.floor(values.length * 0.5)],
              p95: values[Math.floor(values.length * 0.95)],
              max: values.at(-1),
              samples: values.length,
            });
          }
        }
        requestAnimationFrame(tick);
      }),
  );
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  assert.ok(frames.p95 < 55, "4x CPU profile should stay above roughly 20fps");
  await writeFile(
    "artifacts/arcade/frame-profile.json",
    JSON.stringify(frames, null, 2),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: phone account signup/deletion, persisted sponsor enquiry, and local 4x CPU frame profile",
    frames,
  );
} finally {
  await p.request
    .post(base + "/api/auth/delete-user", { data: { password } })
    .catch(() => {});
  await b.close();
}
