// UI enhancements for modern layout
(function() {
  const MODULE = 'UIModule';
  document.addEventListener('DOMContentLoaded', () => {
    try {
      // Highlight active nav (fallback if server-side class missing)
      const path = window.location.pathname.replace(/\/$/, '') || '/';
      document.querySelectorAll('.bottom-nav a').forEach(a => {
        const href = a.getAttribute('href');
        if (href === '/' && path === '/') {
          a.classList.add('active');
        } else if (href !== '/' && path.startsWith(href)) {
          a.classList.add('active');
        }
      });
    } catch (e) {
      console.error('[UI] nav highlight failed', e);
    }
  });
})();
