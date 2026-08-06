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
  const [home, guide, app] = await Promise.all([
    read("docs/index.html"),
    read("docs/guide.html"),
    read("docs/oneform.html"),
  ]);

  assert.match(home, /href="oneform\.html">在线使用/);
  assert.match(home, /href="oneform\.html" download>下载离线版/);
  assert.match(home, /href="guide\.html"/);
  assert.match(guide, /五分钟上手/);
  assert.match(app, /OneForm/);
});
