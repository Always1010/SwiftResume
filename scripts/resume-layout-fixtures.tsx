import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { getDocument, PDFWorker } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { createDefaultResume, getDensityLayout, type RichTextNode } from "../src/model/resume";
import { ResumeProfileView, ResumeSectionView } from "../src/components/ResumePreview";
import { generateTypstPdf } from "../src/export/typstPdf";
import "../src/styles.css";
import "../src/editorModes.css";

const token = new URLSearchParams(location.search).get("token");
const send = async (result: unknown) => {
  const response = await fetch(`/layout-result?token=${token}`, { method: "POST", body: JSON.stringify(result) });
  if (!response.ok) throw new Error(await response.text());
};
let checks = 0;
const assert = (condition: boolean, label: string) => { checks++; if (!condition) throw new Error(label); };
const near = (a: number, b: number, label: string, tolerance = 1) => assert(Math.abs(a - b) <= tolerance, `${label}: ${a} / ${b}`);
const paragraph = (text: string): RichTextNode => ({ type: "paragraph", content: [{ type: "text", text }] });
const root = createRoot(document.querySelector("#fixture")!);

async function run() {
  for (const name of ["short", "long", "multipage", "long-entry"]) {
    checks = 0;
    const resume = createDefaultResume();
    resume.profile = { ...resume.profile, name: "排版校验", headline: "后端开发工程师", photo: "", phone: name === "long" ? "" : "138 0000 0000", email: name === "long" ? "long.contact.address.for.layout@example.com" : "hello@example.com", details: [
      { id: "ethnicity", label: "民族", value: "汉族" }, { id: "degree", label: "学历", value: "本科" }, { id: "status", label: "求职状态", value: "在职，考虑机会" },
    ] };
    const education = resume.sections.find((section) => section.type === "education")!;
    if (education.type !== "education") throw new Error("缺少教育背景");
    education.items = [{ ...education.items[0], school: "江南理工大学", date: "2022.09 — 2026.06", major: "计算机科学与技术", degree: "本科", detail: name === "short" ? "GPA 3.7/4.0" : "GPA 3.7/4.0，专业排名 12/120；主修数据结构、计算机网络、数据库原理。毕业设计围绕校园资源预约，完成需求访谈、前后端开发和测试报告。" }];
    const count = name === "multipage" ? 24 : 1;
    resume.sections = [education, { id: "projects", type: "content", title: "项目经历", enabled: true, entries: Array.from({ length: count }, (_, i) => ({
      id: `project-${i}`, title: `项目条目 ${i + 1}`, subtitle: "开发负责人", date: "2025.10 — 2026.05", body: { type: "doc", content: [
        paragraph("技术栈：TypeScript · Vue · PostgreSQL"),
        { type: "paragraph", content: [{ type: "text", text: "重要成果", marks: [{ type: "bold" }] }, { type: "text", text: "：优化查询性能和用户体验。" }] },
        { type: "bulletList", content: [{ type: "listItem", content: [paragraph("首段说明：负责系统设计与接口开发。"), paragraph("续段说明：增加集成测试和错误处理。"), { type: "bulletList", content: [{ type: "listItem", content: [paragraph("嵌套说明：覆盖边界场景。")] }] }] }] },
        { type: "orderedList", attrs: { start: 3 }, content: [{ type: "listItem", content: [paragraph("编号说明：保留编号起点。")] }] },
        { type: "paragraph", attrs: { textAlign: "right" }, content: [{ type: "text", text: "靠右说明" }] },
        { type: "paragraph", content: [{ type: "text", text: "大字号校验", marks: [{ type: "textStyle", attrs: { fontSize: "14pt", lineHeight: "1.6" } }] }] },
      ] },
    })) }];
    if (name === "long-entry" && resume.sections[1].type === "content") {
      const body = resume.sections[1].entries[0].body;
      body.content = Array.from({ length: 12 }, () => structuredClone(body.content!)).flat();
    }
    const density = getDensityLayout(resume.theme.density);
    flushSync(() => root.render(<div className="resume-editor-canvas resume-page" style={{ width: "210mm", height: "auto", padding: "10.5mm 12.5mm", fontSize: density.fontSizePx, "--body-line": density.bodyLine, "--section-space": `${density.sectionSpacePx}px`, "--entry-space": `${density.entrySpacePx}px` } as React.CSSProperties}>
      <ResumeProfileView resume={resume} />{resume.sections.map((section) => <section className="resume-section" key={section.id}><ResumeSectionView section={section} /></section>)}
    </div>));
    await document.fonts.ready;
    const rows = document.querySelectorAll(".profile-info-row");
    near(rows[0].children[1].getBoundingClientRect().x, rows[1].children[1].getBoundingClientRect().x, "HTML 邮箱与学历");
    const educationRow = document.querySelector(".education-detail")!;
    const htmlMajor = educationRow.children[0].getBoundingClientRect();
    assert(htmlMajor.height < density.fontSizePx * density.bodyLine * 1.2, "HTML 专业学历不可挤成两行");
    near(educationRow.children[1].getBoundingClientRect().right, document.querySelector(".education-entry time")!.getBoundingClientRect().right, "HTML 说明与日期右对齐");
    assert(getComputedStyle(educationRow.children[1]).textAlign === "right", "HTML 说明应右对齐");
    const pdfBlob = (await generateTypstPdf(resume)).blob;
    const nativeWorker = new Worker(workerUrl, { type: "module" });
    const worker = new PDFWorker({ port: nativeWorker } as never);
    const loading = getDocument({ data: new Uint8Array(await pdfBlob.arrayBuffer()), worker, useSystemFonts: false, useWasm: false });
    try {
      const pdf = await loading.promise;
      const pages: string[] = [];
      const all: Array<{ text: string; x: number; y: number; right: number; page: number; font: string }> = [];
      for (let n = 1; n <= pdf.numPages; n++) {
        const page = await pdf.getPage(n);
        const text = await page.getTextContent();
        for (const item of text.items) if ("str" in item && item.str.trim()) {
          const [x, y] = item.transform.slice(4);
          assert(x >= 0 && x + item.width <= page.view[2] + 1 && y > 0 && y <= page.view[3], `PDF 第 ${n} 页文字越界：${item.str}`);
          all.push({ text: item.str, x, y, right: x + item.width, page: n, font: item.fontName });
        }
        // Render every page so pagination is also available for visual review.
        const viewport = page.getViewport({ scale: 1200 / page.view[2] });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        await page.render({ canvas, viewport }).promise;
        pages.push(canvas.toDataURL("image/png"));
        canvas.width = canvas.height = 0;
      }
      const find = (value: string) => { const item = all.find((item) => item.text.includes(value)); if (!item) throw new Error(`PDF 缺少文本：${value}`); return item; };
      near(find("邮箱").x, find("学历").x, "PDF 邮箱与学历");
      near(find("计算机科学与技术").y, find("GPA").y, "PDF 专业与绩点基线");
      const date = find("2022.09");
      const gpa = find("GPA");
      const detailLast = name === "short" ? gpa : find("测试报告");
      // PDF.js reports the full advance of a final CJK punctuation glyph;
      // Typst can trim its blank half-em. Check that allowance, then inspect PNGs.
      near(detailLast.right, date.right, "PDF 说明与日期右边缘", name === "short" ? 1 : density.typstFontSizePt / 2 + 1);
      assert(find("首段说明").y > find("续段说明").y, "列表多个段落应分行");
      assert(find("嵌套说明").x > find("续段说明").x, "嵌套列表应进一步缩进");
      assert(all.some((item) => item.text.includes("◦")), "嵌套列表应使用内置字体支持的空心圆");
      assert(find("重要成果").font !== find("技术栈").font, "粗体与正文应使用不同字体资源");
      near(find("靠右说明").right, date.right, "富文本右对齐");
      assert(all.some((item) => item.text.includes("3.")), "编号应从 3 开始");
      if (name === "multipage" || name === "long-entry") assert(pdf.numPages > 1, "长内容应分页");
      if (name === "multipage") {
        const titles = all.filter((item) => /项目条目 \d+/.test(item.text));
        assert(titles.length === count, "分页不能丢失项目条目");
        const lastParagraphs = all.filter((item) => item.text.includes("大字号校验"));
        titles.forEach((title, i) => assert(title.page === lastParagraphs[i].page, `短条目 ${i + 1} 应保持完整`));
      }
      await send({ name, pages, checks, metrics: { pages: pdf.numPages, text: all } });
    } finally { await loading.destroy(); worker.destroy(); nativeWorker.terminate(); }
  }
  await send({ done: true });
}
run().catch(async (error) => { console.error(error); await send({ error: String(error) }); });
