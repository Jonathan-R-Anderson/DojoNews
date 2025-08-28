// Global debugging utilities
(function () {
    function debugLog(source, ...args) {
        const time = new Date().toISOString();
        console.debug(`[${time}] [${source}]`, ...args);
    }
    window.debugLog = debugLog;

    // Log all fetch requests and responses
    if (window.fetch) {
        const originalFetch = window.fetch;
        window.fetch = async function (...args) {
            debugLog('fetch', ...args);
            try {
                const response = await originalFetch.apply(this, args);
                debugLog('fetch:response', response);
                return response;
            } catch (err) {
                debugLog('fetch:error', err);
                throw err;
            }
        };
    }

    // Log event listener registrations and dispatches
    const origAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
        const wrapped = function (...evtArgs) {
            debugLog(`event:${type}`, this);
            return listener.apply(this, evtArgs);
        };
        debugLog('addEventListener', this, type);
        return origAddEventListener.call(this, type, wrapped, options);
    };

    // Log unhandled errors
    window.addEventListener('error', (e) => {
        debugLog('error', e.message, e.filename, e.lineno, e.colno);
    });
    window.addEventListener('unhandledrejection', (e) => {
        debugLog('unhandledrejection', e.reason);
    });
})();

