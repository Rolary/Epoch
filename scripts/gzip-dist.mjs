import { createGzip } from "node:zlib";
import { createReadStream, createWriteStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";

const distDir = process.argv[2] ?? "apps/web/dist";
const compressibleExtensions = new Set([
  ".html",
  ".css",
  ".js",
  ".json",
  ".svg",
  ".txt",
  ".wasm",
]);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else {
      yield fullPath;
    }
  }
}

function hasCompressibleExtension(filePath) {
  return [...compressibleExtensions].some((extension) => filePath.endsWith(extension));
}

let count = 0;
let sourceBytes = 0;
let gzipBytes = 0;

for await (const filePath of walk(distDir)) {
  if (filePath.endsWith(".gz") || !hasCompressibleExtension(filePath)) continue;
  const sourceStat = await stat(filePath);
  if (sourceStat.size < 1024) continue;
  const gzipPath = `${filePath}.gz`;
  await pipeline(createReadStream(filePath), createGzip({ level: 9 }), createWriteStream(gzipPath));
  const gzipStat = await stat(gzipPath);
  count += 1;
  sourceBytes += sourceStat.size;
  gzipBytes += gzipStat.size;
}

const saved = sourceBytes > 0 ? Math.round((1 - gzipBytes / sourceBytes) * 100) : 0;
console.log(`gzip: ${count} files, ${formatBytes(sourceBytes)} -> ${formatBytes(gzipBytes)} (${saved}% smaller)`);

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
