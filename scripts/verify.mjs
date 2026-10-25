import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { marked } from 'marked';
import { pages, site } from '../site.config.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
const source = path.join(root, '..', 'portfolio-draft');
const manifest = JSON.parse(await readFile(path.join(out, 'source-manifest.json'), 'utf8'));
const normal = text => text.normalize('NFC').replace(/\s+/gu, '');
const plain = html => parseHTML(`<main>${html}</main>`).document.querySelector('main').textContent;
let checkedLinks = 0, checkedBlocks = 0, checkedOriginals = 0;
const cache = new Map();
async function getDocument(file) {
  if (!cache.has(file)) cache.set(file, parseHTML(await readFile(file, 'utf8')).document);
  return cache.get(file);
}
for (const page of pages) {
  const data = await readFile(path.join(root, 'content', page.file));
  const expectedHash = createHash('sha256').update(data).digest('hex');
  assert.equal(manifest.documents.find(item => item.file === page.file)?.sha256, expectedHash, `Source checksum: ${page.file}`);
  try {
    const original = await readFile(path.join(source, page.file));
    assert.ok(original.equals(data), `Published Markdown differs from local source: ${page.file}`);
    checkedOriginals++;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const htmlFile = path.join(out, page.slug, 'index.html');
  const document = await getDocument(htmlFile);
  assert.equal(document.documentElement.lang, 'zh-CN');
  assert.equal(document.querySelectorAll('h1').length, 1, `One page title: ${page.file}`);
  assert.ok(document.querySelector('meta[name="viewport"]'), 'Responsive viewport required');
  const actualText = normal(document.querySelector('main').textContent);
  const tokens = marked.lexer(data.toString('utf8').replace(/^\uFEFF/, ''));
  for (const token of tokens) {
    if (['paragraph', 'heading', 'blockquote', 'list', 'code'].includes(token.type)) {
      const expectedText = normal(plain(marked.parser([token])));
      assert.ok(actualText.includes(expectedText), `Missing or changed source block in ${page.file}: ${expectedText.slice(0, 95)}`);
      checkedBlocks++;
    } else if (token.type === 'table') {
      for (const cell of [...token.header, ...token.rows.flat()]) {
        const expectedText = normal(plain(marked.parseInline(cell.text)));
        assert.ok(actualText.includes(expectedText), `Missing table cell in ${page.file}: ${expectedText}`);
        checkedBlocks++;
      }
    }
  }
  for (const element of document.querySelectorAll('[href], [src]')) {
    const href = element.getAttribute('href') || element.getAttribute('src');
    if (!href || /^(?:https?:|mailto:|data:)/.test(href)) continue;
    let targetFile = htmlFile;
    let fragment = '';
    if (href.startsWith('#')) fragment = decodeURIComponent(href.slice(1));
    else {
      assert.ok(href.startsWith(site.base), `Unexpected relative URL: ${href}`);
      const parsed = new URL(href, site.origin);
      const target = path.join(out, decodeURIComponent(parsed.pathname.slice(site.base.length)));
      targetFile = (await stat(target)).isDirectory() ? path.join(target, 'index.html') : target;
      await stat(targetFile);
      fragment = decodeURIComponent(parsed.hash.slice(1));
    }
    if (fragment) assert.ok((await getDocument(targetFile)).getElementById(fragment), `Missing anchor: ${href}`);
    checkedLinks++;
  }
}
const allowedContent = new Set([...pages.map(page => page.file), 'assets', 'source-manifest.json']);
for (const file of await readdir(path.join(root, 'content'))) assert.ok(allowedContent.has(file), `Unapproved publication source: ${file}`);
const allowedOutput = new Set(['index.html', '404.html', '.nojekyll', 'sitemap.xml', 'source-manifest.json', 'assets', ...pages.filter(page => page.slug).map(page => page.slug)]);
for (const file of await readdir(out)) assert.ok(allowedOutput.has(file), `Unexpected publication output: ${file}`);
assert.ok(![...allowedContent].some(file => /^(?:08_|10_|11_|9[0-9]_)/.test(file)), 'Internal or empty columns must not be published');
console.log(`Verified ${pages.length} pages, ${checkedBlocks} Markdown blocks/table cells, ${checkedLinks} local links and anchors, ${checkedOriginals} exact local-source matches.`);
