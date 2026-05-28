    // Форма заявки на консультацию
    (function () {
        var manyashaApiUrl = (typeof window.__manyashaApiUrl === 'function')
            ? window.__manyashaApiUrl
            : function (path) { return path; };
        var manyashaFetchWithRetry = (typeof window.__manyashaFetchWithRetry === 'function')
            ? window.__manyashaFetchWithRetry
            : function (path, init) {
                return fetch(manyashaApiUrl(path), init);
            };
        var manyashaAuthHeaders = (typeof window.__manyashaAuthHeaders === 'function')
            ? window.__manyashaAuthHeaders
            : function (headers) { return headers || {}; };
        var ensureManyashaBackendContext = (typeof window.__manyashaEnsureBackendContext === 'function')
            ? window.__manyashaEnsureBackendContext
            : function () { return Promise.resolve({}); };
        var form = document.getElementById('consult-form');
        var successBlock = document.getElementById('consult-success');
        var errorEl = document.getElementById('consult-error');
        var submitBtn = document.getElementById('consult-submit');
        if (!form) return;

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var name = document.getElementById('consult-name').value.trim();
            var phone = document.getElementById('consult-phone').value.trim();
            var question = document.getElementById('consult-question').value.trim();
            if (!name || !phone) return;

            submitBtn.disabled = true;
            submitBtn.textContent = 'Отправляем...';
            errorEl.classList.add('hidden');

            var sid = '';
            try { sid = localStorage.getItem('manyasha_sid') || ''; } catch (e) {}
            if (!sid) {
                sid = 'sid-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
                try { localStorage.setItem('manyasha_sid', sid); } catch (e) {}
            }
            var captchaToken = '';
            try {
                if (typeof window.__manyashaGetCaptchaToken === 'function') captchaToken = String(window.__manyashaGetCaptchaToken() || '').trim();
                else if (typeof window.__manyashaCaptchaToken === 'function') captchaToken = String(window.__manyashaCaptchaToken() || '').trim();
                else if (typeof window.__manyashaCaptchaToken === 'string') captchaToken = String(window.__manyashaCaptchaToken || '').trim();
            } catch (e) {}

            ensureManyashaBackendContext()
                .catch(function () { return {}; })
                .then(function () {
                    return manyashaFetchWithRetry('/api/consultation-request', {
                        method: 'POST',
                        headers: manyashaAuthHeaders({ 'Content-Type': 'application/json' }),
                        body: JSON.stringify({
                            name: name,
                            phone: phone,
                            question: question,
                            session_id: sid,
                            captcha_token: captchaToken || null,
                            website: '',
                        }),
                    }, { retries: 2, retryDelayMs: 260 });
                })
                .then(function (res) {
                    if (!res.ok) throw new Error('server_error');
                    return res.json();
                })
                .then(function () {
                    form.classList.add('hidden');
                    successBlock.classList.remove('hidden');
                })
                .catch(function () {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Отправить заявку';
                    errorEl.textContent = 'Не удалось отправить заявку. Попробуйте ещё раз.';
                    errorEl.classList.remove('hidden');
                });
        });
    })();
