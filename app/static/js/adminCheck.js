(() => {
    const debug = (...args) => window.debugLog('adminCheck.js', ...args);
    debug('Loaded');
    function checkAdmin() {
        debug('Checking admin wallet');
        if (document.body.classList.contains('admin-wallet')) {
            debug('Admin wallet present');
            return true;
        }
        return false;
    }
    window.addEventListener('load', () => {
        const start = Date.now();
        const interval = setInterval(() => {
            if (checkAdmin()) {
                clearInterval(interval);
            } else if (Date.now() - start > 3000) {
                debug('Admin wallet not found, redirecting');
                clearInterval(interval);
                window.location.replace('/');
            }
        }, 100);
    });
})();
