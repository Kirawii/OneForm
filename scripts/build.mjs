import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(root, "index.html");
const cssPath = resolve(root, "src/styles.css");
const jsPath = resolve(root, "src/app.js");
const outputPath = resolve(root, "dist/oneform.html");
const pagesOutputPath = resolve(root, "docs/oneform.html");

const [html, css, js] = await Promise.all([
  readFile(sourcePath, "utf8"),
  readFile(cssPath, "utf8"),
  readFile(jsPath, "utf8"),
]);

const styleTag = '<link rel="stylesheet" href="src/styles.css">';
const scriptTag = '<script src="src/app.js"></script>';

if (!html.includes(styleTag) || !html.includes(scriptTag)) {
  throw new Error("index.html 缺少约定的样式或脚本入口");
}

const bundled = html
  .replace(styleTag, `<style>\n${css}</style>`)
  .replace(scriptTag, `<script>\n${js}</script>`);

await Promise.all([
  mkdir(dirname(outputPath), { recursive: true }),
  mkdir(dirname(pagesOutputPath), { recursive: true }),
]);
await Promise.all([
  writeFile(outputPath, bundled, "utf8"),
  writeFile(pagesOutputPath, bundled, "utf8"),
]);

console.log(`Built ${outputPath}`);
console.log(`Built ${pagesOutputPath}`);
