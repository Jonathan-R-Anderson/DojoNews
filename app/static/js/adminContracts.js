(() => {
    const debug = (...args) => window.debugLog('adminContracts.js', ...args);
    debug('Loaded');

    const contracts = window.contractsData || {};
    if (!Object.keys(contracts).length || typeof ethers === 'undefined') {
        debug('No contracts or ethers not loaded');
        return;
    }

    const provider = window.ethereum
        ? new ethers.providers.Web3Provider(window.ethereum)
        : new ethers.providers.JsonRpcProvider(window.rpcUrl || '');

    let signer;
    async function getSigner() {
        if (!signer) {
            if (!window.ethereum) {
                throw new Error('No wallet available');
            }
            await provider.send('eth_requestAccounts', []);
            signer = provider.getSigner();
        }
        return signer;
    }

    Object.entries(contracts).forEach(([name, info]) => {
        const container = document.getElementById(`functions-${name}`);
        if (!container) return;
        const contract = new ethers.Contract(info.address, info.abi, provider);

        info.abi
            .filter((item) => item.type === 'function')
            .forEach((fn) => {
                const fnDiv = document.createElement('div');
                fnDiv.className = 'my-2';

                const title = document.createElement('p');
                title.textContent = fn.name;
                title.className = 'font-medium';
                fnDiv.appendChild(title);

                const form = document.createElement('form');
                form.className = 'flex flex-col items-center';

                fn.inputs.forEach((input, idx) => {
                    const inp = document.createElement('input');
                    inp.className = 'input input-bordered mb-2';
                    inp.placeholder = input.name || input.type;
                    inp.name = `arg${idx}`;
                    form.appendChild(inp);
                });

                const button = document.createElement('button');
                button.type = 'submit';
                button.className = 'btn btn-sm btn-neutral';
                const isReadOnly =
                    fn.stateMutability === 'view' || fn.stateMutability === 'pure';
                button.textContent = isReadOnly ? 'Call' : 'Send';
                form.appendChild(button);

                const result = document.createElement('div');
                result.className = 'mt-2 text-sm break-words';
                form.appendChild(result);

                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const args = fn.inputs.map((_, idx) => form[`arg${idx}`].value);
                    try {
                        if (isReadOnly) {
                            const res = await contract[fn.name](...args);
                            result.textContent = Array.isArray(res)
                                ? JSON.stringify(res)
                                : res?.toString();
                        } else {
                            const s = await getSigner();
                            const c = contract.connect(s);
                            const tx = await c[fn.name](...args);
                            result.textContent = `Tx: ${tx.hash}`;
                            await tx.wait();
                            result.textContent = `Success: ${tx.hash}`;
                        }
                    } catch (err) {
                        debug('Function call failed', err);
                        result.textContent = `Error: ${err.message || err}`;
                    }
                });

                fnDiv.appendChild(form);
                container.appendChild(fnDiv);
            });
    });
})();
