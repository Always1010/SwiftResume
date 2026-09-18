let fontsReady = false;
let fontRequest: Promise<void> | undefined;

// Font readiness is shared across editor, standalone preview and export surfaces
// in this document. A failed request may be retried by the next update.
export function prepareHtmlFonts(): Promise<void> | undefined {
  if (fontsReady) return;
  return fontRequest ??= Promise.all([
    document.fonts.load('400 12px "SwiftResume Browser Sans"'),
    document.fonts.load('700 12px "SwiftResume Browser Sans"'),
  ]).then(() => document.fonts.ready).then(() => { fontsReady = true; }).catch((error) => {
    fontRequest = undefined;
    throw error;
  });
}

// Keep page shells (and unchanged content nodes) alive. Measurement never touches
// the visible tree; all changed pages are committed together without an empty frame.
export function commitHtmlPages(measured: HTMLElement, visible: HTMLElement) {
  const viewport = visible.closest<HTMLElement>(".html-canvas-preview");
  const scrollTop = viewport?.scrollTop;
  const scrollLeft = viewport?.scrollLeft;
  Array.from(measured.children).forEach((next, index) => {
    const current = visible.children[index];
    if (!current) { visible.append(next.cloneNode(true)); return; }
    const currentPage = current as HTMLElement;
    currentPage.style.cssText = (next as HTMLElement).style.cssText;
    if (!current.firstElementChild?.isEqualNode(next.firstElementChild)) {
      current.replaceChildren(...Array.from(next.childNodes, (node) => node.cloneNode(true)));
    }
  });
  while (visible.children.length > measured.children.length) visible.lastElementChild!.remove();
  if (viewport) {
    viewport.scrollTop = scrollTop!;
    viewport.scrollLeft = scrollLeft!;
  }
}
