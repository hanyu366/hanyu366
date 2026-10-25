# 网站维护

网页由 `content/` 中的 Markdown 构建，页面模板不另写一份项目正文。公开范围由 `site.config.mjs` 的九篇文档清单限定，仅同步文档实际引用的图片。

## 更新内容

先编辑本地讨论稿中的正式文档，再在本仓库执行：

```powershell
npm run update
```

默认从同级 `../portfolio-draft` 目录同步；目录不同时，可以指定来源：

```powershell
node scripts/sync-content.mjs <Markdown目录>
npm run build
npm run check
```

检查会核对 Markdown 校验和、原始正文与表格内容、图片和站内链接。本地讨论稿存在时，还会逐字比较九篇文档。`.gitattributes` 保留 Markdown 原始换行，确保 Windows 与部署环境的校验和一致。

## 本地预览

```powershell
npm ci
npm run build
npm run preview
```

预览地址为 `http://127.0.0.1:4173/hanyu366/`。本地专用的 `/__preview/mobile` 提供 390px 页面预览，不进入网站发布目录。

## 发布

将审核后的改动提交并推送到 `main`，GitHub Actions 自动安装锁定依赖、构建、检查并部署到 GitHub Pages。公开地址：

https://hanyu366.github.io/hanyu366/

`README.md` 同样由首页 Markdown 生成。空栏目、内部讨论稿、原始资料及 Word 文档不在同步清单内，也不进入仓库或网站。
