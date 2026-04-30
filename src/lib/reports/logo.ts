export function getLogoContentAspectRatio(image: HTMLImageElement) {
  const naturalWidth = image.naturalWidth || image.width || 1;
  const naturalHeight = image.naturalHeight || image.height || 1;
  const naturalRatio = naturalWidth / naturalHeight;

  if (typeof document === "undefined") {
    return naturalRatio;
  }

  const maxDimension = 220;
  const scale = Math.min(1, maxDimension / Math.max(naturalWidth, naturalHeight));
  const canvasWidth = Math.max(1, Math.round(naturalWidth * scale));
  const canvasHeight = Math.max(1, Math.round(naturalHeight * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return naturalRatio;
  }

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  context.clearRect(0, 0, canvasWidth, canvasHeight);
  context.drawImage(image, 0, 0, canvasWidth, canvasHeight);

  const imageData = context.getImageData(0, 0, canvasWidth, canvasHeight).data;
  let minX = canvasWidth;
  let minY = canvasHeight;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < canvasHeight; y += 1) {
    for (let x = 0; x < canvasWidth; x += 1) {
      const alpha = imageData[(y * canvasWidth + x) * 4 + 3];

      if (alpha > 20) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX === -1 || maxY === -1) {
    return naturalRatio;
  }

  const contentWidth = Math.max(1, maxX - minX + 1);
  const contentHeight = Math.max(1, maxY - minY + 1);

  return contentWidth / contentHeight;
}
