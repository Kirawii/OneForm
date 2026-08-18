import test from "node:test";
import assert from "node:assert/strict";
import {
  createDirectoryPlan,
  cropRect,
  formatBytes,
  moveItem,
  normalizeRotation,
  numberedPdfTitle,
  pdfTitleFromFilename,
  safePdfFilename,
} from "../src/material-core.mjs";

test("旋转角度始终归一化到完整一周", () => {
  assert.equal(normalizeRotation(-90), 270);
  assert.equal(normalizeRotation(450), 90);
  assert.equal(normalizeRotation(720), 0);
});

test("页面排序不会修改原数组", () => {
  const source = ["a", "b", "c"];
  assert.deepEqual(moveItem(source, 0, 2), ["b", "c", "a"]);
  assert.deepEqual(source, ["a", "b", "c"]);
});

test("裁剪框保持目标比例并限制在原图内", () => {
  const crop = cropRect(4000, 3000, 295, 413, 1.5, 100, -100);
  assert.ok(Math.abs(crop.width / crop.height - 295 / 413) < 1e-10);
  assert.ok(crop.x >= 0 && crop.y >= 0);
  assert.ok(crop.x + crop.width <= 4000);
  assert.ok(crop.y + crop.height <= 3000);
});

test("文件大小使用易读单位", () => {
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(1536), "1.5 KB");
  assert.equal(formatBytes(2 * 1024 * 1024), "2.0 MB");
});

test("PDF 名称默认移除扩展名并支持稳定编号", () => {
  assert.equal(pdfTitleFromFilename("本科成绩单.PDF"), "本科成绩单");
  assert.equal(numberedPdfTitle("3-本科成绩单", 0, 12), "01_本科成绩单");
  assert.equal(numberedPdfTitle("外语证明", 11, 12), "12_外语证明");
});

test("下载文件名会移除系统非法字符", () => {
  assert.equal(safePdfFilename("推免:材料/最终版.pdf"), "推免-材料-最终版.pdf");
  assert.equal(safePdfFilename("  "), "OneForm-合并材料.pdf");
});

test("目录按文件顺序和最终页面位置计算起始页", () => {
  const files = [
    { id: "a", name: "成绩单.pdf", displayName: "本科成绩单" },
    { id: "b", name: "外语.pdf", displayName: "外语能力证明" },
    { id: "c", name: "已删除.pdf", displayName: "不应出现" },
  ];
  const pages = [
    { fileId: "b" },
    { fileId: "b" },
    { fileId: "a" },
  ];
  const plan = createDirectoryPlan(pages, files, true, 1);
  assert.equal(plan.directoryPageCount, 2);
  assert.equal(plan.totalPageCount, 5);
  assert.deepEqual(plan.entries, [
    { fileId: "b", title: "外语能力证明", page: 3 },
    { fileId: "a", title: "本科成绩单", page: 5 },
  ]);
});

test("材料较多时目录会自动分页并继续修正页码", () => {
  const files = Array.from({ length: 19 }, (_, index) => ({
    id: `file-${index + 1}`,
    name: `材料-${index + 1}.pdf`,
    displayName: `材料 ${index + 1}`,
  }));
  const pages = files.map(file => ({ fileId: file.id }));
  const plan = createDirectoryPlan(pages, files, true);

  assert.equal(plan.directoryPageCount, 2);
  assert.equal(plan.totalPageCount, 21);
  assert.equal(plan.entries[0].page, 3);
  assert.equal(plan.entries[18].page, 21);
});
