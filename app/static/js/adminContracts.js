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

    const metrics = {};
    Object.entries(contracts).forEach(([name, info]) => {
        const container = document.getElementById(`functions-${name}`);
        const metricsDiv = document.getElementById(`metrics-${name}`);
        if (!container) return;
        const contract = new ethers.Contract(info.address, info.abi, provider);

        metrics[name] = { calls: 0, successes: 0, failures: 0 };
        const updateMetrics = () => {
            if (metricsDiv) {
                const m = metrics[name];
                metricsDiv.textContent = `Calls: ${m.calls}, Successes: ${m.successes}, Failures: ${m.failures}`;
            }
        };
        updateMetrics();

        const fns = info.abi.filter((item) => item.type === 'function');
        if (!fns.length) {
            container.textContent = 'No functions in ABI';
            return;
        }

        const select = document.createElement('select');
        select.className = 'select select-bordered mb-2';
        fns.forEach((fn, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = fn.name;
            select.appendChild(opt);
        });
        container.appendChild(select);

        const form = document.createElement('form');
        form.className = 'flex flex-col items-center';
        container.appendChild(form);

        const result = document.createElement('div');
        result.className = 'mt-2 text-sm break-words';
        container.appendChild(result);

        const renderForm = (fn) => {
            form.innerHTML = '';
            fn.inputs.forEach((input, idx) => {
                const inp = document.createElement('input');
                inp.className = 'input input-bordered mb-2';
                inp.placeholder = `${input.name || 'arg' + idx} (${input.type})`;
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

            form.onsubmit = async (e) => {
                e.preventDefault();
                metrics[name].calls++;
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
                    metrics[name].successes++;
                } catch (err) {
                    debug('Function call failed', err);
                    metrics[name].failures++;
                    result.textContent = `Error: ${err.message || err}`;
                }
                updateMetrics();
            };
        };

        renderForm(fns[0]);
        select.addEventListener('change', () => {
            const fn = fns[select.value];
            result.textContent = '';
            renderForm(fn);
        });
    });
})();

