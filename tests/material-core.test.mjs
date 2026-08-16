import test from "node:test";
import assert from "node:assert/strict";
import { cropRect, formatBytes, moveItem, normalizeRotation } from "../src/material-core.mjs";

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
