(() => {
    const debug = (...args) => window.debugLog('mediaUploader.js', ...args);
    debug('Loaded');

    window.addEventListener('DOMContentLoaded', () => {
        const fileInput = document.getElementById('mediaFiles');
        const uploadBtn = document.getElementById('uploadMedia');
        const list = document.getElementById('mediaList');
        if (!fileInput || !uploadBtn || !list) {
            debug('Required elements not found');
            return;
        }

        uploadBtn.addEventListener('click', async () => {
            const files = Array.from(fileInput.files || []);
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
                        const container = document.createElement('div');
                        container.className = 'mt-2';
                        const label = document.createElement('span');
                        label.className = 'block text-sm';
                        label.textContent = file.name;
                        const input = document.createElement('input');
                        input.type = 'text';
                        input.readOnly = true;
                        input.value = data.magnet;
                        input.className = 'input input-bordered w-full magnet-url';
                        const copyBtn = document.createElement('button');
                        copyBtn.type = 'button';
                        copyBtn.textContent = 'Copy';
                        copyBtn.className = 'btn btn-xs ml-2';
                        copyBtn.addEventListener('click', () => navigator.clipboard.writeText(data.magnet));
                        container.appendChild(label);
                        container.appendChild(input);
                        container.appendChild(copyBtn);
                        list.appendChild(container);
                    } else {
                        debug('No magnet returned for', file.name, data);
                    }
                } catch (err) {
                    debug('Upload failed', err);
                }
            }
            fileInput.value = '';
        });
    });
})();
