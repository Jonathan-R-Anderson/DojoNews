const debug = (...args) => window.debugLog('wallet.js', ...args);
debug('Loaded');

const ADMIN_ADDRESS = "0xB2b36AaD18d7be5d4016267BC4cCec2f12a64b6e".toLowerCase();

async function connectWallet() {
    debug('connectWallet called');
    if (typeof window.ethereum === 'undefined') {
        debug('No ethereum provider');
        return;
    }
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        debug('Accounts', accounts);
        const account = accounts[0]?.toLowerCase();
        if (!account) {
            debug('No account returned');
            return;
        }
        window.userAddress = account;
        const uname = document.getElementById('userName');
        if (uname && !uname.value) {
            uname.value = account;
            uname.readOnly = true;
        }
        const submitBtn = document.getElementById('signup-btn');
        if (submitBtn) {
            submitBtn.disabled = false;
        }
        if (account === ADMIN_ADDRESS) {
            document.body.classList.add('admin-wallet');
            debug('Admin wallet detected');
        }
        debug('Wallet connected', account);
    } catch (err) {
        debug('Wallet connection failed', err);
    }
}

window.addEventListener('load', connectWallet);
