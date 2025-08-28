const debug = (...args) => window.debugLog('createPost.js', ...args);
debug('Loaded');

// Handle on-chain post creation before form submission
window.addEventListener('DOMContentLoaded', () => {
    debug('DOMContentLoaded');
    const form = document.querySelector('form');
    if (!form) {
        debug('No form found');
        return;
    }

    let submitting = false;
    form.addEventListener('submit', async (e) => {
        debug('Submit triggered', { submitting });
        if (submitting) return;

        const bannerInput = form.querySelector('input[name="postBanner"]');
        const magnetField = form.querySelector('input[name="postBannerMagnet"]');
        if (bannerInput && bannerInput.files.length && magnetField && !magnetField.value) {
            debug('Waiting for banner magnet');
            return;
        }
        if (typeof window.ethereum === 'undefined' || typeof postContractAddress === 'undefined') {
            debug('Ethereum or contract address undefined');
            return;
        }
        e.preventDefault();
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const title = form.postTitle.value.trim();
            const tags = form.postTags.value.trim();
            const abs = form.postAbstract.value.trim();
            const content = form.postContent.value.trim();
            const category = form.postCategory.value;
            const magnet = magnetField ? magnetField.value.trim() : '';
            const payload = `${title}|${tags}|${abs}|${content}|${category}|${magnet}`;
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(postContractAddress, postContractAbi, signer);
            const tx = await contract.createPost(payload, magnet);
            debug('Transaction sent', tx.hash);
            const receipt = await tx.wait();
            debug('Transaction mined', receipt.transactionHash);
            let postId;
            try {
                const event = receipt.events.find(e => e.event === 'PostCreated');
                postId = event ? event.args.postId.toNumber() : null;
            } catch {
                postId = null;
            }
            if (postId && magnet) {
                try {
                    const tx2 = await contract.setImageMagnet(`${postId}.png`, magnet);
                    await tx2.wait();
                    debug('Image magnet set');
                } catch (err) {
                    debug('Failed to set image magnet', err);
                }
            }
            window.location.href = '/';
        } catch (err) {
            debug('Failed to create post on-chain', err);
        }
        submitting = true;
    });
});
