import { chromium } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Static share artwork composed from the game's existing original art and fonts.
const root = new URL("../", import.meta.url);
const data = async (path, mime) =>
  `data:${mime};base64,${(await readFile(new URL(path, root))).toString("base64")}`;
const [map, fighter, display, body] = await Promise.all([
  data("public/arcade/maps/market.webp", "image/webp"),
  data("public/arcade/fighters/kunle/0.webp", "image/webp"),
  data("public/fonts/yaba-1.woff2", "font/woff2"),
  data("public/fonts/yaba-3.woff2", "font/woff2"),
]);
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.setContent(`<!doctype html><html><head><style>
  @font-face{font-family:Display;src:url('${display}');font-weight:800}
  @font-face{font-family:Body;src:url('${body}');font-weight:600}
  *{box-sizing:border-box}body{margin:0;width:1200px;height:630px;overflow:hidden;background:#18291f;color:#f4e8c8;font-family:Body,sans-serif;border:6px solid #e6b95c}
  .scene{position:absolute;inset:6px;background:linear-gradient(90deg,#10251af5 0%,#10251ae8 35%,#10251a33 75%),url('${map}') center/cover}
  .fighter{position:absolute;right:75px;top:35px;height:660px;width:auto;filter:drop-shadow(8px 12px 0 #10251a55)}
  .copy{position:absolute;left:66px;top:58px}.eyebrow{font-size:18px;letter-spacing:2px;color:#e6b95c}
  h1{font:800 156px/.83 Display,sans-serif;margin:32px 0 24px;letter-spacing:-2px;transform:rotate(-3deg);transform-origin:left center}h1 span{color:#e6b95c}
  p{font-size:26px;line-height:1.3;margin:0}.cta{margin-top:28px;display:inline-block;padding:11px 18px;background:#e6b95c;color:#18291f;font:800 22px Display,sans-serif;letter-spacing:.5px}
  footer{position:absolute;bottom:6px;left:6px;right:6px;height:50px;display:flex;align-items:center;justify-content:space-between;padding:0 32px;background:#18291f;font-size:14px;letter-spacing:1px}
  </style></head><body><div class="scene"></div><img class="fighter" src="${fighter}" alt="Kunle in a fighting stance"/><main class="copy"><div class="eyebrow">SEVEN RIVALS. ONE MAINLAND.</div><h1>YABA<br/><span>FIGHT.</span></h1><p>Small game.<br/>Big wahala.</p><div class="cta">PLAY FREE IN YOUR BROWSER</div></main><footer><span>A LAGOS ARCADE FIGHTER</span><span>NO DOWNLOAD. NO SIGN-UP.</span></footer></body></html>`);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((im) => im.decode()));
  });
  const directory = new URL("public/og/", root);
  await mkdir(directory, { recursive: true });
  const output = fileURLToPath(new URL("yaba-fight-v1.png", directory));
  await page.screenshot({ path: output });
  console.log(`Saved 1200×630 share card: ${output}`);
} finally {
  await browser.close();
}
