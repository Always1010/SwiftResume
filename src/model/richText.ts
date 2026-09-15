const ALLOWED_TAGS = new Set([
  "A",
  "B",
  "BR",
  "DIV",
  "EM",
  "I",
  "LI",
  "OL",
  "P",
  "STRONG",
  "U",
  "UL",
]);

const SAFE_LINK = /^(https?:|mailto:|tel:)/i;

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
