(() => {
    const debug = (...args) => window.debugLog('mediaUploader.js', ...args);
    debug('Loaded');

    window.addEventListener('DOMContentLoaded', () => {
        const inputsContainer = document.getElementById('mediaInputs');
        const addBtn = document.getElementById('addMediaInput');
        const uploadBtn = document.getElementById('uploadMedia');
        const list = document.getElementById('mediaList');

        if (!inputsContainer || !addBtn || !uploadBtn || !list) {
            debug('Required elements not found');
            return;
        }

        addBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.className = 'file-input file-input-bordered w-full mb-2';
            inputsContainer.appendChild(input);
        });

        uploadBtn.addEventListener('click', async () => {
            const inputs = inputsContainer.querySelectorAll('input[type="file"]');
            const files = [];
            inputs.forEach((inp) => files.push(...Array.from(inp.files || [])));

            debug('Uploading files', files.length);
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                try {
                    const res = await fetch('/uploadmedia', {
                        method: 'POST',
                        body: formData,
                    });
                    const data = await res.json();
                    if (data.magnet) {
                        const row = document.createElement('div');
                        row.className = 'flex items-center mt-2';

                        const name = document.createElement('span');
                        name.className = 'text-sm mr-2';
                        name.textContent = file.name;

                        const url = document.createElement('input');
                        url.type = 'text';
                        url.readOnly = true;
                        url.value = data.magnet;
                        url.className = 'input input-bordered flex-grow magnet-url';

                        const copyBtn = document.createElement('button');
                        copyBtn.type = 'button';
                        copyBtn.textContent = 'Copy';
                        copyBtn.className = 'btn btn-xs ml-2';
                        copyBtn.addEventListener('click', () => navigator.clipboard.writeText(data.magnet));

                        row.appendChild(name);
                        row.appendChild(url);
                        row.appendChild(copyBtn);
                        list.appendChild(row);
                    } else {
                        debug('No magnet returned for', file.name, data);
                    }
                } catch (err) {
                    debug('Upload failed', err);
                }
            }

            inputs.forEach((inp) => (inp.value = ''));
        });
    });
})();

