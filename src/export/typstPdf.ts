import { createTypstCompiler } from "@myriaddreamin/typst.ts";
import { CompileFormatEnum } from "@myriaddreamin/typst.ts/compiler";
import * as compilerWrapper from "@myriaddreamin/typst-ts-web-compiler";
import compilerWasmUrl from "@myriaddreamin/typst-ts-web-compiler/wasm?url";
import { DEFAULT_PROFILE_PHOTO, getDensityLayout, type ContentEntry, type RichTextDocument, type RichTextNode, type ResumeDocument, type ResumeSection, type ResumeTemplateId } from "../model/resume";
import { getResumeTemplate } from "../templates/registry";
import { EDUCATION_LAYOUT, PROFILE_LAYOUT, profileInfoRows } from "../model/resumeLayout";

const asString = (value: string) => JSON.stringify(value);
const withUnit = (value: number, unit: string) => `${Math.round(value * 100) / 100}${unit}`;
const extensionCompilerWrapper = {
  ...compilerWrapper,
  default: (moduleOrPath: unknown) =>
    compilerWrapper.default({ module_or_path: moduleOrPath } as never),
};

function photoAssetPath(photo: string): string | null {
  if (photo === DEFAULT_PROFILE_PHOTO) return "/profile-photo.png";
  const mime = /^data:(image\/(?:png|jpeg|webp|svg\+xml));base64,/.exec(photo)?.[1];
  if (!mime) return null;
  const extension = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg" }[mime];
  return extension ? `/profile-photo.${extension}` : null;
}

async function photoBytes(photo: string): Promise<Uint8Array | null> {
  if (photo === DEFAULT_PROFILE_PHOTO) {
    const response = await fetch(new URL(photo, window.location.href));
    if (!response.ok) throw new Error("无法读取内置示例头像");
    return new Uint8Array(await response.arrayBuffer());
  }
  const encoded = photo.split(",", 2)[1];
  if (!encoded) return null;
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function headingStyle(title: string, templateId: ResumeTemplateId) {
  const label = asString(templateId === "developer" ? `// ${title}` : title);
  if (templateId === "minimal") return `#v(8pt)\n#align(center)[#text(size: 11.5pt, weight: "medium", tracking: 1.4pt, ${label})]\n#v(4pt)\n`;
  if (templateId === "executive") return `#v(7pt)\n#text(size: 12pt, weight: "bold", fill: accent, ${label})\n#line(length: 100%, stroke: 1.2pt + accent)\n#v(3pt)\n`;
  if (templateId === "sidebar") return `#v(7pt)\n#grid(columns: (4pt, 1fr), column-gutter: 6pt, rect(width: 4pt, height: 13pt, fill: accent), text(size: 12pt, weight: "bold", fill: accent, ${label}))\n#v(3pt)\n`;
  if (templateId === "accent") return `#v(7pt)\n#grid(columns: (3pt, 1fr), column-gutter: 6pt, rect(width: 3pt, height: 14pt, fill: accent), text(size: 12.5pt, weight: "bold", ${label}))\n#v(3pt)\n`;
  if (templateId === "timeline") return `#v(7pt)\n#grid(columns: (7pt, auto, 1fr), column-gutter: 5pt, circle(radius: 3pt, fill: accent), text(size: 12pt, weight: "bold", ${label}), line(length: 100%, stroke: .7pt + accent))\n#v(3pt)\n`;
  if (templateId === "academic") return `#v(7pt)\n#line(length: 100%, stroke: .45pt)\n#text(size: 11.5pt, weight: "bold", tracking: .7pt, ${label})\n#v(3pt)\n`;
  if (templateId === "developer") return `#v(7pt)\n#text(font: "Noto Sans CJK SC", size: 11.5pt, weight: "bold", fill: accent, ${label})\n#line(length: 100%, stroke: (dash: "dashed", paint: accent, thickness: .45pt))\n#v(3pt)\n`;
  if (templateId === "compact") return `#v(5pt)\n#block(width: 100%, fill: rgb("#f1f4f2"), inset: (x: 5pt, y: 2.5pt), stroke: (left: 2.5pt + accent))[#text(size: 11pt, weight: "bold", ${label})]\n#v(2pt)\n`;
  if (templateId === "newspaper") return `#v(7pt)\n#line(length: 100%, stroke: .7pt)\n#align(center)[#text(size: 11.5pt, weight: "bold", tracking: 1.1pt, ${label})]\n#line(length: 100%, stroke: .3pt)\n#v(3pt)\n`;
  if (templateId === "swiss") return `#v(7pt)\n#grid(columns: (36mm, 1fr), block(fill: accent, inset: (x: 5pt, y: 3pt))[#text(size: 11pt, weight: "bold", fill: white, ${label})], rect(height: 16pt, fill: rgb("#151515")))\n#v(3pt)\n`;
  if (templateId === "magazine") return `#v(8pt)\n#grid(columns: (auto, 1fr), column-gutter: 7pt, align: bottom, text(size: 15pt, weight: "bold", ${label}), line(length: 100%, stroke: 3pt + accent))\n#v(3pt)\n`;
  if (templateId === "blueprint") return `#v(7pt)\n#block(width: 100%, stroke: .7pt + accent, inset: (x: 5pt, y: 2.5pt))[#text(size: 11pt, weight: "bold", fill: accent, ${label}) #h(1fr) #text(size: 7pt, fill: accent, "SECTION")]\n#v(3pt)\n`;
  if (templateId === "japanese") return `#v(9pt)\n#grid(columns: (8mm, auto, 1fr), column-gutter: 4pt, text(fill: accent, "一"), text(size: 11pt, weight: "medium", tracking: 1.5pt, ${label}), line(length: 100%, stroke: .3pt + rgb("#c9c6c0")))\n#v(4pt)\n`;
  if (templateId === "archive") return `#v(7pt)\n#line(length: 100%, stroke: .5pt + rgb("#756b5b"))\n#text(size: 10.5pt, weight: "bold", tracking: 1pt, fill: rgb("#3f382d"), ${label})\n#line(length: 100%, stroke: .5pt + rgb("#756b5b"))\n#v(3pt)\n`;
  if (templateId === "nordic") return `#v(7pt)\n#block(width: 100%, radius: 7pt, fill: rgb("#eef3f1"), inset: (x: 7pt, y: 3pt))[#text(size: 11pt, weight: "medium", fill: rgb("#405650"), ${label})]\n#v(3pt)\n`;
  if (templateId === "bauhaus") return `#v(7pt)\n#grid(columns: (10pt, auto, 1fr), column-gutter: 6pt, rect(width: 9pt, height: 9pt, fill: accent), text(size: 12pt, weight: "bold", ${label}), line(length: 100%, stroke: 2.5pt))\n#v(3pt)\n`;
  if (templateId === "index") return `#v(7pt)\n#block(width: 38mm, radius: (top-right: 8pt, bottom-right: 8pt), fill: accent, inset: (x: 7pt, y: 3pt))[#text(size: 10.5pt, weight: "bold", fill: white, ${label})]\n#v(3pt)\n`;
  if (templateId === "monochrome") return `#v(7pt)\n#grid(columns: (auto, 1fr), block(fill: black, inset: (x: 7pt, y: 3pt))[#text(size: 11pt, weight: "bold", fill: white, ${label})], rect(height: 17pt, fill: black))\n#v(3pt)\n`;
  if (templateId === "gradient") return `#v(7pt)\n#block(width: 100%, radius: 8pt, fill: rgb("#edf3f6"), stroke: .4pt + accent, inset: (x: 7pt, y: 3pt))[#text(size: 11.5pt, weight: "bold", fill: accent, ${label})]\n#v(3pt)\n`;
  if (templateId === "terminal") return `#v(7pt)\n#text(size: 11pt, weight: "bold", fill: rgb("#176b45"), ${asString(`$ ${title}`)})\n#line(length: 100%, stroke: (dash: "dotted", paint: rgb("#78a48a"), thickness: .5pt))\n#v(3pt)\n`;
  if (templateId === "ledger") return `#v(7pt)\n#block(width: 100%, stroke: .45pt + rgb("#78867e"), inset: (x: 5pt, y: 2pt))[#text(size: 10.5pt, weight: "bold", ${label}) #h(1fr) #text(size: 7pt, fill: rgb("#78867e"), "ENTRY")]\n#v(3pt)\n`;
  if (templateId === "diplomat") return `#v(8pt)\n#grid(columns: (1fr, auto, 1fr), column-gutter: 7pt, line(length: 100%, stroke: .4pt + rgb("#827353")), text(size: 10.5pt, weight: "bold", tracking: 1.4pt, ${label}), line(length: 100%, stroke: .4pt + rgb("#827353")))\n#v(4pt)\n`;
  if (templateId === "studio") return `#v(7pt)\n#grid(columns: (auto, 1fr), column-gutter: 7pt, text(size: 13pt, weight: "bold", fill: accent, ${label}), rect(height: 12pt, fill: rgb("#252525")))\n#v(3pt)\n`;
  if (templateId === "ribbon") return `#v(7pt)\n#block(width: 100%, fill: accent, inset: (x: 8pt, y: 3pt))[#text(size: 11pt, weight: "bold", tracking: .8pt, fill: white, ${label})]\n#v(3pt)\n`;
  if (templateId === "capsule") return `#v(7pt)\n#grid(columns: (auto, 1fr), column-gutter: 6pt, box(radius: 9pt, fill: accent, inset: (x: 7pt, y: 2.5pt), text(size: 10pt, weight: "bold", fill: white, ${label})), line(length: 100%, stroke: .35pt + accent))\n#v(3pt)\n`;
  if (templateId === "split") return `#v(7pt)\n#grid(columns: (1fr, 1fr), column-gutter: 0pt, block(fill: accent, inset: (x: 7pt, y: 3pt))[#text(size: 11pt, weight: "bold", fill: white, ${label})], rect(height: 17pt, fill: rgb("#202725")))\n#v(3pt)\n`;
  if (templateId === "metro") return `#v(7pt)\n#grid(columns: (9pt, auto, 1fr), column-gutter: 5pt, circle(radius: 4pt, fill: accent, stroke: 1pt + white), block(fill: accent, inset: (x: 6pt, y: 2pt))[#text(size: 10pt, weight: "bold", fill: white, ${label})], line(length: 100%, stroke: (dash: "dashed", paint: accent, thickness: .5pt)))\n#v(3pt)\n`;
  if (templateId === "folio") return `#v(9pt)\n#grid(columns: (9mm, auto, 1fr), column-gutter: 6pt, text(size: 8pt, weight: "bold", fill: accent, "§"), text(size: 13pt, weight: "regular", tracking: .8pt, ${label}), line(length: 100%, stroke: .5pt))\n#v(4pt)\n`;
  return `#grid(columns: (auto, 1fr), column-gutter: 5.25pt, align: bottom, text(size: 12pt, weight: "bold", ${label}), line(length: 100%, stroke: 0.45pt))\n`;
}

function heading(title: string, templateId: ResumeTemplateId) {
  const content = headingStyle(title, templateId).replace(/^#v\([^\n]+\)\n/, "").replace(/#v\([^\n]+\)\n$/, "");
  return `#block(above: section-gap, below: 4.5pt, sticky: true)[${content}]\n`;
}

function topLine(left: string, right: string, role = "", templateId: ResumeTemplateId = "classic") {
  const date = ["timeline", "capsule", "metro", "index"].includes(templateId) && right
    ? `box(fill: accent, radius: 5pt, inset: (x: 4pt, y: 1pt), text(size: 7.5pt, fill: white, ${asString(right)}))`
    : `text(size: 7.5pt, fill: ${templateId === "academic" ? `rgb("#333333")` : "accent"}, ${asString(right)})`;
  return `#block(sticky: true, below: 1.5pt)[#grid(
  columns: (1fr, auto),
  column-gutter: 9pt,
  align: bottom,
  [#text(size: 9.375pt, weight: "bold", ${asString(left)})${role ? `${left ? " #h(19.5pt)" : ""} #text(fill: rgb("#68736c"), ${asString(role)})` : ""}],
  ${date},
)]
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
      if (typeof fontSize === "string" && /^(?:[89]|1\d|2[0-4])(?:pt|px)$/.test(fontSize)) options.push(`size: ${fontSize.endsWith("px") ? withUnit(parseFloat(fontSize) * .75, "pt") : fontSize}`);
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
  return (node.content ?? []).map((child, index) => blockSource(child, index === 0)).join("");
}

function tableSource(node: RichTextNode): string {
  const rows = (node.content ?? []).filter((row) => row.type === "tableRow");
  const columns = Math.max(1, ...rows.map((row) => row.content?.length ?? 0));
  const cells = rows.flatMap((row) => (row.content ?? []).map((cell) => `[${(cell.content ?? []).map((child) => blockSource(child)).join("")}]`));
  return cells.length
    ? `#grid(columns: (${Array.from({ length: columns }, () => "1fr").join(", ")}), column-gutter: 6pt, row-gutter: 3pt, ${cells.join(", ")})\n`
    : "";
}

function blockSource(node: RichTextNode, inList = false): string {
  if (node.type === "bulletList" || node.type === "orderedList") {
    const command = node.type === "orderedList" ? "enum" : "list";
    const items = (node.content ?? []).map((item) => `[${listItemSource(item)}]`);
    const start = command === "enum" && Number.isInteger(node.attrs?.start) && Number(node.attrs?.start) > 0 ? `start: ${Number(node.attrs?.start)}, ` : "";
    return items.length ? `#block(above: 2.25pt, below: 0pt)[#${command}(${start}${items.join(", ")})]\n` : "";
  }
  if (node.type === "doc") return (node.content ?? []).map((child) => blockSource(child)).join("");
  if (node.type === "table") return tableSource(node);
  if (node.type === "horizontalRule") return "#line(length: 100%, stroke: 0.35pt)\n";
  if (node.type === "codeBlock") return `#raw(${asString((node.content ?? []).map((child) => child.text ?? "").join(""))}, block: true)\n`;
  if (node.type === "blockquote") return `#block(above: 3pt, below: 3pt, stroke: (left: 1.5pt + rgb("#a8b4ac")), inset: (left: 6pt))[#set text(fill: rgb("#5c665f"))\n${(node.content ?? []).map((child) => blockSource(child)).join("")}]\n`;
  const inline = inlineSource(node);
  if (!inline) return node.type === "paragraph" ? "#block(height: body-line * 1em)[]\n" : "";
  const level = Number(node.attrs?.level ?? 2);
  const isHeading = node.type === "heading";
  const rules: string[] = [];
  const alignment = node.attrs?.textAlign;
  if (alignment === "center" || alignment === "right") rules.push(`#set align(${alignment})`);
  if (alignment === "justify") rules.push("#set par(justify: true)");
  const lineHeight = Number(firstTextStyleValue(node, "lineHeight"));
  if (Number.isFinite(lineHeight) && lineHeight >= 1 && lineHeight <= 2) {
    rules.push(`#set par(leading: ${Math.round((lineHeight - 1) * 100) / 100}em)`);
  }
  const indent = Math.min(6, Math.max(0, Number(node.attrs?.indent) || 0));
  const inset = indent > 0 ? `, inset: (left: ${indent * 2}em)` : "";
  const text = isHeading ? `#text(size: ${level === 1 ? 14 : level === 2 ? 12 : 10.5}pt, weight: "bold")[${inline}]` : inline;
  return `#block(width: 100%, above: ${isHeading ? "3.75pt" : inList ? "0pt" : "body-leading + 1.5pt"}, below: ${isHeading ? "2.25pt" : "0pt"}${isHeading ? ", sticky: true" : ""}${inset})[${rules.join("\n")}\n${text}]\n`;
}

function richTextSource(content: RichTextDocument): string {
  return blockSource(content);
}

function contentEntrySource(entry: ContentEntry, templateId: ResumeTemplateId): string {
  const headingSource = entry.title || entry.subtitle || entry.date
    ? topLine(entry.title, entry.date, entry.subtitle, templateId)
    : "";
  return `#layout(size => {
  let entry = [${headingSource}${richTextSource(entry.body)}]
  block(breakable: measure(entry, width: size.width).height > page-content-height, entry)
})\n`;
}

function sectionSource(section: ResumeSection, templateId: ResumeTemplateId) {
  if (!section.enabled) return "";
  let body = "";
  switch (section.type) {
    case "education":
      body = section.items.map((item) => `${topLine(item.school, item.date, "", templateId)}#layout(size => {
  let major = text(${asString([item.major, item.degree].filter(Boolean).join(" | "))})
  let major-width = calc.min(measure(major).width, size.width * ${EDUCATION_LAYOUT.maxLeftPercent / 100})
  grid(columns: (major-width, 1fr), column-gutter: ${EDUCATION_LAYOUT.columnGapPx * .75}pt, align: (left, right), major, text(${asString(item.detail)}))
})\n`).join("#v(entry-gap)\n");
      break;
    case "content":
      body = section.entries.map((entry) => contentEntrySource(entry, templateId)).join("#v(entry-gap)\n");
      break;
  }
  return `${heading(section.title, templateId)}${body}`;
}

function profileSource(resume: ResumeDocument, templateId: ResumeTemplateId, photoPath: string | null) {
  const singleColumn = templateId === "sidebar";
  const firstColumn = withUnit(getDensityLayout(resume.theme.density).typstFontSizePt * PROFILE_LAYOUT.firstColumnEm, "pt");
  const infoCells = profileInfoRows(resume.profile).flatMap((row) => {
    const cell = (value: string) => `[#text(fill: profile-ink, ${asString(value)})]`;
    if (row.right === undefined) return [singleColumn ? cell(row.left) : `grid.cell(colspan: 2, ${cell(row.left)})`];
    return singleColumn ? [row.left, row.right].filter(Boolean).map(cell) : [cell(row.left), cell(row.right)];
  });
  const infoGrid = infoCells.length
    ? `#v(5.25pt)\n#layout(size => grid(columns: ${singleColumn ? "(1fr,)" : `(calc.min(${firstColumn}, size.width * 0.45), 1fr)`}, column-gutter: ${PROFILE_LAYOUT.columnGapEm}em, row-gutter: ${PROFILE_LAYOUT.rowGapPx * .75}pt, ${infoCells.join(",\n")}))`
    : "";
  const contact = [resume.profile.ageGender, resume.profile.location].filter(Boolean).join("    ");
  const photoImage = photoPath ? `image(${asString(photoPath)}, width: 27mm, height: 35mm, fit: "cover")` : "";
  const photo = photoImage && /^#[0-9a-f]{6}$/i.test(resume.profile.photoBackground)
    ? `block(width: 27mm, height: 35mm, fill: rgb(${asString(resume.profile.photoBackground)}), ${photoImage})`
    : photoImage;
  const profileContent = `
    #text(size: 17.25pt, weight: "bold", fill: profile-ink, ${asString(resume.profile.name || "姓名")})
    #linebreak()
    #text(size: 9pt, weight: "bold", fill: profile-accent, ${asString(resume.profile.headline)})
    #v(5pt)
    ${contact ? `#text(fill: profile-ink, ${asString(contact)})` : ""}
    ${infoGrid}
  `;
  // Code arguments need a content block; markup bodies already provide one.
  const textBlock = `[${profileContent}]`;
  const columns = photo ? "(1fr, 27mm)" : "(1fr,)";
  const grid = `#grid(columns: ${columns}, column-gutter: 14pt, ${textBlock}${photo ? `, ${photo}` : ""})`;

  if (templateId === "minimal") return `#align(center)[${profileContent}]${photo ? `\n#place(top + right, dx: 0pt, dy: 0pt, ${photo})` : ""}\n#line(length: 100%, stroke: .35pt + rgb("#d6d6d6"))`;
  if (templateId === "executive") return `#block(width: 100%, fill: accent, inset: 13pt)[#let profile-ink = white\n#let profile-accent = white\n${grid}]`;
  if (templateId === "sidebar") return `#grid(columns: (42mm, 1fr), column-gutter: 12pt, [#block(width: 100%, fill: accent, inset: 10pt)[#let profile-ink = white\n#let profile-accent = white\n${profileContent}]], [${photo ? `#${photo}\n#v(4pt)` : ""}#text(size: 8pt, fill: rgb("#666666"), ${asString(resume.profile.headline)})])`;
  if (templateId === "accent") return `#grid(columns: (4pt, 1fr${photo ? ", 27mm" : ""}), column-gutter: 12pt, rect(width: 4pt, height: 35mm, fill: accent), ${textBlock}${photo ? `, ${photo}` : ""})`;
  if (templateId === "academic") return `${grid}\n#line(length: 100%, stroke: .9pt)\n#v(1pt)\n#line(length: 100%, stroke: .3pt)`;
  if (templateId === "developer") return `#block(width: 100%, fill: rgb("#f3f7f5"), stroke: .4pt + accent, inset: 10pt)[${grid}]`;
  if (templateId === "compact") return `#block(width: 100%, fill: rgb("#f2f4f3"), inset: 9pt)[${grid}]`;
  if (templateId === "timeline") return `${grid}\n#line(length: 100%, stroke: 1.2pt + accent)`;
  if (templateId === "newspaper") return `#line(length: 100%, stroke: .8pt)\n#v(1pt)\n#line(length: 100%, stroke: .3pt)\n#v(4pt)\n${grid}\n#v(4pt)\n#line(length: 100%, stroke: .3pt)\n#v(1pt)\n#line(length: 100%, stroke: .8pt)`;
  if (templateId === "swiss") return `#grid(columns: (10mm, 1fr${photo ? ", 27mm" : ""}), column-gutter: 10pt, rect(width: 10mm, height: 35mm, fill: rgb("#151515")), ${textBlock}${photo ? `, ${photo}` : ""})\n#v(3pt)\n#line(length: 100%, stroke: 4pt + accent)`;
  if (templateId === "magazine") return `#block(width: 100%, inset: (bottom: 7pt), stroke: (bottom: 3pt + rgb("#171717")))[${grid}]`;
  if (templateId === "blueprint") return `#block(width: 100%, fill: rgb("#f7fbfd"), stroke: .8pt + accent, inset: 9pt)[${grid}]`;
  if (templateId === "japanese") return `#block(width: 100%, inset: (left: 12mm, bottom: 7pt), stroke: (bottom: .35pt + rgb("#c9c6c0")))[${grid}]`;
  if (templateId === "archive") return `#block(width: 100%, fill: rgb("#f7f1e4"), stroke: .6pt + rgb("#756b5b"), inset: 9pt)[${grid}]`;
  if (templateId === "nordic") return `#block(width: 100%, radius: 9pt, fill: rgb("#eaf1ef"), inset: 11pt)[${grid}]`;
  if (templateId === "bauhaus") return `#grid(columns: (8mm, 1fr${photo ? ", 27mm" : ""}), column-gutter: 10pt, circle(radius: 4mm, fill: rgb("#e23d35")), ${textBlock}${photo ? `, ${photo}` : ""})\n#line(length: 100%, stroke: 4pt + accent)`;
  if (templateId === "index") return `#block(width: 100%, stroke: (left: 5pt + accent, bottom: .35pt + rgb("#ccd4d0")), inset: (left: 9pt, bottom: 7pt))[${grid}]`;
  if (templateId === "monochrome") return `#block(width: 100%, fill: black, inset: 12pt)[#let profile-ink = white\n#let profile-accent = white\n${grid}]`;
  if (templateId === "gradient") return `#block(width: 100%, radius: 10pt, fill: rgb("#edf3f6"), stroke: .45pt + accent, inset: 11pt)[${grid}]`;
  if (templateId === "terminal") return `#block(width: 100%, radius: 4pt, fill: rgb("#101b17"), inset: 11pt)[#let profile-ink = rgb("#d9fbe7")\n#let profile-accent = rgb("#63d594")\n${grid}]`;
  if (templateId === "ledger") return `#block(width: 100%, stroke: .55pt + rgb("#78867e"), inset: 8pt)[${grid}]`;
  if (templateId === "diplomat") return `#line(length: 100%, stroke: .4pt + rgb("#827353"))\n#v(4pt)\n#align(center)[${profileContent}]${photo ? `\n#place(top + right, ${photo})` : ""}\n#v(4pt)\n#line(length: 100%, stroke: 1pt + rgb("#827353"))`;
  if (templateId === "studio") return `#block(width: 100%, fill: white, stroke: (left: 6pt + rgb("#252525"), bottom: 4pt + accent), inset: 10pt)[${grid}]`;
  if (templateId === "ribbon") return `${grid}\n#block(width: 100%, height: 4pt, fill: accent)[]`;
  if (templateId === "capsule") return `#block(width: 100%, radius: 14pt, fill: rgb("#f0f5f2"), inset: 11pt)[${grid}]`;
  if (templateId === "split") return `#grid(columns: (1fr, 1fr), column-gutter: 0pt, [#block(width: 100%, fill: accent, inset: 10pt)[#let profile-ink = white\n#let profile-accent = white\n${profileContent}]], [#block(width: 100%, fill: rgb("#202725"), inset: 10pt)[${photo ? `#${photo}` : `#text(fill: white, ${asString(resume.profile.headline)})`}]])`;
  if (templateId === "metro") return `#block(width: 100%, fill: rgb("#f5f6f5"), stroke: (left: 4pt + accent), inset: 10pt)[${grid}]`;
  if (templateId === "folio") return `#block(width: 100%, inset: (bottom: 9pt), stroke: (bottom: .55pt + black))[${grid}]`;
  return grid;
}

export function createTypstSource(resume: ResumeDocument): string {
  const density = getDensityLayout(resume.theme.density);
  const selectedTemplateId = resume.theme.templateId;
  const templateId = getResumeTemplate(selectedTemplateId).renderBase;
  const photoPath = photoAssetPath(resume.profile.photo);
  const pageMargin = ["minimal", "academic", "diplomat", "folio"].includes(templateId)
    ? "(x: 15mm, y: 11mm)"
    : ["compact", "magazine", "studio"].includes(templateId)
      ? "(x: 11mm, y: 9mm)"
      : "(x: 12.5mm, y: 10.5mm)";

  return `// swift-resume-template: ${selectedTemplateId}
#set page(paper: "a4", margin: ${pageMargin})
#set text(font: "Noto Sans CJK SC", lang: "zh", size: ${withUnit(density.typstFontSizePt, "pt")}, fill: rgb("#303030"), top-edge: 0.88em, bottom-edge: -0.12em)
#set par(leading: ${withUnit(density.typstLeadingEm, "em")}, spacing: ${withUnit(density.typstGapPt, "pt")})
#set block(spacing: 0pt)
#let body-line = ${density.bodyLine}
#let body-leading = ${withUnit(density.typstLeadingEm, "em")}
#let section-gap = ${withUnit(density.sectionSpacePx * .75, "pt")}
#let entry-gap = ${withUnit(density.entrySpacePx * .75, "pt")}
#set list(indent: 7.5pt, body-indent: 4.5pt, spacing: ${withUnit(density.typstLeadingEm, "em")} + 0.75pt)
#set list(marker: ([•], [◦], [▪]))
#set enum(indent: 7.5pt, body-indent: 4.5pt, spacing: ${withUnit(density.typstLeadingEm, "em")} + 0.75pt)
#let page-content-height = ${297 - 2 * (["minimal", "academic", "diplomat", "folio"].includes(templateId) ? 11 : ["compact", "magazine", "studio"].includes(templateId) ? 9 : 10.5)}mm
#let accent = rgb(${asString(resume.theme.accent)})
#let profile-ink = rgb("#303030")
#let profile-accent = accent

${profileSource(resume, templateId, photoPath)}
${resume.sections.map((section) => sectionSource(section, templateId)).join("\n")}
`;
}

let compilerPromise: ReturnType<typeof initializeCompiler> | null = null;

async function initializeCompiler() {
  const compiler = createTypstCompiler();
  await compiler.init({
    getWrapper: async () => extensionCompilerWrapper,
    getModule: () => compilerWasmUrl,
    // The upstream loadFonts helper constructs a Function even in browsers,
    // which is forbidden by Manifest V3. Load our bundled font directly.
    beforeBuild: [Object.assign(async (_: unknown, { builder }: { builder: compilerWrapper.TypstCompilerBuilder }) => {
      for (const weight of ["Regular", "Bold"]) {
        const fontUrl = new URL(`./fonts/NotoSansCJKsc-${weight}.otf`, window.location.href).href;
        const response = await fetch(fontUrl);
        if (!response.ok) throw new Error("无法读取内置中文字体，请重新加载扩展后重试");
        await builder.add_raw_font(new Uint8Array(await response.arrayBuffer()));
      }
    }, { _kind: "fontLoader" as const, _preloadRemoteFontOptions: { assets: false as const } })],
  });
  return compiler;
}

export interface GeneratedPdf { blob: Blob; filename: string }
let compilationQueue: Promise<unknown> = Promise.resolve();

// The compiler uses a shared virtual filesystem. Serialize requests so a cancelled
// preview cannot overwrite the sources of a newer export.
export function generateTypstPdf(resume: ResumeDocument): Promise<GeneratedPdf> {
  const request = compilationQueue.then(() => compilePdf(resume));
  compilationQueue = request.catch(() => undefined);
  return request;
}

async function compilePdf(resume: ResumeDocument): Promise<GeneratedPdf> {
  const compiler = await (compilerPromise ??= initializeCompiler().catch((error) => {
    compilerPromise = null;
    throw error;
  }));
  for (const extension of ["png", "jpg", "webp", "svg"]) {
    compiler.unmapShadow(`/profile-photo.${extension}`);
  }
  const photoPath = photoAssetPath(resume.profile.photo);
  const bytes = await photoBytes(resume.profile.photo);
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
  return { blob, filename: `${safeTitle}.pdf` };
}

export async function exportTypstPdf(resume: ResumeDocument): Promise<void> {
  const { blob, filename } = await generateTypstPdf(resume);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
