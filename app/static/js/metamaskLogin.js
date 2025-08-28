(() => {
    const debug = (...args) => window.debugLog('metamaskLogin.js', ...args);
    debug('Loaded');

    window.loginWithMetaMask = async function (redirectUrl) {
        debug('loginWithMetaMask called', redirectUrl);
        if (typeof window.ethereum === 'undefined') {
            debug('MetaMask not detected');
            alert('MetaMask not detected');
            return;
        }
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            debug('Accounts', accounts);
            const address = accounts[0];
            const message = 'Log in to FlaskBlog';
            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [message, address],
            });
            debug('Signature obtained');
            const resp = await fetch(`/login?redirect=${encodeURIComponent(redirectUrl)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
                body: JSON.stringify({ address, signature }),
            });
            debug('Server response status', resp.status);
            const data = await resp.json();
            debug('Server response data', data);
            if (data.redirect) {
                window.location = data.redirect;
            }
        } catch (err) {
            debug('MetaMask login failed', err);
        }
    };
})();

