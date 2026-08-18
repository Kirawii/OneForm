import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { createCopyBatches, mergePdfPayload } from "../src/pdf-merge-core.mjs";

async function createSource(pageSizes) {
  const document = await PDFDocument.create();
  for (const [width, height] of pageSizes) document.addPage([width, height]);
  return (await document.save()).buffer;
}

test("页面按源文件分批且保持每份材料中的最终顺序", () => {
  const pages = [
    { id: "b-1", fileId: "b", pageIndex: 0 },
    { id: "a-2", fileId: "a", pageIndex: 1 },
    { id: "a-1", fileId: "a", pageIndex: 0 },
  ];
  assert.deepEqual(createCopyBatches(pages), [
    { fileId: "b", entries: [pages[0]] },
    { fileId: "a", entries: [pages[1], pages[2]] },
  ]);
});

test("后台合并保持跨文件排序、旋转和快速写入", async () => {
  const [a, b] = await Promise.all([
    createSource([[100, 200], [110, 210]]),
    createSource([[120, 220]]),
  ]);
  const progress = [];
  const bytes = await mergePdfPayload({
    files: [{ id: "a", bytes: a }, { id: "b", bytes: b }],
    pages: [
      { id: "b-1", fileId: "b", pageIndex: 0, rotation: 90 },
      { id: "a-2", fileId: "a", pageIndex: 1, rotation: 0 },
      { id: "a-1", fileId: "a", pageIndex: 0, rotation: 0 },
    ],
    metadata: { title: "性能测试" },
    compress: false,
  }, event => progress.push(event.phase));
  const output = await PDFDocument.load(bytes);
  const pages = output.getPages();

  assert.equal(pages.length, 3);
  assert.deepEqual(pages.map(page => [page.getWidth(), page.getHeight()]), [
    [120, 220], [110, 210], [100, 200],
  ]);
  assert.equal(pages[0].getRotation().angle, 90);
  assert.equal(output.getTitle(), "性能测试");
  assert.ok(progress.includes("parsing"));
  assert.ok(progress.includes("copying"));
  assert.ok(progress.includes("writing"));
});

test("体积压缩模式可以写入目录页", async () => {
  const source = await createSource([[100, 200]]);
  const png = Uint8Array.from(Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  ));
  const bytes = await mergePdfPayload({
    files: [{ id: "source", bytes: source }],
    pages: [{ id: "page", fileId: "source", pageIndex: 0, rotation: 0 }],
    tocImages: [png.buffer],
    compress: true,
  });
  const output = await PDFDocument.load(bytes);

  assert.equal(output.getPageCount(), 2);
});
