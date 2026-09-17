// Real-browser regression checks for HTML geometry and generated PDF text geometry.
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { createServer } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, ".vite/layout-check");
await mkdir(output, { recursive: true });
const profile = await mkdtemp(join(tmpdir(), "swift-layout-"));
const candidates = [process.env.CHROME_PATH, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/chromium", "/usr/bin/google-chrome"].filter(Boolean);
let browserPath;
for (const candidate of candidates) { try { await stat(candidate); browserPath = candidate; break; } catch { /* next */ } }
if (!browserPath) throw new Error("请通过 CHROME_PATH 指定 Chrome 或 Edge");
const token = randomUUID();
let finish, fail, browser, timer;
const complete = new Promise((resolveDone, reject) => { finish = resolveDone; fail = reject; });
// Attach a handler before starting the browser to avoid unhandled failures during startup.
void complete.catch(() => undefined);
const server = await createServer({ root, logLevel: "error", server: { host: "127.0.0.1", port: 4188, strictPort: false, hmr: false, watch: null }, plugins: [{
  name: "resume-layout-verification",
  configureServer(vite) {
    vite.middlewares.use(async (request, response, next) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (url.pathname !== "/layout-check" && url.pathname !== "/layout-result") return next();
      if (url.searchParams.get("token") !== token) { response.statusCode = 403; response.end(); return; }
      if (url.pathname === "/layout-check") {
        response.setHeader("Content-Type", "text/html");
        response.end('<html><head><meta charset="utf-8"></head><body><main id="fixture"></main><script type="module" src="/scripts/resume-layout-fixtures.tsx"></script></body></html>');
        return;
      }
      try {
        const chunks = [];
        let bytes = 0;
        for await (const chunk of request) { bytes += chunk.length; if (bytes > 40_000_000) throw new Error("结果过大"); chunks.push(chunk); }
        const result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (result.error) throw new Error(result.error);
        if (result.done) { response.end("ok"); finish(); return; }
        if (!/^[a-z0-9-]+$/.test(result.name)) throw new Error("无效检查名称");
        for (const [index, png] of result.pages.entries()) {
          if (!png.startsWith("data:image/png;base64,")) throw new Error("无效图像");
          await writeFile(join(output, `${result.name}-${index + 1}.png`), Buffer.from(png.split(",")[1], "base64"));
        }
        await writeFile(join(output, `${result.name}.json`), JSON.stringify(result.metrics, null, 2));
        console.log(`${result.name}: ${result.pages.length} 页，${result.checks} 项几何与内容检查通过`);
        response.end("ok");
      } catch (error) { response.statusCode = 500; response.end(String(error)); fail(error); }
    });
  },
}] });
try {
  await server.listen();
  const address = server.httpServer.address();
  timer = setTimeout(() => fail(new Error("排版检查超时")), 120_000);
  browser = spawn(browserPath, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--window-size=1440,1000", `http://127.0.0.1:${address.port}/layout-check?token=${token}`], { windowsHide: true, stdio: "ignore" });
  browser.on("error", fail);
  browser.on("exit", (code) => fail(new Error(`验证浏览器退出：${code}`)));
  await complete;
  console.log(`渲染结果：${output}`);
} finally {
  clearTimeout(timer);
  if (browser && browser.exitCode === null) { const stopped = new Promise((done) => browser.once("exit", done)); browser.kill(); await stopped; }
  await server.close();
  // Only remove the exact temporary profile created above.
  if (resolve(profile).startsWith(resolve(tmpdir()) + "\\") || resolve(profile).startsWith(resolve(tmpdir()) + "/")) await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
