import { PDFDocument, degrees } from "pdf-lib";
import { normalizeRotation } from "./material-core.mjs";

export function createCopyBatches(pages) {
  const batches = new Map();
  for (const page of pages) {
    if (!batches.has(page.fileId)) batches.set(page.fileId, []);
    batches.get(page.fileId).push(page);
  }
  return [...batches].map(([fileId, entries]) => ({ fileId, entries }));
}

export async function mergePdfPayload(payload, onProgress = () => {}) {
  const {
    files,
    pages,
    tocImages = [],
    metadata = {},
    compress = false,
  } = payload;
  const output = await PDFDocument.create();
  output.setTitle(metadata.title || "OneForm 合并材料");
  output.setCreator("OneForm");
  output.setProducer("OneForm local PDF tools");

  onProgress({ phase: "directory", current: 0, total: tocImages.length });
  for (let index = 0; index < tocImages.length; index += 1) {
    const image = await output.embedPng(new Uint8Array(tocImages[index]));
    output.addPage([595.28, 841.89]).drawImage(image, {
      x: 0,
      y: 0,
      width: 595.28,
      height: 841.89,
    });
    onProgress({ phase: "directory", current: index + 1, total: tocImages.length });
  }

  const activeFileIds = new Set(pages.map(page => page.fileId));
  const sourceDocuments = new Map();
  const activeFiles = files.filter(file => activeFileIds.has(file.id));
  onProgress({ phase: "parsing", current: 0, total: activeFiles.length });
  for (let index = 0; index < activeFiles.length; index += 1) {
    const file = activeFiles[index];
    sourceDocuments.set(file.id, await PDFDocument.load(new Uint8Array(file.bytes)));
    onProgress({ phase: "parsing", current: index + 1, total: activeFiles.length });
  }

  const copiedByPageId = new Map();
  const batches = createCopyBatches(pages);
  let copiedCount = 0;
  onProgress({ phase: "copying", current: 0, total: pages.length });
  for (const batch of batches) {
    const copiedPages = await output.copyPages(
      sourceDocuments.get(batch.fileId),
      batch.entries.map(entry => entry.pageIndex),
    );
    copiedPages.forEach((copiedPage, index) => {
      const entry = batch.entries[index];
      copiedPage.setRotation(degrees(normalizeRotation(copiedPage.getRotation().angle + entry.rotation)));
      copiedByPageId.set(entry.id, copiedPage);
    });
    copiedCount += batch.entries.length;
    onProgress({ phase: "copying", current: copiedCount, total: pages.length });
  }

  for (const page of pages) output.addPage(copiedByPageId.get(page.id));
  onProgress({ phase: "writing", current: 0, total: 1 });
  const bytes = await output.save({ useObjectStreams: compress });
  onProgress({ phase: "writing", current: 1, total: 1 });
  return bytes;
}
