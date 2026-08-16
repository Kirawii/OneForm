export function normalizeRotation(value) {
  const normalized = Number(value) % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function moveItem(items, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
    return [...items];
  }
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function cropRect(sourceWidth, sourceHeight, targetWidth, targetHeight, zoom = 1, panX = 0, panY = 0) {
  if (![sourceWidth, sourceHeight, targetWidth, targetHeight].every(value => Number(value) > 0)) {
    throw new TypeError("图片和输出尺寸必须大于 0");
  }
  const targetRatio = targetWidth / targetHeight;
  const sourceRatio = sourceWidth / sourceHeight;
  const safeZoom = Math.min(4, Math.max(1, Number(zoom) || 1));
  let width;
  let height;
  if (sourceRatio > targetRatio) {
    height = sourceHeight / safeZoom;
    width = height * targetRatio;
  } else {
    width = sourceWidth / safeZoom;
    height = width / targetRatio;
  }
  const maxX = Math.max(0, sourceWidth - width);
  const maxY = Math.max(0, sourceHeight - height);
  const x = maxX * (Math.min(100, Math.max(-100, Number(panX) || 0)) + 100) / 200;
  const y = maxY * (Math.min(100, Math.max(-100, Number(panY) || 0)) + 100) / 200;
  return { x, y, width, height };
}

export function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
