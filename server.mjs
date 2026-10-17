import { createServer } from "node:http";
import next from "next";
const dev = process.env.NODE_ENV !== "production",
  port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname: "0.0.0.0", port });
await app.prepare();
const handle = app.getRequestHandler();
const server = createServer((req, res) => {
  if (/^\/api\/(rooms|ws)(\/|\?|$)|^\/socket\.io/.test(req.url || "")) {
    res.writeHead(503, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(
      JSON.stringify({
        error: "Online play is paused. Arcade runs on this device.",
        code: "ONLINE_PAUSED",
      }),
    );
    return;
  }
  handle(req, res);
});
const upgrade = app.getUpgradeHandler();
server.on("upgrade", (req, socket, head) => {
  if (dev && req.url?.startsWith("/_next/")) upgrade(req, socket, head);
  else socket.destroy();
});
server.listen(port, "0.0.0.0", () =>
  console.log("Yaba Fight local arcade ready, port " + port),
);
