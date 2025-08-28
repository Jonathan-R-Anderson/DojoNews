(() => {
    const debug = (...args) => window.debugLog('magnet.js', ...args);
    debug('Loaded');

    let provider;
    let contract;
    let client;
    const mediaCache = {}; // cache loaded media object URLs by magnet

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
            if (mediaCache[magnet]) {
                debug('using cached media for', id);
                const cached = mediaCache[magnet];
                if (cached.type === 'application/pdf') {
                    const pdf = document.createElement('object');
                    pdf.data = cached.url;
                    pdf.type = 'application/pdf';
                    pdf.className = img.className;
                    pdf.style.width = '100%';
                    pdf.style.height = 'auto';
                    pdf.style.pointerEvents = 'none';
                    pdf.dataset.magnetId = img.dataset.magnetId;
                    pdf.dataset.magnetLoaded = 'true';

                    if (img.dataset.allowDownload === 'true') {
                        const link = document.createElement('a');
                        link.href = cached.url;
                        link.download = `${id}.pdf`;
                        link.textContent = 'Download PDF';
                        link.className = 'btn btn-sm btn-primary mt-2 block text-center';
                        pdf.insertAdjacentElement('afterend', link);
                    }

                    img.replaceWith(pdf);
                    const tile = pdf.closest('.post-tile');
                    if (tile && window.applyMasonry) {
                        window.applyMasonry(tile);
                    }
                } else {
                    setImage(cached.url);
                }
                return;
            }

            const handleTorrent = (torrent) => {
                const processTorrent = async () => {
                    try {
                        debug('torrent available', torrent.infoHash);
                        const file = torrent.files[0];
                        if (!file) {
                            debug('No files in torrent yet');
                            return;
                        }
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

                        if (blob.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                            debug('Detected PDF file for', id);
                            mediaCache[magnet] = { url: newUrl, type: 'application/pdf' };
                            const pdf = document.createElement('object');
                            pdf.data = newUrl;
                            pdf.type = 'application/pdf';
                            pdf.className = img.className;
                            pdf.style.width = '100%';
                            pdf.style.height = 'auto';
                            pdf.style.pointerEvents = 'none';
                            pdf.dataset.magnetId = img.dataset.magnetId;
                            pdf.dataset.magnetLoaded = 'true';

                            if (img.dataset.allowDownload === 'true') {
                                const link = document.createElement('a');
                                link.href = newUrl;
                                link.download = file.name || `${id}.pdf`;
                                link.textContent = 'Download PDF';
                                link.className = 'btn btn-sm btn-primary mt-2 block text-center';
                                pdf.insertAdjacentElement('afterend', link);
                            }

                            img.replaceWith(pdf);
                            const tile = pdf.closest('.post-tile');
                            if (tile && window.applyMasonry) {
                                window.applyMasonry(tile);
                            }
                        } else {
                            mediaCache[magnet] = { url: newUrl, type: blob.type };
                            setImage(newUrl);
                        }
                    } catch (err) {
                        debug("Failed to load magnet", id, err);
                    }
                };
                if (torrent.files && torrent.files.length) {
                    processTorrent();
                } else {
                    torrent.once('ready', processTorrent);
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

    async function fetchVideo(video) {
        debug('fetchVideo', video);
        if (!video || video.dataset.magnetLoaded) return;
        const id = video.dataset.videoId;
        if (!id) return;
        await initMagnetClient();
        try {
            const magnet = await contract.getVideoMagnet(id);
            debug('video magnet URI', magnet);
            if (!magnet) {
                debug('No magnet URI returned for', id);
                return;
            }
            const setVideo = (url) => {
                if (video.src && video.src.startsWith('blob:')) {
                    URL.revokeObjectURL(video.src);
                }
                video.src = url;
                video.dataset.magnetLoaded = 'true';
                video.classList.add('video-js');
                try {
                    if (typeof videojs !== 'undefined') {
                        videojs(video);
                    } else {
                        video.controls = true;
                    }
                } catch (err) {
                    debug('videojs init failed', err);
                }
                debug('video updated', id);
            };

            if (mediaCache[magnet]) {
                const cached = mediaCache[magnet];
                setVideo(cached.url);
                return;
            }

            const handleTorrent = (torrent) => {
                const processTorrent = async () => {
                    try {
                        debug('torrent available', torrent.infoHash);
                        const file = torrent.files[0];
                        if (!file) {
                            debug('No files in torrent yet');
                            return;
                        }
                        let blob;
                        if (typeof file.getBlob === 'function') {
                            blob = await new Promise((resolve, reject) => {
                                file.getBlob((err, b) => (err ? reject(err) : resolve(b)));
                            });
                        } else if (typeof file.blob === 'function') {
                            blob = await file.blob();
                        } else {
                            throw new Error('No blob method on torrent file');
                        }
                        const newUrl = URL.createObjectURL(blob);
                        mediaCache[magnet] = { url: newUrl, type: blob.type };
                        setVideo(newUrl);
                    } catch (err) {
                        debug('Failed to load magnet', id, err);
                    }
                };
                if (torrent.files && torrent.files.length) {
                    processTorrent();
                } else {
                    torrent.once('ready', processTorrent);
                }
            };

            const existing = client.get(magnet);
            if (existing) {
                handleTorrent(existing);
            } else {
                client.add(magnet, handleTorrent);
            }
        } catch (e) {
            debug('Failed to load magnet', id, e);
        }
    }

    async function loadMagnets() {
        debug('loadMagnets start');
        await initMagnetClient();
        const images = document.querySelectorAll("[data-magnet-id]");
        debug('found images', images.length);
        images.forEach(fetchMagnet);
        const videos = document.querySelectorAll('[data-video-id]');
        debug('found videos', videos.length);
        videos.forEach(fetchVideo);
    }

    function observeNewMedia() {
        const observer = new MutationObserver((mutations) => {
            debug('DOM mutations', mutations.length);
            for (const mutation of mutations) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType !== 1) return;
                    if (node.dataset && node.dataset.magnetId) {
                        debug('new image node', node.dataset.magnetId);
                        fetchMagnet(node);
                    } else if (node.dataset && node.dataset.videoId) {
                        debug('new video node', node.dataset.videoId);
                        fetchVideo(node);
                    }
                    node
                        .querySelectorAll?.('[data-magnet-id]')
                        .forEach((el) => fetchMagnet(el));
                    node
                        .querySelectorAll?.('[data-video-id]')
                        .forEach((el) => fetchVideo(el));
                });
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        debug('observer attached');
    }

    if (typeof window !== "undefined") {
        window.loadMagnets = loadMagnets;
        loadMagnets().then(observeNewMedia);
    }
})();
