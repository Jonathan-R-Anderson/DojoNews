(() => {
    const debug = (...args) => window.debugLog('postStats.js', ...args);
    async function loadStats(tile, postId) {
        try {
            const res = await fetch(`/api/v1/postStats?postID=${postId}`);
            if (!res.ok) return;
            const data = await res.json();
            const overlay = tile.querySelector('.tile-overlay');
            if (!overlay) return;
            const fields = [
                ['Read', `${data.estimatedReadTime} min`],
                ['Avg', `${data.avgTimeOnPage}s`],
                ['Total', data.totalReaders],
                ['Current', data.currentReaders],
            ];
            fields.forEach(([label, value]) => {
                const span = document.createElement('span');
                span.className = 'tile-meta';
                span.textContent = `${label}: ${value}`;
                overlay.appendChild(span);
            });
        } catch (e) {
            debug('Failed to load stats', e);
        }
    }
    window.applyPostStats = loadStats;
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.post-tile').forEach(tile => {
            const postId = tile.dataset.postId;
            if (postId) loadStats(tile, postId);
        });
    });
})();
