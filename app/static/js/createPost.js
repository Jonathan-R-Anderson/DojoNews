window.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const bannerInput = form.querySelector('input[name="postBanner"]');
        if (!bannerInput || !bannerInput.files.length) return;
        const data = new FormData();
        data.append('postBanner', bannerInput.files[0]);
        const csrf = form.querySelector('input[name="csrf_token"]');
        if (csrf) data.append('csrf_token', csrf.value);

        let magnet = '';
        try {
            const res = await fetch('/createpost', { method: 'POST', body: data });
            const json = await res.json();
            magnet = json.magnet;
        } catch (err) {
            console.error('Failed to upload image', err);
            return;
        }

        if (typeof window.ethereum === 'undefined') return;
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(postContractAddress, postContractAbi, signer);
            await contract.createPost(magnet);
        } catch (err) {
            console.error('Failed to interact with contract', err);
        }
    });
});
