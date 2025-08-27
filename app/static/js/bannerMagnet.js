(() => {
    const bannerInput = document.querySelector('input[name="postBanner"]');
    if (!bannerInput) return;

    // Hidden field to store returned magnet URI
    const magnetField = document.createElement('input');
    magnetField.type = 'hidden';
    magnetField.name = 'postBannerMagnet';
    bannerInput.insertAdjacentElement('afterend', magnetField);

    const form = bannerInput.form;
    form.addEventListener('submit', async (e) => {
        if (!bannerInput.files.length || magnetField.value) {
            return;
        }
        e.preventDefault();
        const file = bannerInput.files[0];
        const data = new FormData();
        data.append('postBanner', file);
        const csrf = form.querySelector('input[name="csrf_token"]');
        if (csrf) data.append('csrf_token', csrf.value);
        try {
            const res = await fetch('/createpost', { method: 'POST', body: data });
            const json = await res.json();
            magnetField.value = json.magnet || '';
        } catch (err) {
            console.error('Failed to seed image', err);
        }
        form.requestSubmit();
    });
})();
