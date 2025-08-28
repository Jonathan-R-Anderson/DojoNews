const debug = (...args) => window.debugLog('searchBar.js', ...args);
debug('Loaded');

function searchBar() {
  const input = document.querySelector("#searchBarInput").value;
  debug('searchBar', input);
  if (input === "" || input.trim() === "") {
    debug('Empty search');
  } else {
    const url = `/search/${encodeURIComponent(
      escape(input.trim()),
    )}`;
    debug('Redirecting to', url);
    window.location.href = url;
  }
}
