import { createTypstCompiler, loadFonts } from "@myriaddreamin/typst.ts";
import { CompileFormatEnum } from "@myriaddreamin/typst.ts/compiler";
import * as compilerWrapper from "@myriaddreamin/typst-ts-web-compiler";
import compilerWasmUrl from "@myriaddreamin/typst-ts-web-compiler/wasm?url";
import { getDensityLayout, type ResumeDocument, type ResumeSection } from "../model/resume";
import { richTextToPlainText, sanitizeRichText } from "../model/richText";

const asString = (value: string) => JSON.stringify(value);
const withUnit = (value: number, unit: string) => `${Math.round(value * 100) / 100}${unit}`;
const extensionCompilerWrapper = {
  ...compilerWrapper,
  default: (moduleOrPath: unknown) =>
    compilerWrapper.default({ module_or_path: moduleOrPath } as never),
};

function photoAssetPath(photo: string): string | null {
  const mime = /^data:(image\/(?:png|jpeg|webp|svg\+xml));base64,/.exec(photo)?.[1];
  if (!mime) return null;
  const extension = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg" }[mime];
  return extension ? `/profile-photo.${extension}` : null;
}

function photoBytes(photo: string): Uint8Array | null {
  const encoded = photo.split(",", 2)[1];
  if (!encoded) return null;
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function heading(title: string) {
  return `
#v(6pt)
#grid(
  columns: (auto, 1fr),
  column-gutter: 5pt,
  align: bottom,
  text(size: 13pt, weight: "bold", ${asString(title)}),
  line(length: 100%, stroke: 0.45pt),
)
#v(3pt)
`;
}

function topLine(left: string, right: string, role = "") {
  return `#grid(
  columns: (1fr, auto),
  [#text(weight: "bold", ${asString(left)})${role ? ` #h(18pt) #text(fill: rgb("#68736c"), ${asString(role)})` : ""}],
  text(size: 8pt, fill: accent, ${asString(right)}),
)
`;
}

function bullets(items: string[]) {
  const visible = items.filter((item) => item.trim());
  if (!visible.length) return "";
  const cells = visible.flatMap((item) => [`[#text("•")]`, `[#text(${asString(item)})]`]);
  return `#grid(columns: (8pt, 1fr), row-gutter: 2.5pt, ${cells.join(",\n")})\n`;
}

function richTextSource(html: string): string {
  if (typeof DOMParser === "undefined") {
    return richTextToPlainText(html)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => /^[•*-]\s+/.test(line)
        ? bullets([line.replace(/^[•*-]\s+/, "")])
        : `#text(${asString(line)}) #linebreak()\n`)
      .join("");
  }

  const document = new DOMParser().parseFromString(sanitizeRichText(html), "text/html");
  const inline = (node: Node): string => {
    if (node.nodeType === 3) return node.textContent ? `#text(${asString(node.textContent)})` : "";
    if (!(node instanceof Element)) return "";
    const children = Array.from(node.childNodes).map(inline).join("");
    switch (node.tagName) {
      case "B":
      case "STRONG":
        return `#strong[${children}]`;
      case "EM":
      case "I":
        return `#emph[${children}]`;
      case "U":
        return `#underline[${children}]`;
      case "A": {
        const href = node.getAttribute("href");
        return href ? `#link(${asString(href)})[${children}]` : children;
      }
      case "BR":
        return "#linebreak()";
      default:
        return children;
    }
  };
  const block = (node: Node): string => {
    if (node instanceof Element && (node.tagName === "UL" || node.tagName === "OL")) {
      const items = Array.from(node.children)
        .filter((child) => child.tagName === "LI")
        .map((child) => `[${Array.from(child.childNodes).map(inline).join("")}]`);
      return items.length ? `#${node.tagName === "OL" ? "enum" : "list"}(${items.join(", ")})\n` : "";
    }
    const source = inline(node);
    if (!source.trim()) return "";
    return node instanceof Element && (node.tagName === "P" || node.tagName === "DIV")
      ? `${source} #linebreak()\n`
      : source;
  };
  return Array.from(document.body.childNodes).map(block).join("");
}

function sectionSource(section: ResumeSection) {
  if (!section.enabled) return "";
  let body = "";
  switch (section.type) {
    case "education":
      body = section.items.map((item) => `${topLine(item.school, item.date)}#grid(columns: (1fr, auto), text(${asString([item.major, item.degree].filter(Boolean).join(" | "))}), text(${asString(item.detail)}))\n`).join("#v(4pt)\n");
      break;
    case "skills":
      body = bullets(section.items.map((item) => item.text));
      break;
    case "projects":
      body = section.items.map((item) => `${topLine(item.name, item.date, item.role)}${item.stack ? `#text(weight: "bold", "开发工具：") #text(${asString(item.stack)}) #linebreak()\n` : ""}${item.summary ? `#text(weight: "bold", "项目描述：") #text(${asString(item.summary)}) #linebreak()\n` : ""}${bullets(item.bullets)}`).join("#v(6pt)\n");
      break;
    case "experience":
      body = section.items.map((item) => `${topLine(item.company, item.date, item.role)}${item.summary ? `#text(${asString(item.summary)}) #linebreak()\n` : ""}${bullets(item.bullets)}`).join("#v(6pt)\n");
      break;
    case "awards":
      body = section.items.map((item) => topLine(`${item.name}${item.detail ? ` · ${item.detail}` : ""}`, item.date)).join("#v(2pt)\n");
      break;
    case "custom":
      if (section.editorMode === "richtext") {
        body = richTextSource(section.richText);
      } else {
        body = section.nodes.filter((node) => node.enabled).map((node) => {
          if (node.type === "title") return topLine(node.title, node.date, node.subtitle);
          if (node.type === "paragraph") return node.text ? `#text(${asString(node.text)}) #linebreak()\n` : "";
          if (node.type === "bullets") return bullets(node.items.map((item) => item.text));
          const pairs = node.pairs.filter((pair) => pair.label || pair.value);
          if (!pairs.length) return "";
          const cells = pairs.map((pair) => `[#text(fill: rgb("#7a8490"), ${asString(`${pair.label}${pair.label ? "：" : ""}`)}) #text(weight: "medium", ${asString(pair.value)})]`);
          return `#grid(columns: (1fr, 1fr), column-gutter: 12pt, row-gutter: 3pt, ${cells.join(",\n")})\n`;
        }).join("#v(3pt)\n");
      }
      break;
  }
  return `${heading(section.title)}${body}`;
}

export function createTypstSource(resume: ResumeDocument): string {
  const density = getDensityLayout(resume.theme.density);
  const details = resume.profile.details
    .filter((item) => item.label || item.value)
    .map((item) => `[#text(fill: rgb("#7a8490"), ${asString(`${item.label}：`)}) #text(weight: "medium", ${asString(item.value)})]`)
    .join(",\n");
  const photoPath = photoAssetPath(resume.profile.photo);
  const photo = photoPath
    ? `image(${asString(photoPath)}, width: 27mm, height: 35mm, fit: "cover")`
    : `rect(width: 27mm, height: 35mm, fill: rgb("#edf1ee"), inset: 0pt)[#align(center + horizon)[#text(size: 7pt, fill: rgb("#98a39c"), "PHOTO")]]`;

  return `#set page(paper: "a4", margin: (x: 12.5mm, y: 10.5mm))
#set text(font: "Noto Sans CJK SC", lang: "zh", size: ${withUnit(density.typstFontSizePt, "pt")}, fill: rgb("#303030"))
#set par(leading: ${withUnit(density.typstLeadingEm, "em")}, spacing: ${withUnit(density.typstGapPt, "pt")})
#set list(indent: 12pt, body-indent: 4pt, spacing: 1pt)
#let accent = rgb(${asString(resume.theme.accent)})

#grid(
  columns: (1fr, 27mm),
  column-gutter: 14pt,
  [
    #text(size: 18pt, weight: "bold", ${asString(resume.profile.name || "姓名")})
    #linebreak()
    #text(size: 9.5pt, weight: "bold", fill: accent, ${asString(resume.profile.headline)})
    #v(5pt)
    #text(${asString([resume.profile.ageGender, resume.profile.location].filter(Boolean).join("    "))})
    #linebreak()
    #text(${asString([resume.profile.phone && `手机 ${resume.profile.phone}`, resume.profile.email && `邮箱 ${resume.profile.email}`].filter(Boolean).join("    "))})
  ],
  ${photo},
)

${details ? `${heading("基本信息")}#grid(columns: (1fr, 1fr, 1fr), column-gutter: 12pt, row-gutter: 3pt,\n${details}\n)` : ""}
${resume.sections.map(sectionSource).join("\n")}
`;
}

let compilerPromise: ReturnType<typeof initializeCompiler> | null = null;

async function initializeCompiler() {
  const compiler = createTypstCompiler();
  const fontUrl = new URL("./fonts/NotoSansCJKsc-Regular.otf", window.location.href).href;
  await compiler.init({
    getWrapper: async () => extensionCompilerWrapper,
    getModule: () => compilerWasmUrl,
    beforeBuild: [loadFonts([fontUrl], { assets: false })],
  });
  return compiler;
}

export async function exportTypstPdf(resume: ResumeDocument): Promise<void> {
  const compiler = await (compilerPromise ??= initializeCompiler());
  for (const extension of ["png", "jpg", "webp", "svg"]) {
    compiler.unmapShadow(`/profile-photo.${extension}`);
  }
  const photoPath = photoAssetPath(resume.profile.photo);
  const bytes = photoBytes(resume.profile.photo);
  if (photoPath && bytes) compiler.mapShadow(photoPath, bytes);
  compiler.addSource("/main.typ", createTypstSource(resume));
  const compilation = await compiler.compile({
    mainFilePath: "/main.typ",
    format: CompileFormatEnum.pdf,
    diagnostics: "unix",
  });
  if (!compilation.result) {
    throw new Error(compilation.diagnostics?.join("\n") || "Typst 没有生成 PDF");
  }
  const safeTitle = resume.title.replace(/[\\/:*?"<>|]/g, "-") || "SwiftResume";
  const pdfBytes = new Uint8Array(compilation.result);
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${safeTitle}.pdf`;
  link.click();
  URL.revokeObjectURL(link.href);
}
