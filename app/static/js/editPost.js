(() => {
    const debug = (...args) => window.debugLog('editPost.js', ...args);
    debug('Loaded');

    window.addEventListener('DOMContentLoaded', () => {
        const form = document.querySelector('form');
        if (!form) {
            debug('No form found');
            return;
        }
        let submitting = false;
        form.addEventListener('submit', async (e) => {
            if (submitting) return;
            if (typeof window.ethereum === 'undefined' || typeof postContractAddress === 'undefined') {
                debug('Ethereum or contract address undefined');
                return;
            }
            const magnetField = form.querySelector('input[name="postBannerMagnet"]');
            if (magnetField && !magnetField.value) {
                debug('Waiting for banner magnet');
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
                const payload = `${title}|${tags}|${abs}|${content}|${category}`;
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                const contract = new ethers.Contract(postContractAddress, postContractAbi, signer);
                const postId = window.location.pathname.split('/').pop();
                const tx = await contract.updatePost(postId, payload, '');
                debug('Transaction sent', tx.hash);
                await tx.wait();
                debug('Transaction mined');
                submitting = true;
                form.submit();
            } catch (err) {
                debug('Failed to update post on-chain', err);
            }
        });
    });
})();
