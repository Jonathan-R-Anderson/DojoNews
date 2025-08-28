(() => {
    const debug = (...args) => window.debugLog('magnet.js', ...args);
    debug('Loaded');

    let provider;
    let contract;
    let client;
    const imageCache = {}; // cache loaded image object URLs by magnet

    async function initMagnetClient() {
        debug('initMagnetClient start');
        if (client) return;
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
            debug("RPC URL is not defined");
            return;
        }
        provider = new ethers.providers.JsonRpcProvider(url);
        contract = new ethers.Contract(
            window.postContractAddress,
            window.postContractAbi,
            provider
        );
        client = new WebTorrent();
        debug('initMagnetClient complete');
    }

    async function fetchMagnet(img) {
        debug('fetchMagnet', img);
        if (!img || img.dataset.magnetLoaded) return;
        const id = img.dataset.magnetId;
        if (!id) return;
        await initMagnetClient();
        try {
            const magnet = await contract.getImageMagnet(id);
            debug('magnet URI', magnet);
            if (!magnet) {
                debug("No magnet URI returned for", id);
                return;
            }

            // helper to set image src and cache it
            const setImage = (url) => {
                if (img.src && img.src.startsWith("blob:")) {
                    URL.revokeObjectURL(img.src);
                }
                img.src = url;
                img.dataset.magnetLoaded = "true";
                debug('image updated', id);
            };

            // if we've already loaded this magnet, reuse the cached object URL
            if (imageCache[magnet]) {
                debug('using cached image for', id);
                setImage(imageCache[magnet]);
                return;
            }

            const handleTorrent = async (torrent) => {
                try {
                    debug('torrent available', torrent.infoHash);
                    const file = torrent.files[0];
                    let blob;
                    if (typeof file.getBlob === "function") {
                        blob = await new Promise((resolve, reject) => {
                            file.getBlob((err, b) => (err ? reject(err) : resolve(b)));
                        });
                    } else if (typeof file.blob === "function") {
                        blob = await file.blob();
                    } else {
                        throw new Error("No blob method on torrent file");
                    }
                    const newUrl = URL.createObjectURL(blob);
                    imageCache[magnet] = newUrl;
                    setImage(newUrl);
                } catch (err) {
                    debug("Failed to load magnet", id, err);
                }
            };

            // avoid duplicate torrent additions
            const existing = client.get(magnet);
            if (existing) {
                handleTorrent(existing);
            } else {
                client.add(magnet, handleTorrent);
            }
        } catch (e) {
            debug("Failed to load magnet", id, e);
        }
    }

    async function loadMagnets() {
        debug('loadMagnets start');
        await initMagnetClient();
        const images = document.querySelectorAll("[data-magnet-id]");
        debug('found images', images.length);
        images.forEach(fetchMagnet);
    }

    function observeNewImages() {
        const observer = new MutationObserver((mutations) => {
            debug('DOM mutations', mutations.length);
            for (const mutation of mutations) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType !== 1) return;
                    if (node.dataset && node.dataset.magnetId) {
                        debug('new image node', node.dataset.magnetId);
                        fetchMagnet(node);
                    }
                    node
                        .querySelectorAll?.("[data-magnet-id]")
                        .forEach((el) => fetchMagnet(el));
                });
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        debug('observer attached');
    }

    if (typeof window !== "undefined") {
        window.loadMagnets = loadMagnets;
        loadMagnets().then(observeNewImages);
    }
})();
