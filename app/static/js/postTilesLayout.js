(() => {
    const grid = document.querySelector('.post-tiles-grid');
    if (!grid) return;

    const gap = () => parseFloat(getComputedStyle(grid).gap) || 0;
    const autoRow = () => parseFloat(getComputedStyle(grid).gridAutoRows);

    function setColSpan(el) {
        const w = Math.max(1, Math.min(3, parseInt(el.dataset.w || '1', 10)));
        el.style.setProperty('--col-span', w);
    }

    function setRowSpan(el) {
        const media = el.querySelector('.media');
        let total = 0;
        if (media) total += media.getBoundingClientRect().height;
        const span = Math.max(1, Math.ceil((total + gap()) / (autoRow() + gap())));
        el.style.setProperty('--row-span', span);
    }

    function apply(el) {
        setColSpan(el);
        setRowSpan(el);
        const img = el.querySelector('.media');
        if (img && !img.dataset.masonryBound) {
            img.dataset.masonryBound = 'true';
            if (img.complete) {
                setRowSpan(el);
            } else {
                img.addEventListener('load', () => setRowSpan(el), { once: true });
                img.addEventListener('error', () => setRowSpan(el), { once: true });
            }
        }
    }

    function applyAll() {
        grid.querySelectorAll('.post-tile').forEach(apply);
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(applyAll, 100);
    });

    document.addEventListener('DOMContentLoaded', applyAll);

    window.applyMasonry = apply;
})();

