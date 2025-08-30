(() => {
    const debug = (...args) => window.debugLog('postActivity.js', ...args);
    debug('Loaded');
    if (typeof postUrlID === 'undefined') return;
    let start = Date.now();
    const sessionId = (self.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
    async function loadStats() {
        try {
            const res = await fetch(`/api/v1/postStats?postID=${postUrlID}`);
            if (!res.ok) return;
            const data = await res.json();
            const el = document.getElementById('reading-time');
            if (el && data.estimatedReadTime) el.textContent = data.estimatedReadTime;
        } catch (e) {
            debug('Failed to load stats', e);
        }
    }
    loadStats();
    function send(action, extra = {}) {
        const payload = JSON.stringify({ postID: postUrlID, action, sessionID: sessionId, ...extra });
        if (action === 'leave' && navigator.sendBeacon) {
            try {
                navigator.sendBeacon(
                    '/api/v1/postStats/activity',
                    new Blob([payload], { type: 'application/json' }),
                );
            } catch (e) {
                debug('Beacon failed', e);
            }
        } else {
            fetch('/api/v1/postStats/activity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload,
                keepalive: action === 'leave',
            }).catch((e) => debug('Failed to send activity', e));
        }
    }
    send('enter');
    const hb = setInterval(() => send('heartbeat'), 15000);
    window.addEventListener('beforeunload', () => {
        clearInterval(hb);
        const timeSpent = Math.round((Date.now() - start) / 1000);
        send('leave', { timeSpent });
    });
})();
