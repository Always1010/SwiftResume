import { createTypstCompiler, loadFonts } from "@myriaddreamin/typst.ts";
import { CompileFormatEnum } from "@myriaddreamin/typst.ts/compiler";
import * as compilerWrapper from "@myriaddreamin/typst-ts-web-compiler";
import compilerWasmUrl from "@myriaddreamin/typst-ts-web-compiler/wasm?url";
import { getDensityLayout, type CustomTextStyle, type ResumeDocument, type ResumeSection, type SerializedEditorNode } from "../model/resume";
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

function typstColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (/^#[0-9a-f]{6}$/i.test(value)) return `rgb(${asString(value)})`;
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(value);
  return rgb ? `rgb(${rgb[1]}, ${rgb[2]}, ${rgb[3]})` : null;
}

function styledValue(value: string, style?: CustomTextStyle): string {
  const options: string[] = [];
  if (style?.fontSize) options.push(`size: ${style.fontSize}pt`);
  if (style?.fontWeight) options.push(`weight: ${style.fontWeight}`);
  const color = typstColor(style?.color);
  if (color) options.push(`fill: ${color}`);
  return `#text(${options.length ? `${options.join(", ")}, ` : ""}${asString(value)})`;
}

type JsonObject = Record<string, unknown>;

const documentColors: Record<string, string> = {
  gray: "#6b7280", brown: "#8b5e3c", red: "#b42318", orange: "#c45a00", yellow: "#8a6700",
  green: "#16794b", blue: "#2457a7", purple: "#7047a3", pink: "#a83b73",
};

function blockInlineSource(content: unknown): string {
  if (typeof content === "string") return `#text(${asString(content)})`;
  if (!Array.isArray(content)) return "";
  return content.map((item) => {
    if (typeof item === "string") return `#text(${asString(item)})`;
    if (!item || typeof item !== "object") return "";
    const value = item as JsonObject;
    if (value.type === "link") {
      const href = typeof value.href === "string" ? value.href : "";
      const child = blockInlineSource(value.content);
      return href ? `#link(${asString(href)})[${child}]` : child;
    }
    let source = `#text(${asString(typeof value.text === "string" ? value.text : "")})`;
    const styles = value.styles && typeof value.styles === "object" ? value.styles as JsonObject : {};
    if (styles.bold) source = `#strong[${source}]`;
    if (styles.italic) source = `#emph[${source}]`;
    if (styles.underline) source = `#underline[${source}]`;
    if (styles.strike) source = `#strike[${source}]`;
    const textOptions: string[] = [];
    if (typeof styles.fontSize === "string" && /^(?:[89]|1\d|2[0-4])pt$/.test(styles.fontSize)) textOptions.push(`size: ${styles.fontSize}`);
    if (typeof styles.fontWeight === "string" && /^(?:400|500|600|700)$/.test(styles.fontWeight)) textOptions.push(`weight: ${styles.fontWeight}`);
    const textColor = typstColor(typeof styles.textColor === "string" ? documentColors[styles.textColor] ?? styles.textColor : null);
    if (textColor) textOptions.push(`fill: ${textColor}`);
    if (textOptions.length) source = `#text(${textOptions.join(", ")})[${source}]`;
    const background = typstColor(typeof styles.backgroundColor === "string" ? documentColors[styles.backgroundColor] ?? styles.backgroundColor : null);
    if (background) source = `#highlight(fill: ${background})[${source}]`;
    return source;
  }).join("");
}

function documentTableSource(block: JsonObject): string {
  const content = block.content && typeof block.content === "object" ? block.content as JsonObject : {};
  const rows = Array.isArray(content.rows) ? content.rows : [];
  const parsedRows = rows.map((row) => row && typeof row === "object" && Array.isArray((row as JsonObject).cells) ? (row as JsonObject).cells as unknown[] : []);
  const columns = Math.max(1, ...parsedRows.map((row) => row.length));
  const cells = parsedRows.flatMap((row) => row.map((cell) => {
    const fullCell = cell && typeof cell === "object" && !Array.isArray(cell) && (cell as JsonObject).type === "tableCell" ? cell as JsonObject : null;
    return `[${blockInlineSource(fullCell?.content ?? cell)}]`;
  }));
  return cells.length ? `#grid(columns: (${Array.from({ length: columns }, () => "1fr").join(", ")}), column-gutter: 10pt, row-gutter: 3pt, ${cells.join(", ")})\n` : "";
}

function documentBlockSource(block: SerializedEditorNode): string {
  const type = typeof block.type === "string" ? block.type : "paragraph";
  const props = block.props && typeof block.props === "object" ? block.props as JsonObject : {};
  const inline = blockInlineSource(block.content);
  let source = "";
  if (type === "heading") {
    const level = Number(props.level ?? 2);
    source = `#text(size: ${level === 1 ? 14 : level === 2 ? 12 : 10.5}pt, weight: "bold")[${inline}] #linebreak()\n`;
  } else if (type === "bulletListItem") source = `#list([${inline}])\n`;
  else if (type === "numberedListItem") source = `#enum([${inline}])\n`;
  else if (type === "checkListItem") source = `#grid(columns: (10pt, 1fr), [${props.checked ? "✓" : "□"}], [${inline}])\n`;
  else if (type === "toggleListItem") source = `#grid(columns: (10pt, 1fr), [▸], [${inline}])\n`;
  else if (type === "table") source = documentTableSource(block);
  else if (type === "quote") source = `#quote(block: true)[${inline}]\n`;
  else if (type === "codeBlock") source = `#raw(${asString(String(block.content ?? ""))}, block: true)\n`;
  else if (type === "divider") source = "#line(length: 100%, stroke: 0.35pt)\n";
  else if (["image", "video", "audio", "file"].includes(type)) source = typeof props.name === "string" || typeof props.caption === "string" ? `#text(fill: rgb("#6b7280"), ${asString(String(props.name ?? props.caption))}) #linebreak()\n` : "";
  else source = inline ? `${inline} #linebreak()\n` : "#v(3pt)\n";
  const alignment = props.textAlignment;
  if (source && (alignment === "center" || alignment === "right")) source = `#align(${alignment})[${source}]\n`;
  const children = Array.isArray(block.children) ? block.children as SerializedEditorNode[] : [];
  return source + children.map(documentBlockSource).join("");
}

function documentSource(blocks: SerializedEditorNode[], hiddenIds: string[]): string {
  return blocks.filter((block) => typeof block.id !== "string" || !hiddenIds.includes(block.id)).map(documentBlockSource).join("");
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
      case "S":
      case "STRIKE":
        return `#strike[${children}]`;
      case "MARK": {
        const background = typstColor((node as HTMLElement).style.backgroundColor);
        return background ? `#highlight(fill: ${background})[${children}]` : children;
      }
      case "SPAN": {
        const style = (node as HTMLElement).style;
        let source = children;
        const options: string[] = [];
        if (/^(?:[89]|1\d|2[0-4])pt$/.test(style.fontSize)) options.push(`size: ${style.fontSize}`);
        if (/^(?:400|500|600|700|bold|normal)$/.test(style.fontWeight)) options.push(`weight: ${style.fontWeight === "bold" ? "700" : style.fontWeight === "normal" ? "400" : style.fontWeight}`);
        const color = typstColor(style.color);
        if (color) options.push(`fill: ${color}`);
        if (options.length) source = `#text(${options.join(", ")})[${source}]`;
        const background = typstColor(style.backgroundColor);
        if (background) source = `#highlight(fill: ${background})[${source}]`;
        return source;
      }
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
    if (node instanceof Element && node.tagName === "TABLE") {
      const rows = Array.from(node.querySelectorAll(":scope > tbody > tr, :scope > thead > tr, :scope > tr"));
      const columns = Math.max(1, ...rows.map((row) => row.children.length));
      const cells = rows.flatMap((row) => Array.from(row.children).map((cell) => `[${Array.from(cell.childNodes).map(inline).join("")}]`));
      return cells.length ? `#grid(columns: (${Array.from({ length: columns }, () => "1fr").join(", ")}), column-gutter: 10pt, row-gutter: 3pt, ${cells.join(", ")})\n` : "";
    }
    if (node instanceof Element && node.tagName === "HR") return "#line(length: 100%, stroke: 0.35pt)\n";
    const source = inline(node);
    if (!source.trim()) return "";
    if (node instanceof Element && /^H[1-3]$/.test(node.tagName)) {
      const level = Number(node.tagName.slice(1));
      return `#text(size: ${level === 1 ? 14 : level === 2 ? 12 : 10.5}pt, weight: "bold")[${source}] #linebreak()\n`;
    }
    if (node instanceof Element && node.tagName === "BLOCKQUOTE") return `#quote(block: true)[${source}]\n`;
    let result = node instanceof Element && (node.tagName === "P" || node.tagName === "DIV")
      ? `${source} #linebreak()\n`
      : source;
    if (node instanceof HTMLElement && (node.style.textAlign === "center" || node.style.textAlign === "right")) {
      result = `#align(${node.style.textAlign})[${result}]\n`;
    }
    return result;
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
      } else if (section.editorMode === "document") {
        body = documentSource(section.documentBlocks, section.hiddenDocumentBlockIds);
      } else {
        body = section.nodes.filter((node) => node.enabled).map((node) => {
          if (node.type === "title") return `#grid(columns: (1fr, auto), [${styledValue(node.title, node.styles?.title)}${node.subtitle ? ` #h(18pt) ${styledValue(node.subtitle, node.styles?.subtitle)}` : ""}], [${styledValue(node.date, node.styles?.date)}])\n`;
          if (node.type === "paragraph") return node.text ? `${styledValue(node.text, node.styles?.text)} #linebreak()\n` : "";
          if (node.type === "bullets") {
            const visible = node.items.filter((item) => item.text.trim());
            return visible.length ? `#list(${visible.map((item) => `[${styledValue(item.text, node.styles?.[`item:${item.id}`])}]`).join(", ")})\n` : "";
          }
          const pairs = node.pairs.filter((pair) => pair.label || pair.value);
          if (!pairs.length) return "";
          const cells = pairs.map((pair) => `[${styledValue(`${pair.label}${pair.label ? "：" : ""}`, node.styles?.[`label:${pair.id}`])} ${styledValue(pair.value, node.styles?.[`value:${pair.id}`])}]`);
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
