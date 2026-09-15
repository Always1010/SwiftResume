import { spawn } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const modelSource = await readFile(join(projectRoot, "src/model/resume.ts"), "utf8");
const templateList = /RESUME_TEMPLATE_IDS\s*=\s*\[([\s\S]*?)\]\s*as const/.exec(modelSource)?.[1];
if (!templateList) throw new Error("无法从简历模型读取模板列表");
const templateIds = [...templateList.matchAll(/"([a-z-]+)"/g)].map((match) => match[1]);
if (!templateIds.length) throw new Error("模板列表为空");

const browserCandidates = process.platform === "win32"
  ? [
      process.env.CHROME_PATH,
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ]
  : [process.env.CHROME_PATH, "/usr/bin/google-chrome", "/usr/bin/chromium", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];

async function existingPath(paths) {
  for (const path of paths.filter(Boolean)) {
    try {
      await stat(path);
      return path;
    } catch { /* Try the next local browser. */ }
  }
  return null;
}

function runBrowser(browserPath, args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(browserPath, args, { cwd: projectRoot, stdio: ["ignore", "pipe", "pipe"] });
    let diagnostics = "";
    child.stdout.on("data", (chunk) => { diagnostics += chunk; });
    child.stderr.on("data", (chunk) => { diagnostics += chunk; });
    child.on("error", rejectPromise);
    child.on("exit", (code) => code === 0
      ? resolvePromise()
      : rejectPromise(new Error(`浏览器截图失败（退出码 ${code}）\n${diagnostics}`)));
  });
}

const browserPath = await existingPath(browserCandidates);
if (!browserPath) throw new Error("没有找到 Chrome 或 Edge；也可以通过 CHROME_PATH 指定浏览器路径");

const temporaryRoot = await mkdtemp(join(tmpdir(), "swift-resume-previews-"));
const captureDirectory = join(temporaryRoot, "captures");
const profileDirectory = join(temporaryRoot, "browser-profile");
const outputDirectory = join(projectRoot, "public", "template-previews");
await mkdir(captureDirectory, { recursive: true });

const server = await createServer({
  root: projectRoot,
  logLevel: "error",
  server: { host: "127.0.0.1", port: 4179, strictPort: false },
});

try {
  try {
    await server.listen();
    const address = server.httpServer?.address();
    if (!address || typeof address === "string") throw new Error("无法确定本地预览服务端口");
    const origin = `http://127.0.0.1:${address.port}/`;

    for (const templateId of templateIds) {
      const screenshotPath = join(captureDirectory, `${templateId}.png`);
      const url = new URL(origin);
      url.searchParams.set("view", "template-thumbnail");
      url.searchParams.set("templateId", templateId);
      await runBrowser(browserPath, [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--no-first-run",
        "--no-default-browser-check",
        `--user-data-dir=${profileDirectory}`,
        "--window-size=360,510",
        "--force-device-scale-factor=1",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=1800",
        `--screenshot=${screenshotPath}`,
        url.toString(),
      ]);
      const image = await stat(screenshotPath);
      if (image.size < 1000) throw new Error(`${templateId} 的缩略图生成异常`);
    }
  } finally {
    await server.close();
  }

  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  for (const templateId of templateIds) {
    await copyFile(join(captureDirectory, `${templateId}.png`), join(outputDirectory, `${templateId}.png`));
  }
  console.log(`已生成 ${templateIds.length} 张模板缩略图：${outputDirectory}`);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
