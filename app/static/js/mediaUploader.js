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

            // CSRF token from hidden input injected by Flask-WTF
            const csrfInput = document.querySelector('input[name="csrf_token"]');
            const csrfToken = csrfInput ? csrfInput.value : null;

            debug('Uploading files', files.length);
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                if (csrfToken) {
                    // include token so CSRF protection doesn't reject the request
                    formData.append('csrf_token', csrfToken);
                }
                try {
                    const res = await fetch('/uploadmedia', {
                        method: 'POST',
                        headers: csrfToken ? { 'X-CSRFToken': csrfToken } : {},
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

                        const deleteBtn = document.createElement('button');
                        deleteBtn.type = 'button';
                        deleteBtn.textContent = '-';
                        deleteBtn.className = 'btn btn-xs ml-2 btn-error';
                        deleteBtn.addEventListener('click', async () => {
                            try {
                                const fd = new FormData();
                                fd.append('filename', file.name);
                                if (csrfToken) {
                                    fd.append('csrf_token', csrfToken);
                                }
                                await fetch('/deletemedia', {
                                    method: 'POST',
                                    headers: csrfToken ? { 'X-CSRFToken': csrfToken } : {},
                                    body: fd,
                                });
                            } catch (err) {
                                debug('Delete failed', err);
                            }
                            row.remove();
                        });

                        row.appendChild(name);
                        row.appendChild(url);
                        row.appendChild(copyBtn);
                        row.appendChild(deleteBtn);
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

