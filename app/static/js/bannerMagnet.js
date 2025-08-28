(() => {
    const debug = (...args) => window.debugLog('bannerMagnet.js', ...args);
    debug('Loaded');
    debug('Initializing banner magnet handling');
    const bannerInput = document.querySelector('input[name="postBanner"]');
    if (!bannerInput) {
        debug('No banner input found');
        return;
    }

    // Hidden field to store returned magnet URI
    const magnetField = document.createElement('input');
    magnetField.type = 'hidden';
    magnetField.name = 'postBannerMagnet';
    bannerInput.insertAdjacentElement('afterend', magnetField);

    let magnetDisplay = null;
    let cancelButton = null;

    const form = bannerInput.form;
    form.addEventListener('submit', async (e) => {
        debug('Form submit triggered', {
            hasFile: bannerInput.files.length,
            existingMagnet: magnetField.value
        });
        if (!bannerInput.files.length || magnetField.value) {
            debug('No file to seed or magnet already exists');
            return;
        }
        e.preventDefault();
        const file = bannerInput.files[0];
        debug('Seeding file', file.name);
        if (typeof WebTorrent === 'undefined') {
            await new Promise((resolve) => {
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js';
                s.onload = resolve;
                document.head.appendChild(s);
            });
        }
        try {
            const client = new WebTorrent();
            client.seed(file, async (torrent) => {
                magnetField.value = torrent.magnetURI || '';
                debug('Seeded torrent', magnetField.value);

                // If editing an existing post, update magnet on-chain
                if (window.location.pathname.includes('/editpost/')) {
                    const postId = window.location.pathname.split('/').pop();
                    debug('Editing post', postId);
                    if (typeof ethers === 'undefined') {
                        await new Promise((resolve) => {
                            const s = document.createElement('script');
                            s.src = 'https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js';
                            s.onload = resolve;
                            document.head.appendChild(s);
                        });
                    }
                    await window.ethereum.request({ method: 'eth_requestAccounts' });
                    const provider = new ethers.providers.Web3Provider(window.ethereum);
                    const signer = provider.getSigner();
                    const contract = new ethers.Contract(postContractAddress, postContractAbi, signer);
                    try {
                        const tx = await contract.setImageMagnet(`${postId}.png`, magnetField.value);
                        await tx.wait();
                        debug('Magnet updated on-chain');
                    } catch (chainErr) {
                        debug('Failed to set magnet on-chain', chainErr);
                    }
                }

                // Show magnet
                magnetDisplay = document.createElement('input');
                magnetDisplay.type = 'text';
                magnetDisplay.readOnly = true;
                magnetDisplay.value = magnetField.value;
                magnetDisplay.className = 'input input-bordered w-full mt-2';
                magnetField.insertAdjacentElement('afterend', magnetDisplay);

                cancelButton = document.createElement('button');
                cancelButton.type = 'button';
                cancelButton.textContent = '-';
                cancelButton.className = 'btn btn-sm btn-error mt-2';
                magnetDisplay.insertAdjacentElement('afterend', cancelButton);

                cancelButton.addEventListener('click', async () => {
                    debug('Banner image cancelled');
                    bannerInput.value = '';
                    magnetField.value = '';
                    if (window.location.pathname.includes('/editpost/')) {
                        const postId = window.location.pathname.split('/').pop();
                        try {
                            await window.ethereum.request({ method: 'eth_requestAccounts' });
                            const provider = new ethers.providers.Web3Provider(window.ethereum);
                            const signer = provider.getSigner();
                            const contract = new ethers.Contract(postContractAddress, postContractAbi, signer);
                            const tx = await contract.setImageMagnet(`${postId}.png`, '');
                            await tx.wait();
                            debug('Magnet removed on-chain');
                        } catch (chainErr) {
                            debug('Failed to remove magnet on-chain', chainErr);
                        }
                    }
                    if (magnetDisplay) {
                        magnetDisplay.remove();
                        magnetDisplay = null;
                    }
                    if (cancelButton) {
                        cancelButton.remove();
                        cancelButton = null;
                    }
                });

                form.requestSubmit();
                debug('Form resubmitted');
            });
        } catch (err) {
            debug('Failed to seed image', err);
        }
    });
})();
