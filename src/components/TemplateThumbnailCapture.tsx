import { useEffect, useRef, useState } from "react";
import { getDocument, PDFWorker } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { createDefaultResume, createResumeFromTemplate, type ResumeTemplateId } from "../model/resume";
import { SCENARIOS } from "../model/contentPresets";
import { generateTypstPdf } from "../export/typstPdf";

interface CaptureJob { kind: "template" | "scenario"; id: string }

// Development-only batch capture. The generator server supplies jobs and only
// receives a page after both PDF compilation and canvas rendering have finished.
async function capturePreviews(token: string, report: (message: string) => void) {
  const endpoint = `/__template-generation?token=${encodeURIComponent(token)}`;
  const configResponse = await fetch(endpoint);
  if (!configResponse.ok) throw new Error("请通过 npm run generate:template-previews 启动素材生成");
  const { jobs } = await configResponse.json() as { jobs: CaptureJob[] };
  const send = async (payload: unknown) => {
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error(await response.text());
  };
  try {
    for (const job of jobs) {
      report(`正在生成 ${job.kind}: ${job.id}`);
      const scenario = SCENARIOS.find((item) => item.id === job.id);
      const resume = job.kind === "scenario" && scenario ? createResumeFromTemplate(scenario.id) : createDefaultResume();
      if (job.kind === "template") resume.theme = { ...resume.theme, templateId: job.id as ResumeTemplateId, density: 42, accent: "#596d82" };
      const { blob } = await generateTypstPdf(resume);
      const nativeWorker = new Worker(workerUrl, { type: "module" });
      // @ts-expect-error PDF.js accepts Worker ports but its generated type infers null.
      const worker = new PDFWorker({ port: nativeWorker });
      const loading = getDocument({ data: new Uint8Array(await blob.arrayBuffer()), worker, useSystemFonts: false, useWasm: false });
      try {
        const pdf = await loading.promise;
        const pages = [];
        const count = job.kind === "scenario" ? pdf.numPages : 1;
        for (let number = 1; number <= count; number++) {
          const page = await pdf.getPage(number);
          const width = job.kind === "scenario" ? 1200 : 420;
          const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          await page.render({ canvas, viewport }).promise;
          const text = await page.getTextContent();
          const textLength = text.items.reduce((length, item) => length + ("str" in item ? item.str.trim().length : 0), 0);
          if (!textLength) throw new Error(`${job.id} 第 ${number} 页没有文字，请检查排版`);
          pages.push({ png: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height, textLength });
          page.cleanup();
          canvas.width = canvas.height = 0;
        }
        await send({ type: "result", job, pageCount: pdf.numPages, pages });
      } finally {
        await loading.destroy();
        worker.destroy();
        nativeWorker.terminate();
      }
    }
    await send({ type: "done" });
    report("全部素材已生成");
  } catch (error) {
    await send({ type: "error", message: error instanceof Error ? error.message : String(error) });
    throw error;
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
