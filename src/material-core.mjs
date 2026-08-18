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

export function pdfTitleFromFilename(filename) {
  const title = String(filename ?? "").replace(/\.pdf$/i, "").trim();
  return title || "未命名材料";
}

export function removeOrderPrefix(title) {
  return String(title ?? "").replace(/^\s*\d{1,3}[\s._、-]+/, "").trim();
}

export function numberedPdfTitle(title, index, total) {
  const width = Math.max(2, String(Math.max(1, Number(total) || 1)).length);
  const number = String(Number(index) + 1).padStart(width, "0");
  return `${number}_${removeOrderPrefix(title) || "未命名材料"}`;
}

export function safePdfFilename(value, fallback = "OneForm-合并材料") {
  const withoutExtension = String(value ?? "").replace(/\.pdf$/i, "");
  const safe = withoutExtension
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/[.\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return `${safe || fallback}.pdf`;
}

export function createDirectoryPlan(pages, files, includeDirectory = true, itemsPerPage = 18) {
  const fileById = new Map(files.map(file => [file.id, file]));
  const firstPageByFile = new Map();
  pages.forEach((page, index) => {
    if (fileById.has(page.fileId) && !firstPageByFile.has(page.fileId)) firstPageByFile.set(page.fileId, index);
  });
  const activeFiles = files
    .filter(file => firstPageByFile.has(file.id))
    .sort((left, right) => firstPageByFile.get(left.id) - firstPageByFile.get(right.id));
  const pageSize = Math.max(1, Number(itemsPerPage) || 18);
  const directoryPageCount = includeDirectory && activeFiles.length ? Math.ceil(activeFiles.length / pageSize) : 0;
  const entries = activeFiles.map(file => ({
    fileId: file.id,
    title: String(file.displayName || "").trim() || pdfTitleFromFilename(file.name),
    page: directoryPageCount + firstPageByFile.get(file.id) + 1,
  }));
  return { directoryPageCount, entries, totalPageCount: directoryPageCount + pages.length };
}
