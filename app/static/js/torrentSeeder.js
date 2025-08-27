(async () => {
    if (typeof WebTorrent === 'undefined') {
        await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }

    const client = new WebTorrent();
    window.torrentClient = client; // keep reference
    const links = document.querySelectorAll('a[href$=".torrent"]');
    links.forEach((link) => {
        try {
            client.add(link.href, (torrent) => {
                console.log('Seeding', torrent.infoHash);
            });
        } catch (err) {
            console.error('Error adding torrent', link.href, err);
        }
    });
})();
