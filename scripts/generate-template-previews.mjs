import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const modelSource = await readFile(join(projectRoot, "src/model/resume.ts"), "utf8");
const templateList = /RESUME_TEMPLATE_IDS\s*=\s*\[([\s\S]*?)\]\s*as const/.exec(modelSource)?.[1];
if (!templateList) throw new Error("无法读取模板列表");
const allTemplateIds = [...templateList.matchAll(/"([a-z-]+)"/g)].map((match) => match[1]);
const scenarioSource = await readFile(join(projectRoot, "src/model/contentPresets.ts"), "utf8");
const scenarioList = /export const SCENARIOS\s*=\s*\[([\s\S]*?)\]\s*as const/.exec(scenarioSource)?.[1];
if (!scenarioList) throw new Error("无法读取场景列表");
const allScenarioIds = [...scenarioList.matchAll(/\{ id: "([a-z-]+)"/g)].map((match) => match[1]);
const args = process.argv.slice(2);
if (args.some((arg) => !/^--(?:templates|scenarios)=/.test(arg))) throw new Error("参数格式：--templates=classic,minimal --scenarios=graduate；使用 none 跳过某类，省略参数则生成该类全部素材");
function selectedIds(key, available) {
  const value = args.find((arg) => arg.startsWith(`--${key}=`))?.split("=")[1];
  const selected = value === undefined ? available : value === "none" ? [] : value.split(",");
  if (selected.some((id) => !available.includes(id))) throw new Error(`未知的 ${key}：${value}`);
  return [...new Set(selected)];
}
const jobs = [
  ...selectedIds("templates", allTemplateIds).map((id) => ({ kind: "template", id })),
  ...selectedIds("scenarios", allScenarioIds).map((id) => ({ kind: "scenario", id })),
];
if (!jobs.length) throw new Error("没有待生成的素材");
const browserCandidates = process.platform === "win32"
  ? [process.env.CHROME_PATH, "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"]
  : [process.env.CHROME_PATH, "/usr/bin/google-chrome", "/usr/bin/chromium", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];
let browserPath;
for (const path of browserCandidates.filter(Boolean)) {
  try { await stat(path); browserPath = path; break; } catch { /* Try next browser. */ }
}
if (!browserPath) throw new Error("没有找到 Chrome 或 Edge；可以通过 CHROME_PATH 指定路径");

const manifestPath = join(projectRoot, "src/templates/previewManifest.json");
const originalManifest = JSON.parse(await readFile(manifestPath, "utf8"));
const manifest = structuredClone(originalManifest);
const outputDirectory = join(projectRoot, "public/template-previews");
const temporaryRoot = await mkdtemp(join(tmpdir(), "swift-resume-previews-"));
const captures = join(temporaryRoot, "captures");
await mkdir(captures);
const token = randomUUID();
const pending = new Map(jobs.map((job) => [`${job.kind}:${job.id}`, job]));
const generatedFiles = [];
const started = Date.now();
let finish;
let fail;
let idleTimer;
let browser;
let diagnostics = "";
const completed = new Promise((resolvePromise, rejectPromise) => { finish = resolvePromise; fail = rejectPromise; });
// Fail on missing readiness instead of capturing whatever happens to be visible.
const resetTimeout = () => {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => fail(new Error(`素材生成超过 120 秒没有进展\n${diagnostics}`)), 120_000);
};
const server = await createServer({
  root: projectRoot,
  logLevel: "error",
  server: { host: "127.0.0.1", port: 4179, strictPort: false, fs: { allow: [projectRoot, await realpath(join(projectRoot, "node_modules"))] } },
  plugins: [{ name: "static-preview-results", configureServer(vite) {
    vite.middlewares.use(async (request, response, next) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (url.pathname !== "/__template-generation") return next();
      if (url.searchParams.get("token") !== token) { response.statusCode = 403; response.end("无效生成令牌"); return; }
      response.setHeader("Content-Type", "application/json");
      if (request.method === "GET") { response.end(JSON.stringify({ jobs })); return; }
      if (request.method !== "POST") { response.statusCode = 405; response.end(); return; }
      try {
        const chunks = [];
        let length = 0;
        for await (const chunk of request) {
          length += chunk.length;
          if (length > 40_000_000) throw new Error("素材结果超过请求大小限制");
          chunks.push(chunk);
        }
        const result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (result.type === "error") throw new Error(result.message);
        if (result.type === "done") {
          if (pending.size) throw new Error(`尚有 ${pending.size} 个素材未完成`);
          response.end("{}"); finish(); return;
        }
        const key = `${result.job?.kind}:${result.job?.id}`;
        const job = pending.get(key);
        if (result.type !== "result" || !job) throw new Error("收到未知或重复素材任务");
        const expectedPages = job.kind === "template" ? 1 : result.pageCount;
        if (!Number.isInteger(result.pageCount) || result.pageCount < 1 || !Array.isArray(result.pages) || result.pages.length !== expectedPages) throw new Error(`${key} 页数不完整`);
        const pages = [];
        for (const [index, page] of result.pages.entries()) {
          if (!/^data:image\/png;base64,/.test(page.png) || !(page.textLength > 0)) throw new Error(`${key} 第 ${index + 1} 页缺少已完成的渲染结果`);
          const bytes = Buffer.from(page.png.slice("data:image/png;base64,".length), "base64");
          if (bytes.length < 24 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" || bytes.readUInt32BE(16) !== page.width || bytes.readUInt32BE(20) !== page.height || page.width < 400 || page.height < 500) throw new Error(`${key} PNG 尺寸或格式不正确`);
          const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
          const file = `${job.kind === "scenario" ? `scenario-${job.id}-${index + 1}` : job.id}-${hash}.png`;
          await writeFile(join(captures, file), bytes);
          generatedFiles.push(file);
          pages.push({ file, width: page.width, height: page.height });
        }
        if (job.kind === "template") manifest.templates[job.id] = pages[0];
        else manifest.scenarios[job.id] = pages;
        pending.delete(key);
        console.log(`[${jobs.length - pending.size}/${jobs.length}] ${key}: ${result.pages.length} 张图片（PDF ${result.pageCount} 页），累计 ${((Date.now() - started) / 1000).toFixed(1)} 秒`);
        resetTimeout();
        response.end("{}");
      } catch (error) {
        response.statusCode = 500;
        response.end(JSON.stringify({ error: error.message }));
        fail(error);
      }
    });
  } }],
});

try {
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === "string") throw new Error("无法确定本地服务端口");
  const url = `http://127.0.0.1:${address.port}/?view=template-thumbnail&generationToken=${token}`;
  browser = spawn(browserPath, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${join(temporaryRoot, "browser-profile")}`, "--window-size=1440,1000", url], { cwd: projectRoot, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  browser.stdout.on("data", (chunk) => { diagnostics = (diagnostics + chunk).slice(-6000); });
  browser.stderr.on("data", (chunk) => { diagnostics = (diagnostics + chunk).slice(-6000); });
  browser.on("error", fail);
  browser.on("exit", (code) => { if (pending.size) fail(new Error(`浏览器提前退出（${code}）\n${diagnostics}`)); });
  resetTimeout();
  await completed;
  // All jobs succeeded. Content-addressed files preserve the old manifest until
  // the complete new manifest is atomically published.
  await mkdir(outputDirectory, { recursive: true });
  for (const file of generatedFiles) await copyFile(join(captures, file), join(outputDirectory, file));
  const temporaryManifest = `${manifestPath}.tmp`;
  await writeFile(temporaryManifest, JSON.stringify(manifest, null, 2) + "\n");
  await rename(temporaryManifest, manifestPath);
  const filesIn = (value) => [...Object.values(value.templates), ...Object.values(value.scenarios).flat()].map((page) => page.file);
  const retained = new Set(filesIn(manifest));
  for (const file of filesIn(originalManifest)) {
    if (!retained.has(file) && file === basename(file) && /^[a-z0-9-]+\.png$/.test(file)) await rm(join(outputDirectory, file), { force: true });
  }
  console.log(`已生成 ${generatedFiles.length} 张静态预览，清单：${manifestPath}`);
} finally {
  clearTimeout(idleTimer);
  if (browser && browser.exitCode === null) {
    const exited = new Promise((resolveExit) => browser.once("exit", resolveExit));
    browser.kill();
    await exited;
  }
  await server.close();
  await rm(temporaryRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
