(() => {
    const debug = (...args) => window.debugLog('adminContracts.js', ...args);
    debug('Loaded');

    const csrfTokenInput = document.querySelector('input[name="csrf_token"]');
    const csrfToken = csrfTokenInput ? csrfTokenInput.value : null;

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

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const m = metrics[contract];
            m.calls++;
            const method = form.dataset.method;
            const action = form.dataset.action;
            const paramInputs = Array.from(form.querySelectorAll('input[name^="arg"]'));
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
                } catch (err) {
                    m.failures++;
                    const resultDiv = form.nextElementSibling;
                    resultDiv.textContent = `Error: invalid txOptions JSON`;
                    updateMetrics();
                    return;
                }
            }
            if (action === 'transact') {
                if (!txOptions.from) {
                    if (window.userAddress) {
                        txOptions.from = window.userAddress;
                    } else if (window.ethereum) {
                        try {
                            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                            txOptions.from = accounts[0];
                            window.userAddress = accounts[0];
                        } catch (err) {
                            debug('Wallet request failed', err);
                        }
                    }
                    if (!txOptions.from) {
                        m.failures++;
                        const resultDiv = form.nextElementSibling;
                        resultDiv.textContent = 'Error: wallet not connected';
                        updateMetrics();
                        return;
                    }
                }
            }
            const resultDiv = form.nextElementSibling;
            try {
                const res = await fetch(`/admin/contracts/${contract}/${method}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
                    },
                    body: JSON.stringify({ params, action, txOptions }),
                });
                const data = await res.json();
                if (data.error) {
                    m.failures++;
                    resultDiv.textContent = `Error: ${data.error}`;
                } else if (data.result !== undefined) {
                    m.successes++;
                    resultDiv.textContent = typeof data.result === 'string' ? data.result : JSON.stringify(data.result);
                } else if (data.txHash) {
                    m.successes++;
                    resultDiv.textContent = `Tx: ${data.txHash}`;
                } else {
                    m.failures++;
                    resultDiv.textContent = 'No response received';
                }
            } catch (err) {
                m.failures++;
                resultDiv.textContent = `Error: ${err.message || err}`;
            }
            updateMetrics();
        });
    });
})();
