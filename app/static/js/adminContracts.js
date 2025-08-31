(() => {
    const debug = (...args) => window.debugLog('adminContracts.js', ...args);
    debug('Loaded');

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
            const params = Array.from(form.querySelectorAll('input')).map((inp) => inp.value);
            const resultDiv = form.nextElementSibling;
            try {
                const res = await fetch(`/admin/contracts/${contract}/${method}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ params, action }),
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
