const debug = (...args) => window.debugLog('torrentSeeder.js', ...args);
debug('Loaded');

(async () => {
    debug('torrentSeeder init');
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
    debug('Found torrent links', links.length);
    links.forEach((link) => {
        try {
            client.add(link.href, (torrent) => {
                debug('Seeding', torrent.infoHash);

                if (torrent.files && torrent.files.length > 0) {
                    // Create container to hold rendered content
                    const container = document.createElement('div');
                    link.parentNode.insertBefore(container, link);

                    torrent.files[0].appendTo(
                        container,
                        { autoplay: true, controls: true },
                        (err) => {
                            if (err) {
                                debug('Error rendering torrent', link.href, err);
                            }
                        }
                    );

                    // Remove placeholder link once content is rendered
                    link.remove();
                    debug('Rendered torrent content');
                }
            });
        } catch (err) {
            debug('Error adding torrent', link.href, err);
        }
    });
})();
