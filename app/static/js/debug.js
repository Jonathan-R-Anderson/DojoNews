// Simple global debug logger
(() => {
  window.debugLog = function(source, ...args) {
    const time = new Date().toISOString();
    console.log(`[${time}] [${source}]`, ...args);
  };
})();
