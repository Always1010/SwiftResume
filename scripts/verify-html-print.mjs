// Print actual browser PDFs and check them against the same on-screen DOM.
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, ".vite/html-print-check");
await mkdir(output, { recursive: true });
const profile = await mkdtemp(join(tmpdir(), "swift-html-print-"));
let browserPath;
for (const candidate of [process.env.CHROME_PATH, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/chromium"].filter(Boolean)) {
  try { await stat(candidate); browserPath = candidate; break; } catch { /* next candidate */ }
}
if (!browserPath) throw new Error("请通过 CHROME_PATH 指定 Chrome 或 Edge");
const server = await createServer({ root, logLevel: "error", server: { host: "127.0.0.1", port: 4189, hmr: false, watch: null }, plugins: [{ name: "html-print-fixture", configureServer(vite) {
  vite.middlewares.use((request, response, next) => {
    if (!request.url?.startsWith("/html-print-check?")) return next();
    response.setHeader("Content-Type", "text/html");
    response.end('<html><head><meta charset="utf-8"><style>.html-resume-pages { align-items: flex-start !important; }</style></head><body><div id="root"></div><script type="module" src="/scripts/html-print-fixtures.tsx"></script></body></html>');
  });
} }] });
let browser, socket;
let sequence = 0;
const pending = new Map();
async function command(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolveCommand, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timeout`)); }, 60_000);
    pending.set(id, { resolve: resolveCommand, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
const evaluate = async (expression) => {
  const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
};
try {
  await server.listen();
  const port = server.httpServer.address().port;
  browser = spawn(browserPath, ["--headless=new", "--disable-gpu", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--window-size=1440,1000", "about:blank"], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
  const debugUrl = await new Promise((resolveUrl, reject) => {
    let buffer = "";
    const timer = setTimeout(() => reject(new Error("浏览器启动超时")), 20_000);
    browser.on("error", reject);
    browser.stderr.on("data", (data) => { buffer += data; const match = buffer.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) { clearTimeout(timer); resolveUrl(match[1]); } });
  });
  const targets = await (await fetch(`http://${new URL(debugUrl).host}/json/list`)).json();
  socket = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
  await new Promise((resolveOpen, reject) => { socket.onopen = resolveOpen; socket.onerror = reject; });
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    const item = pending.get(message.id);
    if (!item) return;
    clearTimeout(item.timer); pending.delete(message.id);
    if (message.error) item.reject(new Error(JSON.stringify(message.error))); else item.resolve(message.result);
  };
  await command("Page.enable");
  const cases = process.argv.slice(2);
  for (const name of cases.length ? cases : ["short", "multipage", "long-entry", "long-paragraph", "table", "zoom", "gap", "density", "density-multipage"]) {
    await command("Page.navigate", { url: `http://127.0.0.1:${port}/html-print-check?case=${name}` });
    await command("Page.bringToFront");
    let result;
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      result = await evaluate("window.htmlResult");
      if (result?.name === name || result?.error) break;
      await new Promise((done) => setTimeout(done, 150));
    }
    if (!result || result.error) throw new Error(`${name}: ${result?.error ?? "未生成预览"}`);
    if (name.startsWith("density")) {
      const metrics = await evaluate("window.verifyDensityUpdates()");
      result = await evaluate("window.htmlResult");
      if (result.error) throw new Error(result.error);
      result.densityUpdates = metrics;
      console.log(`${name}: ${JSON.stringify(metrics)}`);
    }
    for (const [i, clip] of result.pages.entries()) {
      const screenshot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { ...clip, scale: 1 } });
      await writeFile(join(output, `${name}-html-${i + 1}.png`), Buffer.from(screenshot.data, "base64"));
    }
    const pdf = await command("Page.printToPDF", { printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, scale: 1 });
    await writeFile(join(output, `${name}.pdf`), Buffer.from(pdf.data, "base64"));
    const verified = await evaluate(`window.verifyPrintedPdf(${JSON.stringify(pdf.data)})`);
    await writeFile(join(output, `${name}.json`), JSON.stringify({ ...result, ...verified }, null, 2));
    console.log(`${name}: HTML / 浏览器 PDF 共 ${verified.pdfPages} 页，文字、字体样式、分页与边界检查通过`);
  }
  console.log(`验证输出：${output}`);
} finally {
  socket?.close();
  for (const item of pending.values()) clearTimeout(item.timer);
  if (browser && browser.exitCode === null) { const stopped = new Promise((done) => browser.once("exit", done)); browser.kill(); await stopped; }
  await server.close();
  if (resolve(profile).startsWith(resolve(tmpdir()) + "\\") || resolve(profile).startsWith(resolve(tmpdir()) + "/")) await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
