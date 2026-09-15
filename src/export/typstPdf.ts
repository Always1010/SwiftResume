import { createTypstCompiler, loadFonts } from "@myriaddreamin/typst.ts";
import { CompileFormatEnum } from "@myriaddreamin/typst.ts/compiler";
import * as compilerWrapper from "@myriaddreamin/typst-ts-web-compiler";
import compilerWasmUrl from "@myriaddreamin/typst-ts-web-compiler/wasm?url";
import { getDensityLayout, type ContentEntry, type RichTextDocument, type RichTextNode, type ResumeDocument, type ResumeSection, type ResumeTemplateId } from "../model/resume";

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

function heading(title: string, templateId: ResumeTemplateId) {
  const label = asString(templateId === "developer" ? `// ${title}` : title);
  if (templateId === "minimal") return `#v(8pt)\n#align(center)[#text(size: 11.5pt, weight: "medium", tracking: 1.4pt, ${label})]\n#v(4pt)\n`;
  if (templateId === "executive") return `#v(7pt)\n#text(size: 12pt, weight: "bold", fill: accent, ${label})\n#line(length: 100%, stroke: 1.2pt + accent)\n#v(3pt)\n`;
  if (templateId === "sidebar") return `#v(7pt)\n#grid(columns: (4pt, 1fr), column-gutter: 6pt, rect(width: 4pt, height: 13pt, fill: accent), text(size: 12pt, weight: "bold", fill: accent, ${label}))\n#v(3pt)\n`;
  if (templateId === "accent") return `#v(7pt)\n#grid(columns: (3pt, 1fr), column-gutter: 6pt, rect(width: 3pt, height: 14pt, fill: accent), text(size: 12.5pt, weight: "bold", ${label}))\n#v(3pt)\n`;
  if (templateId === "timeline") return `#v(7pt)\n#grid(columns: (7pt, auto, 1fr), column-gutter: 5pt, circle(radius: 3pt, fill: accent), text(size: 12pt, weight: "bold", ${label}), line(length: 100%, stroke: .7pt + accent))\n#v(3pt)\n`;
  if (templateId === "academic") return `#v(7pt)\n#line(length: 100%, stroke: .45pt)\n#text(size: 11.5pt, weight: "bold", tracking: .7pt, ${label})\n#v(3pt)\n`;
  if (templateId === "developer") return `#v(7pt)\n#text(font: "Noto Sans CJK SC", size: 11.5pt, weight: "bold", fill: accent, ${label})\n#line(length: 100%, stroke: (dash: "dashed", paint: accent, thickness: .45pt))\n#v(3pt)\n`;
  if (templateId === "compact") return `#v(5pt)\n#block(width: 100%, fill: rgb("#f1f4f2"), inset: (x: 5pt, y: 2.5pt), stroke: (left: 2.5pt + accent))[#text(size: 11pt, weight: "bold", ${label})]\n#v(2pt)\n`;
  return `#v(6pt)\n#grid(columns: (auto, 1fr), column-gutter: 5pt, align: bottom, text(size: 13pt, weight: "bold", ${label}), line(length: 100%, stroke: 0.45pt))\n#v(3pt)\n`;
}

function topLine(left: string, right: string, role = "", templateId: ResumeTemplateId = "classic") {
  const date = templateId === "timeline" && right
    ? `box(fill: accent, radius: 5pt, inset: (x: 4pt, y: 1pt), text(size: 7.5pt, fill: white, ${asString(right)}))`
    : `text(size: 8pt, fill: ${templateId === "academic" ? `rgb("#333333")` : "accent"}, ${asString(right)})`;
  return `#grid(
  columns: (1fr, auto),
  [#text(weight: "bold", ${asString(left)})${role ? `${left ? " #h(18pt)" : ""} #text(fill: rgb("#68736c"), ${asString(role)})` : ""}],
  ${date},
)
`;
}

function typstColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (/^#[0-9a-f]{6}$/i.test(value)) return `rgb(${asString(value)})`;
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(value);
  return rgb ? `rgb(${rgb[1]}, ${rgb[2]}, ${rgb[3]})` : null;
}

function inlineSource(node: RichTextNode): string {
  if (node.type === "hardBreak") return "#linebreak()";
  let source = node.text !== undefined
    ? `#text(${asString(node.text)})`
    : (node.content ?? []).map(inlineSource).join("");
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") source = `#strong[${source}]`;
    else if (mark.type === "italic") source = `#emph[${source}]`;
    else if (mark.type === "underline") source = `#underline[${source}]`;
    else if (mark.type === "strike") source = `#strike[${source}]`;
    else if (mark.type === "highlight") {
      const color = typstColor(mark.attrs?.color) ?? `rgb("#fff3a3")`;
      source = `#highlight(fill: ${color})[${source}]`;
    } else if (mark.type === "textStyle") {
      const options: string[] = [];
      const fontSize = mark.attrs?.fontSize;
      if (typeof fontSize === "string" && /^(?:[89]|1\d|2[0-4])(?:pt|px)$/.test(fontSize)) options.push(`size: ${fontSize}`);
      const fontWeight = mark.attrs?.fontWeight;
      if (typeof fontWeight === "string" && /^(?:400|500|600|700)$/.test(fontWeight)) options.push(`weight: ${fontWeight}`);
      const color = typstColor(mark.attrs?.color);
      if (color) options.push(`fill: ${color}`);
      if (options.length) source = `#text(${options.join(", ")})[${source}]`;
      const background = typstColor(mark.attrs?.backgroundColor);
      if (background) source = `#highlight(fill: ${background})[${source}]`;
    }
    else if (mark.type === "link") {
      const href = typeof mark.attrs?.href === "string" ? mark.attrs.href : "";
      if (/^(https?:|mailto:|tel:)/i.test(href)) source = `#link(${asString(href)})[${source}]`;
    }
  }
  return source;
}

function firstTextStyleValue(node: RichTextNode, key: string): unknown {
  for (const mark of node.marks ?? []) {
    if (mark.type === "textStyle" && mark.attrs?.[key] !== undefined) return mark.attrs[key];
  }
  for (const child of node.content ?? []) {
    const value = firstTextStyleValue(child, key);
    if (value !== undefined) return value;
  }
  return undefined;
}

function listItemSource(node: RichTextNode): string {
  return (node.content ?? []).map((child) => {
    if (child.type === "bulletList" || child.type === "orderedList") return blockSource(child);
    return inlineSource(child);
  }).join("");
}

function tableSource(node: RichTextNode): string {
  const rows = (node.content ?? []).filter((row) => row.type === "tableRow");
  const columns = Math.max(1, ...rows.map((row) => row.content?.length ?? 0));
  const cells = rows.flatMap((row) => (row.content ?? []).map((cell) => `[${(cell.content ?? []).map(blockSource).join("")}]`));
  return cells.length
    ? `#grid(columns: (${Array.from({ length: columns }, () => "1fr").join(", ")}), column-gutter: 6pt, row-gutter: 3pt, ${cells.join(", ")})\n`
    : "";
}

function blockSource(node: RichTextNode): string {
  if (node.type === "bulletList" || node.type === "orderedList") {
    const command = node.type === "orderedList" ? "enum" : "list";
    const items = (node.content ?? []).map((item) => `[${listItemSource(item)}]`);
    return items.length ? `#${command}(${items.join(", ")})\n` : "";
  }
  if (node.type === "doc") return (node.content ?? []).map(blockSource).join("");
  if (node.type === "table") return tableSource(node);
  if (node.type === "horizontalRule") return "#line(length: 100%, stroke: 0.35pt)\n";
  if (node.type === "codeBlock") return `#raw(${asString((node.content ?? []).map((child) => child.text ?? "").join(""))}, block: true)\n`;
  const inline = inlineSource(node);
  if (!inline) return "";
  const level = Number(node.attrs?.level ?? 2);
  let source = node.type === "heading"
    ? `#text(size: ${level === 1 ? 14 : level === 2 ? 12 : 10.5}pt, weight: "bold")[${inline}] #linebreak()\n`
    : node.type === "blockquote"
      ? `#quote(block: true)[${inline}]\n`
      : `${Number(node.attrs?.indent ?? 0) > 0 ? `#h(${Number(node.attrs?.indent) * 2}em)` : ""}${inline} #linebreak()\n`;
  const alignment = node.attrs?.textAlign;
  if (alignment === "center" || alignment === "right" || alignment === "justify") {
    source = `#align(${alignment === "justify" ? "left" : alignment})[${source}]\n`;
  }
  const lineHeight = Number(firstTextStyleValue(node, "lineHeight"));
  if (Number.isFinite(lineHeight) && lineHeight >= 1 && lineHeight <= 2) {
    source = `#block[#set par(leading: ${Math.round((lineHeight - 1) * 100) / 100}em)\n${source}]\n`;
  }
  return source;
}

function richTextSource(content: RichTextDocument): string {
  return blockSource(content);
}

function contentEntrySource(entry: ContentEntry, templateId: ResumeTemplateId): string {
  const headingSource = entry.title || entry.subtitle || entry.date
    ? topLine(entry.title, entry.date, entry.subtitle, templateId)
    : "";
  return `${headingSource}${richTextSource(entry.body)}`;
}

function sectionSource(section: ResumeSection, templateId: ResumeTemplateId) {
  if (!section.enabled) return "";
  let body = "";
  switch (section.type) {
    case "education":
      body = section.items.map((item) => `${topLine(item.school, item.date, "", templateId)}#grid(columns: (1fr, auto), text(${asString([item.major, item.degree].filter(Boolean).join(" | "))}), text(${asString(item.detail)}))\n`).join("#v(4pt)\n");
      break;
    case "content":
      body = section.entries.map((entry) => contentEntrySource(entry, templateId)).join("#v(6pt)\n");
      break;
  }
  return `${heading(section.title, templateId)}${body}`;
}

function profileSource(resume: ResumeDocument, templateId: ResumeTemplateId, photoPath: string | null) {
  const details = resume.profile.details.filter((item) => item.label || item.value);
  const detailCells = details.map((item) => `[#text(size: 8pt, fill: profile-muted, ${asString(`${item.label}：`)}) #text(size: 8pt, weight: "medium", fill: profile-ink, ${asString(item.value)})]`).join(",\n");
  const detailGrid = detailCells
    ? `#v(4pt)\n#grid(columns: (1fr, 1fr, 1fr), column-gutter: 10pt, row-gutter: 2pt, ${detailCells})`
    : "";
  const contact = [resume.profile.ageGender, resume.profile.location].filter(Boolean).join("    ");
  const direct = [resume.profile.phone && `手机 ${resume.profile.phone}`, resume.profile.email && `邮箱 ${resume.profile.email}`].filter(Boolean).join("    ");
  const photo = photoPath ? `image(${asString(photoPath)}, width: 27mm, height: 35mm, fit: "cover")` : "";
  const textBlock = `[
    #text(size: 18pt, weight: "bold", fill: profile-ink, ${asString(resume.profile.name || "姓名")})
    #linebreak()
    #text(size: 9.5pt, weight: "bold", fill: profile-accent, ${asString(resume.profile.headline)})
    #v(5pt)
    #text(fill: profile-ink, ${asString(contact)})
    #linebreak()
    #text(fill: profile-ink, ${asString(direct)})
    ${detailGrid}
  ]`;
  const columns = photo ? "(1fr, 27mm)" : "(1fr,)";
  const grid = `#grid(columns: ${columns}, column-gutter: 14pt, ${textBlock}${photo ? `, ${photo}` : ""})`;

  if (templateId === "minimal") return `#align(center)[${textBlock}]${photo ? `\n#place(top + right, dx: 0pt, dy: 0pt, ${photo})` : ""}\n#line(length: 100%, stroke: .35pt + rgb("#d6d6d6"))`;
  if (templateId === "executive") return `#block(width: 100%, fill: accent, inset: 13pt)[#let profile-ink = white\n#let profile-muted = rgb("#dce7ee")\n#let profile-accent = white\n${grid}]`;
  if (templateId === "sidebar") return `#grid(columns: (42mm, 1fr), column-gutter: 12pt, [#block(width: 100%, fill: accent, inset: 10pt)[#let profile-ink = white\n#let profile-muted = rgb("#dce7ee")\n#let profile-accent = white\n${textBlock}]], [${photo ? `${photo}\n#v(4pt)` : ""}#text(size: 8pt, fill: rgb("#666666"), ${asString(resume.profile.headline)})])`;
  if (templateId === "accent") return `#grid(columns: (4pt, 1fr${photo ? ", 27mm" : ""}), column-gutter: 12pt, rect(width: 4pt, height: 35mm, fill: accent), ${textBlock}${photo ? `, ${photo}` : ""})`;
  if (templateId === "academic") return `${grid}\n#line(length: 100%, stroke: .9pt)\n#v(1pt)\n#line(length: 100%, stroke: .3pt)`;
  if (templateId === "developer") return `#block(width: 100%, fill: rgb("#f3f7f5"), stroke: .4pt + accent, inset: 10pt)[${grid}]`;
  if (templateId === "compact") return `#block(width: 100%, fill: rgb("#f2f4f3"), inset: 9pt)[${grid}]`;
  if (templateId === "timeline") return `${grid}\n#line(length: 100%, stroke: 1.2pt + accent)`;
  return grid;
}

export function createTypstSource(resume: ResumeDocument): string {
  const density = getDensityLayout(resume.theme.density);
  const templateId = resume.theme.templateId;
  const photoPath = photoAssetPath(resume.profile.photo);
  const pageMargin = templateId === "minimal" || templateId === "academic" ? "(x: 15mm, y: 11mm)" : templateId === "compact" ? "(x: 11mm, y: 9mm)" : "(x: 12.5mm, y: 10.5mm)";

  return `// swift-resume-template: ${templateId}
#set page(paper: "a4", margin: ${pageMargin})
#set text(font: "Noto Sans CJK SC", lang: "zh", size: ${withUnit(density.typstFontSizePt, "pt")}, fill: rgb("#303030"))
#set par(leading: ${withUnit(density.typstLeadingEm, "em")}, spacing: ${withUnit(density.typstGapPt, "pt")})
#set list(indent: 12pt, body-indent: 4pt, spacing: 1pt)
#let accent = rgb(${asString(resume.theme.accent)})
#let profile-ink = rgb("#303030")
#let profile-muted = rgb("#7a8490")
#let profile-accent = accent

${profileSource(resume, templateId, photoPath)}
${resume.sections.map((section) => sectionSource(section, templateId)).join("\n")}
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
