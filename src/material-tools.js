import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { PDFDocument, degrees } from "pdf-lib";
import pica from "pica";
import { cropRect, formatBytes, moveItem, normalizeRotation } from "./material-core.mjs";

const workerBlob = new Blob([globalThis.__ONEFORM_PDF_WORKER__], { type: "text/javascript" });
const workerUrl = URL.createObjectURL(workerBlob);
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const pdfInput = document.querySelector("#pdf-input");
const pdfDrop = document.querySelector("#pdf-drop");
const pdfFileList = document.querySelector("#pdf-file-list");
const pdfPagesBox = document.querySelector("#pdf-pages");
const pdfSummary = document.querySelector("#pdf-summary");
const pdfStatus = document.querySelector("#pdf-status");
const pdfDownload = document.querySelector("#pdf-download");
const pdfClear = document.querySelector("#pdf-clear");

const pdfFiles = new Map();
let pdfPages = [];
let renderVersion = 0;
let draggedPageId = "";

function setStatus(element, message, error = false) {
  element.textContent = message;
  element.classList.toggle("error", error);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character]));
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function addPdfFiles(fileList) {
  const files = [...fileList].filter(file => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
  if (!files.length) {
    setStatus(pdfStatus, "请选择 PDF 文件。", true);
    return;
  }
  setStatus(pdfStatus, `正在读取 ${files.length} 个文件...`);
  for (const file of files) {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
      const previewDocument = await loadingTask.promise;
      const fileId = crypto.randomUUID();
      pdfFiles.set(fileId, { id: fileId, name: file.name, size: file.size, bytes, previewDocument });
      for (let pageIndex = 0; pageIndex < previewDocument.numPages; pageIndex += 1) {
        pdfPages.push({ id: crypto.randomUUID(), fileId, pageIndex, rotation: 0 });
      }
    } catch (error) {
      console.error(error);
      setStatus(pdfStatus, `${file.name} 无法读取，可能已加密或文件损坏。`, true);
    }
  }
  renderPdfWorkspace();
  if (pdfPages.length) setStatus(pdfStatus, "PDF 已读取。拖动缩略图可以调整最终顺序。");
  pdfInput.value = "";
}

function rotateFile(fileId, amount) {
  pdfPages = pdfPages.map(page => page.fileId === fileId
    ? { ...page, rotation: normalizeRotation(page.rotation + amount) }
    : page);
  renderPdfWorkspace();
}

async function removeFile(fileId) {
  const file = pdfFiles.get(fileId);
  if (file) await file.previewDocument.destroy();
  pdfFiles.delete(fileId);
  pdfPages = pdfPages.filter(page => page.fileId !== fileId);
  renderPdfWorkspace();
}

async function clearPdfs() {
  await Promise.all([...pdfFiles.values()].map(file => file.previewDocument.destroy()));
  pdfFiles.clear();
  pdfPages = [];
  renderPdfWorkspace();
  setStatus(pdfStatus, "");
}

function renderPdfFiles() {
  pdfFileList.innerHTML = [...pdfFiles.values()].map(file => {
    const count = pdfPages.filter(page => page.fileId === file.id).length;
    return `<div class="file-row" data-file-id="${file.id}">
      <div class="file-meta"><strong title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</strong><span>${count} 页 · ${formatBytes(file.size)}</span></div>
      <div class="file-actions">
        <button class="icon-button" type="button" data-file-action="left" title="全部向左旋转" aria-label="${escapeHtml(file.name)} 全部向左旋转">↶</button>
        <button class="icon-button" type="button" data-file-action="right" title="全部向右旋转" aria-label="${escapeHtml(file.name)} 全部向右旋转">↷</button>
        <button class="icon-button danger" type="button" data-file-action="remove" title="移除文件" aria-label="移除 ${escapeHtml(file.name)}">×</button>
      </div>
    </div>`;
  }).join("");
}

function renderPdfWorkspace() {
  const version = ++renderVersion;
  renderPdfFiles();
  pdfPagesBox.innerHTML = pdfPages.map((page, index) => {
    const file = pdfFiles.get(page.fileId);
    return `<article class="page-card" draggable="true" data-page-id="${page.id}">
      <div class="page-thumb"><span>正在生成缩略图</span></div>
      <div class="page-caption">
        <div><strong>${index + 1}. ${escapeHtml(file?.name || "PDF")}</strong><span>原文件第 ${page.pageIndex + 1} 页</span></div>
      </div>
      <div class="page-actions">
        <button class="icon-button" type="button" data-page-action="left" title="向左旋转" aria-label="第 ${index + 1} 页向左旋转">↶</button>
        <button class="icon-button" type="button" data-page-action="right" title="向右旋转" aria-label="第 ${index + 1} 页向右旋转">↷</button>
        <button class="icon-button danger" type="button" data-page-action="remove" title="删除这一页" aria-label="删除第 ${index + 1} 页">×</button>
      </div>
    </article>`;
  }).join("");
  pdfSummary.textContent = pdfPages.length ? `${pdfFiles.size} 个文件，共 ${pdfPages.length} 页` : "尚未添加 PDF";
  pdfDownload.disabled = pdfPages.length === 0;
  pdfClear.disabled = pdfPages.length === 0;
  void renderPdfThumbnails(version);
}

async function renderPdfThumbnails(version) {
  const cards = [...pdfPagesBox.querySelectorAll(".page-card")];
  for (const card of cards) {
    if (version !== renderVersion) return;
    const entry = pdfPages.find(page => page.id === card.dataset.pageId);
    const file = entry && pdfFiles.get(entry.fileId);
    if (!entry || !file) continue;
    try {
      const sourcePage = await file.previewDocument.getPage(entry.pageIndex + 1);
      const baseViewport = sourcePage.getViewport({ scale: 1, rotation: normalizeRotation(sourcePage.rotate + entry.rotation) });
      const cssScale = Math.min(144 / baseViewport.width, 176 / baseViewport.height);
      const renderScale = Math.max(.2, cssScale * Math.min(2, window.devicePixelRatio || 1));
      const viewport = sourcePage.getViewport({ scale: renderScale, rotation: normalizeRotation(sourcePage.rotate + entry.rotation) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.style.width = `${Math.ceil(baseViewport.width * cssScale)}px`;
      canvas.style.height = `${Math.ceil(baseViewport.height * cssScale)}px`;
      await sourcePage.render({ canvasContext: canvas.getContext("2d", { alpha: false }), viewport }).promise;
      if (version !== renderVersion || !card.isConnected) return;
      const thumb = card.querySelector(".page-thumb");
      thumb.replaceChildren(canvas);
      sourcePage.cleanup();
    } catch (error) {
      console.error(error);
      const label = card.querySelector(".page-thumb span");
      if (label) label.textContent = "缩略图生成失败";
    }
  }
}

pdfFileList.addEventListener("click", event => {
  const button = event.target.closest("[data-file-action]");
  if (!button) return;
  const fileId = button.closest("[data-file-id]").dataset.fileId;
  if (button.dataset.fileAction === "left") rotateFile(fileId, -90);
  if (button.dataset.fileAction === "right") rotateFile(fileId, 90);
  if (button.dataset.fileAction === "remove") void removeFile(fileId);
});

pdfPagesBox.addEventListener("click", event => {
  const button = event.target.closest("[data-page-action]");
  if (!button) return;
  const id = button.closest("[data-page-id]").dataset.pageId;
  const index = pdfPages.findIndex(page => page.id === id);
  if (index < 0) return;
  if (button.dataset.pageAction === "remove") pdfPages.splice(index, 1);
  if (button.dataset.pageAction === "left") pdfPages[index].rotation = normalizeRotation(pdfPages[index].rotation - 90);
  if (button.dataset.pageAction === "right") pdfPages[index].rotation = normalizeRotation(pdfPages[index].rotation + 90);
  renderPdfWorkspace();
});

pdfPagesBox.addEventListener("dragstart", event => {
  const card = event.target.closest("[data-page-id]");
  if (!card) return;
  draggedPageId = card.dataset.pageId;
  card.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
});

pdfPagesBox.addEventListener("dragover", event => {
  const card = event.target.closest("[data-page-id]");
  if (!card || card.dataset.pageId === draggedPageId) return;
  event.preventDefault();
  pdfPagesBox.querySelectorAll(".drag-target").forEach(item => item.classList.remove("drag-target"));
  card.classList.add("drag-target");
});

pdfPagesBox.addEventListener("drop", event => {
  const card = event.target.closest("[data-page-id]");
  if (!card || !draggedPageId) return;
  event.preventDefault();
  const fromIndex = pdfPages.findIndex(page => page.id === draggedPageId);
  const toIndex = pdfPages.findIndex(page => page.id === card.dataset.pageId);
  pdfPages = moveItem(pdfPages, fromIndex, toIndex);
  draggedPageId = "";
  renderPdfWorkspace();
});

pdfPagesBox.addEventListener("dragend", () => {
  draggedPageId = "";
  pdfPagesBox.querySelectorAll(".dragging,.drag-target").forEach(item => item.classList.remove("dragging", "drag-target"));
});

pdfInput.addEventListener("change", event => void addPdfFiles(event.target.files));
pdfDrop.addEventListener("click", () => pdfInput.click());
pdfDrop.addEventListener("keydown", event => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    pdfInput.click();
  }
});
for (const eventName of ["dragenter", "dragover"]) {
  pdfDrop.addEventListener(eventName, event => {
    event.preventDefault();
    pdfDrop.classList.add("dragover");
  });
}
for (const eventName of ["dragleave", "drop"]) {
  pdfDrop.addEventListener(eventName, event => {
    event.preventDefault();
    pdfDrop.classList.remove("dragover");
  });
}
pdfDrop.addEventListener("drop", event => void addPdfFiles(event.dataTransfer.files));
pdfClear.addEventListener("click", () => void clearPdfs());

pdfDownload.addEventListener("click", async () => {
  if (!pdfPages.length) return;
  pdfDownload.disabled = true;
  setStatus(pdfStatus, "正在合并 PDF，请保持页面打开...");
  try {
    const output = await PDFDocument.create();
    const documents = new Map();
    for (const [fileId, file] of pdfFiles) documents.set(fileId, await PDFDocument.load(file.bytes));
    for (let index = 0; index < pdfPages.length; index += 1) {
      const entry = pdfPages[index];
      setStatus(pdfStatus, `正在处理第 ${index + 1} / ${pdfPages.length} 页...`);
      const [copiedPage] = await output.copyPages(documents.get(entry.fileId), [entry.pageIndex]);
      copiedPage.setRotation(degrees(normalizeRotation(copiedPage.getRotation().angle + entry.rotation)));
      output.addPage(copiedPage);
    }
    const bytes = await output.save({ useObjectStreams: true });
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), `OneForm-合并材料-${new Date().toISOString().slice(0, 10)}.pdf`);
    setStatus(pdfStatus, `合并完成，共 ${pdfPages.length} 页，文件大小 ${formatBytes(bytes.byteLength)}。`);
  } catch (error) {
    console.error(error);
    setStatus(pdfStatus, "合并失败。请检查文件是否加密，并尝试减少文件数量。", true);
  } finally {
    pdfDownload.disabled = pdfPages.length === 0;
  }
});

const photoInput = document.querySelector("#photo-input");
const photoPreview = document.querySelector("#photo-preview");
const photoEmpty = document.querySelector("#photo-empty");
const photoInfo = document.querySelector("#photo-info");
const photoStatus = document.querySelector("#photo-status");
const photoPreset = document.querySelector("#photo-preset");
const photoWidth = document.querySelector("#photo-width");
const photoHeight = document.querySelector("#photo-height");
const photoZoom = document.querySelector("#photo-zoom");
const photoPanX = document.querySelector("#photo-pan-x");
const photoPanY = document.querySelector("#photo-pan-y");
const photoFormat = document.querySelector("#photo-format");
const photoSize = document.querySelector("#photo-size");
const photoDownload = document.querySelector("#photo-download");
const zoomValue = document.querySelector("#zoom-value");
const picaResize = pica();

let photoBitmap = null;
let rotatedPhoto = null;
let photoRotation = 0;
let photoName = "证件照";

function outputDimensions() {
  const width = Math.min(6000, Math.max(32, Number(photoWidth.value) || 295));
  const height = Math.min(6000, Math.max(32, Number(photoHeight.value) || 413));
  photoWidth.value = width;
  photoHeight.value = height;
  return { width, height };
}

function rebuildRotatedPhoto() {
  if (!photoBitmap) return;
  const sideways = photoRotation % 180 !== 0;
  const canvas = document.createElement("canvas");
  canvas.width = sideways ? photoBitmap.height : photoBitmap.width;
  canvas.height = sideways ? photoBitmap.width : photoBitmap.height;
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(photoRotation * Math.PI / 180);
  context.drawImage(photoBitmap, -photoBitmap.width / 2, -photoBitmap.height / 2);
  rotatedPhoto = canvas;
  renderPhotoPreview();
}

function currentCrop() {
  const { width, height } = outputDimensions();
  return cropRect(rotatedPhoto.width, rotatedPhoto.height, width, height, Number(photoZoom.value) / 100, photoPanX.value, photoPanY.value);
}

function renderPhotoPreview() {
  if (!rotatedPhoto) return;
  const { width, height } = outputDimensions();
  const ratio = width / height;
  if (ratio >= 1) {
    photoPreview.width = 900;
    photoPreview.height = Math.round(900 / ratio);
  } else {
    photoPreview.height = 900;
    photoPreview.width = Math.round(900 * ratio);
  }
  const crop = currentCrop();
  const context = photoPreview.getContext("2d", { alpha: false });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(rotatedPhoto, crop.x, crop.y, crop.width, crop.height, 0, 0, photoPreview.width, photoPreview.height);
  const upscale = crop.width < width || crop.height < height;
  photoInfo.textContent = `${photoName} · 原图 ${rotatedPhoto.width} × ${rotatedPhoto.height} px · 输出 ${width} × ${height} px${upscale ? " · 将等比例放大" : ""}`;
}

async function loadPhoto(file) {
  if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    setStatus(photoStatus, "请选择 JPG、PNG 或 WebP 图片。", true);
    return;
  }
  setStatus(photoStatus, "正在读取照片...");
  try {
    if (photoBitmap) photoBitmap.close();
    photoBitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    photoRotation = 0;
    photoName = file.name.replace(/\.[^.]+$/, "") || "证件照";
    photoZoom.value = "100";
    photoPanX.value = "0";
    photoPanY.value = "0";
    zoomValue.value = "100%";
    rebuildRotatedPhoto();
    photoPreview.style.display = "block";
    photoEmpty.hidden = true;
    photoDownload.disabled = false;
    setStatus(photoStatus, "照片已加载。调整预览后下载即可。");
  } catch (error) {
    console.error(error);
    setStatus(photoStatus, "照片无法读取，请换一张图片重试。", true);
  }
  photoInput.value = "";
}

photoInput.addEventListener("change", event => void loadPhoto(event.target.files[0]));
photoPreset.addEventListener("change", () => {
  if (photoPreset.value !== "custom") {
    const [width, height] = photoPreset.value.split("x");
    photoWidth.value = width;
    photoHeight.value = height;
  }
  photoWidth.disabled = photoPreset.value !== "custom";
  photoHeight.disabled = photoPreset.value !== "custom";
  renderPhotoPreview();
});
photoWidth.disabled = true;
photoHeight.disabled = true;
for (const input of [photoWidth, photoHeight, photoPanX, photoPanY]) input.addEventListener("input", renderPhotoPreview);
photoZoom.addEventListener("input", () => {
  zoomValue.value = `${photoZoom.value}%`;
  renderPhotoPreview();
});
document.querySelector("#photo-left").addEventListener("click", () => {
  photoRotation = normalizeRotation(photoRotation - 90);
  rebuildRotatedPhoto();
});
document.querySelector("#photo-right").addEventListener("click", () => {
  photoRotation = normalizeRotation(photoRotation + 90);
  rebuildRotatedPhoto();
});
photoFormat.addEventListener("change", () => {
  photoSize.disabled = photoFormat.value === "png";
});

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("图片编码失败")), type, quality));
}

async function compressedJpeg(canvas, targetBytes) {
  if (!targetBytes) return canvasBlob(canvas, "image/jpeg", .92);
  let low = .32;
  let high = .95;
  let best = await canvasBlob(canvas, "image/jpeg", low);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const quality = (low + high) / 2;
    const candidate = await canvasBlob(canvas, "image/jpeg", quality);
    if (candidate.size <= targetBytes) {
      best = candidate;
      low = quality;
    } else {
      high = quality;
    }
  }
  return best;
}

photoDownload.addEventListener("click", async () => {
  if (!rotatedPhoto) return;
  photoDownload.disabled = true;
  setStatus(photoStatus, "正在裁剪和调整尺寸...");
  try {
    const { width, height } = outputDimensions();
    const crop = currentCrop();
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = Math.max(1, Math.round(crop.width));
    cropCanvas.height = Math.max(1, Math.round(crop.height));
    cropCanvas.getContext("2d", { alpha: false }).drawImage(
      rotatedPhoto, crop.x, crop.y, crop.width, crop.height, 0, 0, cropCanvas.width, cropCanvas.height
    );
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = width;
    outputCanvas.height = height;
    await picaResize.resize(cropCanvas, outputCanvas, {
      quality: 3, alpha: false, unsharpAmount: 80, unsharpRadius: .6, unsharpThreshold: 2
    });
    const isPng = photoFormat.value === "png";
    const targetBytes = isPng ? 0 : Math.max(0, Number(photoSize.value) || 0) * 1024;
    const blob = isPng
      ? await canvasBlob(outputCanvas, "image/png")
      : await compressedJpeg(outputCanvas, targetBytes);
    const extension = isPng ? "png" : "jpg";
    downloadBlob(blob, `${photoName}-${width}x${height}.${extension}`);
    const targetMissed = targetBytes && blob.size > targetBytes;
    setStatus(photoStatus, `处理完成，实际大小 ${formatBytes(blob.size)}。${targetMissed ? "原图内容复杂，已使用最低建议质量但仍高于目标大小。" : ""}`, targetMissed);
  } catch (error) {
    console.error(error);
    setStatus(photoStatus, "处理失败。图片尺寸可能过大，请缩小输出尺寸后重试。", true);
  } finally {
    photoDownload.disabled = !rotatedPhoto;
  }
});

renderPdfWorkspace();
