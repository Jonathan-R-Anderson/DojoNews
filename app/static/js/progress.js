const debug = (...args) => window.debugLog('progress.js', ...args);
debug('Loaded');

document.addEventListener('scroll', () => {
  const doc = document.documentElement;
  const scrollTop = doc.scrollTop;
  const scrollHeight = doc.scrollHeight - doc.clientHeight;
  const progress = scrollHeight ? (scrollTop / scrollHeight) * 100 : 0;
  debug('scroll', { scrollTop, progress });
  const bar = document.getElementById('progress-bar');
  if (bar) {
    bar.style.width = progress + '%';
  }
});
