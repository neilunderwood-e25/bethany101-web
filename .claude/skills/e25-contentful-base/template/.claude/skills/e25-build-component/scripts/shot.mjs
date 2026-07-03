#!/usr/bin/env node
/*
 * Self-contained headless-Chrome screenshot tool for visual verification.
 *
 * Launches Chrome with remote debugging, (optionally) sets an auth cookie, navigates,
 * (optionally) clicks an element to trigger an interaction, then captures either the full
 * viewport or a single element clipped to its bounding box — and kills Chrome on exit.
 *
 * Usage:
 *   node shot.mjs --url <url> --out <file.png> [options]
 *
 * Options:
 *   --clip "<css selector>"   clip to that element's bounding box (great for one section)
 *   --click "<css selector>"  click this element before capturing (test an interaction)
 *   --width <px>              viewport width (default 1920 — match the Figma node width)
 *   --height <px>             viewport height (default 900)
 *   --scale <n>               device scale factor (default 1; use 2 for retina detail)
 *   --wait <ms>              extra settle time after load (default 2500)
 *   --cookie "name=value"    set this cookie on the target origin before navigating
 *                            (for auth-gated dev sites — obtain it via the project's login)
 *   --port <n>               Chrome debug port (default 9222)
 *
 * Requires Node 22+ (global WebSocket). Set CHROME_PATH to override the browser binary.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith("--")) args[a.slice(2)] = process.argv[i + 1]?.startsWith("--") || i + 1 >= process.argv.length ? true : process.argv[++i];
}
const url = args.url, out = args.out;
if (!url || !out) { console.error("required: --url <url> --out <file.png>"); process.exit(1); }
const width = parseInt(args.width || "1920", 10);
const height = parseInt(args.height || "900", 10);
const scale = parseInt(args.scale || "1", 10);
const waitMs = parseInt(args.wait || "2500", 10);
const port = parseInt(args.port || "9222", 10);

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
].filter(Boolean);
const chrome = CHROME_CANDIDATES.find((p) => { try { return fs.existsSync(p); } catch { return false; } });
if (!chrome) { console.error("Chrome not found; set CHROME_PATH"); process.exit(1); }

const profile = fs.mkdtempSync(path.join(os.tmpdir(), "shot-profile-"));
const proc = spawn(chrome, [
  "--headless=new", `--remote-debugging-port=${port}`, "--disable-gpu",
  "--no-first-run", "--no-default-browser-check", "--hide-scrollbars",
  `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });

const cleanup = () => { try { proc.kill("SIGKILL"); } catch {} try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} };
process.on("exit", cleanup);

let ver;
for (let i = 0; i < 60; i++) {
  try { ver = await (await fetch(`http://localhost:${port}/json/version`)).json(); break; } catch { await sleep(250); }
}
if (!ver) { console.error("Chrome debug endpoint never came up"); cleanup(); process.exit(1); }

const ws = new WebSocket(ver.webSocketDebuggerUrl);
let nextId = 1;
const pending = new Map();
const waiters = new Map();
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id); pending.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
  } else if (m.method && waiters.has(m.method)) { const l = waiters.get(m.method); if (l.length) l.shift()(m.params); }
});
const send = (method, params = {}, sessionId) => {
  const id = nextId++;
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
};
const waitEvent = (m) => new Promise((r) => { if (!waiters.has(m)) waiters.set(m, []); waiters.get(m).push(r); });
await new Promise((r) => ws.addEventListener("open", r));

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Network.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);
await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile: false }, sessionId);

if (args.cookie) {
  const eq = args.cookie.indexOf("=");
  const name = args.cookie.slice(0, eq), value = args.cookie.slice(eq + 1);
  const domain = new URL(url).hostname;
  await send("Network.setCookie", { name, value, domain, path: "/" }, sessionId);
}

const loaded = waitEvent("Page.loadEventFired");
await send("Page.navigate", { url }, sessionId);
await Promise.race([loaded, sleep(8000)]);
await sleep(waitMs);

if (args.click) {
  const r = await send("Runtime.evaluate", {
    expression: `(() => { const el = document.querySelector(${JSON.stringify(args.click)}); if(!el) return "not found"; el.click(); return "clicked"; })()`,
    returnByValue: true,
  }, sessionId);
  console.log("click:", r.result.value);
  await sleep(1200);
}

let clip;
if (args.clip) {
  const r = await send("Runtime.evaluate", {
    expression: `(() => { const el = document.querySelector(${JSON.stringify(args.clip)}); if(!el) return null; const b = el.getBoundingClientRect(); return JSON.stringify({x:Math.round(b.x),y:Math.round(b.y),width:Math.round(b.width),height:Math.round(b.height)}); })()`,
    returnByValue: true,
  }, sessionId);
  if (!r.result.value) { console.error("clip selector not found:", args.clip); cleanup(); process.exit(1); }
  const rect = JSON.parse(r.result.value);
  console.log("clip rect:", JSON.stringify(rect));
  clip = { ...rect, scale };
}

const shot = await send("Page.captureScreenshot",
  clip ? { format: "png", captureBeyondViewport: true, clip } : { format: "png" }, sessionId);
fs.writeFileSync(out, Buffer.from(shot.data, "base64"));
console.log("wrote", out, `${width}x${height}@${scale}x`);
ws.close();
cleanup();
process.exit(0);
