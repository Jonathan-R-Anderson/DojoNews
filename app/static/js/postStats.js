(() => {
    const debug = (...args) => window.debugLog('postStats.js', ...args);
    async function fetchStats(tile, postId) {
        try {
            const res = await fetch(`/api/v1/postStats?postID=${postId}`);
            if (!res.ok) return;
            const data = await res.json();
            const overlay = tile.querySelector('.tile-overlay');
            if (!overlay) return;
            overlay.querySelectorAll('.tile-meta').forEach((span) => span.remove());
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
    function loadStats(tile, postId) {
        fetchStats(tile, postId);
        if (!tile.dataset.statsInterval) {
            const id = setInterval(() => fetchStats(tile, postId), 5000);
            tile.dataset.statsInterval = id;
        }
    }
    window.applyPostStats = loadStats;
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.post-tile').forEach((tile) => {
            const postId = tile.dataset.postId;
            if (postId) loadStats(tile, postId);
        });
    });
})();
