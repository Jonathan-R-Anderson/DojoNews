async function loginWithMetaMask(redirectUrl) {
    if (typeof window.ethereum === 'undefined') {
        alert('MetaMask not detected');
        return;
    }
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];
        const message = 'Log in to FlaskBlog';
        const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [message, address],
        });
        const resp = await fetch(`/login?redirect=${encodeURIComponent(redirectUrl)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, signature }),
        });
        const data = await resp.json();
        if (data.redirect) {
            window.location = data.redirect;
        }
    } catch (err) {
        console.error('MetaMask login failed', err);
    }
}

