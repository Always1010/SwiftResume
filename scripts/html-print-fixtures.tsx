import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { HtmlResumePages } from "../src/components/HtmlPrintPreview";
import { createDefaultResume, getDensityLayout, type RichTextNode } from "../src/model/resume";
import { getDocument, PDFWorker } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "../src/styles.css";
import "../src/editorModes.css";
import "../src/workspace.css";
import "../src/htmlPrint.css";
import { savePrintJob, loadPrintJob } from "../src/export/htmlPrintJobs";

const name = new URLSearchParams(location.search).get("case") ?? "short";
const paragraph = (text: string): RichTextNode => ({ type: "paragraph", content: [{ type: "text", text }] });
const resume = createDefaultResume();
resume.profile = { ...resume.profile, name: "排版验证", headline: "后端开发工程师", photo: "", email: "hello@example.com", details: [{ id: "nation", label: "民族", value: "汉族" }, { id: "degree", label: "学历", value: "本科" }] };
const education = resume.sections.find((section) => section.type === "education")!;
if (education.type === "education") education.items = [{ ...education.items[0], school: "某某大学", major: "计算机科学与技术", degree: "本科", date: "2021.09 — 2025.06", detail: "GPA 3.7/5.0 · 专业前 20%" }];
const body: RichTextNode[] = [
  { type: "paragraph", content: [{ type: "text", text: "开发工具：", marks: [{ type: "bold" }] }, { type: "text", text: "C++ · CMake · GDB · Postman" }] },
  paragraph("项目描述：基于 Linux 的高并发 HTTP 服务器，支持静态资源访问与连接管理。"),
  { type: "bulletList", content: ["使用 epoll 与线程池实现 Reactor 高并发模型。", "实现 GET、POST 请求解析、定时器和异步日志模块。", "完成压力测试与性能分析，在实验环境中稳定处理高并发请求。"].map((text) => ({ type: "listItem", content: [paragraph(text)] })) },
  { type: "orderedList", attrs: { start: 3 }, content: [{ type: "listItem", content: [paragraph("保留编号起点"), { type: "bulletList", content: [{ type: "listItem", content: [paragraph("嵌套列表内容")] }] }] }] },
  { type: "paragraph", content: [{ type: "text", text: "宋体样式验证", marks: [{ type: "textStyle", attrs: { fontFamily: "SimSun", fontSize: "14pt" } }] }] },
];
if (name === "long-entry") body.push(...Array.from({ length: 70 }, (_, i) => paragraph(`段落 ${i + 1}：验证长项目分页，不能截断或遗漏内容。`)));
if (name === "long-paragraph") body.push(paragraph("超长段落开始" + "验证连续长段落和中文自动换行，保留全部内容与标点。".repeat(240) + "超长段落结束"));
if (name === "table") body.push({ type: "table", content: Array.from({ length: 65 }, (_, i) => ({ type: "tableRow", content: ["第一列", "第二列"].map((text) => ({ type: "tableCell", content: [paragraph(`${text}数据 ${i + 1}`)] })) })) });
resume.sections = [education, { id: "projects", type: "content", title: "项目经历", enabled: true, entries: Array.from({ length: name === "multipage" ? 16 : name === "density-multipage" ? 8 : 1 }, (_, i) => ({ id: `p${i}`, title: `轻量级 HTTP 服务器 ${i + 1}`, subtitle: "核心开发", date: "2024.07 — 2024.09", body: { type: "doc", content: body } })) }];
const zoom = name === "zoom" ? 0.7 : 1;
if (name === "gap" && resume.sections[1].type === "content") {
  const entry = resume.sections[1].entries[0];
  resume.sections[1].entries = [30, 22].map((length, i) => ({ ...entry, id: `gap-${i}`, title: `留白测试项目 ${i + 1}`, body: { type: "doc", content: Array.from({ length }, (_, line) => paragraph(`项目 ${i + 1} 段落 ${line + 1}：保留正文并合理跨页。`)) } }));
}
const assert = (condition: boolean, message: string) => { if (!condition) throw new Error(message); };
const normalized = (text: string) => text.replace(/\s/g, "");
const root = document.getElementById("root")!;
document.body.classList.add("html-print-body");
// This module is served by the verification harness, never by the production app.
declare global { interface Window { htmlResult: unknown; verifyPrintedPdf: (data: string) => Promise<unknown>; verifyDensityUpdates: () => Promise<unknown>; } }
let currentResume = resume;
let completions = 0;
const renderer = createRoot(root);
const render = () => renderer.render(<main className="html-print-app"><div className="html-print-stage" style={{ zoom }}><HtmlResumePages resume={currentResume} onReady={(count, error) => {
  if (error) { window.htmlResult = { error }; return; }
  if (!count) return;
  completions++;
  try {
    const source = document.querySelector<HTMLElement>(".html-resume-source")!;
    const pages = Array.from(document.querySelectorAll<HTMLElement>(".html-resume-pages > .html-resume"));
    assert(normalized(source.textContent!) === normalized(pages.map((page) => page.textContent).join("")), "分页丢失或重复文字");
    assert(count === pages.length, "页数不一致");
    if (name === "gap") assert(pages[0].textContent?.includes("留白测试项目 2"), "不能把整个下一项目推到下一页造成大块留白");
    if (["multipage", "long-entry", "long-paragraph", "table"].includes(name)) assert(count > 1, "长内容应分页");
    const properties = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "listStyleType", "paddingLeft", "marginBottom"] as const;
    for (const selector of ["h1", ".resume-section-heading h2", ".resume-rich-text p", ".resume-rich-text li", ".resume-rich-text strong", ".entry-role", ".education-detail"]) {
      if (!source.querySelector(selector)) continue;
      const expected = getComputedStyle(source.querySelector(selector)!);
      const actual = getComputedStyle(pages[0].querySelector(selector)!);
      for (const property of properties) assert(expected[property] === actual[property], `${selector} ${property} 与原始 HTML 不同`);
    }
    for (const page of pages) {
      const bounds = page.getBoundingClientRect();
      for (const node of page.querySelectorAll("p, li, .entry-topline, .education-detail, .resume-section-heading")) {
        const box = node.getBoundingClientRect();
        assert(box.bottom <= bounds.bottom - 20 * zoom, `内容越过页底 ${node.textContent?.slice(0, 20)}`);
        assert(box.right <= bounds.right && box.left >= bounds.left, "内容水平越界");
      }
      const last = page.querySelector(".html-resume-content")!.lastElementChild;
      assert(!last || last.querySelector(".resume-flow-entry") || last.querySelector(".resume-header"), `模块标题孤立在页末 ${last?.outerHTML.slice(0, 800)}`);
    }
    const rows = pages[0].querySelectorAll(".profile-info-row");
    assert(Math.abs(rows[0].children[1].getBoundingClientRect().left - rows[1].children[1].getBoundingClientRect().left) < 1, "学历与邮箱错位");
    window.htmlResult = { count, name, zoom, text: normalized(source.textContent!), pages: pages.map((page) => { const r = page.getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, width: r.width, height: r.height }; }) };
  } catch (failure) { window.htmlResult = { error: String(failure) }; }
}} /></div></main>);
render();

window.verifyPrintedPdf = async (data) => {
  const original = structuredClone(resume);
  const jobId = crypto.randomUUID();
  const url = await savePrintJob(jobId, original);
  original.profile.name = "保存后修改，不应改变快照";
  const saved = await loadPrintJob(jobId);
  assert(saved?.profile.name === resume.profile.name, "打印快照不能随原数据修改");
  assert(new URL(url).searchParams.get("job") === jobId, "打印链接缺少快照标识");
  const nativeWorker = new Worker(workerUrl, { type: "module" });
  const worker = new PDFWorker({ port: nativeWorker } as never);
  const task = getDocument({ data: Uint8Array.from(atob(data), (char) => char.charCodeAt(0)), worker, useSystemFonts: false });
  try {
    const pdf = await task.promise;
    const pages = document.querySelectorAll<HTMLElement>(".html-resume-pages > .html-resume");
    assert(pdf.numPages === pages.length, `打印页数不同：${pdf.numPages} / ${pages.length}`);
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const text = await page.getTextContent();
      const items = text.items.filter((item) => "str" in item);
      const actual = normalized(items.filter((item) => !/^\s*(?:[•◦▪●]|\d+\.)\s*$/.test(item.str)).map((item) => item.str).join(""));
      // Ignore generated list markers, which are not part of DOM textContent.
      assert(actual === normalized(pages[n - 1].textContent!), `PDF 第 ${n} 页文本与 HTML 不一致\n${actual}\n${normalized(pages[n - 1].textContent!)}`);
      for (const item of items) {
        if (!item.str.trim()) continue;
        assert(item.transform[4] >= 0 && item.transform[4] + item.width < 597 && item.transform[5] > 0, `PDF 文本越界 ${item.str}`);
      }
      assert(Math.abs(page.view[2] - 595.28) < 1 && Math.abs(page.view[3] - 841.89) < 1, "不是 A4 PDF");
    }
    return { pdfPages: pdf.numPages, verified: true };
  } finally { await task.destroy(); worker.destroy(); nativeWorker.terminate(); }
};


window.verifyDensityUpdates = async () => {
  const visible = document.querySelector<HTMLElement>(".html-resume-pages")!;
  const firstPage = visible.firstElementChild!;
  const firstText = firstPage.querySelector(".resume-rich-text p")!;
  const sourceText = document.querySelector(".html-resume-source .resume-rich-text p")!;
  const nextFrame = () => new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`等待动画帧超时，页面状态：${document.visibilityState}`)), 2000);
    requestAnimationFrame(() => { clearTimeout(timer); resolve(); });
  });
  const samples: number[] = [];
  const fontLoad = document.fonts.load.bind(document.fonts);
  let fontRequests = 0;
  document.fonts.load = (...args) => { fontRequests++; return fontLoad(...args); };
  try {
    const before = completions;
    for (const value of [12, 95, 35, 70, 0, 100, 44]) {
      currentResume = { ...resume, theme: { ...resume.theme, density: value } };
      flushSync(render);
      assert(visible.firstElementChild === firstPage, "快速更新时清空或替换了页壳");
      assert(Math.abs(parseFloat(getComputedStyle(firstPage).fontSize) - getDensityLayout(value).fontSizePx) < 0.01, "滑块变化未立即应用字号");
    }
    await nextFrame();
    assert(completions === before + 1, "同一帧的连续更新应合并成一次分页");
    for (let step = 0; step < 90; step++) {
      const value = step < 45 ? step * 2 : (89 - step) * 2;
      const started = performance.now();
      currentResume = { ...resume, theme: { ...resume.theme, density: value } };
      flushSync(render);
      assert(visible.children.length > 0, "拖动期间出现空白预览");
      assert(visible.firstElementChild === firstPage, "不应重建原有页壳");
      if (name !== "density-multipage") assert(firstPage.querySelector(".resume-rich-text p") === firstText, "分页未变时不应重建正文");
      assert(document.querySelector(".html-resume-source .resume-rich-text p") === sourceText, "密度调整不应重建源富文本");
      await nextFrame();
      samples.push(performance.now() - started);
    }
    assert(fontRequests === 0, "调节密度不应重复请求已经准备好的字体");
    const expected = getDensityLayout(currentResume.theme.density).fontSizePx;
    assert(Math.abs(parseFloat(getComputedStyle(firstPage).fontSize) - expected) < 0.01, "旧分页结果覆盖了最新密度");
    assert(!document.querySelector(".html-resume-measure")!.childNodes.length, "测量 DOM 应在完成后释放");
    samples.sort((a, b) => a - b);
    return { frames: samples.length, p95FrameMs: Math.round(samples[Math.floor(samples.length * 0.95)]), fontRequests, finalDensity: currentResume.theme.density };
  } finally { document.fonts.load = fontLoad; }
};
