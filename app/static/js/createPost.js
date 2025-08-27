// Handle on-chain post creation before form submission
window.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    if (!form) return;

    let submitting = false;
    form.addEventListener('submit', async (e) => {
        if (submitting) return;

        const bannerInput = form.querySelector('input[name="postBanner"]');
        const magnetField = form.querySelector('input[name="postBannerMagnet"]');
        if (bannerInput && bannerInput.files.length && magnetField && !magnetField.value) {
            // Wait for bannerMagnet.js to generate the magnet and resubmit
            return;
        }
        if (typeof window.ethereum === 'undefined' || typeof postContractAddress === 'undefined') {
            submitting = true;
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
            const encoder = new TextEncoder();
            const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(payload));
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(postContractAddress, postContractAbi, signer);
            const tx = await contract.createPost(contentHash);
            document.getElementById('onchainTx').value = tx.hash;
            await tx.wait();
        } catch (err) {
            console.error('Failed to create post on-chain', err);
        }
        submitting = true;
        form.requestSubmit();
    });
});
