(() => {
  const menu = document.querySelector('.menu-toggle');
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    document.querySelector('#primary-nav')?.classList.toggle('is-open', open);
  });
  document.querySelectorAll('#primary-nav a').forEach(link => link.addEventListener('click', () => {
    menu?.setAttribute('aria-expanded', 'false');
    document.querySelector('#primary-nav')?.classList.remove('is-open');
  }));
  document.querySelector('.print-button')?.addEventListener('click', () => window.print());

  const dialog = document.querySelector('#image-dialog');
  let previousFocus;
  document.querySelectorAll('.image-zoom').forEach(button => button.addEventListener('click', () => {
    const image = button.querySelector('img');
    const large = image.cloneNode();
    large.removeAttribute('loading');
    dialog.querySelector('.dialog-image').replaceChildren(large);
    dialog.querySelector('.dialog-caption').textContent = image.alt;
    previousFocus = button;
    dialog.showModal();
    document.body.classList.add('dialog-open');
  }));
  const closeDialog = () => dialog?.close();
  dialog?.querySelector('.dialog-close').addEventListener('click', closeDialog);
  dialog?.addEventListener('click', event => { if (event.target === dialog) closeDialog(); });
  dialog?.addEventListener('close', () => { document.body.classList.remove('dialog-open'); previousFocus?.focus(); });

  const tocLinks = [...document.querySelectorAll('.article-toc nav a')];
  if ('IntersectionObserver' in window && tocLinks.length) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        const id = '#' + entry.target.id;
        tocLinks.forEach(link => {
          const active = link.getAttribute('href') === id;
          link.classList.toggle('active', active);
          if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
        });
      }
    }, { rootMargin: '-90px 0px -65% 0px' });
    document.querySelectorAll('.article-body > h2').forEach(heading => observer.observe(heading));
  }

  window.addEventListener('DOMContentLoaded', async () => {
    if (!window.mermaid || !document.querySelector('.mermaid')) return;
    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      themeVariables: {
        primaryColor: '#edf1ff', primaryTextColor: '#26314b', primaryBorderColor: '#8297dc',
        lineColor: '#8290a8', secondaryColor: '#f6f7fa', tertiaryColor: '#ffffff',
        background: '#ffffff', fontSize: '15px',
      },
      flowchart: { htmlLabels: false, useMaxWidth: true, curve: 'basis', nodeSpacing: 28, rankSpacing: 42 },
    });
    for (const node of document.querySelectorAll('.mermaid')) {
      try { await window.mermaid.run({ nodes: [node], suppressErrors: false }); }
      catch { node.classList.add('diagram-fallback'); }
    }
  });
})();
