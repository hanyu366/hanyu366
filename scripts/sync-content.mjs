import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pages } from '../site.config.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(process.argv[2] || path.join(root, '..', 'portfolio-draft'));
const target = path.join(root, 'content');
const assets = new Set();
const records = [];
await mkdir(target, { recursive: true });
await mkdir(path.join(target, 'assets'), { recursive: true });
for (const page of pages) {
  const data = await readFile(path.join(source, page.file));
  await writeFile(path.join(target, page.file), data);
  records.push({ file: page.file, sha256: createHash('sha256').update(data).digest('hex') });
  for (const match of data.toString('utf8').matchAll(/!\[[^\]]*\]\((assets\/[^\s)]+)\)/g)) {
    assets.add(match[1]);
  }
}
for (const file of assets) {
  if (!/^assets\/[a-z0-9-]+\.png$/.test(file)) throw new Error(`Unexpected image path: ${file}`);
  await copyFile(path.join(source, file), path.join(target, file));
}
const expected = new Set([...pages.map(page => page.file), 'assets', 'source-manifest.json']);
for (const entry of await readdir(target)) {
  if (!expected.has(entry)) throw new Error(`Unapproved content file: ${entry}`);
}
for (const entry of await readdir(path.join(target, 'assets'))) {
  if (!assets.has(`assets/${entry}`)) throw new Error(`Unreferenced image: ${entry}`);
}
await writeFile(path.join(target, 'source-manifest.json'), JSON.stringify({ documents: records, assets: [...assets].sort() }, null, 2) + '\n');
console.log(`Synced ${records.length} approved Markdown documents and ${assets.size} referenced images.`);
