(async () => {
    if (typeof WebTorrent === "undefined") {
        await new Promise((resolve) => {
            const s = document.createElement("script");
            s.src = "https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js";
            s.onload = resolve;
            document.head.appendChild(s);
        });
    }
    if (typeof ethers === "undefined") {
        await new Promise((resolve) => {
            const s = document.createElement("script");
            s.src = "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js";
            s.onload = resolve;
            document.head.appendChild(s);
        });
    }
    const url = typeof window !== "undefined" ? window.rpcUrl : undefined;
    if (!url) {
        console.error("RPC URL is not defined");
        return;
    }
    const provider = new ethers.providers.JsonRpcProvider(url);
    const contract = new ethers.Contract(
        window.postContractAddress,
        window.postContractAbi,
        provider
    );
    const client = new WebTorrent();
    const images = document.querySelectorAll("[data-magnet-id]");
    for (const img of images) {
        const id = img.dataset.magnetId;
        try {
            const magnet = await contract.getImageMagnet(id);
            if (magnet) {
                client.add(magnet, (torrent) => {
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
