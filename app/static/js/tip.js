(() => {
    const debug = (...args) => (window.debugLog ? window.debugLog('tip.js', ...args) : console.log('tip.js', ...args));
    debug('Loaded');

    async function loadEthers() {
        if (typeof ethers !== 'undefined') return;
        await new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js';
            s.onload = resolve;
            document.head.appendChild(s);
        });
    }

    async function sendTip() {
        debug('sendTip clicked');
        const amountEl = document.getElementById('tip-amount');
        if (!amountEl) {
            debug('tip amount input not found');
            return;
        }
        const amount = amountEl.value;
        if (!amount || Number(amount) <= 0) {
            debug('invalid amount');
            return;
        }
        if (!window.tipJarAddress || !window.tipJarAbi) {
            debug('TipJar contract info missing');
            return;
        }
        try {
            await loadEthers();
            if (typeof window.ethereum === 'undefined') {
                debug('no ethereum provider');
                return;
            }
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(window.tipJarAddress, window.tipJarAbi, signer);
            const postIdBytes = ethers.utils.hexZeroPad(ethers.BigNumber.from(postUrlID).toHexString(), 32);
            const tx = await contract.tip(window.postAuthor, postIdBytes, {
                value: ethers.utils.parseEther(amount),
            });
            debug('tx sent', tx.hash);
            await tx.wait();
            debug('tx confirmed');
            amountEl.value = '';
            alert('Tip sent!');
        } catch (err) {
            console.error('tipping failed', err);
        }
    }

    document.getElementById('tip-button')?.addEventListener('click', sendTip);
})();
