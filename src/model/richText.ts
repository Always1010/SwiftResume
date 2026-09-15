const ALLOWED_TAGS = new Set([
  "A",
  "B",
  "BLOCKQUOTE",
  "BR",
  "DIV",
  "EM",
  "H1",
  "H2",
  "H3",
  "HR",
  "I",
  "LI",
  "MARK",
  "OL",
  "P",
  "S",
  "SPAN",
  "STRIKE",
  "STRONG",
  "TABLE",
  "TBODY",
  "TD",
  "TH",
  "THEAD",
  "TR",
  "U",
  "UL",
]);

const SAFE_LINK = /^(https?:|mailto:|tel:)/i;
const SAFE_FONT_FAMILY = /^(Microsoft YaHei|SimSun|KaiTi|Cascadia Mono)$/;

function sanitizeStyle(element: Element, value: string): string {
  const probe = element.ownerDocument.createElement("span");
  probe.setAttribute("style", value);
  const safe: string[] = [];
  const fontSize = probe.style.fontSize;
  if (/^(?:[89]|1\d|2[0-4])pt$/.test(fontSize)) safe.push(`font-size: ${fontSize}`);
  const fontFamily = probe.style.fontFamily.replace(/^['"]|['"]$/g, "");
  if (SAFE_FONT_FAMILY.test(fontFamily)) safe.push(`font-family: ${fontFamily}`);
  const fontWeight = probe.style.fontWeight;
  if (/^(?:400|500|600|700|bold|normal)$/.test(fontWeight)) safe.push(`font-weight: ${fontWeight}`);
  const color = probe.style.color;
  if (color) safe.push(`color: ${color}`);
  const backgroundColor = probe.style.backgroundColor;
  if (backgroundColor) safe.push(`background-color: ${backgroundColor}`);
  const textAlign = probe.style.textAlign;
  if (/^(?:left|center|right|justify)$/.test(textAlign)) safe.push(`text-align: ${textAlign}`);
  const lineHeight = probe.style.lineHeight;
  if (/^(?:1|1\.2|1\.4|1\.5|1\.6|1\.8|2)$/.test(lineHeight)) safe.push(`line-height: ${lineHeight}`);
  const marginLeft = probe.style.marginLeft;
  if (element.tagName === "P" && /^(?:2|4|6|8|10|12)em$/.test(marginLeft)) safe.push(`margin-left: ${marginLeft}`);
  if ((element.tagName === "TD" || element.tagName === "TH") && /^\d+(?:\.\d+)?px$/.test(probe.style.width)) safe.push(`width: ${probe.style.width}`);
  return safe.join("; ");
}

export function sanitizeRichText(html: string): string {
  if (typeof DOMParser === "undefined") return html;
  const document = new DOMParser().parseFromString(html, "text/html");
  for (const element of Array.from(document.body.querySelectorAll("*"))) {
    if (!ALLOWED_TAGS.has(element.tagName)) {
      if (element.tagName === "SCRIPT" || element.tagName === "STYLE") {
        element.remove();
      } else {
        element.replaceWith(...Array.from(element.childNodes));
      }
      continue;
    }
    for (const attribute of Array.from(element.attributes)) {
      if (element.tagName === "A" && attribute.name === "href" && SAFE_LINK.test(attribute.value)) continue;
      if (attribute.name === "style") {
        const safeStyle = sanitizeStyle(element, attribute.value);
        if (safeStyle) element.setAttribute("style", safeStyle);
        else element.removeAttribute("style");
        continue;
      }
      if ((element.tagName === "TD" || element.tagName === "TH") && (attribute.name === "colspan" || attribute.name === "rowspan") && /^\d{1,2}$/.test(attribute.value)) continue;
      element.removeAttribute(attribute.name);
    }
    if (element.tagName === "A") {
      const href = element.getAttribute("href") ?? "";
      if (!SAFE_LINK.test(href)) element.removeAttribute("href");
    }
  }
  return document.body.innerHTML;
}

export function richTextToPlainText(html: string): string {
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*li(?:\s[^>]*)?>/gi, "• ")
    .replace(/<\s*\/\s*(?:p|div|li|ul|ol)\s*>/gi, "\n");
  return withBreaks
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
