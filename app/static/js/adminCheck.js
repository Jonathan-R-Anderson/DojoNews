(() => {
    const debug = (...args) => window.debugLog('adminCheck.js', ...args);
    debug('Loaded');

    (function() {
    debug('Checking admin wallet');
    if (!document.body.classList.contains('admin-wallet')) {
        debug('Admin wallet not found, redirecting');
        window.location.replace('/');
    } else {
        debug('Admin wallet present');
    }
    })();
})();
