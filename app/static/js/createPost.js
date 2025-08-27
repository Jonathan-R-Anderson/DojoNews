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
            const contentHash = ethers.utils.sha256(
                ethers.utils.toUtf8Bytes(payload)
            );
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(postContractAddress, postContractAbi, signer);
            const tx = await contract.createPost(contentHash, magnet);
            await tx.wait();
            window.location.href = '/';
        } catch (err) {
            console.error('Failed to create post on-chain', err);
        }
        submitting = true;
    });
});
