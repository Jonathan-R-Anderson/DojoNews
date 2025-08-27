document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;

  // Theme handling
  const initialTheme = root.getAttribute('data-theme');
  const storedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  let theme = storedTheme || initialTheme || (prefersDark ? 'dark' : 'light');

  // If the server provided a different theme, sync it to localStorage
  if (initialTheme && initialTheme !== storedTheme) {
    theme = initialTheme;
    localStorage.setItem('theme', theme);
  }

  root.setAttribute('data-theme', theme);

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = root.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  }

  // Font size controls
  let fontSize = parseInt(localStorage.getItem('fontSize'));
  if (!fontSize) {
    fontSize = parseInt(getComputedStyle(root).fontSize) / 16 * 100;
  }
  const applySize = () => {
    root.style.fontSize = fontSize + '%';
    localStorage.setItem('fontSize', fontSize);
  };
  applySize();

  const incBtn = document.getElementById('font-inc');
  const decBtn = document.getElementById('font-dec');
  if (incBtn) {
    incBtn.addEventListener('click', () => {
      fontSize = Math.min(fontSize + 10, 300);
      applySize();
    });
  }
  if (decBtn) {
    decBtn.addEventListener('click', () => {
      fontSize = Math.max(fontSize - 10, 50);
      applySize();
    });
  }

  // Text-to-speech
  const listenBtn = document.getElementById('listen-btn');
  if (listenBtn) {
    const audioUrl = listenBtn.dataset.audio;
    const audio = new Audio(audioUrl);
    listenBtn.addEventListener('click', () => {
      audio.play();
    });
  }
});
