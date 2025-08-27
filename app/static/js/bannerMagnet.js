(async () => {
    const bannerInput = document.querySelector('input[name="postBanner"]');
    if (!bannerInput) return;

    // Create hidden input to hold magnet URI
    const magnetField = document.createElement('input');
    magnetField.type = 'hidden';
    magnetField.name = 'postBannerMagnet';
    bannerInput.insertAdjacentElement('afterend', magnetField);

    async function loadClient() {
        if (typeof WebTorrent === 'undefined') {
            await new Promise((resolve) => {
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js';
                s.onload = resolve;
                document.head.appendChild(s);
            });
        }
        return new WebTorrent();
    }

    const client = await loadClient();

    function seedFile(file) {
        return new Promise((resolve) => {
            client.seed(file, (torrent) => {
                const magnet = torrent.magnetURI;
                torrent.destroy();
                resolve(magnet);
            });
        });
    }

    const form = bannerInput.form;
    form.addEventListener('submit', async (e) => {
        if (!bannerInput.files.length || magnetField.value) {
            return;
        }
        e.preventDefault();
        const file = bannerInput.files[0];
        magnetField.value = await seedFile(file);
        form.submit();
    });
})();
