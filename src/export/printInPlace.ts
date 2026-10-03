/** Print the already paginated snapshot without navigating or remounting the editor. */
export function printHtmlInPlace(container: HTMLElement, title: string) {
  const pages = container.querySelector<HTMLElement>(".html-resume-pages");
  if (!pages?.children.length) throw new Error("排版尚未完成，请稍候再试。");
  const printRoot = document.createElement("div");
  printRoot.className = "resume-print-root";
  printRoot.append(pages.cloneNode(true));
  const previousTitle = document.title;
  let restored = false;
  const cleanup = () => {
    if (restored) return;
    restored = true;
    printRoot.remove();
    document.body.classList.remove("swift-resume-printing");
    document.title = previousTitle;
    window.removeEventListener("afterprint", cleanup);
  };
  document.body.append(printRoot);
  document.body.classList.add("swift-resume-printing");
  document.title = title || "简历";
  window.addEventListener("afterprint", cleanup);
  try { window.print(); } catch (error) { cleanup(); throw error; }
  // Chromium returns after its native print dialog closes (also on Cancel).
  cleanup();
}
