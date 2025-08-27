(async () => {
    if (typeof WebTorrent === "undefined") {
        await new Promise((resolve) => {
            const s = document.createElement("script");
            s.src = "https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js";
            s.onload = resolve;
            document.head.appendChild(s);
        });
    }
    const client = new WebTorrent();
    const images = document.querySelectorAll("[data-magnet-id]");
    for (const img of images) {
        const id = img.dataset.magnetId;
        try {
            const res = await fetch(`/magnet/${id}`);
            const data = await res.json();
            if (data.magnet) {
                client.add(data.magnet, (torrent) => {
                    torrent.files[0].getBlob((err, blob) => {
                        if (!err) {
                            img.src = URL.createObjectURL(blob);
                        }
                    });
                });
            } else {
                console.warn("No magnet URI returned for", id);
            }
        } catch (e) {
            console.error("Failed to load magnet", id, e);
        }
    }
})();
