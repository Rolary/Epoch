import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";

const root = process.cwd();
const utf8 = new TextDecoder("utf-8", { fatal: true });

const ignoredDirs = new Set([
  ".git",
  ".idea",
  ".vite",
  "dist",
  "hatch-pet-runs",
  "node_modules",
  "tmp",
]);

const ignoredFiles = new Set(["pnpm-lock.yaml"]);
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".ps1",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

const mojibakeTokens = [
  "\u951B",
  "\u9286",
  "\u9422",
  "\u7ED7",
  "\u9353",
  "\u6FC2",
  "\u6D5C",
  "\u6D93",
  "\u93C2",
  "\uE0C7",
  "\uE18C",
  "\uE06C",
  "\u00C3",
  "\u00C2",
  "\u00E2\u20AC",
  "\uFFFD",
];

async function collectFiles(dir, files = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        await collectFiles(path.join(dir, entry.name), files);
      }
      continue;
    }

    if (ignoredFiles.has(entry.name)) continue;
    if (textExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

const failures = [];

for (const file of await collectFiles(root)) {
  const bytes = await readFile(file);
  const relative = path.relative(root, file);

  let text;
  try {
    text = utf8.decode(bytes);
  } catch {
    failures.push(`${relative}: not valid UTF-8`);
    continue;
  }

  const hit = mojibakeTokens.find((token) => text.includes(token));
  if (hit) {
    failures.push(`${relative}: possible mojibake token "${hit}"`);
  }
}

if (failures.length > 0) {
  console.error("Text encoding check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Text encoding check passed.");
