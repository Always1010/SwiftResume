export interface MeasuredPreviewItem {
  height: number;
  keepWithNext?: boolean;
}

export function paginatePreviewItems(items: MeasuredPreviewItem[], pageHeight: number): number[][] {
  if (!items.length) return [[]];

  const pages: number[][] = [];
  let page: number[] = [];
  let usedHeight = 0;

  const finishPage = () => {
    if (!page.length) return;
    pages.push(page);
    page = [];
    usedHeight = 0;
  };

  items.forEach((item, index) => {
    const height = Math.max(0, item.height);
    const nextHeight = item.keepWithNext ? Math.max(0, items[index + 1]?.height ?? 0) : 0;

    if (page.length && usedHeight + height + nextHeight > pageHeight) finishPage();
    if (page.length && usedHeight + height > pageHeight) finishPage();

    page.push(index);
    usedHeight += height;
  });

  finishPage();
  return pages.length ? pages : [[]];
}
