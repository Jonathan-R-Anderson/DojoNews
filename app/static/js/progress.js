document.addEventListener('scroll', () => {
  const doc = document.documentElement;
  const scrollTop = doc.scrollTop;
  const scrollHeight = doc.scrollHeight - doc.clientHeight;
  const progress = scrollHeight ? (scrollTop / scrollHeight) * 100 : 0;
  const bar = document.getElementById('progress-bar');
  if (bar) {
    bar.style.width = progress + '%';
  }
});
