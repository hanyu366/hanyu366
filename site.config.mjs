export const site = {
  name: '赖韦寒雨',
  role: 'AI 产品经理',
  origin: 'https://hanyu366.github.io',
  base: '/hanyu366/',
  repo: 'https://github.com/hanyu366/hanyu366',
  date: '2026-10-25',
};

// Only these approved Markdown documents may enter the publication pipeline.
export const pages = [
  { file: '00_作品集首页.md', slug: '', kind: 'home' },
  { file: '01_素材经营与生产协同平台.md', slug: 'production-platform', kind: 'company', label: '素材经营与生产协同平台', tag: 'B 端平台建设', image: 'platform-overview.png' },
  { file: '05_AI内容审核系统.md', slug: 'content-review', kind: 'company', label: 'AI 内容审核系统', tag: 'AI Workflow' },
  { file: '06_多模态AI素材诊断.md', slug: 'multimodal-diagnosis', kind: 'company', label: '多模态 AI 素材诊断', tag: '多模态 · 人机协同' },
  { file: '07_AI书单导入工作流.md', slug: 'book-import', kind: 'company', label: 'AI 书单导入工作流', tag: '数据与工作流' },
  { file: '09_信奥RAG引导式答疑.md', slug: 'rag-tutoring', kind: 'company', label: '信奥 RAG 引导式答疑', tag: 'RAG · 测评设计' },
  { file: '03_DormMate_AI.md', slug: 'dormmate', kind: 'personal', label: 'DormMate AI', tag: '产品原型 · AI 操作', image: 'dormmate-board.png' },
  { file: '02_Zotero论文预读助手.md', slug: 'zotero-preread', kind: 'personal', label: 'Zotero 论文预读助手', tag: '科研阅读工作流' },
  { file: '04_简历摘要.md', slug: 'resume', kind: 'resume', label: '个人简历' },
];
