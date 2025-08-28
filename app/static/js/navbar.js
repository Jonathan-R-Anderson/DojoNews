const debug = (...args) => window.debugLog('navbar.js', ...args);
debug('Loaded');

function search() {
  const input = document.querySelector("#searchInput").value;
  debug('search', input);
  if (input === "" || input.trim() === "") {
    debug('Empty search submitted');
  } else {
    const url = `/search/${encodeURIComponent(
      escape(input.trim()),
    )}`;
    debug('Redirecting to', url);
    window.location.href = url;
  }
}
