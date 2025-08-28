(() => {
  const debug = (...args) => window.debugLog('searchBar.js', ...args);
  debug('Loaded');

  window.searchBar = function () {
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
  };
})();
