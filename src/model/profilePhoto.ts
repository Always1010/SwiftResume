import type { ProfilePhotoCrop } from "./resume";

export interface PhotoCropRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function calculatePhotoCrop(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  crop: ProfilePhotoCrop,
): PhotoCropRectangle {
  const targetRatio = targetWidth / targetHeight;
  const sourceRatio = sourceWidth / sourceHeight;
  const baseWidth = sourceRatio > targetRatio ? sourceHeight * targetRatio : sourceWidth;
  const baseHeight = sourceRatio > targetRatio ? sourceHeight : sourceWidth / targetRatio;
  const zoom = Math.min(3, Math.max(1, crop.zoom));
  const width = baseWidth / zoom;
  const height = baseHeight / zoom;
  const centerX = (sourceWidth - width) / 2;
  const centerY = (sourceHeight - height) / 2;
  const offsetX = Math.min(100, Math.max(-100, crop.offsetX)) / 100;
  const offsetY = Math.min(100, Math.max(-100, crop.offsetY)) / 100;

  return {
    x: centerX + centerX * offsetX,
    y: centerY + centerY * offsetY,
    width,
    height,
  };
}

export function drawCroppedPhoto(
  canvas: HTMLCanvasElement,
  image: CanvasImageSource & { width: number; height: number },
  crop: ProfilePhotoCrop,
) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器无法创建照片裁切画布");
  const rectangle = calculatePhotoCrop(image.width, image.height, canvas.width, canvas.height, crop);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    image,
    rectangle.x,
    rectangle.y,
    rectangle.width,
    rectangle.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
}

export function loadPhotoImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("当前浏览器无法读取这张图片，请尝试转换图片格式后重新上传"));
    image.src = source;
  });
}

export async function createCroppedPhoto(source: string, crop: ProfilePhotoCrop): Promise<string> {
  const image = await loadPhotoImage(source);
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 800;
  drawCroppedPhoto(canvas, image, crop);
  return canvas.toDataURL("image/png");
}
