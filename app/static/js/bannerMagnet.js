(() => {
    const bannerInput = document.querySelector('input[name="postBanner"]');
    if (!bannerInput) return;

    // Hidden field to store returned magnet URI
    const magnetField = document.createElement('input');
    magnetField.type = 'hidden';
    magnetField.name = 'postBannerMagnet';
    bannerInput.insertAdjacentElement('afterend', magnetField);

    let magnetDisplay = null;
    let cancelButton = null;

    const form = bannerInput.form;
    form.addEventListener('submit', async (e) => {
        if (!bannerInput.files.length || magnetField.value) {
            return;
        }
        e.preventDefault();
        const file = bannerInput.files[0];
        const data = new FormData();
        data.append('postBanner', file);
        const csrf = form.querySelector('input[name="csrf_token"]');
        if (csrf) data.append('csrf_token', csrf.value);
        try {
            const res = await fetch('/createpost', { method: 'POST', body: data });
            const json = await res.json();
            magnetField.value = json.magnet || '';

            // If editing an existing post, update magnet on-chain
            if (window.location.pathname.includes('/editpost/')) {
                const postId = window.location.pathname.split('/').pop();
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
                } catch (chainErr) {
                    console.error('Failed to set magnet on-chain', chainErr);
                }
            }

            // Disable input and show magnet
            bannerInput.disabled = true;
            magnetDisplay = document.createElement('input');
            magnetDisplay.type = 'text';
            magnetDisplay.readOnly = true;
            magnetDisplay.value = magnetField.value;
            magnetDisplay.className = 'input input-bordered w-full mt-2';
            magnetField.insertAdjacentElement('afterend', magnetDisplay);

            cancelButton = document.createElement('button');
            cancelButton.type = 'button';
            cancelButton.textContent = 'Cancel Image';
            cancelButton.className = 'btn btn-sm btn-error mt-2';
            magnetDisplay.insertAdjacentElement('afterend', cancelButton);

            cancelButton.addEventListener('click', () => {
                bannerInput.disabled = false;
                bannerInput.value = '';
                magnetField.value = '';
                if (magnetDisplay) {
                    magnetDisplay.remove();
                    magnetDisplay = null;
                }
                if (cancelButton) {
                    cancelButton.remove();
                    cancelButton = null;
                }
            });
        } catch (err) {
            console.error('Failed to seed image', err);
        }
        form.requestSubmit();
    });
})();
