(function () {
    const overlay = document.getElementById('post-overlay');
    const iframe = document.getElementById('post-iframe');
    const closeBtn = overlay.querySelector('.overlay-close');

    function openOverlay(url) {
        iframe.src = url;
        overlay.classList.remove('hidden');
        requestAnimationFrame(() => overlay.classList.add('show'));
    }

    function closeOverlay() {
        overlay.classList.remove('show');
        iframe.src = '';
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }

    document.addEventListener('click', function (e) {
        const link = e.target.closest('a');
        if (!link || !link.href) return;
        const url = new URL(link.href, window.location.origin);
        if (url.pathname.startsWith('/post/')) {
            e.preventDefault();
            openOverlay(url.href);
        }
    });

    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
            closeOverlay();
        }
    });

    closeBtn.addEventListener('click', closeOverlay);
})();
