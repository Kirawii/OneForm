import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = path => readFile(resolve(root, path), "utf8");

test("源码保持最初版结构并按职责拆分", async () => {
  const [html, css, js] = await Promise.all([
    read("index.html"),
    read("src/styles.css"),
    read("src/app.js"),
  ]);

  assert.match(html, /OneForm/);
  assert.match(html, /href="src\/styles\.css"/);
  assert.match(html, /src="src\/app\.js"/);
  assert.match(html, /id="nav"/);
  assert.match(html, /data-key="nameCn"/);
  assert.match(css, /border-radius:\s*17px/);
  assert.match(js, /function copyKey/);
  assert.match(js, /\['中文姓名',d=>d\.nameCn\]/);
  assert.match(js, /function initTableCopyButtons/);
  assert.match(js, /\.tablewrap td > \[data-key\]/);
  assert.match(js, /function rankStandard/);
  assert.match(js, /Math\.ceil\(r\/t\*100\)/);
  assert.doesNotMatch(js, /前10%/);
  assert.match(js, /localStorage\.setItem/);
  assert.match(js, /function exportData/);
});

test("公开模板没有预填个人资料", async () => {
  const html = await read("index.html");
  const inputTags = html.match(/<input\b[^>]*data-key="[^"]+"[^>]*>/g) ?? [];
  const textareas = [...html.matchAll(/<textarea\b[^>]*data-key="[^"]+"[^>]*>([\s\S]*?)<\/textarea>/g)];

  assert.ok(inputTags.length > 20);
  assert.equal((html.match(/data-key=/g) ?? []).length, 122);
  assert.equal((html.match(/<section/g) ?? []).length, 13);
  for (const tag of inputTags) {
    assert.doesNotMatch(tag, /\svalue="[^"]+"/);
  }
  for (const match of textareas) {
    assert.equal(match[1].trim(), "");
  }
});

test("公开文件不包含常见高风险个人标识", async () => {
  const paths = [
    "index.html",
    "src/styles.css",
    "src/app.js",
    "dist/oneform.html",
    "docs/index.html",
    "docs/guide.html",
    "docs/oneform.html",
    "USER_GUIDE.md",
    "PUBLISHING.md",
    "README.md",
    "CONTRIBUTING.md",
    "PRIVACY.md",
    "SECURITY.md",
  ];
  const text = (await Promise.all(paths.map(read))).join("\n");
  const highRiskPatterns = [
    /\b\d{17}[\dXx]\b/,
    /\b1[3-9]\d{9}\b/,
    /@[a-z0-9.-]+\.edu\.cn\b/i,
  ];

  for (const pattern of highRiskPatterns) {
    assert.doesNotMatch(text, pattern);
  }
});

test("单文件发行版已正确构建", async () => {
  const output = await read("dist/oneform.html");

  assert.doesNotMatch(output, /href="src\/styles\.css"/);
  assert.doesNotMatch(output, /src="src\/app\.js"/);
  assert.match(output, /<style>/);
  assert.match(output, /function copyAll/);
  assert.match(output, /data-key="nameCn"/);
});

test("材料工具已构建为可离线打开的单文件", async () => {
  const [source, output] = await Promise.all([
    read("materials.html"),
    read("dist/materials.html"),
  ]);

  assert.match(source, /id="pdf-tool"/);
  assert.match(source, /id="photo-tool"/);
  assert.doesNotMatch(output, /href="src\/material-tools\.css"/);
  assert.doesNotMatch(output, /src="src\/material-tools\.js"/);
  assert.match(output, /__ONEFORM_PDF_WORKER__/);
  assert.match(output, /合并并下载/);
  assert.match(output, /处理并下载/);
  assert.doesNotMatch(output, /https:\/\/cdnjs|https:\/\/unpkg|https:\/\/cdn\.jsdelivr/);
});

test("README 的本地配图完整可用", async () => {
  const [readme, preview, workflow] = await Promise.all([
    read("README.md"),
    read("docs/product-preview.svg"),
    read("docs/workflow.svg"),
  ]);

  assert.match(readme, /docs\/product-preview\.svg/);
  assert.match(readme, /docs\/workflow\.svg/);
  assert.match(preview, /<svg[\s\S]*OneForm 界面预览/);
  assert.match(workflow, /<svg[\s\S]*OneForm 工作流/);
});

test("GitHub Pages 官网提供在线使用和离线下载", async () => {
  const [home, guide, app, materials] = await Promise.all([
    read("docs/index.html"),
    read("docs/guide.html"),
    read("docs/oneform.html"),
    read("docs/materials.html"),
  ]);

  assert.match(home, /href="oneform\.html">在线使用/);
  assert.match(home, /href="oneform\.html" download>下载信息库/);
  assert.match(home, /href="materials\.html" download>下载材料工具/);
  assert.match(home, /href="guide\.html"/);
  assert.match(home, /href="materials\.html"/);
  assert.match(guide, /五分钟上手/);
  assert.match(app, /OneForm/);
  assert.match(materials, /PDF 合并/);
});
