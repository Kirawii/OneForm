import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(root, "index.html");
const cssPath = resolve(root, "src/styles.css");
const jsPath = resolve(root, "src/app.js");
const outputPath = resolve(root, "dist/oneform.html");
const pagesOutputPath = resolve(root, "docs/oneform.html");
const materialsSourcePath = resolve(root, "materials.html");
const materialsCssPath = resolve(root, "src/material-tools.css");
const materialsJsPath = resolve(root, "src/material-tools.js");
const pdfWorkerPath = resolve(root, "node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs");
const materialsOutputPath = resolve(root, "dist/materials.html");
const pagesMaterialsOutputPath = resolve(root, "docs/materials.html");

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
  .replace(styleTag, () => `<style>\n${css}</style>`)
  .replace(scriptTag, () => `<script>\n${js}</script>`);

const [materialsHtml, materialsCss, pdfWorkerSource] = await Promise.all([
  readFile(materialsSourcePath, "utf8"),
  readFile(materialsCssPath, "utf8"),
  readFile(pdfWorkerPath, "utf8"),
]);
const materialsBuild = await build({
  entryPoints: [materialsJsPath],
  bundle: true,
  format: "iife",
  target: ["es2022"],
  minify: true,
  write: false,
  banner: { js: `globalThis.__ONEFORM_PDF_WORKER__=${JSON.stringify(pdfWorkerSource)};` },
});
const materialsStyleTag = '<link rel="stylesheet" href="src/material-tools.css">';
const materialsScriptTag = '<script src="src/material-tools.js"></script>';
if (!materialsHtml.includes(materialsStyleTag) || !materialsHtml.includes(materialsScriptTag)) {
  throw new Error("materials.html 缺少约定的样式或脚本入口");
}
const materialsBundled = materialsHtml
  .replace(materialsStyleTag, () => `<style>\n${materialsCss}</style>`)
  .replace(materialsScriptTag, () => `<script>\n${materialsBuild.outputFiles[0].text}</script>`);

await Promise.all([
  mkdir(dirname(outputPath), { recursive: true }),
  mkdir(dirname(pagesOutputPath), { recursive: true }),
  mkdir(dirname(materialsOutputPath), { recursive: true }),
]);
await Promise.all([
  writeFile(outputPath, bundled, "utf8"),
  writeFile(pagesOutputPath, bundled, "utf8"),
  writeFile(materialsOutputPath, materialsBundled, "utf8"),
  writeFile(pagesMaterialsOutputPath, materialsBundled, "utf8"),
]);

console.log(`Built ${outputPath}`);
console.log(`Built ${pagesOutputPath}`);
console.log(`Built ${materialsOutputPath}`);
console.log(`Built ${pagesMaterialsOutputPath}`);
