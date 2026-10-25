import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { Marked } from 'marked';
import { pages, site } from '../site.config.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const content = path.join(root, 'content');
const out = path.join(root, 'dist');
const base = process.env.SITE_BASE || site.base;
const styleVersion = createHash('sha256').update(await readFile(path.join(root, 'web/site.css'))).digest('hex').slice(0, 12);
if (!/^\/(?:[a-z0-9-]+\/)*$/i.test(base)) throw new Error('Invalid site base');
const route = page => base + (page.slug ? page.slug + '/' : '');
const escape = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const bare = text => text.replace(/<[^>]*>/g, '').replace(/[*`]/g, '');
const markdownByFile = new Map();
const manifest = JSON.parse(await readFile(path.join(content, 'source-manifest.json'), 'utf8'));
for (const page of pages) {
  const data = await readFile(path.join(content, page.file));
  const sha = createHash('sha256').update(data).digest('hex');
  if (manifest.documents.find(doc => doc.file === page.file)?.sha256 !== sha) throw new Error(`Source manifest mismatch: ${page.file}`);
  markdownByFile.set(page.file, data.toString('utf8').replace(/^\uFEFF/, ''));
}

function resolveLink(href = '') {
  if (/^(?:https?:|mailto:|tel:|#)/i.test(href)) return href;
  const [file, hash] = decodeURI(href).split('#');
  if (file.startsWith('assets/')) return base + file;
  const page = pages.find(item => item.file === file);
  if (!page) throw new Error(`Link points outside approved publication: ${href}`);
  return route(page) + (hash ? '#' + hash : '');
}

function makeRenderer() {
  const headings = [];
  const used = new Map();
  const marked = new Marked({ gfm: true, breaks: false });
  marked.use({ renderer: {
    heading({ tokens, depth }) {
      const html = this.parser.parseInline(tokens);
      const text = bare(html);
      let id = text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-');
      const count = used.get(id) || 0;
      used.set(id, count + 1);
      if (count) id += '-' + count;
      headings.push({ depth, id, text });
      return `<h${depth} id="${escape(id)}">${html}</h${depth}>\n`;
    },
    link({ href, title, tokens }) {
      const external = /^https?:/i.test(href);
      return `<a href="${escape(resolveLink(href))}"${title ? ` title="${escape(title)}"` : ''}${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${this.parser.parseInline(tokens)}</a>`;
    },
    image({ href, text }) {
      return `<figure class="article-figure"><button class="image-zoom" type="button" aria-label="放大图片：${escape(text)}"><img src="${escape(resolveLink(href))}" alt="${escape(text)}" loading="lazy" decoding="async"><span class="zoom-hint" aria-hidden="true">查看大图 ↗</span></button><figcaption>${escape(text)}</figcaption></figure>`;
    },
    code({ text, lang }) {
      if (lang === 'mermaid') return `<figure class="diagram"><pre class="mermaid">${escape(text)}</pre></figure>\n`;
      return `<pre class="code-block"><code${lang ? ` class="language-${escape(lang)}"` : ''}>${escape(text)}</code></pre>\n`;
    },
    table(token) {
      const head = token.header.map(cell => `<th scope="col">${this.parser.parseInline(cell.tokens)}</th>`).join('');
      const rows = token.rows.map(row => `<tr>${row.map(cell => `<td>${this.parser.parseInline(cell.tokens)}</td>`).join('')}</tr>`).join('');
      return `<div class="table-scroll" tabindex="0" role="region" aria-label="表格，可横向滚动"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
    },
  } });
  return { marked, headings };
}

function nav(current) {
  return `<header class="site-header"><div class="header-inner"><a class="brand" href="${base}" aria-label="${site.name}，作品集首页"><span>${site.name}</span></a><button class="menu-toggle" aria-expanded="false" aria-controls="primary-nav" type="button"><span>导航</span><span aria-hidden="true">☰</span></button><nav id="primary-nav" aria-label="主导航"><a href="${base}#company-projects"${current === 'company' || current === 'home' ? ' class="active"' : ''}>公司项目</a><a href="${base}#personal-projects"${current === 'personal' ? ' class="active"' : ''}>个人项目</a><a href="${base}resume/"${current === 'resume' ? ' class="active" aria-current="page"' : ''}>个人简历 <span aria-hidden="true">↗</span></a></nav></div></header>`;
}

function shell(page, title, description, main, { diagrams = false } = {}) {
  const canonical = site.origin + route(page);
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><meta name="theme-color" content="#fafaf9"><title>${escape(title)}${page.kind === 'home' ? '' : ` · ${site.name}`}</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="${canonical}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="website"><meta property="og:locale" content="zh_CN"><meta property="og:url" content="${canonical}"><link rel="icon" type="image/svg+xml" href="${base}assets/favicon.svg"><link rel="stylesheet" href="${base}assets/site.css?v=${styleVersion}"><script src="${base}assets/site.js" defer></script>${diagrams ? `<script src="${base}assets/mermaid.min.js" defer></script>` : ''}</head>
<body class="${page.kind === 'home' ? 'home-page' : 'detail-page'}"><a class="skip-link" href="#main">跳至正文</a>${nav(page.kind)}${main}<footer class="site-footer"><div><a href="${base}">${site.name}</a><span>AI 产品经理作品集</span></div><a href="#top" class="back-top">返回顶部 ↑</a></footer><dialog id="image-dialog" aria-label="图片大图"><button class="dialog-close" type="button" aria-label="关闭大图">关闭 ×</button><div class="dialog-image"></div><p class="dialog-caption"></p></dialog></body></html>`;
}

function getHomeRecords(tokens) {
  const groups = { company: [], personal: [] };
  let group = null;
  let record = null;
  for (const token of tokens) {
    if (token.type === 'heading' && token.depth === 2) {
      group = token.text === '公司项目' ? 'company' : token.text === '个人项目' ? 'personal' : null;
      record = null;
    } else if (group && token.type === 'heading' && token.depth === 3) {
      const page = pages.find(item => item.kind === group && token.text.startsWith(item.label));
      if (!page) throw new Error(`Unknown home project: ${token.text}`);
      record = { title: token.text, page, tokens: [] };
      groups[group].push(record);
    } else if (record && token.type !== 'space') record.tokens.push(token);
  }
  return groups;
}

function renderCard(record, index, style = '') {
  const { marked } = makeRenderer();
  const tokens = [...record.tokens];
  const meta = tokens[0]?.type === 'paragraph' && tokens[0].raw.startsWith('**') ? tokens.shift() : null;
  const last = tokens.at(-1);
  const links = last?.type === 'paragraph' && last.tokens.some(token => token.type === 'link') ? tokens.pop() : null;
  const body = marked.parser(tokens);
  const image = record.page.image && style.includes('featured') ? `<div class="project-image"><img src="${base}assets/${record.page.image}" alt="${escape(record.page.image === 'platform-overview.png' ? '业务信息分散及其影响，脱敏重绘示意图' : 'DormMate 比赛原型：成员状态与今日任务看板')}" loading="lazy"></div>` : '';
  return `<article class="project-card ${style}"><div class="project-content"><div class="card-top"><span class="project-number">${String(index).padStart(2, '0')}</span><span class="project-tag">${escape(record.page.tag)}</span><span class="card-arrow" aria-hidden="true">↗</span></div><h3><a href="${route(record.page)}">${escape(record.title)}</a></h3>${meta ? `<div class="project-meta">${marked.parser([meta])}</div>` : ''}<div class="project-description">${body}</div>${links ? `<div class="card-links">${marked.parser([links])}</div>` : ''}</div>${image}</article>`;
}

function renderHome(page, markdown) {
  const { marked } = makeRenderer();
  const tokens = marked.lexer(markdown);
  const identity = tokens.find(token => token.type === 'heading' && token.depth === 1).text;
  const introTokens = tokens.slice(1, tokens.findIndex(token => token.type === 'heading' && token.depth === 2)).filter(token => token.type === 'paragraph');
  const subtitle = introTokens.find(token => token.raw.startsWith('**'));
  const intro = introTokens.find(token => !token.raw.startsWith('**') && !token.raw.startsWith('['));
  const groups = getHomeRecords(tokens);
  const main = `<main id="main"><div id="top"></div>
<section class="hero page-width"><div class="hero-copy">
<h1>${escape(identity)}</h1>
<div class="hero-subtitle">${marked.parser([subtitle])}</div>
<div class="hero-intro">${marked.parser([intro])}</div>
<div class="hero-actions"><a class="button button-primary" href="#company-projects">浏览项目 <span aria-hidden="true">↓</span></a><a class="text-link" href="${base}resume/">个人简历 <span aria-hidden="true">↗</span></a></div>
</div></section>
<section id="company-projects" class="project-section page-width">
<div class="section-heading"><h2>公司项目<span class="section-count">05</span></h2></div>
${renderCard(groups.company[0], 1, 'featured platform-card')}
<div class="company-grid">${groups.company.slice(1).map((record, index) => renderCard(record, index + 2)).join('')}</div>
</section>
<section id="personal-projects" class="project-section personal-section page-width">
<div class="section-heading"><h2>个人项目<span class="section-count">02</span></h2></div>
${renderCard(groups.personal[0], 6, 'featured dormmate-card')}
${renderCard(groups.personal[1], 7, 'compact-card')}
</section></main>`;
  return shell(page, identity + '｜' + site.role, bare(intro.text), main);
}

function renderArticle(page, markdown) {
  const { marked, headings } = makeRenderer();
  const tokens = marked.lexer(markdown).filter(token => token.type !== 'space');
  const title = tokens.shift().text;
  const metaIndex = tokens.findIndex(token => token.type === 'paragraph' && /^\*\*[^\n]+\*\*\s*$/.test(token.raw));
  const meta = tokens[metaIndex];
  const subtitle = metaIndex === 1 && tokens[0].type === 'heading' ? tokens[0] : null;
  tokens.splice(metaIndex, 1);
  if (subtitle) tokens.shift();
  const introTokens = [];
  while (tokens[0] && tokens[0].type !== 'heading') introTokens.push(tokens.shift());
  const introHtml = marked.parser(introTokens);
  const body = marked.parser(tokens);
  const category = page.kind === 'company' ? '公司项目' : page.kind === 'personal' ? '个人项目' : '个人简历';
  const toc = headings.filter(heading => heading.depth === 2).map(heading => `<a href="#${escape(heading.id)}">${escape(heading.text)}</a>`).join('');
  const related = page.kind === 'resume' ? pages.filter(item => item.kind === 'company').slice(0, 3) : pages.filter(item => item.kind === page.kind && item !== page).slice(0, 2);
  const main = `<main id="main"><div id="top"></div><header class="article-header page-width"><div class="breadcrumb"><a href="${base}">作品集</a><span>/</span><span>${category}</span></div><div class="article-label"><span class="small-dot"></span>${page.tag || '个人简历'}</div><h1>${escape(title)}</h1>${subtitle ? `<p class="article-subtitle">${escape(subtitle.text)}</p>` : ''}<div class="article-meta">${meta ? marked.parser([meta]) : ''}</div>${introHtml ? `<div class="article-intro prose">${introHtml}</div>` : ''}${page.kind === 'resume' ? '<button class="print-button" type="button">打印 / 保存 PDF <span aria-hidden="true">↗</span></button>' : ''}</header><div class="article-layout page-width"><aside class="article-toc" aria-label="本文目录"><div class="toc-heading">本文目录<span aria-hidden="true">↘</span></div><nav>${toc}</nav><a class="toc-return" href="${base}">← 返回作品集</a></aside><article class="article-body prose">${body}<section class="related-projects" aria-label="继续阅读"><p class="eyebrow">继续阅读</p>${related.map(item => `<a href="${route(item)}"><span>${escape(item.label)}</span><span aria-hidden="true">↗</span></a>`).join('')}</section></article></div></main>`;
  return shell(page, title, bare(introTokens.map(token => token.text || '').join(' ')).slice(0, 200), main, { diagrams: /```mermaid/.test(markdown) });
}

await mkdir(path.join(out, 'assets'), { recursive: true });
await cp(path.join(content, 'assets'), path.join(out, 'assets'), { recursive: true });
await cp(path.join(root, 'web'), path.join(out, 'assets'), { recursive: true });
await cp(path.join(root, 'node_modules/mermaid/dist/mermaid.min.js'), path.join(out, 'assets/mermaid.min.js'));
for (const page of pages) {
  const directory = path.join(out, page.slug);
  await mkdir(directory, { recursive: true });
  const markdown = markdownByFile.get(page.file);
  await writeFile(path.join(directory, 'index.html'), page.kind === 'home' ? renderHome(page, markdown) : renderArticle(page, markdown));
}
await writeFile(path.join(out, 'source-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(path.join(out, '.nojekyll'), '');
await writeFile(path.join(out, '404.html'), shell({ kind: 'error', slug: '404' }, '页面未找到', '返回作品集继续浏览项目。', `<main id="main" class="not-found page-width"><div id="top"></div><p class="eyebrow">404</p><h1>这页暂时没有内容</h1><a class="button button-primary" href="${base}">返回作品集 →</a></main>`));
await writeFile(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(page => `<url><loc>${site.origin + route(page)}</loc></url>`).join('')}</urlset>`);
const readme = markdownByFile.get(pages[0].file).replace(/\]\(([^\s)]+\.md)(#[^)]*)?\)/g, (_, file, hash = '') => `](${site.origin + resolveLink(file + hash)})`);
const readmeLines = readme.split('\n');
readmeLines.splice(4, 0, `[浏览网页作品集 →](${site.origin + base})`, '');
await writeFile(path.join(root, 'README.md'), readmeLines.join('\n').trimEnd() + '\n');
console.log(`Built ${pages.length} pages from approved Markdown sources at ${base}`);
