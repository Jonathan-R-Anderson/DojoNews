const debug = (...args) => window.debugLog('postOverlay.js', ...args);
debug('Loaded');

(function () {
    debug('postOverlay init');
    const overlay = document.getElementById('post-overlay');
    const iframe = document.getElementById('post-iframe');
    const closeBtn = overlay.querySelector('.overlay-close');

    function openOverlay(url) {
        debug('openOverlay', url);
        iframe.src = url;
        overlay.classList.remove('hidden');
        requestAnimationFrame(() => overlay.classList.add('show'));
    }

    function closeOverlay() {
        debug('closeOverlay');
        overlay.classList.remove('show');
        iframe.src = '';
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }

    document.addEventListener('click', function (e) {
        const link = e.target.closest('a');
        if (!link || !link.href) return;
        const url = new URL(link.href, window.location.origin);
        debug('link click', url.pathname);
        if (url.pathname.startsWith('/post/')) {
            e.preventDefault();
            openOverlay(url.href);
        }
    });

    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
            debug('overlay background click');
            closeOverlay();
        }
    });

    closeBtn.addEventListener('click', closeOverlay);
})();
