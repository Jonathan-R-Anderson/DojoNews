(() => {
    const debug = (...args) => window.debugLog('adminContracts.js', ...args);
    debug('Loaded');

    const csrfTokenInput = document.querySelector('input[name="csrf_token"]');
    const csrfToken = csrfTokenInput ? csrfTokenInput.value : null;

    const uploadFile = async (file) => {
        const fd = new FormData();
        fd.append('file', file);
        if (csrfToken) {
            fd.append('csrf_token', csrfToken);
        }
        const res = await fetch('/uploadmedia', {
            method: 'POST',
            headers: csrfToken ? { 'X-CSRFToken': csrfToken } : {},
            body: fd,
        });
        const data = await res.json();
        if (!data.magnet) {
            throw new Error(data.error || 'upload failed');
        }
        return data.magnet;
    };

    const metrics = {};
    document.querySelectorAll('.contract-form').forEach((form) => {
        const contract = form.dataset.contract;
        if (!metrics[contract]) {
            metrics[contract] = { calls: 0, successes: 0, failures: 0 };
        }
        const metricsDiv = document.getElementById(`metrics-${contract}`);
        const updateMetrics = () => {
            const m = metrics[contract];
            if (metricsDiv) {
                metricsDiv.textContent = `Calls: ${m.calls}, Successes: ${m.successes}, Failures: ${m.failures}`;
            }
        };
        updateMetrics();

        const paramInputs = Array.from(form.querySelectorAll('input[name^="arg"]'));
        paramInputs.forEach((inp) => {
            const ph = (inp.getAttribute('placeholder') || '').toLowerCase();
            if (ph.includes('magnet') || ph.includes('image') || ph.includes('banner')) {
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.className = 'file-input file-input-bordered mb-2';
                inp.insertAdjacentElement('afterend', fileInput);
                inp.dataset.fileInput = 'true';

                fileInput.addEventListener('change', async () => {
                    if (!fileInput.files.length) return;
                    try {
                        const magnet = await uploadFile(fileInput.files[0]);
                        inp.value = magnet;
                    } catch (err) {
                        console.error('upload failed', err);
                    }
                });
            }
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const m = metrics[contract];
            m.calls++;
            const method = form.dataset.method;
            const action = form.dataset.action;
            const resultDiv = form.nextElementSibling;
            try {
                for (const inp of paramInputs) {
                    if (inp.dataset.fileInput) {
                        const fileInput = inp.nextElementSibling;
                        if (fileInput && fileInput.files.length && !inp.value.trim()) {
                            inp.value = await uploadFile(fileInput.files[0]);
                        }
                    }
                }

                const params = paramInputs.map((inp) => {
                    const val = inp.value.trim();
                    try {
                        return JSON.parse(val);
                    } catch {
                        return val;
                    }
                });

                const txOptField = form.querySelector('[name="txOptions"]');
                let txOptions = {};
                if (txOptField && txOptField.value.trim()) {
                    try {
                        txOptions = JSON.parse(txOptField.value);
                    } catch {
                        throw new Error('invalid txOptions JSON');
                    }
                }

                const info = window.contractData ? window.contractData[contract] : null;
                if (!info) {
                    throw new Error('contract info not found');
                }

                if (action === 'transact') {
                    if (!window.ethereum) {
                        throw new Error('wallet not connected');
                    }
                    await window.ethereum.request({ method: 'eth_requestAccounts' });
                    const provider = new ethers.providers.Web3Provider(window.ethereum);
                    const signer = provider.getSigner();
                    const ctr = new ethers.Contract(info.address, info.abi, signer);
                    const tx = await ctr[method](...params, txOptions);
                    const receipt = await tx.wait();
                    m.successes++;
                    resultDiv.textContent = `Tx: ${receipt.transactionHash}`;
                } else {
                    const provider = window.ethereum
                        ? new ethers.providers.Web3Provider(window.ethereum)
                        : window.rpcUrl
                        ? new ethers.providers.JsonRpcProvider(window.rpcUrl)
                        : ethers.getDefaultProvider();
                    const ctr = new ethers.Contract(info.address, info.abi, provider);
                    const res = await ctr[method](...params);
                    const replacer = (_, v) => (v && v._isBigNumber ? v.toString() : v);
                    m.successes++;
                    resultDiv.textContent = typeof res === 'object' ? JSON.stringify(res, replacer) : res;
                }
            } catch (err) {
                m.failures++;
                resultDiv.textContent = `Error: ${err.message || err}`;
            }
            updateMetrics();
        });
    });
})();

