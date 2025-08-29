(() => {
    const debug = (...args) => window.debugLog('postActivity.js', ...args);
    debug('Loaded');
    if (typeof postUrlID === 'undefined') return;
    let start = Date.now();
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
        fetch('/api/v1/postStats/activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postID: postUrlID, action, ...extra }),
        }).catch((e) => debug('Failed to send activity', e));
    }
    send('enter');
    window.addEventListener('beforeunload', () => {
        const timeSpent = Math.round((Date.now() - start) / 1000);
        send('leave', { timeSpent });
    });
})();
