const ADMIN_ADDRESS = "0xB2b36AaD18d7be5d4016267BC4cCec2f12a64b6e".toLowerCase();

async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        return;
    }
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const account = accounts[0]?.toLowerCase();
        if (!account) {
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
        }
    } catch (err) {
        console.error('Wallet connection failed', err);
    }
}

window.addEventListener('load', connectWallet);
