import { useEffect, useRef, useState } from "react";
import { getDocument, PDFWorker } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { createDefaultResume, createResumeFromTemplate, type ResumeTemplateId } from "../model/resume";
import { SCENARIOS } from "../model/contentPresets";
import { generateTypstPdf } from "../export/typstPdf";

interface CaptureJob { kind: "template" | "scenario"; id: string }

// Development-only batch capture. The generator server supplies jobs and only
// receives a page after both PDF compilation and canvas rendering have finished.
export async function capturePreviews(token: string, report: (message: string) => void) {
  const endpoint = `/__template-generation?token=${encodeURIComponent(token)}`;
  const send = async (payload: unknown) => {
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error(await response.text());
  };
  let currentJob: CaptureJob | undefined;
  let stage = "读取生成任务";
  try {
    const configResponse = await fetch(endpoint);
    if (!configResponse.ok) throw new Error("请通过 npm run generate:template-previews 启动素材生成");
    const { jobs } = await configResponse.json() as { jobs: CaptureJob[] };
    for (const job of jobs) {
      currentJob = job;
      stage = "准备示例内容";
      report(`正在生成 ${job.kind}: ${job.id}`);
      const scenario = SCENARIOS.find((item) => item.id === job.id);
      const resume = job.kind === "scenario" && scenario ? createResumeFromTemplate(scenario.id) : createDefaultResume();
      if (job.kind === "template") resume.theme = { ...resume.theme, templateId: job.id as ResumeTemplateId, density: 42, accent: "#596d82" };
      stage = "编译 Typst PDF（含字体与头像读取）";
      const { blob } = await generateTypstPdf(resume);
      stage = "加载 PDF 与 PDF.js worker";
      const nativeWorker = new Worker(workerUrl, { type: "module" });
      // @ts-expect-error PDF.js accepts Worker ports but its generated type infers null.
      const worker = new PDFWorker({ port: nativeWorker });
      const loading = getDocument({ data: new Uint8Array(await blob.arrayBuffer()), worker, useSystemFonts: false, useWasm: false });
      try {
        const pdf = await loading.promise;
        const pages = [];
        const count = job.kind === "scenario" ? pdf.numPages : 1;
        for (let number = 1; number <= count; number++) {
          stage = `读取 PDF 第 ${number} 页`;
          const page = await pdf.getPage(number);
          const width = job.kind === "scenario" ? 1200 : 420;
          const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          stage = `绘制 PDF 第 ${number} 页`;
          await page.render({ canvas, viewport }).promise;
          stage = `校验 PDF 第 ${number} 页文字`;
          const text = await page.getTextContent();
          const textLength = text.items.reduce((length, item) => length + ("str" in item ? item.str.trim().length : 0), 0);
          if (!textLength) throw new Error(`${job.id} 第 ${number} 页没有文字，请检查排版`);
          stage = `导出 PDF 第 ${number} 页 PNG`;
          pages.push({ png: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height, textLength });
          page.cleanup();
          canvas.width = canvas.height = 0;
        }
        stage = "上传预览结果";
        await send({ type: "result", job, pageCount: pdf.numPages, pages });
      } finally {
        await loading.destroy();
        worker.destroy();
        nativeWorker.terminate();
      }
    }
    currentJob = undefined;
    stage = "确认全部任务完成";
    await send({ type: "done" });
    report("全部素材已生成");
  } catch (error) {
    const message = `[${currentJob ? `${currentJob.kind}:${currentJob.id}` : "生成任务"} / ${stage}] ${error instanceof Error ? error.message : String(error)}`;
    // If the server disappeared, retain the original stage and error instead of
    // replacing it with a second, context-free fetch failure from reporting.
    await send({ type: "error", job: currentJob, stage, message }).catch(() => undefined);
    throw new Error(message, { cause: error });
  }
}

export function TemplateThumbnailCapture({ templateId: _templateId }: { templateId: ResumeTemplateId }) {
  const started = useRef(false);
  const [message, setMessage] = useState("等待素材生成任务");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = new URLSearchParams(window.location.search).get("generationToken");
    if (!import.meta.env.DEV || !token) { setMessage("请通过 npm run generate:template-previews 启动素材生成"); return; }
    void capturePreviews(token, setMessage).catch((error: unknown) => setMessage(error instanceof Error ? error.message : String(error)));
  }, []);
  return <main aria-label="静态预览素材生成页"><p role="status">{message}</p></main>;
}
