// Paginate the browser's own DOM at content boundaries. The resulting nodes are
// used unchanged for screen preview and printing; no canvas/text reconstruction.
type Boundary = { node: Node; offset: number };

export function paginateHtml(source: HTMLElement, destination: HTMLElement): number {
  const original = source.querySelector<HTMLElement>(".html-resume-content")!;
  const page = source.cloneNode(false) as HTMLElement;
  page.removeAttribute("aria-hidden");
  page.classList.remove("html-resume-source");
  const content = original.cloneNode(false) as HTMLElement;
  page.append(content);
  destination.replaceChildren(page);
  const style = getComputedStyle(page);
  const scale = page.getBoundingClientRect().width / parseFloat(style.width);
  const capacity = page.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - 1;
  const boundaries: Boundary[] = [];
  const after = (node: Node) => boundaries.push({ node: node.parentNode!, offset: Array.prototype.indexOf.call(node.parentNode!.childNodes, node) + 1 });

  original.querySelectorAll<HTMLElement>("li, .resume-flow-entry, section").forEach((node, i) => { node.dataset.printNode = String(i); });
  original.querySelectorAll<HTMLOListElement>("ol").forEach((list) => {
    let value = list.start || 1;
    Array.from(list.children).forEach((child) => {
      if (child instanceof HTMLLIElement) { value = child.hasAttribute("value") ? child.value : value; child.value = value++; }
    });
  });
  function collect(element: HTMLElement) {
    // Reserve room for a section/entry heading on the first page of an entry.
    const short = element.getBoundingClientRect().height / scale < capacity - 80;
    if (element.matches(".resume-header, .education-entry, tr") || (short && element.matches(".resume-flow-entry, li, p, blockquote, table"))) {
      after(element);
    } else if (element.matches("p") && !short) {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const text = walker.currentNode;
        // Grapheme boundaries preserve surrogate pairs, accents and emoji.
        const segments = new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text.textContent ?? "");
        for (const segment of segments) boundaries.push({ node: text, offset: segment.index + segment.segment.length });
      }
      after(element);
    } else if (element.matches(".resume-section-heading, .entry-topline, h1, h2, h3, h4, h5, h6")) {
      // A heading travels with the next body block.
    } else if (element.children.length) {
      Array.from(element.children).forEach((child) => collect(child as HTMLElement));
    } else after(element);
  }
  Array.from(original.children).forEach((child) => collect(child as HTMLElement));
  boundaries.push({ node: original, offset: original.childNodes.length });

  let start: Boundary = { node: original, offset: 0 };
  let cursor = 0;
  let currentContent = content;
  let count = 0;
  function render(end: Boundary) {
    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    let fragment: Node = range.cloneContents();
    // cloneContents excludes the common ancestor. Restore that ancestor chain
    // so a continuation retains section spacing, paragraph font and list/table context.
    let common = range.commonAncestorContainer;
    if (!(common instanceof Element)) common = common.parentNode!;
    while (common !== original) {
      const shell = common.cloneNode(false);
      shell.appendChild(fragment);
      fragment = shell;
      common = common.parentNode!;
    }
    currentContent.replaceChildren(fragment);
    Array.from(currentContent.querySelectorAll("section, .resume-flow-entry, .resume-entry, .resume-rich-text, ul, ol, li")).reverse().forEach((node) => {
      if (!node.childNodes.length) node.remove();
    });
    // Partial ancestors carry their styles but not a second bullet/top gap.
    let ancestor = start.node instanceof Element ? start.node : start.node.parentElement;
    while (ancestor && ancestor !== original) {
      const id = (ancestor as HTMLElement).dataset.printNode;
      if (id !== undefined) {
        const continuation = currentContent.querySelector<HTMLElement>(`[data-print-node="${id}"]`);
        if (continuation) {
          continuation.style.marginTop = "0";
          if (ancestor.matches("li")) continuation.style.listStyleType = "none";
        }
      }
      ancestor = ancestor.parentElement;
    }
    return currentContent.getBoundingClientRect().height / scale <= capacity;
  }
  while (cursor < boundaries.length) {
    let low = cursor, high = boundaries.length - 1, best = -1;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      if (render(boundaries[middle])) { best = middle; low = middle + 1; }
      else high = middle - 1;
    }
    if (best < cursor) {
      destination.replaceChildren();
      throw new Error("有内容超过一页可用高度，请缩短个人信息或拆分过高的表格行后重试。");
    }
    render(boundaries[best]);
    // Range endpoints may leave an empty continuation at the very end.
    if (!currentContent.textContent?.trim() && !currentContent.querySelector("img, table, hr")) {
      currentContent.parentElement!.remove();
      break;
    }
    count++;
    start = boundaries[best];
    cursor = best + 1;
    if (cursor < boundaries.length) {
      const next = page.cloneNode(false) as HTMLElement;
      currentContent = content.cloneNode(false) as HTMLElement;
      next.append(currentContent);
      destination.append(next);
    }
  }
  return count;
}
