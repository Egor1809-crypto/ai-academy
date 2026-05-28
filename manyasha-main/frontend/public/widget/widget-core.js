    // ═══════════════════════════════════════════════════════════
    // ─── МАНЯША: ЕДИНЫЙ СКРИПТ ИНИЦИАЛИЗАЦИИ ───
    // ═══════════════════════════════════════════════════════════
    (function() {
        var queryParams = (function () {
            try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(); }
        })();
        function queryParam(name) {
            var value = queryParams.get(name);
            return value ? String(value).trim() : '';
        }
        function safeHostMode(value) {
            var v = String(value || '').trim().toLowerCase();
            return (v === 'dark' || v === 'light') ? v : '';
        }
        function safeHostTone(value) {
            var v = String(value || '').trim().toLowerCase();
            return (v === 'warm' || v === 'neutral') ? v : '';
        }
        function safeHostContrast(value) {
            var v = String(value || '').trim().toLowerCase();
            return (v === 'high-light' || v === 'high-dark') ? v : '';
        }
        function isTruthyFlag(value) {
            return /^(1|true|yes|on)$/i.test(String(value || '').trim());
        }

        var embedMode = false;
        var inIframe = false;
        try { inIframe = window.self !== window.top; } catch (e) { inIframe = true; }
        var embedRequested = isTruthyFlag(queryParam('embed'));
        embedMode = (!!window.__MANAYA_EMBED_MODE && inIframe) || embedRequested;
        if (embedMode) {
            document.body.classList.add('manyasha-embed-clean');
            if (inIframe) {
                try { window.parent.postMessage({ type: 'manyasha:embed-ready' }, '*'); } catch (e) {}
            }
        }
        var embedSizeHint = String(queryParam('embed_size') || queryParam('embedSize') || 'medium').trim().toLowerCase();
        if (['compact', 'medium', 'large'].indexOf(embedSizeHint) === -1) embedSizeHint = 'medium';
        function getManyashaDemoApi() {
            var api = window.ManyashaWidgetDemo || null;
            if (!api || typeof api !== 'object') return null;
            return api;
        }
        function getManyashaTextApi() {
            var api = window.ManyashaWidgetText || null;
            if (!api || typeof api !== 'object') return null;
            return api;
        }
        var manyashaTextApi = null;
        function resolveManyashaTextApi() {
            if (manyashaTextApi && typeof manyashaTextApi === 'object') return manyashaTextApi;
            manyashaTextApi = getManyashaTextApi();
            return manyashaTextApi;
        }
        var demoModeEnabled = (function() {
            var demoApi = getManyashaDemoApi();
            if (demoApi && typeof demoApi.isEnabled === 'function') {
                try { return !!demoApi.isEnabled(); } catch (_eDemoEnabled) {}
            }
            return isTruthyFlag(queryParam('demo_mode') || queryParam('demoMode'));
        })();
        var forcedHostMode = safeHostMode(queryParam('host_mode') || queryParam('hostMode'));
        var forcedHostTone = safeHostTone(queryParam('host_tone') || queryParam('hostTone'));
        var forcedHostContrast = safeHostContrast(queryParam('host_contrast') || queryParam('hostContrast'));

        function _normalizeStorageToken(value) {
            var text = String(value || '').trim();
            return text.toLowerCase().replace(/[^a-z0-9._-]/gi, '-').replace(/-+/g, '-').slice(0, 80);
        }
        function _buildStorageNamespace() {
            var pidHint = queryParam('pid') || queryParam('id') || (typeof window.__MANAYA_EMBED_PID !== 'undefined' && window.__MANAYA_EMBED_PID !== null
                ? String(window.__MANAYA_EMBED_PID)
                : 'default');
            var instanceHint = queryParam('instance') || queryParam('instanceId');
            if (!instanceHint) {
                instanceHint = 'manyasha-' + _normalizeStorageToken(pidHint || 'default');
            }
            var originHint = '';
            try { originHint = String((window.location && window.location.origin) || ''); } catch (_err) {}
            return [
                'manyasha_ns',
                _normalizeStorageToken(originHint || 'unknown-origin'),
                _normalizeStorageToken(pidHint || 'default'),
                _normalizeStorageToken(instanceHint || ('manyasha-' + (pidHint || 'default')))
            ].join('::');
        }
        var _manyashaStorageNamespace = _buildStorageNamespace();
        function _storageKey(rawKey) {
            var raw = String(rawKey || '').trim();
            if (!raw) return _manyashaStorageNamespace;
            return _manyashaStorageNamespace + '::' + raw;
        }
        function _storageGet(rawKey, fallback) {
            var fallbackValue = arguments.length > 1 ? fallback : null;
            try { return localStorage.getItem(_storageKey(rawKey)); } catch (_err) {}
            return fallbackValue;
        }
        function _storageSet(rawKey, value) {
            try { localStorage.setItem(_storageKey(rawKey), value); } catch (_err) {}
        }
        function _storageRemove(rawKey) {
            try { localStorage.removeItem(_storageKey(rawKey)); } catch (_err) {}
        }
        function _storageGetNumber(rawKey, fallback) {
            try {
                var raw = localStorage.getItem(_storageKey(rawKey));
                var n = Number(raw);
                return isFinite(n) ? n : fallback;
            } catch (_err) {
                return fallback;
            }
        }

        var API_ORIGIN_STORAGE_KEY = _storageKey('manyasha_api_origin');
        var requestedApiOrigin = queryParam('api_origin') || queryParam('apiOrigin');
        var isFilePreview = !!(window.location && window.location.protocol === 'file:');
        var runtimeApiOriginCandidates = [];
        var apiModule = window.ManyashaWidgetApi || null;
        function normalizeApiOrigin(origin) {
            if (apiModule && typeof apiModule.normalizeApiOrigin === 'function') {
                return apiModule.normalizeApiOrigin(origin);
            }
            var clean = String(origin || '').trim().replace(/\/+$/, '');
            if (!clean) return '';
            if (!/^https?:\/\//i.test(clean)) return '';
            return clean;
        }
        function pushApiOriginCandidate(origin) {
            var clean = normalizeApiOrigin(origin);
            if (!clean) return;
            if (runtimeApiOriginCandidates.indexOf(clean) !== -1) return;
            runtimeApiOriginCandidates.push(clean);
        }
        function rememberApiOrigin(origin) {
            var clean = normalizeApiOrigin(origin);
            if (!clean) return;
            requestedApiOrigin = clean;
            pushApiOriginCandidate(clean);
            _storageSet('manyasha_api_origin', clean);
        }

        pushApiOriginCandidate(requestedApiOrigin);
        pushApiOriginCandidate(window.__MANAYA_API_ORIGIN || '');
        if (isFilePreview) {
            pushApiOriginCandidate('http://localhost:8000');
            pushApiOriginCandidate('http://127.0.0.1:8000');
            pushApiOriginCandidate('http://localhost:5173');
            pushApiOriginCandidate('http://127.0.0.1:5173');
        }
        try { pushApiOriginCandidate(_storageGet('manyasha_api_origin', '')); } catch (e) {}
        if (!requestedApiOrigin && runtimeApiOriginCandidates.length) {
            requestedApiOrigin = runtimeApiOriginCandidates[0];
        }
        var manyashaApiClient = null;
        if (apiModule && typeof apiModule.createApiClient === 'function') {
            manyashaApiClient = apiModule.createApiClient({
                storageKey: API_ORIGIN_STORAGE_KEY,
                requestedApiOrigin: requestedApiOrigin,
                candidates: runtimeApiOriginCandidates.slice()
            });
            requestedApiOrigin = manyashaApiClient.getRequestedApiOrigin() || requestedApiOrigin;
        }

        function manyashaApiUrl(path) {
            if (manyashaApiClient && typeof manyashaApiClient.apiUrl === 'function') {
                return manyashaApiClient.apiUrl(path);
            }
            var normalizedPath = String(path || '');
            if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath;
            if (!normalizedPath) return requestedApiOrigin || '';
            if (normalizedPath.charAt(0) !== '/') normalizedPath = '/' + normalizedPath;
            return requestedApiOrigin ? (requestedApiOrigin + normalizedPath) : normalizedPath;
        }
        function shouldRetryWithNextApiOrigin(status) {
            return status === 0 || status === 404 || status === 405 || status >= 500;
        }
        function isLikelyNetworkError(err) {
            var message = '';
            try { message = String(err && err.message ? err.message : err || '').toLowerCase(); } catch (e) {}
            return (
                message.indexOf('failed to fetch') !== -1 ||
                message.indexOf('networkerror') !== -1 ||
                message.indexOf('load failed') !== -1 ||
                message.indexOf('fetch failed') !== -1 ||
                message.indexOf('manyasha api unreachable') !== -1
            );
        }
        function normalizeFetchError(err) {
            if (!isLikelyNetworkError(err)) {
                return err || new Error('manyasha_fetch_failed');
            }
            var wrapped = new Error('manyasha_fetch_failed');
            wrapped.isNetworkError = true;
            try { wrapped.cause = err; } catch (e) {}
            return wrapped;
        }
        function manyashaFetch(path, init) {
            if (manyashaApiClient && typeof manyashaApiClient.fetchApi === 'function') {
                return manyashaApiClient.fetchApi(path, init);
            }
            var normalizedPath = String(path || '');
            if (normalizedPath.charAt(0) !== '/') normalizedPath = '/' + normalizedPath;

            var urls = [];
            function pushUrl(url) {
                if (!url) return;
                if (urls.indexOf(url) !== -1) return;
                urls.push(url);
            }

            pushUrl(manyashaApiUrl(normalizedPath));
            runtimeApiOriginCandidates.forEach(function(origin) {
                pushUrl(origin + normalizedPath);
            });

            var idx = 0;
            function attempt(lastError) {
                if (idx >= urls.length) {
                    return Promise.reject(normalizeFetchError(lastError || new Error('manyasha api unreachable')));
                }
                var url = urls[idx++];
                var isApiUrl = normalizedPath.indexOf('/api/') === 0;
                var isApiNonJsonPath = isApiUrl && normalizedPath.indexOf('/api/tts') === 0;
                return fetch(url, init).then(function(res) {
                    if (isApiUrl && !isApiNonJsonPath) {
                        var contentType = '';
                        try { contentType = String((res.headers && res.headers.get('content-type')) || '').toLowerCase(); } catch (e) {}
                        if (res && contentType.indexOf('application/json') === -1 && contentType.indexOf('application/problem+json') === -1) {
                            if (idx < urls.length) {
                                throw new Error('retry-non-json');
                            }
                            return Promise.reject(new Error('api_response_is_not_json'));
                        }
                    }
                    if (res && shouldRetryWithNextApiOrigin(res.status) && idx < urls.length) {
                        throw new Error('retry-next-origin');
                    }
                    if (/^https?:\/\//i.test(url)) {
                        try {
                            var origin = new URL(url).origin;
                            rememberApiOrigin(origin);
                        } catch (e) {}
                    }
                    return res;
                }).catch(function(err) {
                    return attempt(err);
                });
            }
            return attempt();
        }
        function cloneFetchInit(init) {
            var src = init || {};
            var out = {};
            Object.keys(src).forEach(function(k) {
                if (k === 'headers') {
                    var hdr = src.headers || {};
                    var copy = {};
                    Object.keys(hdr).forEach(function(hk) { copy[hk] = hdr[hk]; });
                    out.headers = copy;
                } else {
                    out[k] = src[k];
                }
            });
            return out;
        }
        function manyashaFetchWithRetry(path, init, options) {
            if (manyashaApiClient && typeof manyashaApiClient.fetchWithRetry === 'function') {
                return manyashaApiClient.fetchWithRetry(path, init, options);
            }
            var opts = options || {};
            var maxRetries = typeof opts.retries === 'number' ? Math.max(0, opts.retries) : 2;
            var retryDelayMs = typeof opts.retryDelayMs === 'number' ? Math.max(120, opts.retryDelayMs) : 320;
            var retryOnStatus = opts.retryOnStatus || function(status) { return status >= 500 || status === 429 || status === 0; };
            var timeoutMs = typeof opts.timeoutMs === 'number' ? Math.max(600, opts.timeoutMs) : 0;
            var attemptNo = 0;

            function fetchAttempt(reqInit) {
                if (!timeoutMs) return manyashaFetch(path, reqInit);
                var timeoutTimer = null;
                var localInit = reqInit || {};
                var promise;
                if (!localInit.signal && typeof AbortController === 'function') {
                    var ctrl = new AbortController();
                    localInit.signal = ctrl.signal;
                    timeoutTimer = setTimeout(function() {
                        try { ctrl.abort(); } catch (e) {}
                    }, timeoutMs);
                    promise = manyashaFetch(path, localInit);
                } else {
                    promise = Promise.race([
                        manyashaFetch(path, localInit),
                        new Promise(function(_resolve, reject) {
                            timeoutTimer = setTimeout(function() {
                                reject(new Error('request_timeout'));
                            }, timeoutMs);
                        })
                    ]);
                }
                return promise.finally(function() {
                    if (timeoutTimer) clearTimeout(timeoutTimer);
                });
            }

            function doAttempt(lastError) {
                var reqInit = cloneFetchInit(init || {});
                return fetchAttempt(reqInit).then(function(res) {
                    if (res && retryOnStatus(res.status) && attemptNo < maxRetries) {
                        attemptNo += 1;
                        return new Promise(function(resolve, reject) {
                            setTimeout(function() {
                                doAttempt(new Error('retry_status_' + res.status)).then(resolve).catch(reject);
                            }, retryDelayMs * attemptNo);
                        });
                    }
                    return res;
                }).catch(function(err) {
                    if (attemptNo >= maxRetries) {
                        throw (err || lastError || new Error('manyasha_fetch_failed'));
                    }
                    attemptNo += 1;
                    return new Promise(function(resolve, reject) {
                        setTimeout(function() {
                            doAttempt(err || lastError).then(resolve).catch(reject);
                        }, retryDelayMs * attemptNo);
                    });
                });
            }

            return doAttempt();
        }
        window.__manyashaApiUrl = manyashaApiUrl;
        window.__manyashaFetchWithRetry = manyashaFetchWithRetry;
        // Получаем элементы, проверяем на null
        var widget  = document.getElementById('manyasha-widget');
        var showBtn = document.getElementById('manyasha-show-btn');
        var hideBtn = document.getElementById('manyasha-hide-btn');
        var card    = document.getElementById('manyasha-card');
        var stage   = document.getElementById('manyasha-stage');
        var widgetHeader = document.getElementById('manyasha-header');
        var menuBtn = document.getElementById('manyasha-menu-btn');
        var menuPanel = document.getElementById('manyasha-menu-panel');
        var modeChip = document.getElementById('manyasha-mode-chip');


        // Если виджет не найден — отменить всю инициализацию
        if (!widget) {
            console.warn('⚠️ manyasha-widget не найден — скрипт Маняши пропущен');
            return;
        }
        // Важно: outbox должен существовать до первого trackEvent, иначе ранний вызов ломает весь виджет.
        var analyticsOutbox = [];

        function parseRgbColor(value) {
            var m = String(value || '').match(/rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)(?:\s*[,/]\s*([0-9.]+))?\s*\)/i);
            if (!m) return null;
            var alpha = (m[4] === undefined) ? 1 : Number(m[4]);
            if (!isFinite(alpha)) alpha = 1;
            return {
                r: Number(m[1]),
                g: Number(m[2]),
                b: Number(m[3]),
                a: Math.min(Math.max(alpha, 0), 1)
            };
        }
        function applyHostContrastAttribute(contrastMode) {
            if (!widget) return;
            if (contrastMode) {
                widget.setAttribute('data-host-contrast', contrastMode);
            } else {
                widget.removeAttribute('data-host-contrast');
            }
        }
        function applyManyashaHostTheme() {
            if (forcedHostMode) {
                widget.setAttribute('data-host-mode', forcedHostMode);
                widget.setAttribute('data-host-tone', forcedHostTone || 'neutral');
                applyHostContrastAttribute(forcedHostContrast);
                return;
            }
            var bodyBg = '';
            try { bodyBg = getComputedStyle(document.body).backgroundColor || ''; } catch (e) {}
            var rgb = parseRgbColor(bodyBg);
            if (!rgb) {
                widget.setAttribute('data-host-tone', 'warm');
                widget.setAttribute('data-host-mode', 'light');
                applyHostContrastAttribute('');
                return;
            }
            if ((rgb.a || 0) < 0.35) {
                widget.setAttribute('data-host-tone', 'warm');
                widget.setAttribute('data-host-mode', 'light');
                applyHostContrastAttribute('');
                return;
            }
            var lum = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
            var warmBias = (rgb.r - rgb.b);
            widget.setAttribute('data-host-mode', lum < 0.45 ? 'dark' : 'light');
            widget.setAttribute('data-host-tone', warmBias > 16 ? 'warm' : 'neutral');
            if (lum <= 0.22) {
                applyHostContrastAttribute('high-dark');
            } else if (lum >= 0.86) {
                applyHostContrastAttribute('high-light');
            } else {
                applyHostContrastAttribute('');
            }
        }
        applyManyashaHostTheme();

        var VISUAL_STATE_PRIORITY = {
            idle: 1,
            thinking: 2,
            listening: 3,
            speaking: 4,
            error: 5
        };
        var visualStateMachine = {
            current: 'idle',
            requested: 'idle',
            appliedAt: 0,
            timer: null,
            debounceMs: 280,
            minStateMs: 700
        };
        function normalizeVisualState(state) {
            var raw = String(state || '').trim().toLowerCase();
            if (!raw) return 'idle';
            if (raw === 'ready') return 'idle';
            if (raw === 'answering') return 'speaking';
            if (raw === 'speaking') return 'speaking';
            if (raw === 'listening') return 'listening';
            if (raw === 'thinking') return 'thinking';
            if (raw === 'error') return 'error';
            if (raw === 'idle') return 'idle';
            return 'idle';
        }
        function applyWidgetVisualState(nextState) {
            visualStateMachine.current = nextState;
            visualStateMachine.appliedAt = Date.now();
            widget.setAttribute('data-visual-state', nextState);
            widget.setAttribute('data-state', nextState);
            if (!modeChip) return;
            var labels = {
                idle: 'Готова помочь',
                listening: 'Слушаю',
                thinking: 'Анализирую',
                speaking: 'Объясняю',
                error: 'Проверяю подключение'
            };
            modeChip.textContent = labels[nextState] || labels.idle;
        }
        function setWidgetVisualState(state) {
            var nextState = normalizeVisualState(state);
            var currentState = visualStateMachine.current;
            visualStateMachine.requested = nextState;

            if (nextState === currentState) {
                if (!widget.getAttribute('data-visual-state')) applyWidgetVisualState(nextState);
                return;
            }

            if (visualStateMachine.timer) {
                clearTimeout(visualStateMachine.timer);
                visualStateMachine.timer = null;
            }

            var now = Date.now();
            var elapsed = now - (visualStateMachine.appliedAt || 0);
            var currentPriority = VISUAL_STATE_PRIORITY[currentState] || 0;
            var nextPriority = VISUAL_STATE_PRIORITY[nextState] || 0;
            var holdMs = 0;
            var urgentResponseState = (nextState === 'listening') || (nextState === 'speaking') || (nextState === 'thinking' && isRequestPending);
            if (!urgentResponseState && elapsed < visualStateMachine.minStateMs && nextPriority <= currentPriority) {
                holdMs = visualStateMachine.minStateMs - elapsed;
            }
            var debounceMs = nextState === 'error' ? 120 : visualStateMachine.debounceMs;
            if (nextPriority > currentPriority) debounceMs = Math.min(debounceMs, 120);
            if (urgentResponseState) debounceMs = 0;
            var waitMs = Math.max(holdMs, debounceMs);

            if (waitMs <= 0) {
                applyWidgetVisualState(nextState);
                return;
            }

            visualStateMachine.timer = setTimeout(function() {
                visualStateMachine.timer = null;
                if (visualStateMachine.requested !== nextState) return;
                applyWidgetVisualState(nextState);
            }, waitMs);
        }
        function getWidgetVisualState() {
            return visualStateMachine.current;
        }
        applyWidgetVisualState('idle');
        var externalStateController = null;
        if (window.ManyashaWidgetState && typeof window.ManyashaWidgetState.createVisualStateController === 'function') {
            if (typeof window.ManyashaWidgetState.normalizeVisualState === 'function') {
                normalizeVisualState = window.ManyashaWidgetState.normalizeVisualState;
            }
            externalStateController = window.ManyashaWidgetState.createVisualStateController({
                initialState: 'idle',
                debounceMs: 280,
                minStateMs: 700,
                onApply: function (nextState) {
                    applyWidgetVisualState(nextState);
                }
            });
            setWidgetVisualState = function (state) {
                externalStateController.setState(state);
            };
            getWidgetVisualState = function () {
                return externalStateController.getState();
            };
            externalStateController.forceState('idle');
        }

        function postManyashaEmbedMessage(type, payload) {
            if (!embedMode || !inIframe) return;
            var out = Object.assign({ type: type }, (payload || {}));
            try { window.parent.postMessage(out, '*'); } catch (e) {}
        }

        var embedResizeRaf = null;
        var embedResizeObserver = null;
        function reportManyashaEmbedSize() {
            if (!embedMode || !inIframe) return;
            var target = null;
            if (widget && widget.style.display !== 'none') target = widget;
            else if (showBtn && showBtn.style.display !== 'none') target = showBtn;
            if (!target) return;
            var rect = target.getBoundingClientRect();
            if (!rect || !rect.width || !rect.height) return;
            var cardEl = document.getElementById('manyasha-card');
            var chatElLocal = document.getElementById('manyasha-chat');
            var sizePreset = {
                compact: { w: 340, h: 620 },
                medium: { w: 380, h: 700 },
                large: { w: 420, h: 760 }
            }[embedSizeHint] || { w: 380, h: 700 };
            var chatMode = 'normal';
            if ((widget && widget.classList.contains('chat-fullsize')) || (chatElLocal && chatElLocal.classList.contains('fullsize'))) {
                chatMode = 'fullsize';
            } else if ((widget && widget.classList.contains('chat-expanded')) || (chatElLocal && chatElLocal.classList.contains('expanded'))) {
                chatMode = 'expanded';
            }
            var widthHint = 0;
            var heightHint = 0;
            if (widget && widget.style.display !== 'none') {
                if (chatMode === 'expanded') {
                    widthHint = 520;
                    heightHint = sizePreset.h + 70;
                } else if (chatMode === 'fullsize') {
                    widthHint = 700;
                    heightHint = sizePreset.h + 150;
                } else {
                    widthHint = Math.max(
                        Math.ceil(rect.width),
                        cardEl ? Math.ceil(cardEl.offsetWidth || 0) : 0,
                        320
                    );
                    heightHint = Math.max(
                        Math.ceil(rect.height),
                        cardEl ? Math.ceil(cardEl.scrollHeight || 0) : 0,
                        420
                    );
                }
            } else {
                widthHint = Math.max(70, sizePreset.w * 0.18);
                heightHint = widthHint;
            }
            var preferredWidth = Math.max(
                Math.ceil(rect.width),
                Math.ceil(target.scrollWidth || 0),
                Math.ceil(target.offsetWidth || 0),
                cardEl ? Math.ceil(cardEl.scrollWidth || 0) : 0,
                cardEl ? Math.ceil(cardEl.offsetWidth || 0) : 0,
                Math.ceil(widthHint)
            );
            var preferredHeight = Math.max(
                Math.ceil(rect.height),
                Math.ceil(target.scrollHeight || 0),
                Math.ceil(target.offsetHeight || 0),
                cardEl ? Math.ceil(cardEl.scrollHeight || 0) : 0,
                cardEl ? Math.ceil(cardEl.offsetHeight || 0) : 0,
                Math.ceil(heightHint)
            );
            postManyashaEmbedMessage('manyasha:resize', {
                width: preferredWidth,
                height: preferredHeight
            });
        }
        function scheduleManyashaEmbedSizeReport() {
            if (!embedMode || !inIframe) return;
            if (embedResizeRaf) {
                try { cancelAnimationFrame(embedResizeRaf); } catch (e) {}
                embedResizeRaf = null;
            }
            embedResizeRaf = requestAnimationFrame(function() {
                embedResizeRaf = null;
                reportManyashaEmbedSize();
            });
        }
        if (embedMode && inIframe && typeof ResizeObserver !== 'undefined') {
            try {
                embedResizeObserver = new ResizeObserver(function() {
                    scheduleManyashaEmbedSizeReport();
                });
                if (widget) embedResizeObserver.observe(widget);
                if (showBtn) embedResizeObserver.observe(showBtn);
                var cardWatch = document.getElementById('manyasha-card');
                if (cardWatch) embedResizeObserver.observe(cardWatch);
            } catch (e) {}
        }

        function closeManyashaMenu() {
            if (!menuPanel) return;
            menuPanel.classList.remove('open');
            menuPanel.setAttribute('aria-hidden', 'true');
            if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
        }
        function toggleManyashaMenu() {
            if (!menuPanel) return;
            var open = !menuPanel.classList.contains('open');
            menuPanel.classList.toggle('open', open);
            menuPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
            if (menuBtn) menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
        if (menuBtn && menuPanel) {
            menuBtn.setAttribute('aria-expanded', 'false');
            menuBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleManyashaMenu();
            });
            document.addEventListener('click', function(e) {
                if (!menuPanel.classList.contains('open')) return;
                if (menuPanel.contains(e.target) || menuBtn.contains(e.target)) return;
                closeManyashaMenu();
            });
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') closeManyashaMenu();
            });
        }

        // ─── 1. ПОКАЗ / СКРЫТИЕ ВИДЖЕТА ───
        function hideManyasha() {
            closeManyashaMenu();
            if (embedMode && inIframe) {
                postManyashaEmbedMessage('manyasha:close');
                return;
            }
            if (window.manyashaPlay) window.manyashaPlay('goodbye');
            widget.classList.add('manyasha-hidden');
            if (a11yController && typeof a11yController.updateExpanded === 'function') {
                a11yController.updateExpanded(false);
            }
            setTimeout(function() {
                widget.style.display = 'none';
                if (showBtn) {
                    showBtn.style.display = 'block';
                    setTimeout(function() { showBtn.classList.remove('manyasha-hidden'); }, 10);
                }
                scheduleManyashaEmbedSizeReport();
            }, 350);
        }

        function showManyasha() {
            closeManyashaMenu();
            if (a11yController && typeof a11yController.updateExpanded === 'function') {
                a11yController.updateExpanded(true);
            }
            if (showBtn) {
                showBtn.classList.add('manyasha-hidden');
                setTimeout(function() {
                    showBtn.style.display = 'none';
                    widget.style.display = '';
                    setTimeout(function() {
                        widget.classList.remove('manyasha-hidden');
                        scheduleManyashaEmbedSizeReport();
                    }, 10);
                }, 350);
            } else {
                widget.style.display = '';
                widget.classList.remove('manyasha-hidden');
                scheduleManyashaEmbedSizeReport();
            }
        }

        if (hideBtn) hideBtn.addEventListener('click', hideManyasha);
        if (showBtn) {
            showBtn.classList.add('manyasha-hidden');
        }
        if (a11yController && typeof a11yController.updateExpanded === 'function') {
            a11yController.updateExpanded(widget.style.display !== 'none');
        }
        // Трекаем первое открытие после инициализации sessionId ниже.
        var initialWidgetOpenedFirst = !_storageGet(_storageKey('manyasha_seen'), '');
        _storageSet(_storageKey('manyasha_seen'), '1');
        setTimeout(scheduleManyashaEmbedSizeReport, 60);

        // ─── 2. DRAG & DROP ───
        var manyashaShowBtnDragSuppressUntil = 0;
        var WIDGET_POS_KEY = _storageKey('manyasha_widget_pos_v1');
        var SHOW_BTN_POS_KEY = _storageKey('manyasha_show_btn_pos_v1');

        function clampManyashaPosition(left, top, width, height) {
            var margin = 6;
            var maxLeft = Math.max(margin, window.innerWidth - width - margin);
            var maxTop = Math.max(margin, window.innerHeight - height - margin);
            return {
                left: Math.min(Math.max(left, margin), maxLeft),
                top: Math.min(Math.max(top, margin), maxTop)
            };
        }

        function applyManyashaFixedPosition(el, left, top) {
            el.style.left = Math.round(left) + 'px';
            el.style.top = Math.round(top) + 'px';
            el.style.right = 'auto';
            el.style.bottom = 'auto';
        }

        function saveManyashaPosition(key, pos) {
            try { localStorage.setItem(key, JSON.stringify(pos)); } catch (e) {}
        }

        function loadManyashaPosition(key) {
            try {
                var raw = localStorage.getItem(key);
                if (!raw) return null;
                var parsed = JSON.parse(raw);
                if (!parsed || typeof parsed.left !== 'number' || typeof parsed.top !== 'number') return null;
                return parsed;
            } catch (e) {
                return null;
            }
        }

        function restoreManyashaPosition(el, key) {
            if (!el) return;
            if (embedMode && inIframe) return;
            var saved = loadManyashaPosition(key);
            if (!saved) return;
            var r = el.getBoundingClientRect();
            var width = r.width || el.offsetWidth || 0;
            var height = r.height || el.offsetHeight || 0;
            if (!width || !height) return;
            var p = clampManyashaPosition(saved.left, saved.top, width, height);
            applyManyashaFixedPosition(el, p.left, p.top);
        }

        function keepManyashaInViewport(el, key) {
            if (!el || !el.offsetWidth || !el.offsetHeight) return;
            if (embedMode && inIframe) return;
            var r = el.getBoundingClientRect();
            var p = clampManyashaPosition(r.left, r.top, r.width, r.height);
            applyManyashaFixedPosition(el, p.left, p.top);
            saveManyashaPosition(key, p);
        }

        function makeManyashaDraggable(config) {
            var target = config && config.target;
            var handle = config && config.handle;
            var storageKey = config && config.storageKey;
            var onEnd = config && config.onEnd;
            var shouldStart = config && config.shouldStart;
            var embedDragTarget = (config && config.embedDragTarget) || 'widget';
            var disableTouchAction = !config || config.disableTouchAction !== false;
            if (!target || !handle) return;

            if (disableTouchAction) {
                handle.style.touchAction = 'none';
            }
            handle.style.userSelect = 'none';

            var drag = null;

            function requestDragFrame(cb) {
                if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(cb);
                return setTimeout(cb, 16);
            }

            function cancelDragFrame(id) {
                if (!id) return;
                if (typeof cancelAnimationFrame === 'function') {
                    cancelAnimationFrame(id);
                } else {
                    clearTimeout(id);
                }
            }

            function startDragVisual(activeDrag) {
                if (!activeDrag || activeDrag.visualActive) return;
                activeDrag.visualActive = true;
                activeDrag.previousTransform = target.style.transform;
                activeDrag.previousTransition = target.style.transition;
                activeDrag.previousWillChange = target.style.willChange;
                if (target.classList) target.classList.add('manyasha-dragging');
                target.style.transition = 'opacity 0.24s ease';
                target.style.willChange = 'transform';
            }

            function finishDragVisual(activeDrag) {
                if (!activeDrag || !activeDrag.visualActive) return;
                if (target.classList) target.classList.remove('manyasha-dragging');
                target.style.transform = activeDrag.previousTransform || '';
                target.style.transition = activeDrag.previousTransition || '';
                target.style.willChange = activeDrag.previousWillChange || '';
            }

            function updateDragLatestFromEvent(activeDrag, e) {
                if (!activeDrag || !e) return { dx: 0, dy: 0 };
                // В iframe clientX/clientY меняются, когда host двигает iframe.
                // screenX/screenY дают стабильную дельту и убирают дрожание embed-drag.
                var dx = embedMode && inIframe
                    ? ((typeof e.screenX === 'number' ? e.screenX : e.clientX) - activeDrag.startScreenX)
                    : (e.clientX - activeDrag.startX);
                var dy = embedMode && inIframe
                    ? ((typeof e.screenY === 'number' ? e.screenY : e.clientY) - activeDrag.startScreenY)
                    : (e.clientY - activeDrag.startY);
                if (embedMode && inIframe) {
                    activeDrag.latestDx = dx;
                    activeDrag.latestDy = dy;
                } else {
                    var p = clampManyashaPosition(activeDrag.left + dx, activeDrag.top + dy, activeDrag.width, activeDrag.height);
                    activeDrag.latestLeft = p.left;
                    activeDrag.latestTop = p.top;
                    activeDrag.latestDx = p.left - activeDrag.left;
                    activeDrag.latestDy = p.top - activeDrag.top;
                }
                return { dx: dx, dy: dy };
            }

            function flushDragFrame() {
                if (!drag) return;
                drag.raf = null;
                if (embedMode && inIframe) {
                    postManyashaEmbedMessage('manyasha:embed-drag', {
                        target: embedDragTarget,
                        dx: drag.latestDx || 0,
                        dy: drag.latestDy || 0,
                        width: drag.width,
                        height: drag.height
                    });
                    return;
                }
                target.style.transform = 'translate3d(' +
                    Math.round(drag.latestDx || 0) + 'px, ' +
                    Math.round(drag.latestDy || 0) + 'px, 0)';
            }

            function scheduleDragFrame() {
                if (!drag || drag.raf) return;
                drag.raf = requestDragFrame(flushDragFrame);
            }

            handle.addEventListener('pointerdown', function(e) {
                if (e.button !== undefined && e.button !== 0) return;
                if (typeof shouldStart === 'function' && !shouldStart(e)) return;
                var rect = target.getBoundingClientRect();
                drag = {
                    pointerId: e.pointerId,
                    startX: e.clientX,
                    startY: e.clientY,
                    startScreenX: typeof e.screenX === 'number' ? e.screenX : e.clientX,
                    startScreenY: typeof e.screenY === 'number' ? e.screenY : e.clientY,
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                    moved: false,
                    latestDx: 0,
                    latestDy: 0,
                    latestLeft: rect.left,
                    latestTop: rect.top,
                    raf: null,
                    visualActive: false
                };
                try { handle.setPointerCapture(e.pointerId); } catch (err) {}
                document.body.style.userSelect = 'none';
                if (embedMode && inIframe) {
                    postManyashaEmbedMessage('manyasha:embed-drag-start', {
                        target: embedDragTarget,
                        width: rect.width,
                        height: rect.height
                    });
                }
                e.preventDefault();
            });

            function endDrag(e) {
                if (!drag) return;
                if (e && drag.pointerId !== e.pointerId) return;
                var activeDrag = drag;
                if (e) updateDragLatestFromEvent(activeDrag, e);
                if (activeDrag.raf) {
                    cancelDragFrame(activeDrag.raf);
                    activeDrag.raf = null;
                }
                var wasMoved = activeDrag.moved;
                if (wasMoved && embedMode && inIframe) {
                    postManyashaEmbedMessage('manyasha:embed-drag', {
                        target: embedDragTarget,
                        dx: activeDrag.latestDx || 0,
                        dy: activeDrag.latestDy || 0,
                        width: activeDrag.width,
                        height: activeDrag.height
                    });
                } else if (wasMoved) {
                    var finalPos = {
                        left: activeDrag.latestLeft,
                        top: activeDrag.latestTop
                    };
                    applyManyashaFixedPosition(target, finalPos.left, finalPos.top);
                    saveManyashaPosition(storageKey, finalPos);
                }
                drag = null;
                finishDragVisual(activeDrag);
                document.body.style.userSelect = '';
                if (embedMode && inIframe) {
                    postManyashaEmbedMessage('manyasha:embed-drag-end', {
                        target: embedDragTarget,
                        moved: !!wasMoved
                    });
                }
                if (typeof onEnd === 'function') onEnd(wasMoved);
            }

            handle.addEventListener('pointermove', function(e) {
                if (!drag || drag.pointerId !== e.pointerId) return;
                var delta = updateDragLatestFromEvent(drag, e);
                if (!drag.moved && (Math.abs(delta.dx) > 3 || Math.abs(delta.dy) > 3)) {
                    drag.moved = true;
                    startDragVisual(drag);
                }
                if (!drag.moved) return;
                scheduleDragFrame();
            });

            handle.addEventListener('pointerup', endDrag);
            handle.addEventListener('pointercancel', endDrag);
        }

        function isManyashaInteractiveTarget(target) {
            if (!target || typeof target.closest !== 'function') return false;
            return !!target.closest(
                'button, input, textarea, a, [contenteditable="true"], ' +
                '#manyasha-chat-messages, #manyasha-quick-panel, ' +
                '.quick-replies, .suggested-questions, .consult-offer-card'
            );
        }

        restoreManyashaPosition(widget, WIDGET_POS_KEY);
        restoreManyashaPosition(showBtn, SHOW_BTN_POS_KEY);

        if (widget) {
            var widgetDragHandle = widgetHeader || widget;
            makeManyashaDraggable({
                target: widget,
                handle: widgetDragHandle,
                storageKey: WIDGET_POS_KEY,
                disableTouchAction: false,
                embedDragTarget: 'widget',
                shouldStart: function(e) {
                    if (!widget || widget.style.display === 'none') return false;
                    if (isManyashaInteractiveTarget(e.target)) return false;
                    closeManyashaMenu();
                    return true;
                }
            });
        }

        if (showBtn) {
            makeManyashaDraggable({
                target: showBtn,
                handle: showBtn,
                storageKey: SHOW_BTN_POS_KEY,
                embedDragTarget: 'show_button',
                disableTouchAction: true,
                onEnd: function(moved) {
                    if (moved) manyashaShowBtnDragSuppressUntil = Date.now() + 260;
                }
            });
        }

        window.addEventListener('resize', function() {
            applyManyashaHostTheme();
            keepManyashaInViewport(widget, WIDGET_POS_KEY);
            if (showBtn && showBtn.style.display !== 'none') {
                keepManyashaInViewport(showBtn, SHOW_BTN_POS_KEY);
            }
            scheduleManyashaEmbedSizeReport();
        });


        // ─── 3. СТЕЙТ-МАШИНА ВИДЕО МАНЯШИ ───
        var mediaController = null;
        if (window.ManyashaWidgetMedia && typeof window.ManyashaWidgetMedia.createMediaController === 'function') {
            mediaController = window.ManyashaWidgetMedia.createMediaController({
                stageElement: stage,
                videoAElement: document.getElementById('mv-a'),
                videoBElement: document.getElementById('mv-b'),
                fallbackElement: document.getElementById('manyasha-stage-fallback')
            });
            if (mediaController && typeof mediaController.init === 'function') {
                mediaController.init();
            }
        }
        if (typeof window.manyashaPlay !== 'function') {
            window.manyashaPlay = function() {};
        }
        if (typeof window.manyashaSetLoop !== 'function') {
            window.manyashaSetLoop = function() {};
        }

        // ─── 4. ЧАТ С МАНЯШЕЙ (Ollama LLM) ───
        var chatMessages = document.getElementById('manyasha-chat-messages');
        var chatForm    = document.getElementById('manyasha-chat-form');
        var chatInput   = document.getElementById('manyasha-chat-input');
        var chatSend    = document.getElementById('manyasha-chat-send');
        var opsStatusEl = document.getElementById('manyasha-ops-status');
        var bootstrapStatusEl = document.getElementById('manyasha-bootstrap-status');
        var voiceBtn    = document.getElementById('manyasha-voice-btn');
        var voiceAutoBtn = document.getElementById('manyasha-voice-auto-btn');
        var voiceStatusEl = document.getElementById('manyasha-voice-status');
        var voiceStatusTextEl = document.getElementById('manyasha-voice-status-text');
        var chatHistory = [];
        var API_CHAT_PATH = '/api/manyasha/chat';
        var consultOffersCount = 0;
        var MAX_CONSULT_OFFERS = 1;
        var CHAT_CONSULT_OFFERS_ENABLED = false;
        var CONSULT_AUTO_MIN_USER_MESSAGES = 3;
        var CONSULT_AUTO_COOLDOWN_MS = 180000;
        var MIN_THINK_MS = 1400;
        var VOICE_TEXT_START_DELAY_MS = 100;
        var WAITING_TO_MAIN_PAUSE_MS = 110;
        var THINKING_VIDEO_MIN_VISIBLE_MS = 420;
        var THINKING_VIDEO_MAX_REPLY_DELAY_MS = 1600;
        var ANSWERING_VIDEO_MIN_VISIBLE_MS = 900;
        var ANSWERING_VIDEO_MAX_IDLE_DELAY_MS = 1300;
        var CHAT_CONTEXT_BUDGET_MS = 90;
        var isRequestPending = false;
        var currentReplyFlowId = 0;
        var activeReplyAbortController = null;
        var activeSpeechTypingFlow = null;
        var activeWaitingBubbleEl = null;
        var consultOfferVisible = false;
        var consultOfferDismissed = false;
        var consultLastOfferedAt = 0;
        var OUTBOX_KEY = 'manyasha_chat_outbox_v2';
        var triggerEngineStarted = false;
        var handoffPollTimer = null;
        var handoffActiveTicketId = '';
        var handoffManager = null;
        var showNonCriticalBootstrapStatus =
            !!(
                (typeof window.__MANAYA_WIDGET_DEBUG_STATUS !== 'undefined' && window.__MANAYA_WIDGET_DEBUG_STATUS) ||
                (queryParam('widget_debug') === '1') ||
                (queryParam('manyasha_debug') === '1') ||
                (queryParam('debug') === '1')
            );
        var USER_FRIENDLY_CONNECTION_ERROR = 'Не могу подключиться к серверу. Проверьте интернет или попробуйте обновить страницу.';
        var INSTALL_HEALTH_RECHECK_COOLDOWN_MS = 20000;
        var installHealthInFlight = null;
        var installHealthNextAllowedAt = 0;
        var backendContextFailureCount = 0;
        var backendContextNextRetryAt = 0;

        if (!chatMessages || !chatForm || !chatInput) {
            console.warn('⚠️ Элементы чата не найдены — чат не инициализирован');
            return;
        }
        function isConsultModalOpen() {
            return !!(consultModal && consultModal.classList.contains('open'));
        }
        function focusChatInputIfSafe() {
            if (!chatInput || chatInput.disabled || isConsultModalOpen()) return;
            chatInput.focus();
        }
        var a11yController = null;
        if (window.ManyashaWidgetA11y && typeof window.ManyashaWidgetA11y.setDefaults === 'function') {
            a11yController = window.ManyashaWidgetA11y.setDefaults({
                widget: widget,
                showButton: showBtn,
                hideButton: hideBtn,
                menuButton: menuBtn,
                chatInput: chatInput
            });
        }

        function setOperationalState(state, text) {
            if (!opsStatusEl) return;
            if (!state || state === 'normal') {
                opsStatusEl.classList.remove('visible', 'state-degraded', 'state-offline');
                opsStatusEl.textContent = '';
                return;
            }
            opsStatusEl.classList.add('visible');
            opsStatusEl.classList.toggle('state-degraded', state === 'degraded');
            opsStatusEl.classList.toggle('state-offline', state === 'offline');
            opsStatusEl.textContent = text || (state === 'offline'
                ? 'Сеть нестабильна. Работаем в безопасном режиме.'
                : 'Временная нагрузка. Могут быть задержки ответа.');
        }
        function setBootstrapStatus(level, text) {
            if (!bootstrapStatusEl) return;
            var message = String(text || '').trim();
            bootstrapStatusEl.classList.remove('state-ok', 'state-warn', 'state-error', 'visible');
            if (!message) {
                bootstrapStatusEl.textContent = '';
                if (!isRequestPending && !voiceListening && getWidgetVisualState() === 'error') {
                    setWidgetVisualState('idle');
                }
                return;
            }
            // По умолчанию не показываем технические статусы (ok/warn) в клиентском интерфейсе.
            // Для диагностики можно включить query-параметр ?widget_debug=1 или window.__MANAYA_WIDGET_DEBUG_STATUS=true.
            if (level !== 'error' && !showNonCriticalBootstrapStatus) {
                bootstrapStatusEl.textContent = '';
                return;
            }
            bootstrapStatusEl.classList.add('visible');
            if (level === 'error') {
                bootstrapStatusEl.classList.add('state-error');
                if (!isRequestPending && !voiceListening) {
                    setWidgetVisualState('error');
                }
            } else if (level === 'warn') {
                bootstrapStatusEl.classList.add('state-warn');
            }
            if (level === 'error' && !showNonCriticalBootstrapStatus) {
                if (message && message !== USER_FRIENDLY_CONNECTION_ERROR) {
                    try { console.warn('[manyasha-bootstrap][debug-hidden]', message); } catch (_eBootstrapLog) {}
                }
                bootstrapStatusEl.textContent = USER_FRIENDLY_CONNECTION_ERROR;
                return;
            }
            bootstrapStatusEl.textContent = message;
        }
        function describeBootstrapIssue() {
            var issues = [];
            if (!requestedApiOrigin) issues.push('api_origin не задан');
            if (!EMBED_PID) issues.push('pid не задан');
            if (!EMBED_SITE_KEY) issues.push('site_key не задан');
            if (!EMBED_INSTALL_TOKEN) issues.push('install_token не задан');
            if (!EMBED_CONTRACT_VERSION) issues.push('embed_contract_version не задан');
            var lines = [
                'Контракт: ' + (EMBED_CONTRACT_VERSION || 'не задан'),
                'pid: ' + (EMBED_PID || 'default'),
                'api_origin: ' + (requestedApiOrigin || 'не задан'),
                'site_key: ' + (EMBED_SITE_KEY ? 'задан' : 'не задан'),
                'install_token: ' + (EMBED_INSTALL_TOKEN ? 'задан' : 'не задан')
            ];
            if (issues.length) {
                lines.push('Что проверить: ' + issues.join(', '));
                setBootstrapStatus(
                    'warn',
                    'Bootstrap-конфиг может быть неполным для strict-режима. ' + lines.join(', ')
                );
            } else {
                setBootstrapStatus('ok', 'Конфиг embed: ' + lines.join(', '));
            }
        }
        function buildInstallHealthUrl() {
            var url = '/api/manyasha/widget-install-health?pid=' + encodeURIComponent(EMBED_PID || 'default');
            if (EMBED_SITE_KEY) url += '&site_key=' + encodeURIComponent(EMBED_SITE_KEY);
            if (EMBED_INSTALL_TOKEN) url += '&install_token=' + encodeURIComponent(EMBED_INSTALL_TOKEN);
            url += '&embed_contract_version=' + encodeURIComponent(EMBED_CONTRACT_VERSION || '');
            return url;
        }
        function fetchInstallHealth() {
            return manyashaFetchWithRetry(buildInstallHealthUrl(), {}, { retries: 1, retryDelayMs: 220, timeoutMs: 7000 })
                .then(function(r) {
                    if (!r.ok) throw new Error('install_health_http_' + r.status);
                    return r.json();
                })
                .catch(function(err) {
                    var reason = String(err && err.message ? err.message : err || 'unknown');
                    var reasonLc = reason.toLowerCase();
                    var isNetworkFailure = (
                        reasonLc.indexOf('failed to fetch') !== -1 ||
                        reasonLc.indexOf('networkerror') !== -1 ||
                        reasonLc.indexOf('load failed') !== -1 ||
                        reasonLc.indexOf('manyasha_fetch_failed') !== -1
                    );
                    var code = reason.indexOf('install_health_http_') === 0
                        ? 'install_health_http'
                        : (isNetworkFailure ? 'install_health_network' : 'install_health_failed');
                    var checkCode = reason.indexOf('install_health_http_') === 0
                        ? reason
                        : (isNetworkFailure ? 'install_health_network' : 'install_health_failed');
                    var summary = USER_FRIENDLY_CONNECTION_ERROR;
                    var details = reason || 'request failed';
                    if (isNetworkFailure && showNonCriticalBootstrapStatus) {
                        details += ' Проверь `api_origin` и CORS backend для текущего origin браузера.';
                    }
                    if (!showNonCriticalBootstrapStatus) {
                        details = 'network_or_backend_unreachable';
                    }
                    return {
                        status: 'error',
                        code: code,
                        summary: summary,
                        checks: [
                            {
                                status: 'error',
                                code: checkCode,
                                message: details
                            }
                        ]
                    };
                });
        }
        function requestInstallHealthWithCooldown(force) {
            var now = Date.now();
            var bypassCooldown = !!force;
            if (installHealthInFlight) return installHealthInFlight;
            if (!bypassCooldown && installHealthNextAllowedAt && now < installHealthNextAllowedAt) {
                return Promise.resolve(null);
            }
            installHealthNextAllowedAt = now + INSTALL_HEALTH_RECHECK_COOLDOWN_MS;
            installHealthInFlight = fetchInstallHealth()
                .then(function(health) {
                    if (health) applyInstallHealthBootstrap(health);
                    return health;
                })
                .catch(function(err) {
                    if (showNonCriticalBootstrapStatus) {
                        try { console.warn('[manyasha-install-health] check failed', err); } catch (_eHealthLog) {}
                    }
                    return null;
                })
                .finally(function() {
                    installHealthInFlight = null;
                });
            return installHealthInFlight;
        }
        function applyInstallHealthBootstrap(health) {
            if (!health) return;
            var level = 'warn';
            if (health.status === 'ok') level = 'ok';
            else if (health.status === 'error') level = 'error';
            if (String(health.code || '') === 'widget_install_ready' && health.status !== 'error') level = 'ok';
            var lines = [
                'Install health: ' + String(health.summary || ''),
                'code: ' + String(health.code || 'unknown')
            ];
            if (Array.isArray(health.checks)) {
                var problems = [];
                var i;
                for (i = 0; i < health.checks.length; i += 1) {
                    var item = health.checks[i] || {};
                    var status = String(item.status || '');
                    if (!status || status === 'ok') continue;
                    if (level === 'ok' && status !== 'warn') continue;
                    if (level === 'error' && status !== 'error') continue;
                    if (problems.length < 2) {
                        problems.push(String(item.code || 'check') + ': ' + String(item.message || ''));
                    }
                }
                if (problems.length) {
                    lines.push((level === 'error' ? 'Ключевые ошибки: ' : 'Ключевые замечания: ') + problems.join(' | '));
                }
            }
            setBootstrapStatus(level, lines.join('\n'));
        }
        if (embedMode) {
            describeBootstrapIssue();
            requestInstallHealthWithCooldown(true);
        }

        var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        var voiceRecognition = null;
        var voiceListening = false;
        var voicePressMode = false;
        var suppressVoiceClick = false;
        var voiceInteractedOnce = false;
        var voiceFinalTranscript = '';
        var voiceInterimTranscript = '';
        var voiceAutoMode = false;
        var autoListenTimer = null;
        var autoListenCooldownUntil = 0;
        var voiceFallbackLastAt = 0;
        var voiceFallbackResetTimer = null;
        var ALLOWED_TTS_SOURCES = {
            chat_submit_waiting_phrase: true,
            chat_submit_main_reply: true,
            explicit_voice_input: true,
            explicit_user_clicked_voice: true
        };
        function isAllowedTTSSource(source) {
            return !!ALLOWED_TTS_SOURCES[String(source || '').trim()];
        }
        function isAllowedVoiceInputSource(source) {
            return source === 'explicit_voice_input' || source === 'explicit_user_clicked_voice';
        }
        function scheduleVoiceIdleRestore(delayMs) {
            if (voiceFallbackResetTimer) {
                clearTimeout(voiceFallbackResetTimer);
                voiceFallbackResetTimer = null;
            }
            voiceFallbackResetTimer = setTimeout(function() {
                if (voiceListening || isRequestPending) return;
                if (voiceAutoMode && !isMuted) setVoiceStatus('thinking', 'Жду следующую фразу…');
                else setVoiceStatus('idle', '');
            }, Math.max(1100, delayMs || 1700));
        }
        function showVoiceFallbackStatus(text, options) {
            var opts = options || {};
            var cooldownMs = typeof opts.cooldownMs === 'number' ? Math.max(200, opts.cooldownMs) : 2200;
            var now = Date.now();
            if ((now - voiceFallbackLastAt) < cooldownMs) return;
            voiceFallbackLastAt = now;
            if (isRequestPending && !voiceListening) {
                if (voiceStatusEl && voiceStatusTextEl) {
                    voiceStatusEl.classList.remove('state-listening', 'state-speaking', 'state-error');
                    voiceStatusEl.classList.add('visible', 'state-thinking');
                    voiceStatusTextEl.textContent = text || 'Голос временно недоступен';
                }
                scheduleVoiceIdleRestore(typeof opts.resetMs === 'number' ? opts.resetMs : 1800);
                return;
            }
            setVoiceStatus('error', text || 'Голос временно недоступен');
            scheduleVoiceIdleRestore(typeof opts.resetMs === 'number' ? opts.resetMs : 1800);
        }
        function setVoiceListening(on) {
            voiceListening = !!on;
            if (!voiceBtn) return;
            voiceBtn.classList.toggle('listening', voiceListening);
            voiceBtn.title = voiceListening ? 'Слушаю... Отпустите кнопку, чтобы отправить' : 'Голосовой ввод';
            if (voiceListening) {
                setVoiceStatus('listening', 'Слушаю…');
            } else if (voiceAutoMode) {
                setVoiceStatus('thinking', 'Жду следующую фразу…');
            } else {
                setVoiceStatus('idle', '');
            }
        }
        function _normalizeVoiceText(text) {
            return String(text || '')
                .replace(/\s+/g, ' ')
                .replace(/[.,!?;:]{2,}/g, '.')
                .trim();
        }
        function _shouldSubmitVoiceText(text) {
            var t = _normalizeVoiceText(text);
            if (!t || t.length < 4) return false;
            var words = t.split(/\s+/).filter(Boolean);
            if (words.length < 2 && t.length < 10) return false;
            var letters = (t.match(/[а-яёa-z0-9]/gi) || []).length;
            return letters >= Math.max(3, Math.floor(t.length * 0.35));
        }
        function setVoiceAutoMode(on) {
            voiceAutoMode = !!on;
            if (!voiceAutoBtn) return;
            voiceAutoBtn.classList.toggle('active', voiceAutoMode);
            voiceAutoBtn.title = voiceAutoMode ? 'Режим звонка: включён' : 'Режим звонка';
            if (!voiceAutoMode) {
                if (autoListenTimer) { clearTimeout(autoListenTimer); autoListenTimer = null; }
                setVoiceStatus('idle', '');
            }
        }
        function setVoiceStatus(state, text) {
            if (state === 'listening') setWidgetVisualState('listening');
            else if (state === 'thinking') setWidgetVisualState('thinking');
            else if (state === 'speaking') setWidgetVisualState('speaking');
            else if (state === 'error') setWidgetVisualState('error');
            else if ((!state || state === 'idle') && !isRequestPending) setWidgetVisualState('idle');

            if (!voiceStatusEl || !voiceStatusTextEl) return;
            voiceStatusEl.classList.remove('state-listening', 'state-thinking', 'state-speaking', 'state-error');
            if (!state || state === 'idle') {
                voiceStatusEl.classList.remove('visible');
                voiceStatusTextEl.textContent = '';
                return;
            }
            voiceStatusEl.classList.add('visible');
            voiceStatusEl.classList.add('state-' + state);
            voiceStatusTextEl.textContent = text || '';
        }
        function maybeResumeAutoListen(delayMs) {
            if (!voiceAutoMode || isMuted || voiceListening) return;
            if (chatSend && chatSend.disabled) return;
            if (ttsBusy || ttsQueue.length || currentAudio || pendingAutoplayAudio) return;
            if (Date.now() < autoListenCooldownUntil) return;
            setVoiceStatus('thinking', 'Думаю…');
            if (autoListenTimer) { clearTimeout(autoListenTimer); autoListenTimer = null; }
            autoListenTimer = setTimeout(function() {
                if (!voiceAutoMode || isMuted || voiceListening) return;
                if (chatSend && chatSend.disabled) return;
                if (ttsBusy || ttsQueue.length || currentAudio || pendingAutoplayAudio) return;
                autoListenCooldownUntil = Date.now() + 900;
                startVoiceInput({ source: 'auto_listen' });
            }, delayMs || 350);
        }
        function stopVoiceInput() {
            if (!voiceRecognition) return;
            try { voiceRecognition.stop(); } catch (e) {}
            setVoiceListening(false);
        }
        function startVoiceInput(options) {
            var inputOpts = options || {};
            var inputSource = String(inputOpts.source || '').trim();
            if (!isAllowedVoiceInputSource(inputSource)) {
                return;
            }
            if (!SpeechRecognition) {
                addChatMsg('Голосовой ввод не поддерживается в этом браузере. Лучше открыть в Chrome.', 'bot');
                showVoiceFallbackStatus('Голосовой ввод недоступен в этом браузере.', { cooldownMs: 4000, resetMs: 2300 });
                return;
            }
            if (voiceListening) {
                stopVoiceInput();
                return;
            }
            // Барж-ин: если пользователь заговорил, сразу останавливаем текущую озвучку.
            if (typeof stopAllSpeechPlayback === 'function') stopAllSpeechPlayback();
            if (!voiceRecognition) {
                voiceRecognition = new SpeechRecognition();
                voiceRecognition.lang = 'ru-RU';
                voiceRecognition.interimResults = true;
                voiceRecognition.continuous = false;
                voiceRecognition.onstart = function() {
                    voiceFinalTranscript = '';
                    voiceInterimTranscript = '';
                    setVoiceListening(true);
                    if (window.manyashaPlay) window.manyashaPlay('listening');
                };
                voiceRecognition.onresult = function(event) {
                    var interim = '';
                    for (var i = event.resultIndex; i < event.results.length; i++) {
                        var t = event.results[i][0] && event.results[i][0].transcript ? event.results[i][0].transcript : '';
                        if (event.results[i].isFinal) voiceFinalTranscript += t + ' ';
                        else interim += t;
                    }
                    voiceInterimTranscript = interim;
                    var textNow = _normalizeVoiceText(voiceFinalTranscript + ' ' + voiceInterimTranscript);
                    chatInput.value = textNow;
                    resizeChatInputHeight();
                };
                voiceRecognition.onerror = function(event) {
                    setVoiceListening(false);
                    var code = String(event && event.error || '').toLowerCase();
                    if (code === 'not-allowed' || code === 'service-not-allowed') {
                        setVoiceAutoMode(false);
                        showVoiceFallbackStatus('Доступ к микрофону запрещён. Разрешите его в браузере.', { cooldownMs: 3200, resetMs: 2600 });
                        return;
                    }
                    if (code === 'audio-capture') {
                        showVoiceFallbackStatus('Не найден рабочий микрофон.', { cooldownMs: 2600, resetMs: 2200 });
                        return;
                    }
                    if (code === 'no-speech') {
                        showVoiceFallbackStatus('Не услышала голос, попробуйте ещё раз.', { cooldownMs: 1600, resetMs: 1300 });
                        return;
                    }
                    showVoiceFallbackStatus('Проблема с голосовым вводом, продолжаю в текстовом режиме.', { cooldownMs: 2600, resetMs: 1900 });
                };
                voiceRecognition.onend = function() {
                    setVoiceListening(false);
                    var text = _normalizeVoiceText(voiceFinalTranscript + ' ' + voiceInterimTranscript);
                    chatInput.value = text;
                    if (_shouldSubmitVoiceText(text)) {
                        setVoiceStatus('thinking', 'Думаю…');
                        // Короткая пауза как у живого собеседника перед отправкой.
                        autoListenCooldownUntil = Date.now() + 1200;
                        chatForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                    } else if (voiceInteractedOnce && text) {
                        addChatMsg('Я не до конца расслышала фразу. Повтори, пожалуйста, чуть медленнее.', 'bot');
                    }
                };
            }
            try {
                voiceRecognition.start();
            } catch (e) {}
        }
        if (voiceBtn) {
            // Push-to-talk: зажал — говоришь, отпустил — отправка.
            voiceBtn.addEventListener('pointerdown', function(e) {
                e.preventDefault();
                voiceInteractedOnce = true;
                voicePressMode = true;
                startVoiceInput({ source: 'explicit_user_clicked_voice' });
            });
            ['pointerup', 'pointercancel', 'pointerleave'].forEach(function(evt) {
                voiceBtn.addEventListener(evt, function() {
                    if (!voicePressMode) return;
                    voicePressMode = false;
                    suppressVoiceClick = true;
                    stopVoiceInput();
                });
            });
            // fallback на клик (если pointer не сработал)
            voiceBtn.addEventListener('click', function(e) {
                if (voicePressMode || suppressVoiceClick) {
                    suppressVoiceClick = false;
                    return;
                }
                e.preventDefault();
                voiceInteractedOnce = true;
                startVoiceInput({ source: 'explicit_user_clicked_voice' });
            });
        }
        if (voiceAutoBtn) {
            voiceAutoBtn.addEventListener('click', function() {
                setVoiceAutoMode(!voiceAutoMode);
                if (voiceAutoMode) {
                    if (typeof stopAllSpeechPlayback === 'function') stopAllSpeechPlayback();
                } else {
                    if (voiceListening) stopVoiceInput();
                }
            });
        }

        var scrollBottomBtn = document.getElementById('manyasha-scroll-bottom');
        var chatScrollPinned = true;

        function isNearChatBottom(threshold) {
            threshold = threshold || 56;
            return chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < threshold;
        }

        function updateScrollBottomBtn() {
            if (!scrollBottomBtn) return;
            var overflow = chatMessages.scrollHeight > chatMessages.clientHeight + 6;
            var near = isNearChatBottom(64);
            chatScrollPinned = near;
            scrollBottomBtn.classList.toggle('visible', overflow && !near);
        }

        function scrollChatToBottom(smooth) {
            chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
            chatScrollPinned = true;
            if (scrollBottomBtn) scrollBottomBtn.classList.remove('visible');
        }

        function scrollChatToBottomIfPinned(smooth) {
            if (chatScrollPinned || isNearChatBottom(72)) {
                scrollChatToBottom(!!smooth);
            } else {
                updateScrollBottomBtn();
            }
        }

        chatMessages.addEventListener('scroll', function() {
            chatScrollPinned = isNearChatBottom(64);
            updateScrollBottomBtn();
        });
        if (scrollBottomBtn) {
            scrollBottomBtn.addEventListener('click', function() {
                scrollChatToBottom(true);
            });
        }

        // ─── SESSION ID + Персонализация ───
        var SESSION_KEY   = _storageKey('manyasha_sid');
        var NAME_KEY      = _storageKey('manyasha_user_name');
        var HISTORY_KEY   = _storageKey('manyasha_history');
        var PROFILE_KEY   = _storageKey('manyasha_profile_v1');
        var DIAGNOSTICS_KEY = _storageKey('manyasha_diagnostics_v1');
        var AB_KEY        = _storageKey('manyasha_ab_variants_v2');
        var BACKEND_PARTNER_KEY = _storageKey('manyasha_backend_partner_id');
        var BACKEND_USER_KEY = _storageKey('manyasha_backend_user_id');
        var BACKEND_SESSION_KEY = _storageKey('manyasha_backend_session_id');
        var BACKEND_PERSISTENCE_DISABLED_UNTIL_KEY = _storageKey('manyasha_backend_persistence_disabled_until');
        var ANALYTICS_DISABLED_UNTIL_KEY = _storageKey('manyasha_analytics_disabled_until');
        var WIDGET_SEEN_KEY = _storageKey('manyasha_seen');
        var MUTE_KEY = _storageKey('manyasha_muted');
        var VOICE_CONSENT_KEY = _storageKey('manyasha_voice_consent_v1');
        var sessionId = _storageGet(SESSION_KEY);
        if (!sessionId) {
            sessionId = 'sid-' + Date.now() + '-' + Math.random().toString(36).slice(2,9);
            _storageSet(SESSION_KEY, sessionId);
        }
        var userName = _storageGet(NAME_KEY, '') || '';
        var manyashaProfile = {};
        (function bootstrapProfile() {
            var raw = null;
            try { raw = _storageGet(PROFILE_KEY, null); } catch (e) {}
            if (raw) {
                try { manyashaProfile = JSON.parse(raw) || {}; } catch (e) {}
            }
            var merged = {
                role: queryParam('role') || manyashaProfile.role || '',
                case_stage: queryParam('stage') || queryParam('case_stage') || manyashaProfile.case_stage || 'pre',
                debt_amount: queryParam('debt_amount') || manyashaProfile.debt_amount || '',
                debt_type: queryParam('debt_type') || manyashaProfile.debt_type || '',
                priority: queryParam('priority') || manyashaProfile.priority || '',
                diagnostics: manyashaProfile.diagnostics || {},
            };
            manyashaProfile = merged;
            try { _storageSet(PROFILE_KEY, JSON.stringify(merged)); } catch (e) {}
        })();
        var diagnosticsManager = null;
        if (window.ManyashaWidgetDiagnostics && typeof window.ManyashaWidgetDiagnostics.createDiagnostics === 'function') {
            diagnosticsManager = window.ManyashaWidgetDiagnostics.createDiagnostics({
                storageKey: DIAGNOSTICS_KEY,
                isDemoMode: function() { return demoModeEnabled; }
            });
        }

        function getManyashaProfileForChat() {
            var profile = Object.assign({}, manyashaProfile || {});
            if (diagnosticsManager && typeof diagnosticsManager.getProfileAddon === 'function' && !demoModeEnabled) {
                profile.diagnostics = diagnosticsManager.getProfileAddon();
            }
            return profile;
        }

        function hasLeadPacketValue(packet) {
            if (!packet || typeof packet !== 'object') return false;
            return Object.keys(packet).some(function(key) {
                var value = packet[key];
                if (Array.isArray(value)) return value.length > 0;
                if (typeof value === 'number') return value > 0;
                return String(value || '').trim().length > 0;
            });
        }

        function getDiagnosticsLeadPacket() {
            if (demoModeEnabled) return null;
            if (!diagnosticsManager || typeof diagnosticsManager.getLeadPacket !== 'function') return null;
            var packet = diagnosticsManager.getLeadPacket();
            return hasLeadPacketValue(packet) ? packet : null;
        }

        function buildLeadContext(extra) {
            var profile = getManyashaProfileForChat();
            var context = {};
            ['role', 'case_stage', 'debt_amount', 'debt_type', 'priority'].forEach(function(key) {
                var value = profile[key];
                if (typeof value === 'string' && value.trim()) context[key] = value.trim();
            });
            var packet = getDiagnosticsLeadPacket();
            if (packet) {
                context.diagnostics = packet;
                context.diagnostic_summary = packet;
            }
            return Object.assign(context, extra || {});
        }

        function stableHash(input) {
            var str = String(input || '');
            var h = 0;
            for (var i = 0; i < str.length; i++) {
                h = ((h << 5) - h) + str.charCodeAt(i);
                h |= 0;
            }
            return Math.abs(h);
        }
        function pickVariant(expName, values) {
            var list = values || [];
            if (!list.length) return 'default';
            var idx = stableHash(sessionId + '::' + expName) % list.length;
            return list[idx];
        }
        function getABVariants() {
            var cached = null;
            try { cached = JSON.parse(_storageGet(AB_KEY, 'null') || 'null'); } catch (e) {}
            if (cached && cached.session_id === sessionId && cached.variants) {
                return cached.variants;
            }
            var variants = {
                opening_script: pickVariant('opening_script', ['warm_expert', 'direct_expert']),
                consult_cta: pickVariant('consult_cta', ['contrast_brand', 'soft_premium']),
                trigger_style: pickVariant('trigger_style', ['soft_teaser', 'assertive_open']),
            };
            try { _storageSet(AB_KEY, JSON.stringify({ session_id: sessionId, variants: variants })); } catch (e) {}
            return variants;
        }
        var abVariants = getABVariants();

        // ─── Бэкенд: partner / user / dialog session (RLS + аудит + история в БД) ───
        var EMBED_PID = (typeof window.__MANAYA_EMBED_PID !== 'undefined' && window.__MANAYA_EMBED_PID !== null)
            ? String(window.__MANAYA_EMBED_PID)
            : (queryParam('pid') || 'default');
        var EMBED_SITE_KEY = (
            typeof window.__MANAYA_SITE_KEY !== 'undefined' && window.__MANAYA_SITE_KEY !== null
                ? String(window.__MANAYA_SITE_KEY)
                : ''
        ) || queryParam('site_key');
        var EMBED_INSTALL_TOKEN = (
            typeof window.__MANAYA_INSTALL_TOKEN !== 'undefined' && window.__MANAYA_INSTALL_TOKEN !== null
                ? String(window.__MANAYA_INSTALL_TOKEN)
                : ''
        ) || queryParam('install_token');
        var EMBED_CONTRACT_VERSION = (
            typeof window.__MANAYA_EMBED_CONTRACT_VERSION !== 'undefined' && window.__MANAYA_EMBED_CONTRACT_VERSION !== null
                ? String(window.__MANAYA_EMBED_CONTRACT_VERSION)
                : ''
        ) || queryParam('embed_contract_version');
        if (!EMBED_CONTRACT_VERSION) EMBED_CONTRACT_VERSION = '1';
        var BACKEND_PERSISTENCE_COOLDOWN_MS = 5 * 60 * 1000;
        var ANALYTICS_COOLDOWN_MS = 5 * 60 * 1000;
        var backendCtx = {
            partnerId: null,
            userId: null,
            dialogSessionId: null,
            widgetToken: '',
            widgetTokenExpiresAt: 0,
            persistenceDisabledUntil: _storageGetNumber(BACKEND_PERSISTENCE_DISABLED_UNTIL_KEY, 0) || 0,
            _promise: null,
            _lastError: ''
        };
        var analyticsDisabledUntil = _storageGetNumber(ANALYTICS_DISABLED_UNTIL_KEY, 0) || 0;
        var backendContextManager = null;
        if (window.ManyashaWidgetContext && typeof window.ManyashaWidgetContext.createBackendContextManager === 'function') {
            backendContextManager = window.ManyashaWidgetContext.createBackendContextManager({
                fetchWithRetry: manyashaFetchWithRetry,
                embedPid: EMBED_PID,
                embedSiteKey: EMBED_SITE_KEY,
                embedInstallToken: EMBED_INSTALL_TOKEN,
                embedContractVersion: EMBED_CONTRACT_VERSION || '1',
                getSessionId: function() { return sessionId; },
                setSessionId: function(nextSessionId) {
                    sessionId = String(nextSessionId || '');
                    try { localStorage.setItem(SESSION_KEY, sessionId); } catch (e) {}
                },
                getUserName: function() { return userName; },
                storageGetByKey: function(key) {
                    try { return localStorage.getItem(String(key || '')); } catch (e) {}
                    return null;
                },
                storageSetByKey: function(key, value) {
                    try { localStorage.setItem(String(key || ''), String(value || '')); } catch (e) {}
                },
                storageRemoveByKey: function(key) {
                    try { localStorage.removeItem(String(key || '')); } catch (e) {}
                },
                backendPartnerKey: BACKEND_PARTNER_KEY,
                backendUserKey: BACKEND_USER_KEY,
                backendSessionKey: BACKEND_SESSION_KEY,
                backendPersistenceDisabledUntilKey: BACKEND_PERSISTENCE_DISABLED_UNTIL_KEY,
                initialContext: backendCtx,
                initialPersistenceDisabledUntil: backendCtx.persistenceDisabledUntil,
                persistenceCooldownMs: BACKEND_PERSISTENCE_COOLDOWN_MS,
                onBootstrapWarn: function(message) {
                    if (bootstrapStatusEl) {
                        setBootstrapStatus('warn', String(message || ''));
                    }
                },
                onBootstrapError: function() {
                    if (bootstrapStatusEl) {
                        setBootstrapStatus('error', USER_FRIENDLY_CONNECTION_ERROR);
                    }
                },
                onRequestInstallHealth: function(force) {
                    if (bootstrapStatusEl) {
                        requestInstallHealthWithCooldown(!!force);
                    }
                }
            });
            if (backendContextManager && typeof backendContextManager.getContext === 'function') {
                backendCtx = backendContextManager.getContext();
            }
        }
        function clearPersistenceCooldown() {
            if (backendContextManager && typeof backendContextManager.clearPersistenceCooldown === 'function') {
                backendContextManager.clearPersistenceCooldown();
                return;
            }
            backendCtx.persistenceDisabledUntil = 0;
            _storageRemove(BACKEND_PERSISTENCE_DISABLED_UNTIL_KEY);
        }
        function setPersistenceCooldown(ms) {
            if (backendContextManager && typeof backendContextManager.setPersistenceCooldown === 'function') {
                backendContextManager.setPersistenceCooldown(ms);
                return;
            }
            var cooldownMs = Math.max(1000, parseInt(ms, 10) || BACKEND_PERSISTENCE_COOLDOWN_MS);
            var until = Date.now() + cooldownMs;
            backendCtx.persistenceDisabledUntil = until;
            _storageSet(BACKEND_PERSISTENCE_DISABLED_UNTIL_KEY, String(until));
        }
        function isAnalyticsDisabledNow() {
            if (analyticsDisabledUntil && analyticsDisabledUntil > Date.now()) {
                return true;
            }
            if (analyticsDisabledUntil) {
                analyticsDisabledUntil = 0;
                _storageRemove(ANALYTICS_DISABLED_UNTIL_KEY);
            }
            return false;
        }
        function disableAnalyticsTemporarily(ms) {
            var cooldownMs = Math.max(1000, parseInt(ms, 10) || ANALYTICS_COOLDOWN_MS);
            analyticsDisabledUntil = Date.now() + cooldownMs;
            _storageSet(ANALYTICS_DISABLED_UNTIL_KEY, String(analyticsDisabledUntil));
            if (Array.isArray(analyticsOutbox)) analyticsOutbox = [];
        }
        function getCaptchaToken() {
            if (backendContextManager && typeof backendContextManager.getCaptchaToken === 'function') {
                return backendContextManager.getCaptchaToken();
            }
            try {
                if (typeof window.__manyashaGetCaptchaToken === 'function') {
                    return String(window.__manyashaGetCaptchaToken() || '').trim();
                }
                if (typeof window.__manyashaCaptchaToken === 'function') {
                    return String(window.__manyashaCaptchaToken() || '').trim();
                }
                if (typeof window.__manyashaCaptchaToken === 'string') {
                    return String(window.__manyashaCaptchaToken || '').trim();
                }
            } catch (e) {}
            return '';
        }
        function buildWidgetAuthHeaders(baseHeaders) {
            if (backendContextManager && typeof backendContextManager.buildWidgetAuthHeaders === 'function') {
                return backendContextManager.buildWidgetAuthHeaders(baseHeaders);
            }
            var out = {};
            var src = baseHeaders || {};
            Object.keys(src).forEach(function(k) { out[k] = src[k]; });
            if (backendCtx && backendCtx.widgetToken) {
                out.Authorization = 'Bearer ' + backendCtx.widgetToken;
            }
            return out;
        }
        window.__manyashaAuthHeaders = buildWidgetAuthHeaders;
        function ensureManyashaBackendContext() {
            if (backendContextManager && typeof backendContextManager.ensureManyashaBackendContext === 'function') {
                return backendContextManager.ensureManyashaBackendContext();
            }
            if (!backendCtx || typeof backendCtx !== 'object') {
                return Promise.reject(new Error('backend-context-not-ready'));
            }
            if (backendCtx.widgetTokenExpiresAt && backendCtx.widgetTokenExpiresAt < (Date.now() + 15000)) {
                backendCtx._promise = null;
            }
            if (backendCtx._promise) return backendCtx._promise;
            if (
                backendContextNextRetryAt &&
                Date.now() < backendContextNextRetryAt &&
                !(backendCtx && backendCtx.widgetToken)
            ) {
                return Promise.reject(new Error('backend-offline-cooldown'));
            }
            var ctxUrl = '/api/manyasha/widget-context?pid=' + encodeURIComponent(EMBED_PID) + '&sid=' + encodeURIComponent(sessionId);
            if (EMBED_SITE_KEY) ctxUrl += '&site_key=' + encodeURIComponent(EMBED_SITE_KEY);
            if (EMBED_INSTALL_TOKEN) ctxUrl += '&install_token=' + encodeURIComponent(EMBED_INSTALL_TOKEN);
            ctxUrl += '&embed_contract_version=' + encodeURIComponent(EMBED_CONTRACT_VERSION || '');
            backendCtx._promise = manyashaFetchWithRetry(
                ctxUrl,
                {},
                { retries: 1, retryDelayMs: 320 }
            )
                .then(function (r) {
                    if (!r.ok) { backendCtx._promise = null; throw new Error('widget-context-http-' + r.status); }
                    return r.json();
                })
                .then(function (data) {
                    backendCtx._lastError = '';
                    backendContextFailureCount = 0;
                    backendContextNextRetryAt = 0;
                    backendCtx.partnerId = data.partner_id;
                    backendCtx.widgetToken = String(data.widget_token || '');
                    backendCtx.widgetTokenExpiresAt = data.expires_at ? Date.parse(data.expires_at) : 0;
                    if (!backendCtx.widgetToken) {
                        backendCtx._promise = null;
                        throw new Error('widget-token-missing');
                    }
                    if (data.session_id && data.session_id !== sessionId) {
                        sessionId = String(data.session_id);
                        try { localStorage.setItem(SESSION_KEY, sessionId); } catch (e) {}
                    }
                    backendCtx.userId = null;
                    backendCtx.dialogSessionId = null;
                    return backendCtx;
                })
                .catch(function (e) {
                    try { backendCtx._lastError = String(e && e.message ? e.message : e || 'backend-context'); } catch (_ctxErr) { backendCtx._lastError = 'backend-context'; }
                    backendContextFailureCount = Math.min(8, backendContextFailureCount + 1);
                    var cooldownMs = Math.min(30000, 1500 * Math.pow(2, Math.min(backendContextFailureCount - 1, 4)));
                    backendContextNextRetryAt = Date.now() + cooldownMs;
                    backendCtx._promise = null;
                    backendCtx.partnerId = backendCtx.userId = backendCtx.dialogSessionId = null;
                    backendCtx.widgetToken = '';
                    backendCtx.widgetTokenExpiresAt = 0;
                    if (bootstrapStatusEl) {
                        setBootstrapStatus('error', USER_FRIENDLY_CONNECTION_ERROR);
                        requestInstallHealthWithCooldown(false);
                    }
                    throw new Error('backend-context');
                });
            return backendCtx._promise;
        }
        window.__manyashaEnsureBackendContext = ensureManyashaBackendContext;

        // ─── Аналитика ───
        analyticsOutbox = Array.isArray(analyticsOutbox) ? analyticsOutbox : [];
        function flushAnalyticsOutbox() {
            if (!Array.isArray(analyticsOutbox)) analyticsOutbox = [];
            if (!analyticsOutbox.length) return;
            if (isAnalyticsDisabledNow()) return;
            // На самом старте backendCtx ещё не собран: просто держим очередь до следующего тика.
            if (!backendCtx || typeof backendCtx !== 'object') return;
            ensureManyashaBackendContext().then(function() {
                if (isAnalyticsDisabledNow()) return;
                var item = analyticsOutbox.shift();
                if (!item) return;
                manyashaFetchWithRetry('/api/analytics/event', {
                    method: 'POST',
                    headers: buildWidgetAuthHeaders({'Content-Type': 'application/json'}),
                    body: JSON.stringify(item)
                }, { retries: 1, retryDelayMs: 260, timeoutMs: 7000, cooldownKey: 'analytics-event', cooldownMs: ANALYTICS_COOLDOWN_MS })
                    .then(function(res) {
                        if (!res || res.ok) return;
                        if (res.status === 401 || res.status === 403 || res.status === 503 || res.status === 500 || res.status === 502 || res.status === 504) {
                            disableAnalyticsTemporarily(ANALYTICS_COOLDOWN_MS);
                        }
                    }).catch(function(err) {
                        var reason = String(err && err.message ? err.message : err || '').toLowerCase();
                        if (
                            reason.indexOf('backend-offline-cooldown') !== -1 ||
                            reason.indexOf('manyasha_fetch_failed') !== -1 ||
                            reason.indexOf('request_timeout') !== -1 ||
                            reason.indexOf('aborterror') !== -1 ||
                            reason.indexOf('retry_status_500') !== -1 ||
                            reason.indexOf('retry_status_502') !== -1 ||
                            reason.indexOf('retry_status_503') !== -1 ||
                            reason.indexOf('retry_status_504') !== -1
                        ) {
                            disableAnalyticsTemporarily(ANALYTICS_COOLDOWN_MS);
                        }
                    });
            }).catch(function(err) {
                var reason = String(err && err.message ? err.message : err || '').toLowerCase();
                if (reason.indexOf('backend-offline-cooldown') !== -1 || reason.indexOf('backend-context') !== -1) {
                    disableAnalyticsTemporarily(ANALYTICS_COOLDOWN_MS);
                }
            });
        }
        function trackEvent(type, data) {
            if (!Array.isArray(analyticsOutbox)) analyticsOutbox = [];
            if (isAnalyticsDisabledNow()) return;
            var sid = sessionId;
            if (!sid) {
                try { sid = localStorage.getItem(SESSION_KEY) || ''; } catch (e) {}
            }
            if (!sid) {
                sid = 'sid-' + Date.now() + '-' + Math.random().toString(36).slice(2,9);
                try { localStorage.setItem(SESSION_KEY, sid); } catch (e) {}
            }
            var payload = {
                session_id: sid,
                event_type: type,
                data: Object.assign({
                    ab_opening_script: (abVariants && abVariants.opening_script) || '',
                    ab_consult_cta: (abVariants && abVariants.consult_cta) || '',
                    profile_stage: (manyashaProfile && manyashaProfile.case_stage) || '',
                    profile_debt_type: (manyashaProfile && manyashaProfile.debt_type) || '',
                }, (data || {}))
            };
            analyticsOutbox.push(payload);
            flushAnalyticsOutbox();
        }
        window.addEventListener('online', flushAnalyticsOutbox);
        setInterval(flushAnalyticsOutbox, 5000);
        trackEvent('ab_exposure', { variants: abVariants });
        trackEvent('widget_opened', { first: initialWidgetOpenedFirst });

        // ─── История: server app.dialog_* (при наличии контекста) + fallback localStorage ───
        // bootstrap вызывается после объявления addChatMsg (см. ниже)

        function saveHistory() {
            var toStore = chatHistory.slice(-30);
            localStorage.setItem(HISTORY_KEY, JSON.stringify({ messages: toStore }));
            var payload = { messages: toStore };
            function doPut(body) {
                manyashaFetchWithRetry('/api/chat/session/' + encodeURIComponent(sessionId), {
                    method: 'PUT',
                    headers: buildWidgetAuthHeaders({'Content-Type': 'application/json'}),
                    body: JSON.stringify(body)
                }, { retries: 1, retryDelayMs: 240 }).catch(function(){});
            }
            ensureManyashaBackendContext().then(function(ctx) {
                if (ctx && ctx.partnerId && ctx.userId && ctx.dialogSessionId) {
                    payload.partner_id = ctx.partnerId;
                    payload.user_id = ctx.userId;
                    payload.dialog_session_id = ctx.dialogSessionId;
                }
                doPut(payload);
            }).catch(function() {
                doPut({ messages: toStore });
            });
        }

        // ─── Персонализация: запомнить имя ───
        function updateGreetingWithName(name) {
            if (!name) return;
            var nameEl = document.getElementById('manyasha-name');
            if (nameEl) nameEl.textContent = 'Маняша';
        }
        if (userName) updateGreetingWithName(userName);

        // Self-serve KB отключён в этом виджете: все вопросы обрабатываются AI/эскалацией.

        // ─── TTS (озвучка ответов) ───
        
        var isMuted = localStorage.getItem(MUTE_KEY) === '1';
        var currentAudio = null;
        var pendingAutoplayAudio = null;
        var pendingAutoplayResolve = null;
        var pendingAutoplayTimer = null;
        var ttsQueue = [];
        var ttsBusy = false;
        var ttsDrainTimer = null;
        var ttsRunId = 0;
        var lastTTSQueueSignature = '';
        var lastTTSQueueAt = 0;
        var speechPlaybackPrimePromise = null;
        var speechPlaybackPrimed = false;
        var TTS_PREFETCH_AHEAD = 2;
        var WAITING_VOICE_START_TIMEOUT_MS = 1500;
        var WAITING_VOICE_MAX_TOTAL_MS = 1800;
        var WAITING_VOICE_STARTED_MAX_MS = 6500;
        var SILENT_AUDIO_UNLOCK_SRC = 'data:audio/wav;base64,UklGRmQBAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YUABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
        var voiceConsentWrap = document.getElementById('manyasha-voice-consent');
        var voiceConsentAllowBtn = document.getElementById('manyasha-consent-allow');
        var voiceConsentDenyBtn = document.getElementById('manyasha-consent-deny');
        var voiceConsentState = 'granted';
        try { localStorage.setItem(VOICE_CONSENT_KEY, 'granted'); } catch (e) {}

        function persistVoiceConsent(nextState) {
            voiceConsentState = 'granted';
            try { localStorage.setItem(VOICE_CONSENT_KEY, 'granted'); } catch (e) {}
        }
        function applyVoiceConsentUI() {
            if (!voiceConsentWrap) return;
            voiceConsentWrap.classList.remove('visible');
            voiceConsentWrap.setAttribute('aria-hidden', 'true');
        }
        if (voiceConsentAllowBtn) {
            voiceConsentAllowBtn.addEventListener('click', function() {
                persistVoiceConsent('granted');
                isMuted = false;
                try { localStorage.setItem(MUTE_KEY, '0'); } catch (e) {}
                applyVoiceConsentUI();
                primeSpeechPlaybackOnGesture();
                primeWaitingPhraseAudio();
                trackEvent('voice_consent_given', { source: 'widget_banner' });
            });
        }
        if (voiceConsentDenyBtn) {
            voiceConsentDenyBtn.addEventListener('click', function() {
                persistVoiceConsent('granted');
                isMuted = true;
                try { localStorage.setItem(MUTE_KEY, '1'); } catch (e) {}
                stopAllSpeechPlayback();
                applyVoiceConsentUI();
                trackEvent('voice_consent_denied', { source: 'widget_banner' });
            });
        }
        applyVoiceConsentUI();

        function stopActiveSpeechTypingFlow() {
            if (!activeSpeechTypingFlow || typeof activeSpeechTypingFlow.stop !== 'function') return;
            activeSpeechTypingFlow.stop();
            activeSpeechTypingFlow = null;
        }
        function clearBotTypingIndicators() {
            var nodes = chatMessages ? chatMessages.querySelectorAll('.chat-msg.bot.typing') : [];
            for (var i = nodes.length - 1; i >= 0; i -= 1) {
                var node = nodes[i];
                if (node && node.parentNode) {
                    node.parentNode.removeChild(node);
                }
            }
        }
        function stopActiveReplyFlowContext() {
            stopActiveSpeechTypingFlow();
            clearBotTypingIndicators();
            if (activeWaitingBubbleEl && activeWaitingBubbleEl.parentNode) {
                activeWaitingBubbleEl.parentNode.removeChild(activeWaitingBubbleEl);
            }
            activeWaitingBubbleEl = null;
            if (activeReplyAbortController) {
                try { activeReplyAbortController.abort(); } catch (e) {}
                activeReplyAbortController = null;
            }
            stopAllSpeechPlayback();
        }

        function clearBrowserSpeechQueue() {
            try {
                if (window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') {
                    window.speechSynthesis.cancel();
                }
            } catch (_eSpeechCancel) {}
        }

        function resetTTSPlaybackGuards() {
            lastTTSQueueSignature = '';
            lastTTSQueueAt = 0;
            voiceFallbackLastAt = 0;
        }

        function stopAllSpeechPlayback() {
            ttsRunId += 1;
            if (ttsDrainTimer) {
                clearTimeout(ttsDrainTimer);
                ttsDrainTimer = null;
            }
            ttsQueue = [];
            ttsBusy = false;
            if (pendingAutoplayAudio) {
                try { pendingAutoplayAudio.pause(); } catch(e) {}
                pendingAutoplayAudio = null;
            }
            if (pendingAutoplayTimer) {
                clearTimeout(pendingAutoplayTimer);
                pendingAutoplayTimer = null;
            }
            if (pendingAutoplayResolve) {
                try { pendingAutoplayResolve(); } catch(e) {}
                pendingAutoplayResolve = null;
            }
            if (currentAudio) {
                try { currentAudio.pause(); } catch(e) {}
                currentAudio = null;
            }
            resetTTSPlaybackGuards();
            clearBrowserSpeechQueue();
            if (window.manyashaSetLoop) window.manyashaSetLoop(false);
            if (voiceAutoMode) setVoiceStatus('thinking', 'Думаю…');
        }
        clearBrowserSpeechQueue();

        var muteBtn  = document.getElementById('manyasha-mute-btn');
        var muteIcon = document.getElementById('manyasha-mute-icon');
        var muteLabel = document.getElementById('manyasha-mute-label');
        var soundToggleBtn = document.getElementById('manyasha-sound-toggle');
        var soundToggleIcon = document.getElementById('manyasha-sound-toggle-icon');
        var SVG_ON  = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" fill="currentColor"/>';
        var SVG_OFF = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" fill="currentColor"/>';

        function updateVoiceToggleControls() {
            var nextLabel = isMuted ? 'Включить голос' : 'Выключить голос';
            var icon = isMuted ? SVG_OFF : SVG_ON;
            if (muteBtn) {
                muteBtn.title = nextLabel;
                muteBtn.setAttribute('aria-label', nextLabel);
            }
            if (muteIcon) muteIcon.innerHTML = icon;
            if (muteLabel) muteLabel.textContent = nextLabel;
            if (soundToggleBtn) {
                soundToggleBtn.title = nextLabel;
                soundToggleBtn.setAttribute('aria-label', nextLabel);
                soundToggleBtn.setAttribute('aria-pressed', isMuted ? 'false' : 'true');
                soundToggleBtn.classList.toggle('muted', isMuted);
            }
            if (soundToggleIcon) soundToggleIcon.innerHTML = icon;
        }

        function setVoiceMuted(nextMuted, source) {
            isMuted = !!nextMuted;
            persistVoiceConsent('granted');
            try { localStorage.setItem(MUTE_KEY, isMuted ? '1' : '0'); } catch (e) {}
            updateVoiceToggleControls();
            applyVoiceConsentUI();
            resetTTSPlaybackGuards();
            if (isMuted) {
                stopAllSpeechPlayback();
                ttsQueue = [];
                ttsBusy = false;
            } else {
                ttsQueue = [];
                ttsBusy = false;
                primeSpeechPlaybackOnGesture();
                if (!isRequestPending && !voiceListening) setVoiceStatus('idle', '');
            }
            trackEvent(isMuted ? 'voice_muted' : 'voice_unmuted', { source: source || 'toggle' });
        }

        if (muteBtn) {
            muteBtn.addEventListener('click', function() {
                setVoiceMuted(!isMuted, 'menu_toggle');
                closeManyashaMenu();
            });
        }
        if (soundToggleBtn) {
            soundToggleBtn.addEventListener('click', function() {
                setVoiceMuted(!isMuted, 'inline_toggle');
            });
        }
        updateVoiceToggleControls();

        var textApiSnapshot = resolveManyashaTextApi();
        function _ttsPlural(n, one, few, many) {
            if (textApiSnapshot && typeof textApiSnapshot.ttsPlural === 'function') {
                return textApiSnapshot.ttsPlural(n, one, few, many);
            }
            var num = Math.abs(parseInt(n, 10) || 0);
            var mod10 = num % 10;
            var mod100 = num % 100;
            if (mod10 === 1 && mod100 !== 11) return one;
            if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
            return many;
        }
        function _ttsRuUnderThousand(num, feminine) {
            if (textApiSnapshot && typeof textApiSnapshot.ttsRuUnderThousand === 'function') {
                return textApiSnapshot.ttsRuUnderThousand(num, feminine);
            }
            var n = Math.max(0, Math.floor(num || 0));
            if (!n) return '';
            var unitsMasc = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
            var unitsFem = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
            if (n < 10) return (feminine ? unitsFem : unitsMasc)[n];
            return String(n);
        }
        function _ttsNumberToWords(raw, options) {
            if (textApiSnapshot && typeof textApiSnapshot.ttsNumberToWords === 'function') {
                return textApiSnapshot.ttsNumberToWords(raw, options);
            }
            var n = parseInt(raw, 10);
            if (isNaN(n)) return String(raw || '');
            if (n === 0) return 'ноль';
            if (Math.abs(n) > 999999) return String(n);
            if (n < 0) return 'минус ' + _ttsNumberToWords(Math.abs(n), options || {});
            var thousands = Math.floor(n / 1000);
            var rest = n % 1000;
            var parts = [];
            if (thousands) {
                parts.push(_ttsRuUnderThousand(thousands, true));
                parts.push(_ttsPlural(thousands, 'тысяча', 'тысячи', 'тысяч'));
            }
            if (rest) parts.push(_ttsRuUnderThousand(rest, !!(options && options.feminine)));
            return parts.join(' ').replace(/\s+/g, ' ').trim();
        }
        function _ttsNumberToWordsSafe(raw, options) {
            if (textApiSnapshot && typeof textApiSnapshot.ttsNumberToWordsSafe === 'function') {
                return textApiSnapshot.ttsNumberToWordsSafe(raw, options);
            }
            var text = _ttsNumberToWords(raw, options);
            return text || String(raw || '');
        }
        function _ttsLawNominative(raw) {
            if (textApiSnapshot && typeof textApiSnapshot.ttsLawNominative === 'function') {
                return textApiSnapshot.ttsLawNominative(raw);
            }
            return 'федеральный закон номер ' + _ttsNumberToWordsSafe(raw);
        }
        function _ttsLawDative(raw) {
            if (textApiSnapshot && typeof textApiSnapshot.ttsLawDative === 'function') {
                return textApiSnapshot.ttsLawDative(raw);
            }
            return 'федеральному закону номер ' + _ttsNumberToWordsSafe(raw);
        }
        function _normalizeTTSPronunciation(text) {
            if (textApiSnapshot && typeof textApiSnapshot.normalizeTTSPronunciation === 'function') {
                return textApiSnapshot.normalizeTTSPronunciation(text);
            }
            return String(text || '');
        }
        function sanitizeTTS(text) {
            if (textApiSnapshot && typeof textApiSnapshot.sanitizeTTS === 'function') {
                return textApiSnapshot.sanitizeTTS(text);
            }
            var t = String(text || '');
            t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/gi, '$1');
            t = t.replace(/\*\*(.*?)\*\*/g, '$1');
            t = t.replace(/`{1,3}/g, '');
            t = t.replace(/https?:\/\/\S+/gi, '');
            t = _normalizeTTSPronunciation(t);
            t = t.replace(/\s+/g, ' ').trim();
            return t.slice(0, 800);
        }
        function ttsProfileForMood(mood) {
            if (textApiSnapshot && typeof textApiSnapshot.ttsProfileForMood === 'function') {
                return textApiSnapshot.ttsProfileForMood(mood);
            }
            return {
                maxChunkLen: 250,
                maxChunks: 4,
                delayShort: 520,
                delayMed: 760,
                delayLong: 980,
                jitter: 260,
                pauseBetween: 100,
                pauseLast: 130,
                pushToTalkDelay: 100
            };
        }
        function splitTextForVoiceSync(text, profile) {
            if (textApiSnapshot && typeof textApiSnapshot.splitTextForVoiceSync === 'function') {
                return textApiSnapshot.splitTextForVoiceSync(text, profile);
            }
            var src = String(text || '').replace(/\s+/g, ' ').trim();
            if (!src) return [];
            return src
                .replace(/([.!?…;:])\s+/g, '$1|')
                .split('|')
                .map(function(s) { return s.trim(); })
                .filter(Boolean);
        }
        function chunkTTS(text, profile) {
            if (textApiSnapshot && typeof textApiSnapshot.chunkTTS === 'function') {
                return textApiSnapshot.chunkTTS(text, profile);
            }
            var chunks = splitTextForVoiceSync(text, profile);
            if (!chunks.length) return [];
            var out = [];
            for (var i = 0; i < chunks.length; i += 1) {
                var safe = sanitizeTTS(chunks[i]);
                if (safe) out.push(safe);
            }
            return out.slice(0, (profile && profile.maxChunks) || 4);
        }
        function fallbackSpeechFromReply(reply) {
            if (textApiSnapshot && typeof textApiSnapshot.fallbackSpeechFromReply === 'function') {
                return textApiSnapshot.fallbackSpeechFromReply(reply);
            }
            var speech = sanitizeTTS(String(reply || ''));
            if (speech.length > 260) speech = speech.slice(0, 260).trim();
            return speech;
        }

        function primeSpeechPlaybackOnGesture() {
            if (speechPlaybackPrimed || speechPlaybackPrimePromise || isMuted || voiceConsentState !== 'granted') return;
            try {
                var unlockAudio = new Audio(SILENT_AUDIO_UNLOCK_SRC);
                unlockAudio.preload = 'auto';
                unlockAudio.volume = 0;
                unlockAudio.muted = false;
                try {
                    unlockAudio.setAttribute('playsinline', '');
                    unlockAudio.setAttribute('data-manyasha-audio-primer', '1');
                } catch (_eUnlockAttr) {}
                speechPlaybackPrimePromise = unlockAudio.play()
                    .then(function() {
                        speechPlaybackPrimed = true;
                    })
                    .catch(function() {
                        speechPlaybackPrimed = false;
                    })
                    .finally(function() {
                        try {
                            unlockAudio.pause();
                            unlockAudio.removeAttribute('src');
                            unlockAudio.load();
                        } catch (_eUnlockCleanup) {}
                        speechPlaybackPrimePromise = null;
                    });
            } catch (_eUnlockAudio) {
                speechPlaybackPrimePromise = null;
                speechPlaybackPrimed = false;
            }
        }

        function _unlockPendingAudio() {
            if (isMuted || !pendingAutoplayAudio) return;
            pendingAutoplayAudio.play().then(function() {
                pendingAutoplayAudio = null;
                if (pendingAutoplayTimer) {
                    clearTimeout(pendingAutoplayTimer);
                    pendingAutoplayTimer = null;
                }
            }).catch(function() {
                // Не блокируем очередь навсегда, если браузер снова отклонил autoplay.
                if (pendingAutoplayResolve) {
                    try { pendingAutoplayResolve(); } catch (e) {}
                    pendingAutoplayResolve = null;
                }
                pendingAutoplayAudio = null;
                if (pendingAutoplayTimer) {
                    clearTimeout(pendingAutoplayTimer);
                    pendingAutoplayTimer = null;
                }
            });
        }
        ['click', 'keydown', 'touchstart'].forEach(function(evt) {
            window.addEventListener(evt, _unlockPendingAudio, { passive: true });
        });

        function fetchTTS(text) {
            var body = JSON.stringify({ text: text });
            return manyashaFetchWithRetry('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: body
            }, { retries: 1, retryDelayMs: 220 });
        }

        function fetchTTSBlob(text) {
            return fetchTTS(text).then(function(r) {
                if (!r.ok || r.headers.get('content-length') === '0') throw new Error('tts empty');
                return r.blob();
            }).then(function(blob) {
                if (!blob || blob.size < 100) return null;
                return blob;
            });
        }

        function _playTTSNow(text, preloadedBlobPromise, chunkMeta, runId) {
            var onSessionUnavailableFallback = chunkMeta && typeof chunkMeta.onSessionUnavailable === 'function'
                ? chunkMeta.onSessionUnavailable
                : null;
            var blobPromise = preloadedBlobPromise || fetchTTSBlob(text);
            return Promise.resolve(blobPromise)
            .then(function(blob) {
                if ((typeof runId === 'number' && runId !== ttsRunId) || isMuted) {
                    return;
                }
                if (!blob) {
                    if (typeof onSessionUnavailableFallback === 'function') onSessionUnavailableFallback();
                    return;
                }
                return new Promise(function(resolve) {
                    var url = URL.createObjectURL(blob);
                    var audio = new Audio(url);
                    var finished = false;
                    var sessionStarted = false;
                    var onSessionStart = chunkMeta && typeof chunkMeta.onSessionStart === 'function' ? chunkMeta.onSessionStart : null;
                    var onSessionDone = chunkMeta && typeof chunkMeta.onSessionDone === 'function' ? chunkMeta.onSessionDone : null;
                    var onSessionUnavailable = chunkMeta && typeof chunkMeta.onSessionUnavailable === 'function' ? chunkMeta.onSessionUnavailable : null;
                    var onChunkStart = chunkMeta && typeof chunkMeta.onChunkStart === 'function' ? chunkMeta.onChunkStart : null;
                    currentAudio = audio;

                    function markSessionStart() {
                        if (sessionStarted) return;
                        sessionStarted = true;
                        if (typeof onChunkStart === 'function') onChunkStart();
                        if (typeof onSessionStart === 'function') onSessionStart();
                    }

                    function markSessionUnavailable() {
                        if (sessionStarted) return;
                        if (typeof onSessionUnavailable === 'function') onSessionUnavailable();
                    }

                    function finish() {
                        if (finished) return;
                        finished = true;
                        if (!sessionStarted) {
                            markSessionUnavailable();
                        } else if (typeof onSessionDone === 'function') {
                            onSessionDone();
                        }
                        if (window.manyashaSetLoop) window.manyashaSetLoop(false);
                        if (currentAudio === audio) currentAudio = null;
                        if (pendingAutoplayAudio === audio) pendingAutoplayAudio = null;
                        if (pendingAutoplayTimer) {
                            clearTimeout(pendingAutoplayTimer);
                            pendingAutoplayTimer = null;
                        }
                        if (pendingAutoplayResolve) pendingAutoplayResolve = null;
                        URL.revokeObjectURL(url);
                        resolve();
                    }

                    // Пока аудио играет — держим видео в петле
                    audio.addEventListener('playing', function() {
                        markSessionStart();
                        if (window.manyashaSetLoop) window.manyashaSetLoop(true);
                    });
                    audio.addEventListener('ended', function() {
                        finish();
                    });
                    audio.addEventListener('error', function() {
                        finish();
                    });
                    audio.play().catch(function(e) {
                        console.warn('[TTS] autoplay blocked:', e);
                        showVoiceFallbackStatus('Нажмите, чтобы включить голос', { cooldownMs: 3200, resetMs: 1600 });
                        pendingAutoplayAudio = audio;
                        pendingAutoplayResolve = finish;
                        // Fallback: если autoplay так и не разблокировался, не держим очередь в deadlock.
                        if (pendingAutoplayTimer) clearTimeout(pendingAutoplayTimer);
                        pendingAutoplayTimer = setTimeout(function() {
                            if (pendingAutoplayAudio === audio && pendingAutoplayResolve === finish) {
                                markSessionUnavailable();
                                finish();
                            }
                        }, 1800);
                    });
                });
            })
            .catch(function(e) {
                if ((typeof runId === 'number' && runId !== ttsRunId) || isMuted) {
                    return;
                }
                console.warn('[TTS] error:', e);
                if (typeof onSessionUnavailableFallback === 'function') onSessionUnavailableFallback();
                showVoiceFallbackStatus('Голос временно недоступен, продолжаю текстом.', { cooldownMs: 5000, resetMs: 2200 });
            });
        }

        function _drainTTSQueue() {
            if (ttsBusy || isMuted || !ttsQueue.length) return;
            ttsBusy = true;
            var next = ttsQueue.shift();
            var nextText = (next && next.text) ? next.text : String(next || '');
            var postPause = (next && typeof next.postPauseMs === 'number') ? next.postPauseMs : 140;
            var profile = (next && next.profile) ? next.profile : ttsProfileForMood('neutral');
            var preloadedBlobPromise = next && next.preloadBlobPromise ? next.preloadBlobPromise : null;
            var runId = ttsRunId;
            var startDelay = (next && typeof next.startDelayMs === 'number' && next.startDelayMs > 0)
                ? next.startDelayMs
                : 0;
            var prewarmCount = 0;
            var qi;
            for (qi = 0; qi < ttsQueue.length && prewarmCount < TTS_PREFETCH_AHEAD; qi += 1) {
                var queued = ttsQueue[qi];
                if (!queued || !queued.text || queued.preloadBlobPromise) continue;
                queued.preloadBlobPromise = fetchTTSBlob(queued.text).catch(function() { return null; });
                prewarmCount += 1;
            }
            ttsDrainTimer = setTimeout(function() {
                ttsDrainTimer = null;
                if (runId !== ttsRunId || isMuted) {
                    ttsBusy = false;
                    return;
                }
                var chunkMeta = (next && next._ttsMeta) ? next._ttsMeta : {};
                _playTTSNow(nextText, preloadedBlobPromise, chunkMeta, runId).finally(function() {
                    if (runId !== ttsRunId) {
                        ttsBusy = false;
                        return;
                    }
                    ttsBusy = false;
                    if (!isMuted && ttsQueue.length) {
                        ttsDrainTimer = setTimeout(function() {
                            ttsDrainTimer = null;
                            if (runId !== ttsRunId) return;
                            _drainTTSQueue();
                        }, postPause);
                    }
                });
            }, startDelay);
        }

        function enqueueTTS(text, mood, options) {
            var result = {
                queued: false,
                duplicated: false,
                reason: ''
            };
            var source = options && options.source;
            if (!isAllowedTTSSource(source)) {
                result.reason = source ? ('source_' + String(source) + '_not_allowed') : 'source_missing';
                return result;
            }
            if (voiceConsentState !== 'granted' || isMuted) {
                result.reason = 'disabled';
                return result;
            }
            var profile = ttsProfileForMood(mood);
            var chunks = [];
            if (options && Array.isArray(options.segments) && options.segments.length) {
                chunks = options.segments.map(function(chunk) {
                    return sanitizeTTS(chunk);
                }).filter(Boolean);
            } else {
                chunks = chunkTTS(text, profile);
            }
            if (!chunks.length) {
                result.reason = 'empty';
                return result;
            }
            var initialDelayMs = 0;
            if (options && typeof options.initialDelayMs === 'number' && options.initialDelayMs > 0) {
                initialDelayMs = options.initialDelayMs;
            }
            var onSessionStart = options && typeof options.onSessionStart === 'function' ? options.onSessionStart : null;
            var onSessionDone = options && typeof options.onSessionDone === 'function' ? options.onSessionDone : null;
            var onSessionUnavailable = options && typeof options.onSessionUnavailable === 'function' ? options.onSessionUnavailable : null;
            var onChunkStart = options && typeof options.onChunkStart === 'function' ? options.onChunkStart : null;
            var firstChunkPreloadPromise = options && options.preloadBlobPromise
                ? Promise.resolve(options.preloadBlobPromise).catch(function() { return null; })
                : null;
            var queueSignature = chunks.join(' || ');
            var now = Date.now();
            if (
                queueSignature &&
                queueSignature === lastTTSQueueSignature &&
                (now - lastTTSQueueAt) < 2500 &&
                (ttsBusy || ttsQueue.length || currentAudio || pendingAutoplayAudio)
            ) {
                result.duplicated = true;
                result.reason = 'duplicate';
                return result;
            }
            lastTTSQueueSignature = queueSignature;
            lastTTSQueueAt = now;
            chunks.forEach(function(chunk, idx) {
                var preloadBlobPromise = null;
                if (idx === 0 && firstChunkPreloadPromise) {
                    preloadBlobPromise = firstChunkPreloadPromise;
                } else if (idx < TTS_PREFETCH_AHEAD) {
                    preloadBlobPromise = fetchTTSBlob(chunk).catch(function() { return null; });
                }
                ttsQueue.push({
                    text: chunk,
                    profile: profile,
                    postPauseMs: idx === chunks.length - 1 ? profile.pauseLast : profile.pauseBetween,
                    startDelayMs: idx === 0 ? initialDelayMs : 0,
                    preloadBlobPromise: preloadBlobPromise,
                    _ttsMeta: {
                        onSessionStart: idx === 0 ? onSessionStart : null,
                        onSessionDone: idx === chunks.length - 1 ? onSessionDone : null,
                        onSessionUnavailable: idx === chunks.length - 1 ? onSessionUnavailable : null,
                        onChunkStart: onChunkStart
                    }
                });
            });
            _drainTTSQueue();
            result.queued = true;
            return result;
        }

        function speakReplyWithSyncState(text, mood, options) {
            var config = options || {};
            var result = {
                started: false,
                unavailable: false,
                done: false,
                queued: false,
                stopped: false,
                _resolve: null,
                donePromise: null
            };
            result.donePromise = new Promise(function(resolve) {
                result._resolve = resolve;
            });
            var markDone = function() {
                if (result.done) return;
                result.done = true;
                if (result._resolve) result._resolve(result);
            };
            result.stop = function() {
                if (result.stopped || result.done) return;
                result.stopped = true;
                stopAllSpeechPlayback();
                markDone();
            };
            var onStart = function() {
                result.started = true;
                if (typeof config.onStart === 'function') config.onStart();
            };
            var onDone = function() {
                if (typeof config.onDone === 'function') config.onDone();
                markDone();
            };
            var onUnavailable = function() {
                result.unavailable = true;
                if (typeof config.onUnavailable === 'function') config.onUnavailable();
                markDone();
            };
            if (!text) {
                onUnavailable();
                return result;
            }
            if (!isAllowedTTSSource(config.source)) {
                onUnavailable();
                return result;
            }
            if (voiceConsentState !== 'granted' || isMuted) {
                onUnavailable();
                return result;
            }
            var queueResult = enqueueTTS(text, mood, {
                initialDelayMs: typeof config.initialDelayMs === 'number' ? config.initialDelayMs : 0,
                segments: config.segments,
                preloadBlobPromise: config.preloadBlobPromise,
                onSessionStart: onStart,
                onSessionDone: onDone,
                onSessionUnavailable: onUnavailable,
                onChunkStart: typeof config.onChunkStart === 'function' ? config.onChunkStart : null,
                source: config.source
            });
            if (!queueResult || !queueResult.queued) {
                onUnavailable();
                return result;
            }
            result.queued = true;
            return result;
        }


        function resizeChatInputHeight() {
            chatInput.style.height = 'auto';
            var maxH = 72;
            chatInput.style.height = Math.min(chatInput.scrollHeight, maxH) + 'px';
        }
        function setFlowState(state, onEnd) {
            if (!window.manyashaPlay) return;
            var visualState = normalizeVisualState(state);
            if (visualState === 'listening' && isRequestPending) return;
            if (visualState === 'idle' && (voiceListening || isRequestPending)) return;
            setWidgetVisualState(visualState);
            var videoState = visualState;
            if (visualState === 'speaking') videoState = 'answering';
            if (visualState === 'idle') videoState = 'idle';
            window.manyashaPlay(videoState, onEnd);
        }
        function warmManyashaMediaOnIntent() {
            if (typeof window.manyashaWarmMedia === 'function') {
                window.manyashaWarmMedia();
            }
        }

        function getMediaStateReadyForMs(expectedState) {
            var readyForMs = 0;
            try {
                if (typeof window.manyashaGetMediaState === 'function') {
                    var mediaState = window.manyashaGetMediaState();
                    if (mediaState && mediaState.state === expectedState) {
                        readyForMs = Math.max(0, Number(mediaState.readyForMs) || 0);
                    }
                }
            } catch (_eMediaState) {}
            return readyForMs;
        }

        function waitForThinkingMediaBeforeReply() {
            if (getWidgetVisualState() !== 'thinking') return Promise.resolve();
            var startedAt = Date.now();
            return new Promise(function(resolve) {
                function poll() {
                    var readyForMs = getMediaStateReadyForMs('thinking');
                    if (readyForMs >= THINKING_VIDEO_MIN_VISIBLE_MS) {
                        resolve();
                        return;
                    }
                    if ((Date.now() - startedAt) >= THINKING_VIDEO_MAX_REPLY_DELAY_MS) {
                        resolve();
                        return;
                    }
                    setTimeout(poll, 80);
                }
                poll();
            });
        }

        function getAnsweringIdleDelayMs() {
            if (getWidgetVisualState() !== 'speaking') return 120;
            var readyForMs = getMediaStateReadyForMs('answering');
            if (readyForMs <= 0) return ANSWERING_VIDEO_MAX_IDLE_DELAY_MS;
            if (readyForMs < ANSWERING_VIDEO_MIN_VISIBLE_MS) {
                return Math.max(120, Math.min(ANSWERING_VIDEO_MIN_VISIBLE_MS - readyForMs, ANSWERING_VIDEO_MAX_IDLE_DELAY_MS));
            }
            return 120;
        }

        // Видео: listening пока пользователь печатает + авто-высота поля
        chatInput.addEventListener('input', function() {
            resizeChatInputHeight();
            if (chatInput.value.trim()) {
                warmManyashaMediaOnIntent();
                primeImmediateWaitingPhraseAudio();
                setFlowState('listening');
            } else if (!isRequestPending) {
                setFlowState('idle');
            }
        });
        chatInput.addEventListener('focus', warmManyashaMediaOnIntent);
        chatInput.addEventListener('pointerdown', warmManyashaMediaOnIntent);
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (typeof chatForm.requestSubmit === 'function') chatForm.requestSubmit();
                else chatForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            }
        });
        resizeChatInputHeight();

        var manyashaGreeted = false;
        function getTimeGreeting() {
            var hour = new Date().getHours();
            var base;
            if (hour >= 5 && hour < 12) base = "Доброе утро!";
            else if (hour >= 12 && hour < 18) base = "Добрый день!";
            else if (hour >= 18 && hour < 23) base = "Добрый вечер!";
            else base = "Доброй ночи!";
            var stageHint = '';
            if ((manyashaProfile.case_stage || '').toLowerCase() === 'critical') {
                stageHint = ' Вижу, что ситуация срочная, разберём её без лишней воды.';
            }
            return base + " Я рядом и помогу спокойно разобрать вашу ситуацию по шагам." + stageHint;
        }

        var WAITING_PHRASE_IMMEDIATE = 'Секунду, я сейчас над этим подумаю.';
        var WAITING_PHRASE_PRELOAD_LIST = [
            WAITING_PHRASE_IMMEDIATE,
            'Секунду, я проверяю детали.',
            'Сейчас аккуратно разберусь.',
            'Дайте мне пару секунд.'
        ];
        var waitingPhraseAudioCache = {};

        function _waitingPhraseCacheEntry(text) {
            var key = sanitizeTTS(String(text || ''));
            if (!key) return null;
            var now = Date.now();
            var entry = waitingPhraseAudioCache[key];
            if (entry && entry.blob) return { key: key, entry: entry };
            if (entry && entry.promise) return { key: key, entry: entry };
            if (entry && !entry.blob && (now - (entry.ts || 0)) < 15000) {
                return { key: key, entry: entry };
            }
            return { key: key, entry: null };
        }

        function getWaitingPhrasePreloadPromise(text) {
            var cacheData = _waitingPhraseCacheEntry(text);
            if (!cacheData || !cacheData.key) return Promise.resolve(null);
            if (cacheData.entry && cacheData.entry.blob) return Promise.resolve(cacheData.entry.blob);
            if (cacheData.entry && cacheData.entry.promise) return cacheData.entry.promise;
            var key = cacheData.key;
            var preloadPromise = fetchTTSBlob(key)
                .then(function(blob) {
                    waitingPhraseAudioCache[key] = { blob: blob || null, promise: null, ts: Date.now() };
                    return blob || null;
                })
                .catch(function() {
                    waitingPhraseAudioCache[key] = { blob: null, promise: null, ts: Date.now() };
                    return null;
                });
            waitingPhraseAudioCache[key] = { blob: null, promise: preloadPromise, ts: Date.now() };
            return preloadPromise;
        }

        function primeWaitingPhraseAudio() {
            if (isMuted || voiceConsentState !== 'granted') return;
            WAITING_PHRASE_PRELOAD_LIST.forEach(function(phrase) {
                getWaitingPhrasePreloadPromise(phrase);
            });
        }
        function primeImmediateWaitingPhraseAudio() {
            if (isMuted || voiceConsentState !== 'granted') return;
            getWaitingPhrasePreloadPromise(WAITING_PHRASE_IMMEDIATE);
        }

        function playWaitingPhraseFast(text) {
            var phrase = sanitizeTTS(String(text || ''));
            var result = {
                started: false,
                done: false,
                queued: false,
                waitForCompletion: false,
                donePromise: null,
                stop: function() {}
            };
            var doneResolver = null;
            result.donePromise = new Promise(function(resolve) { doneResolver = resolve; });
            var finalized = false;
            var flow = null;
            var startTimeout = null;
            var maxTotalTimeout = null;
            var startedSafetyTimeout = null;

            function markDone() {
                if (finalized) return;
                finalized = true;
                result.done = true;
                if (startTimeout) clearTimeout(startTimeout);
                startTimeout = null;
                if (maxTotalTimeout) clearTimeout(maxTotalTimeout);
                maxTotalTimeout = null;
                if (startedSafetyTimeout) clearTimeout(startedSafetyTimeout);
                startedSafetyTimeout = null;
                if (doneResolver) doneResolver(result);
            }

            function markStarted() {
                result.waitForCompletion = true;
                result.started = true;
                if (startTimeout) clearTimeout(startTimeout);
                startTimeout = null;
                if (maxTotalTimeout) clearTimeout(maxTotalTimeout);
                maxTotalTimeout = null;
                if (!startedSafetyTimeout) {
                    startedSafetyTimeout = setTimeout(function() {
                        if (finalized) return;
                        if (flow && typeof flow.stop === 'function') {
                            try { flow.stop(); } catch (_eStopStartedFlow) {}
                        }
                        markDone();
                    }, WAITING_VOICE_STARTED_MAX_MS);
                }
            }

            result.stop = function() {
                if (flow && typeof flow.stop === 'function') {
                    try { flow.stop(); } catch (_eStopFlow) {}
                }
                markDone();
            };

            if (!phrase || isMuted || voiceConsentState !== 'granted') {
                markDone();
                return result;
            }

            flow = speakReplyWithSyncState(phrase, 'good', {
                segments: [phrase],
                preloadBlobPromise: getWaitingPhrasePreloadPromise(phrase),
                source: 'chat_submit_waiting_phrase',
                onStart: function() {
                    markStarted();
                },
                onChunkStart: function() {
                    markStarted();
                },
                onDone: function() {
                    markDone();
                },
                onUnavailable: function() {
                    markDone();
                }
            });
            result.queued = !!(flow && flow.queued);

            startTimeout = setTimeout(function() {
                if (result.started || finalized) return;
                result.waitForCompletion = false;
                if (flow && typeof flow.stop === 'function') {
                    try { flow.stop(); } catch (_eStopTimeoutFlow) {}
                }
                markDone();
            }, WAITING_VOICE_START_TIMEOUT_MS);

            maxTotalTimeout = setTimeout(function() {
                if (finalized) return;
                if (result.started) {
                    return;
                }
                result.waitForCompletion = false;
                if (flow && typeof flow.stop === 'function') {
                    try { flow.stop(); } catch (_eStopMaxFlow) {}
                }
                markDone();
            }, WAITING_VOICE_MAX_TOTAL_MS);

            if (!result.queued) {
                markDone();
            }

            if (flow && flow.donePromise) {
                flow.donePromise.then(function() {
                    markDone();
                }).catch(function() {
                    markDone();
                });
            }
            return result;
        }

        function showGreetingIfNeeded() {
            if (!manyashaGreeted) {
                var greeting = getTimeGreeting();
                    addChatMsg(greeting, 'bot');
                    chatHistory.push({role: 'assistant', content: greeting});
                    manyashaGreeted = true;
                    updateQuickPanel(greeting);
                    // 🎬 Маняша машет при приветствии

            }
        }

        if (chatMessages.children.length === 0) {
            showGreetingIfNeeded();
        }

        // При показе виджета — приветствие
        var _origShow = showManyasha;
        showManyasha = function() {
            _origShow();
            setTimeout(function() {
                if (chatMessages.children.length === 0) showGreetingIfNeeded();
            }, 400);
        };
        if (showBtn) {
            showBtn.addEventListener('click', function(e) {
                if (Date.now() < manyashaShowBtnDragSuppressUntil) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                showManyasha();
                trackEvent('widget_opened', {});
            });
        }

        // ─── Trigger engine: 6-8 триггеров + anti-spam cooldown ───
        var TRIGGER_MEM_KEY = 'manyasha_trigger_memory_v1';
        var triggerMem = (function() {
            try {
                var raw = localStorage.getItem(TRIGGER_MEM_KEY);
                if (raw) return JSON.parse(raw) || {};
            } catch (e) {}
            return {};
        })();
        if (!triggerMem.triggers) triggerMem.triggers = {};
        var triggerSessionFired = 0;
        function saveTriggerMem() {
            if (Object.prototype.hasOwnProperty.call(triggerMem, 'session_fired')) {
                delete triggerMem.session_fired;
            }
            try { localStorage.setItem(TRIGGER_MEM_KEY, JSON.stringify(triggerMem)); } catch (e) {}
        }
        function canFireTrigger(triggerId, cooldownMs) {
            var now = Date.now();
            var globalCooldown = 20 * 60 * 1000;
            if (triggerMem.last_fired_at && (now - triggerMem.last_fired_at) < globalCooldown) return false;
            var lastById = triggerMem.triggers[triggerId] || 0;
            if (now - lastById < (cooldownMs || (90 * 60 * 1000))) return false;
            if (triggerSessionFired >= 2) return false;
            return true;
        }
        function markTriggerFired(triggerId) {
            var now = Date.now();
            triggerMem.last_fired_at = now;
            triggerMem.triggers[triggerId] = now;
            triggerMem.last_source = triggerId;
            triggerSessionFired += 1;
            saveTriggerMem();
        }
        function setTeaserMessage(text) {
            var teaserMsg = document.getElementById('manyasha-teaser-msg');
            if (teaserMsg) teaserMsg.textContent = text;
        }
        function proactiveTextByTrigger(triggerId) {
            var map = {
                time_on_page_18s: 'Если хотите, начнем с короткой проверки вашей ситуации по долгам.',
                scroll_depth_55: 'Вижу, что вы изучаете страницу. Могу сразу показать безопасный план.',
                scroll_depth_85: 'Если вы почти дочитали, могу собрать краткий персональный разбор.',
                exit_intent: 'Перед уходом: могу за 1 минуту подсветить риски и шаги.',
                inactivity_45s: 'Если вы думаете над следующим шагом, я помогу без давления.',
                returning_user: 'С возвращением. Продолжим с того места, где остановились?',
                page_intent_pricing: 'Могу объяснить, от чего зависит стоимость именно в вашем кейсе.',
            };
            return map[triggerId] || 'Могу помочь с разбором вашей ситуации.';
        }
        function fireProactiveTrigger(triggerId, extra) {
            if (widget && widget.style.display !== 'none') return;
            if (!canFireTrigger(triggerId)) return;
            markTriggerFired(triggerId);
            var text = proactiveTextByTrigger(triggerId);
            setTeaserMessage(text);
            trackEvent('trigger_fired', Object.assign({ trigger_id: triggerId }, (extra || {})));
            var shouldOpenNow = (
                abVariants.trigger_style === 'assertive_open' &&
                (triggerId === 'exit_intent' || triggerId === 'scroll_depth_85')
            );
            if (shouldOpenNow) {
                showManyasha();
                if (!manyashaGreeted) {
                    addChatMsg(text, 'bot');
                    chatHistory.push({ role: 'assistant', content: text });
                    manyashaGreeted = true;
                }
                trackEvent('trigger_opened_widget', { trigger_id: triggerId, mode: 'auto' });
            } else if (showBtn) {
                showBtn.style.display = 'block';
                showBtn.classList.remove('manyasha-hidden');
                trackEvent('trigger_opened_widget', { trigger_id: triggerId, mode: 'teaser' });
            }
        }
        function startTriggerEngine() {
            if (triggerEngineStarted) return;
            triggerEngineStarted = true;

            setTimeout(function() { fireProactiveTrigger('time_on_page_18s', { seconds: 18 }); }, 18000);

            var scroll55Done = false;
            var scroll85Done = false;
            window.addEventListener('scroll', function() {
                var docH = Math.max(
                    document.body.scrollHeight, document.documentElement.scrollHeight,
                    document.body.offsetHeight, document.documentElement.offsetHeight
                );
                var viewport = window.innerHeight || document.documentElement.clientHeight || 1;
                var maxScrollable = Math.max(1, docH - viewport);
                var pct = (window.scrollY || window.pageYOffset || 0) / maxScrollable;
                if (!scroll55Done && pct >= 0.55) {
                    scroll55Done = true;
                    fireProactiveTrigger('scroll_depth_55', { depth_pct: 55 });
                }
                if (!scroll85Done && pct >= 0.85) {
                    scroll85Done = true;
                    fireProactiveTrigger('scroll_depth_85', { depth_pct: 85 });
                }
            }, { passive: true });

            document.addEventListener('mouseout', function(e) {
                if (!e || e.relatedTarget || e.toElement) return;
                if (typeof e.clientY === 'number' && e.clientY <= 3) {
                    fireProactiveTrigger('exit_intent', {});
                }
            });

            var inactivityTimer = null;
            function refreshInactivityTimer() {
                if (inactivityTimer) clearTimeout(inactivityTimer);
                inactivityTimer = setTimeout(function() {
                    fireProactiveTrigger('inactivity_45s', { inactivity_sec: 45 });
                }, 45000);
            }
            ['mousemove', 'scroll', 'keydown', 'touchstart'].forEach(function(evt) {
                window.addEventListener(evt, refreshInactivityTimer, { passive: true });
            });
            refreshInactivityTimer();

            if (localStorage.getItem(WIDGET_SEEN_KEY) === '1') {
                setTimeout(function() { fireProactiveTrigger('returning_user', {}); }, 2500);
            }
            var pathHint = (location.pathname + ' ' + document.title).toLowerCase();
            if (/tarif|pricing|price|стоим|тариф/.test(pathHint)) {
                setTimeout(function() {
                    fireProactiveTrigger('page_intent_pricing', { page_intent: 'pricing' });
                }, 3500);
            }
        }
        startTriggerEngine();

        function formatBold(text) {
            var el = document.createElement('span');
            el.textContent = text;
            var safe = el.innerHTML;
            safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            safe = safe.replace(/\n/g, '<br>');
            return safe;
        }

        function getSuggestedQuestions(userText, botReply) {
            var lowerUser = String(userText || '').toLowerCase();
            var lowerBot = String(botReply || '').toLowerCase();
            var lower = lowerUser + ' ' + lowerBot;

            function actions(items) {
                return items.slice(0, 3).map(function(item) {
                    return { text: item[0], value: item[1] || item[0] };
                });
            }

            function pick(rules, source) {
                for (var i = 0; i < rules.length; i++) {
                    if (rules[i].match.test(source || '')) return actions(rules[i].items);
                }
                return null;
            }

            var bailiff = [
                ['Как проверить ИП?', 'Как проверить исполнительные производства?'],
                ['Что можно сохранить?', 'Что из имущества и дохода можно сохранить?'],
                ['Как остановить списания?', 'Как законно уменьшить или остановить списания приставов?']
            ];
            var procedure = [
                ['Когда подходит МФЦ?', 'Когда подходит банкротство через МФЦ?'],
                ['Когда нужен суд?', 'Когда лучше идти в судебное банкротство?'],
                ['Какие риски?', 'Какие риски есть у каждого варианта?']
            ];
            var docs = [
                ['Список документов', 'Какие документы нужны для банкротства?'],
                ['Где их взять?', 'Где взять документы для банкротства?'],
                ['Что первым?', 'Что подготовить первым?']
            ];
            var property = [
                ['Квартира сохранится?', 'Можно ли сохранить квартиру при банкротстве?'],
                ['Что могут продать?', 'Какое имущество могут продать?'],
                ['Как снизить риски?', 'Как снизить риски по имуществу?']
            ];
            var collectors = [
                ['Что им отвечать?', 'Что отвечать коллекторам?'],
                ['Куда жаловаться?', 'Куда жаловаться на коллекторов?'],
                ['Как защититься?', 'Как законно защититься от давления коллекторов?']
            ];
            var timeline = [
                ['Сколько длится?', 'Сколько длится процедура банкротства?'],
                ['Какие этапы?', 'Какие этапы есть в процедуре?'],
                ['Что ускорит?', 'Что может ускорить подготовку?']
            ];
            var debts = [
                ['Какие долги учитываются?', 'Какие долги учитываются при банкротстве?'],
                ['Что с имуществом?', 'Что будет с имуществом при долгах?'],
                ['Когда нужен суд?', 'Когда при долгах нужен суд?']
            ];
            var userRules = [
                { match: /пристав|арест|исполнительн|фссп|списан|удержан/, items: bailiff },
                { match: /мфц|внесудебн|через суд|судебн|суд/, items: procedure },
                { match: /документ|справк|выписк|список|подготов/, items: docs },
                { match: /квартир|жиль|имуществ|машин|собственност|продад|сохран/, items: property },
                { match: /коллектор|звон|угрож|давлен/, items: collectors },
                { match: /срок|длит|врем|этап|когда/, items: timeline },
                { match: /долг|кредит|микрозайм|мфо|займ|банк/, items: debts }
            ];
            var contextRules = [
                userRules[0],
                userRules[6],
                userRules[1],
                userRules[2],
                userRules[3],
                userRules[4],
                userRules[5]
            ];

            return pick(userRules, lowerUser) || pick(contextRules, lower) || actions([
                ['Подробнее', 'Расскажите подробнее'],
                ['Что дальше?', 'Что мне делать дальше?'],
                ['Когда нужен юрист?', 'Когда в моей ситуации нужен юрист?']
            ]);
        }

        var quickPanel    = document.getElementById('manyasha-quick-panel');
        var quickRepliesEl = document.getElementById('manyasha-quick-replies');
        var suggestedEl    = document.getElementById('manyasha-suggested');
        var chatResizeBtn  = document.getElementById('manyasha-chat-resize');
        var resizeLabel    = document.getElementById('manyasha-resize-label');
        var chatEl = document.getElementById('manyasha-chat');

        // ─── Расширение/сужение чата (3 состояния) ───
        var chatSizes = ['normal', 'expanded', 'fullsize'];
        var chatSizeIdx = 0;
        var chatSizeLabels = ['развернуть', 'ещё больше', 'свернуть'];
        var expandActionLabels = ['Развернуть чат', 'Ещё больше', 'Свернуть чат'];

        function applyChatSizeState(nextIdx) {
            if (!chatEl) return;
            chatSizeIdx = nextIdx;
            chatEl.classList.remove('expanded', 'fullsize');
            if (chatSizes[chatSizeIdx] !== 'normal') {
                chatEl.classList.add(chatSizes[chatSizeIdx]);
            }

            var isOpen = chatSizeIdx !== 0;
            widget.classList.toggle('chat-expanded', isOpen);
            widget.classList.toggle('chat-fullsize', chatSizeIdx === 2);

            if (expandIcon) {
                expandIcon.innerHTML = isOpen
                    ? '<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>'
                    : '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>';
            }
            if (expandBtn) {
                expandBtn.title = isOpen ? 'Свернуть чат' : 'Развернуть чат';
                expandBtn.setAttribute('aria-label', isOpen ? 'Свернуть' : 'Развернуть');
            }
            if (expandLabel) {
                expandLabel.textContent = expandActionLabels[chatSizeIdx];
            }

            if (resizeLabel) resizeLabel.textContent = chatSizeLabels[chatSizeIdx];

            var titleByState = [
                'Развернуть чат',
                'Ещё больше',
                'Свернуть чат'
            ];
            if (chatResizeBtn) {
                chatResizeBtn.title = titleByState[chatSizeIdx];
            }
            scheduleManyashaEmbedSizeReport();
            setTimeout(scheduleManyashaEmbedSizeReport, 140);
            setTimeout(scheduleManyashaEmbedSizeReport, 380);

            setTimeout(function() {
                if (typeof scrollChatToBottom === 'function') scrollChatToBottom(false);
            }, 320);
        }

        var expandBtn  = document.getElementById('manyasha-expand-btn');
        var expandIcon = document.getElementById('manyasha-expand-icon');
        var expandLabel = document.getElementById('manyasha-expand-label');

        if (chatResizeBtn && chatForm && chatEl) {
            if (widget.classList.contains('chat-fullsize') || chatEl.classList.contains('fullsize')) {
                chatSizeIdx = 2;
            } else if (widget.classList.contains('chat-expanded') || chatEl.classList.contains('expanded')) {
                chatSizeIdx = 1;
            }
            applyChatSizeState(chatSizeIdx);

            chatResizeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                var nextIdx = (chatSizeIdx + 1) % chatSizes.length;
                applyChatSizeState(nextIdx);
            });
        }

        if (expandBtn) {
            expandBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                var nextIdx = (chatSizeIdx + 1) % chatSizes.length;
                applyChatSizeState(nextIdx);
                closeManyashaMenu();
                setTimeout(function() {
                    if (chatMessages && typeof scrollChatToBottom === 'function') scrollChatToBottom(false);
                }, 370);
            });
        }

        function updateQuickPanel(userText, botReply) {
            if (!quickPanel) return;
            if (demoModeEnabled) {
                renderDemoQuickPanel();
                return;
            }
            var userMessageCount = chatHistory.filter(function(m) { return m.role === 'user'; }).length;
            if (userMessageCount === 0) {
                renderNormalStarterQuickPanel();
                return;
            }
            quickRepliesEl.innerHTML = '';
            suggestedEl.innerHTML = '';
            var quickActions = getSuggestedQuestions(userText, botReply);
            quickActions.slice(0, 3).forEach(function(r, qi) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'quick-reply-btn';
                btn.textContent = r.text;
                btn.style.animationDelay = (qi * 40) + 'ms';
                btn.onclick = function() {
                    dispatchQuickReplyText(r.value);
                };
                quickRepliesEl.appendChild(btn);
            });

            renderDiagnosticReportAction();
            quickPanel.classList.add('visible');
        }

        function renderNormalStarterQuickPanel() {
            if (!quickPanel || !quickRepliesEl || !suggestedEl || !chatInput || !chatForm) return;
            quickRepliesEl.innerHTML = '';
            suggestedEl.innerHTML = '';
            [
                'У меня долги',
                'Приставы списывают',
                'МФЦ или суд?'
            ].forEach(function(question, index) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'quick-reply-btn';
                btn.textContent = question;
                btn.style.animationDelay = (index * 40) + 'ms';
                btn.onclick = function() {
                    dispatchQuickReplyText(question);
                };
                quickRepliesEl.appendChild(btn);
            });
            quickPanel.classList.add('visible');
        }

        function renderDiagnosticReportAction() {
            if (!suggestedEl || demoModeEnabled || !diagnosticsManager || typeof diagnosticsManager.buildClientReport !== 'function') return;
            suggestedEl.innerHTML = '';
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'manyasha-report-action';
            btn.textContent = 'Показать итог';
            btn.addEventListener('click', function() {
                appendDiagnosticReportCard();
            });
            suggestedEl.appendChild(btn);
        }

        function dispatchQuickReplyText(text) {
            var value = String(text || '').trim();
            if (!value) return;
            if (diagnosticsManager && typeof diagnosticsManager.updateFromQuickReply === 'function') {
                diagnosticsManager.updateFromQuickReply(value);
            }
            chatInput.value = value;
            chatForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }

        function hideQuickPanel() {
            if (quickPanel) quickPanel.classList.remove('visible');
        }
        if (demoModeEnabled) {
            setTimeout(function() {
                if (!isRequestPending) renderDemoQuickPanel();
            }, 120);
        } else {
            setTimeout(function() {
                var userMessageCount = chatHistory.filter(function(m) { return m.role === 'user'; }).length;
                if (!isRequestPending && userMessageCount === 0) renderNormalStarterQuickPanel();
            }, 120);
        }

        function addCopyButton(msgDiv, text) {
            var btn = document.createElement('button');
            btn.className = 'chat-msg-copy';
            btn.style.marginLeft = '4px'; // небольшой отступ слева как у пузыря
            var SVG_COPY  = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';
            var SVG_CHECK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
            btn.innerHTML = SVG_COPY;
            btn.title = 'Копировать';
            btn.onclick = function(e) {
                e.stopPropagation();
                var doOk = function() {
                    btn.innerHTML = SVG_CHECK;
                    btn.classList.add('copied');
                    setTimeout(function() {
                        btn.innerHTML = SVG_COPY;
                        btn.classList.remove('copied');
                    }, 1500);
                };
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(doOk).catch(function() {
                        var ta = document.createElement('textarea');
                        ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;';
                        document.body.appendChild(ta); ta.select();
                        document.execCommand('copy'); document.body.removeChild(ta); doOk();
                    });
                } else {
                    var ta = document.createElement('textarea');
                    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;';
                    document.body.appendChild(ta); ta.select();
                    document.execCommand('copy'); document.body.removeChild(ta); doOk();
                }
            };
            // Вставляем кнопку ПОСЛЕ пузыря (не внутри)
            if (msgDiv.parentNode) {
                msgDiv.parentNode.insertBefore(btn, msgDiv.nextSibling);
            } else {
                msgDiv.appendChild(btn);
            }
        }

        function writeTextToClipboard(text, onOk) {
            var value = String(text || '');
            var done = typeof onOk === 'function' ? onOk : function() {};
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(value).then(done).catch(function() {
                    var ta = document.createElement('textarea');
                    ta.value = value; ta.style.cssText = 'position:fixed;opacity:0;';
                    document.body.appendChild(ta); ta.select();
                    document.execCommand('copy'); document.body.removeChild(ta); done();
                });
            } else {
                var ta = document.createElement('textarea');
                ta.value = value; ta.style.cssText = 'position:fixed;opacity:0;';
                document.body.appendChild(ta); ta.select();
                document.execCommand('copy'); document.body.removeChild(ta); done();
            }
        }

        function getLastChatBubble() {
            var ch = chatMessages.children;
            for (var i = ch.length - 1; i >= 0; i--) {
                if (ch[i].classList && ch[i].classList.contains('chat-msg')) return ch[i];
            }
            return null;
        }

        function addChatMsg(text, role) {
            var div = document.createElement('div');
            var parts = String(role).trim().split(/\s+/);
            var speaker = parts[0];
            var cls = 'chat-msg ' + role;
            var prev = getLastChatBubble();
            if (prev && prev.classList.contains(speaker)) {
                cls += ' msg-grouped';
            }
            div.className = cls;
            if (role.indexOf('typing') !== -1) {
                div.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
            } else {
                div.innerHTML = formatBold(text);
            }
            chatMessages.appendChild(div);
            if (role === 'bot') {
                addCopyButton(div, text);
            }
            scrollChatToBottomIfPinned(false);
            updateScrollBottomBtn();
            return div;
        }

        function renderDiagnosticSummaryIfNeeded() {
            if (demoModeEnabled || !diagnosticsManager || typeof diagnosticsManager.shouldShowSummary !== 'function') return;
            var userMessageCount = chatHistory.filter(function(m) { return m.role === 'user'; }).length;
            if (!diagnosticsManager.shouldShowSummary(userMessageCount)) return;
            var summary = diagnosticsManager.buildSummary();
            if (!summary || (!summary.known || !summary.known.length)) return;
            var card = document.createElement('div');
            card.className = 'manyasha-diagnostic-card';
            var title = document.createElement('div');
            title.className = 'manyasha-diagnostic-title';
            title.textContent = 'Маршрут ситуации';
            card.appendChild(title);
            if (summary.progress && summary.progress.label) {
                var progress = document.createElement('div');
                progress.className = 'manyasha-diagnostic-progress';
                var progressLabel = document.createElement('span');
                progressLabel.textContent = summary.progress.label;
                var progressTrack = document.createElement('i');
                var progressFill = document.createElement('b');
                progressFill.style.width = Math.max(0, Math.min(100, Number(summary.progress.percent || 0))) + '%';
                progressTrack.appendChild(progressFill);
                progress.appendChild(progressLabel);
                progress.appendChild(progressTrack);
                card.appendChild(progress);
            }

            function addSection(label, items, sectionKey) {
                var section = document.createElement('div');
                section.className = 'manyasha-diagnostic-section' + (sectionKey ? ' manyasha-diagnostic-section-' + sectionKey : '');
                var strong = document.createElement('strong');
                strong.textContent = label;
                section.appendChild(strong);
                if (sectionKey === 'missing' && items && items.length) {
                    var list = document.createElement('span');
                    list.className = 'manyasha-diagnostic-missing-list';
                    items.slice(0, 2).forEach(function(item) {
                        var pill = document.createElement('span');
                        pill.className = 'manyasha-diagnostic-pill';
                        pill.textContent = item;
                        list.appendChild(pill);
                    });
                    section.appendChild(list);
                } else {
                    var text = document.createElement('span');
                    text.textContent = (items && items.length) ? items.join('; ') : 'пока нужно уточнить';
                    section.appendChild(text);
                }
                card.appendChild(section);
            }

            addSection('Что уже понятно', summary.known || [], 'known');
            addSection('Что уточнить', summary.missing || [], 'missing');
            if (summary.missing_actions && summary.missing_actions.length) {
                var actions = document.createElement('div');
                actions.className = 'manyasha-diagnostic-actions';
                summary.missing_actions.slice(0, 2).forEach(function(action) {
                    var actionBtn = document.createElement('button');
                    actionBtn.type = 'button';
                    actionBtn.className = 'manyasha-diagnostic-action';
                    actionBtn.textContent = action.label || 'Уточнить';
                    actionBtn.addEventListener('click', function() {
                        dispatchQuickReplyText(action.value || action.label || '');
                    });
                    actions.appendChild(actionBtn);
                });
                card.appendChild(actions);
            }
            addSection('Следующий шаг', [summary.next_step || 'Продолжим уточнять ситуацию без финальных выводов.'], 'next');
            var reportActions = document.createElement('div');
            reportActions.className = 'manyasha-diagnostic-actions';
            var reportBtn = document.createElement('button');
            reportBtn.type = 'button';
            reportBtn.className = 'manyasha-diagnostic-action manyasha-diagnostic-report-btn';
            reportBtn.textContent = 'Показать итог';
            reportBtn.addEventListener('click', function() {
                appendDiagnosticReportCard();
            });
            reportActions.appendChild(reportBtn);
            card.appendChild(reportActions);
            var note = document.createElement('div');
            note.className = 'manyasha-diagnostic-note';
            note.textContent = 'Это не юридическое заключение, а ориентир для следующего вопроса.';
            card.appendChild(note);
            chatMessages.appendChild(card);
            if (typeof diagnosticsManager.markSummaryShown === 'function') diagnosticsManager.markSummaryShown();
            scrollChatToBottomIfPinned(true);
        }

        function appendDiagnosticReportCard() {
            if (demoModeEnabled || !diagnosticsManager || typeof diagnosticsManager.buildClientReport !== 'function') return;
            var report = diagnosticsManager.buildClientReport();
            if (!report) return;
            var card = document.createElement('div');
            card.className = 'manyasha-client-report-card';
            var title = document.createElement('div');
            title.className = 'manyasha-client-report-title';
            title.textContent = report.title || 'Предварительный итог';
            card.appendChild(title);

            if (report.message) {
                var message = document.createElement('p');
                message.className = 'manyasha-client-report-message';
                message.textContent = report.message;
                card.appendChild(message);
            }

            (report.sections || []).forEach(function(section) {
                var block = document.createElement('div');
                block.className = 'manyasha-client-report-section';
                var heading = document.createElement('strong');
                heading.textContent = section.title || 'Раздел';
                block.appendChild(heading);
                var list = document.createElement('ul');
                (section.items || []).slice(0, 6).forEach(function(item) {
                    var li = document.createElement('li');
                    li.textContent = item;
                    list.appendChild(li);
                });
                block.appendChild(list);
                card.appendChild(block);
            });

            var disclaimer = document.createElement('div');
            disclaimer.className = 'manyasha-client-report-disclaimer';
            disclaimer.textContent = report.disclaimer || 'Предварительно, по вашим словам. Это не юридическое заключение.';
            card.appendChild(disclaimer);

            var copy = document.createElement('button');
            copy.type = 'button';
            copy.className = 'manyasha-client-report-copy';
            copy.textContent = 'Скопировать итог';
            copy.addEventListener('click', function() {
                writeTextToClipboard(report.copy_text || card.textContent || '', function() {
                    copy.textContent = 'Итог скопирован';
                    setTimeout(function() { copy.textContent = 'Скопировать итог'; }, 1500);
                });
            });
            card.appendChild(copy);
            appendDiagnosticReportEmailControls(card, report);
            chatMessages.appendChild(card);
            scrollChatToBottomIfPinned(true);
            updateScrollBottomBtn();
        }

        function appendDiagnosticReportEmailControls(card, report) {
            var wrap = document.createElement('div');
            wrap.className = 'manyasha-client-report-email';
            var toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'manyasha-client-report-email-toggle';
            toggle.textContent = 'Отправить на email';
            var form = document.createElement('div');
            form.className = 'manyasha-client-report-email-form';
            form.hidden = true;

            var input = document.createElement('input');
            input.type = 'email';
            input.placeholder = 'ваш@email.ru';
            input.autocomplete = 'email';
            input.maxLength = 255;
            input.className = 'manyasha-client-report-email-input';

            var consent = document.createElement('p');
            consent.className = 'manyasha-client-report-email-consent';
            consent.textContent = 'Отправим только этот предварительный итог и безопасную диагностику. История чата и технические токены не отправляются.';

            var actions = document.createElement('div');
            actions.className = 'manyasha-client-report-email-actions';
            var send = document.createElement('button');
            send.type = 'button';
            send.className = 'manyasha-client-report-email-send';
            send.textContent = 'Отправить итог';
            var cancel = document.createElement('button');
            cancel.type = 'button';
            cancel.className = 'manyasha-client-report-email-cancel';
            cancel.textContent = 'Отмена';
            actions.appendChild(send);
            actions.appendChild(cancel);

            var statusEl = document.createElement('div');
            statusEl.className = 'manyasha-client-report-email-status';
            form.appendChild(input);
            form.appendChild(consent);
            form.appendChild(actions);
            form.appendChild(statusEl);

            toggle.addEventListener('click', function() {
                form.hidden = !form.hidden;
                statusEl.textContent = '';
                statusEl.classList.remove('error', 'success');
                if (!form.hidden) input.focus();
            });
            cancel.addEventListener('click', function() {
                form.hidden = true;
                statusEl.textContent = '';
                statusEl.classList.remove('error', 'success');
            });
            send.addEventListener('click', function() {
                var email = String(input.value || '').trim();
                if (!email || email.indexOf('@') === -1) {
                    statusEl.textContent = 'Введите корректный email.';
                    statusEl.className = 'manyasha-client-report-email-status error';
                    return;
                }
                var reportText = String(report.copy_text || '').trim();
                if (!reportText) {
                    statusEl.textContent = 'Итог пока пустой, сформируйте его ещё раз.';
                    statusEl.className = 'manyasha-client-report-email-status error';
                    return;
                }
                send.disabled = true;
                statusEl.textContent = 'Отправляю итог...';
                statusEl.className = 'manyasha-client-report-email-status';
                ensureManyashaBackendContext().then(function() {
                    return manyashaFetchWithRetry('/api/client-report-email', {
                        method: 'POST',
                        headers: buildWidgetAuthHeaders({ 'Content-Type': 'application/json' }),
                        body: JSON.stringify({
                            email: email,
                            session_id: sessionId,
                            report_text: reportText,
                            diagnostics: getDiagnosticsLeadPacket() || {},
                            consent: true,
                            captcha_token: getCaptchaToken() || null,
                            website: ''
                        })
                    }, { retries: 0, retryDelayMs: 250 });
                }).then(function(res) {
                    if (!res || !res.ok) {
                        return (res ? res.json().catch(function() { return {}; }) : Promise.resolve({})).then(function(data) {
                            throw new Error(String(data.detail || 'Не удалось отправить итог.'));
                        });
                    }
                    statusEl.textContent = 'Итог отправлен. Проверьте почту.';
                    statusEl.className = 'manyasha-client-report-email-status success';
                    toggle.textContent = 'Итог отправлен на email';
                }).catch(function(err) {
                    statusEl.textContent = String(err && err.message ? err.message : 'Не удалось отправить итог.');
                    statusEl.className = 'manyasha-client-report-email-status error';
                }).finally(function() {
                    send.disabled = false;
                });
            });

            wrap.appendChild(toggle);
            wrap.appendChild(form);
            card.appendChild(wrap);
        }

        function bootstrapChatHistoryFromStorageAndServer() {
            function renderFromMessages(msgs) {
                if (!msgs || !msgs.length) return false;
                var filteredHistory = msgs.filter(function(m) {
                    return m && (m.role === 'user' || m.role === 'assistant') && m.content;
                });
                var firstUserIndex = -1;
                for (var i = 0; i < filteredHistory.length; i += 1) {
                    if (filteredHistory[i].role === 'user') {
                        firstUserIndex = i;
                        break;
                    }
                }
                if (firstUserIndex < 0) {
                    try { localStorage.setItem(HISTORY_KEY, JSON.stringify({ messages: [] })); } catch (_eClearAssistantOnlyHistory) {}
                    return false;
                }
                chatHistory = filteredHistory.slice(firstUserIndex);
                if (!chatHistory.length) return false;
                chatMessages.innerHTML = '';
                var _hm = document.createElement('div');
                _hm.className = 'chat-history-marker';
                _hm.textContent = 'Начало переписки';
                chatMessages.appendChild(_hm);
                chatHistory.forEach(function(m) {
                    if (m.role === 'user') addChatMsg(m.content, 'user');
                    else addChatMsg(m.content, 'bot');
                });
                setTimeout(function() {
                    scrollChatToBottom(false);
                    updateScrollBottomBtn();
                }, 0);
                localStorage.setItem(HISTORY_KEY, JSON.stringify({ messages: chatHistory.slice(-30) }));
                return true;
            }
            ensureManyashaBackendContext().then(function(ctx) {
                if (!ctx || !ctx.partnerId || !ctx.userId || !ctx.dialogSessionId) return null;
                return manyashaFetchWithRetry('/api/chat/session/' + encodeURIComponent(sessionId) +
                    '?partner_id=' + encodeURIComponent(ctx.partnerId) +
                    '&user_id=' + encodeURIComponent(ctx.userId) +
                    '&dialog_session_id=' + encodeURIComponent(ctx.dialogSessionId), {
                        headers: buildWidgetAuthHeaders({})
                    }, { retries: 1, retryDelayMs: 250 })
                    .then(function(r) { return r.json(); });
            }).catch(function() { return null; })
            .then(function(data) {
                if (data && data.messages && data.messages.length && renderFromMessages(data.messages)) return;
                var raw = localStorage.getItem(HISTORY_KEY);
                if (!raw) return;
                try {
                    var parsed = JSON.parse(raw);
                    if (parsed && parsed.messages && parsed.messages.length) renderFromMessages(parsed.messages);
                } catch (e) {}
            });
        }

        bootstrapChatHistoryFromStorageAndServer();

        // Typewriter-эффект: выводит текст посимвольно в элемент
        function typewriterEffect(div, text, onDone, options) {
            var formatted = formatBold(text);
            var opts = options || {};
            var appendMode = !!opts.append;
            var finished = false;
            var stopRequested = false;
            var tickTimer = null;
            var cursor = null;

            function finishIfNeeded() {
                if (finished || stopRequested) return;
                finished = true;
                if (cursor && cursor.parentNode) {
                    cursor.parentNode.removeChild(cursor);
                }
                if (typeof onDone === 'function') onDone();
            }

            function stop() {
                stopRequested = true;
                if (tickTimer) clearTimeout(tickTimer);
                tickTimer = null;
                if (cursor && cursor.parentNode) {
                    cursor.parentNode.removeChild(cursor);
                }
            }

            if (document.visibilityState === 'hidden' || (widget && widget.classList.contains('manyasha-hidden'))) {
                if (appendMode && div) {
                    div.insertAdjacentHTML('beforeend', formatted);
                } else if (div) {
                    div.innerHTML = formatted;
                }
                scrollChatToBottomIfPinned(false);
                updateScrollBottomBtn();
                finishIfNeeded();
                return { stop: stop };
            }

            cursor = document.createElement('span');
            cursor.className = 'typewriter-cursor';
            if (!div) return { stop: stop };
            if (appendMode) {
                div.appendChild(cursor);
            } else {
                div.innerHTML = '';
                div.appendChild(cursor);
            }

            // Парсим HTML в отдельный div, затем читаем текстовые узлы
            var tmp = document.createElement('div');
            tmp.innerHTML = formatted;
            var nodes = [];
            (function collect(node) {
                node.childNodes.forEach(function(n) {
                    if (n.nodeType === 3) { // text
                        nodes.push({type: 'text', text: n.textContent});
                    } else if (n.nodeName === 'STRONG') {
                        nodes.push({type: 'strong', text: n.textContent});
                    } else if (n.nodeName === 'BR') {
                        nodes.push({type: 'br'});
                    } else {
                        collect(n);
                    }
                });
            })(tmp);

            var ni = 0, ci = 0;
            var currentEl = null;
            var SPEED = 11; // мс на символ (чуть быстрее, без заиканий)
            var punctuationDelayMap = {
                '.': 24,
                '!': 24,
                '?': 26,
                ',': 16,
                ';': 18,
                ':': 18,
                '…': 28
            };

            function tick() {
                if (ni >= nodes.length) {
                    if (stopRequested) return;
                    finishIfNeeded();
                    return;
                }
                if (stopRequested) return;
                var node = nodes[ni];
                if (node.type === 'br') {
                    div.insertBefore(document.createElement('br'), cursor);
                    currentEl = null;
                    ni++;
                    tickTimer = setTimeout(tick, SPEED);
                    return;
                }
                if (ci === 0) {
                    if (node.type === 'strong') {
                        currentEl = document.createElement('strong');
                    } else {
                        currentEl = document.createTextNode('');
                    }
                    div.insertBefore(currentEl, cursor);
                }
                var ch = node.text[ci];
                var delay = SPEED;
                if (ch === ' ') delay = Math.max(18, SPEED + 6);
                else if (punctuationDelayMap[ch]) delay = Math.max(delay, punctuationDelayMap[ch]);
                if (node.type === 'strong') {
                    currentEl.textContent += ch;
                } else {
                    currentEl.textContent += ch;
                }
                ci++;
                if (ci >= node.text.length) { ni++; ci = 0; currentEl = null; }
                scrollChatToBottomIfPinned(false);
                tickTimer = setTimeout(tick, delay);
            }
            tick();

            return { stop: stop };
        }

        function createReplySpeechTypingFlow(targetDiv, flowId, onSegmentDone) {
            var queue = [];
            var activeHandle = null;
            var stopped = false;

            function pump() {
                if (stopped || activeHandle || !queue.length) return;
                var next = queue.shift();
                var seg = next && next.text;
                if (!seg) {
                    pump();
                    return;
                }
                activeHandle = typewriterEffect(targetDiv, seg, function() {
                    activeHandle = null;
                    if (!stopped) {
                        if (typeof onSegmentDone === 'function') onSegmentDone(seg);
                        pump();
                    }
                }, { append: true });
            }

            return {
                enqueue: function(seg) {
                    if (stopped || flowId !== currentReplyFlowId) return;
                    queue.push({ text: String(seg || '').trim() });
                    pump();
                },
                stop: function() {
                    stopped = true;
                    queue = [];
                    if (activeHandle && activeHandle.stop) {
                        activeHandle.stop();
                    }
                    activeHandle = null;
                }
            };
        }

        // Быстрые кнопки вопросов
        var QUICK_QUESTIONS = {
            'whatdo': 'Что ты делаешь и чем можешь помочь?'
        };
        function renderDemoQuickPanel() {
            var demoApi = getManyashaDemoApi();
            if (!demoApi || typeof demoApi.renderQuickPanel !== 'function') return;
            demoApi.renderQuickPanel({
                quickPanel: quickPanel,
                quickRepliesEl: quickRepliesEl,
                suggestedEl: suggestedEl,
                chatInput: chatInput,
                chatForm: chatForm
            });
        }
        function getSocialReactionState(userText) {
            var t = String(userText || '').toLowerCase();
            var complimentPatterns = [
                'ты красивая', 'какая ты красивая', 'ты красавица', 'ты милая', 'ты классная', 'ты прелесть'
            ];
            var thanksPatterns = [
                'спасибо', 'благодарю', 'благодарочка', 'спс'
            ];
            if (complimentPatterns.some(function(p){ return t.indexOf(p) !== -1; })) return 'compliment';
            if (thanksPatterns.some(function(p){ return t.indexOf(p) !== -1; })) return 'thanks';
            return null;
        }
        function applyFemalePostFilter(text) {
            if (textApiSnapshot && typeof textApiSnapshot.applyFemalePostFilter === 'function') {
                return textApiSnapshot.applyFemalePostFilter(text);
            }
            var t = String(text || '');
            if (!t) return t;
            // Пост-фильтр: выравниваем самореференс Маняши в женский род.
            var rules = [
                [/\bя\s+сделал\b/gi, 'я сделала'],
                [/\bя\s+подготовил\b/gi, 'я подготовила'],
                [/\bя\s+проверил\b/gi, 'я проверила'],
                [/\bя\s+уточнил\b/gi, 'я уточнила'],
                [/\bя\s+собрал\b/gi, 'я собрала'],
                [/\bя\s+наш[её]л\b/gi, 'я нашла'],
                [/\bя\s+обнаружил\b/gi, 'я обнаружила'],
                [/\bя\s+обновил\b/gi, 'я обновила'],
                [/\bя\s+исправил\b/gi, 'я исправила'],
                [/\bя\s+настроил\b/gi, 'я настроила'],
                [/\bя\s+добавил\b/gi, 'я добавила'],
                [/\bя\s+удалил\b/gi, 'я удалила'],
                [/\bя\s+сменил\b/gi, 'я сменила'],
                [/\bя\s+заменил\b/gi, 'я заменила'],
                [/\bя\s+применил\b/gi, 'я применила'],
                [/\bя\s+запустил\b/gi, 'я запустила'],
                [/\bя\s+получил\b/gi, 'я получила'],
                [/\bя\s+отправил\b/gi, 'я отправила'],
                [/\bя\s+попробовал\b/gi, 'я попробовала'],
                [/\bя\s+убедилс[яь]\b/gi, 'я убедилась'],
                [/\bя\s+разобралс[яь]\b/gi, 'я разобралась'],
                [/\bя\s+наш[её]лс[яь]\b/gi, 'я нашлась'],
                [/\bя\s+определил\b/gi, 'я определила'],
                [/\bя\s+сформировал\b/gi, 'я сформировала'],
                [/\bя\s+подобрал\b/gi, 'я подобрала'],
                [/\bя\s+понял\b/gi, 'я поняла'],
                [/\bя\s+смог\b/gi, 'я смогла'],
                [/\bя\s+должен\b/gi, 'я должна'],
                [/\bя\s+готов\b/gi, 'я готова'],
                [/\bя\s+уверен\b/gi, 'я уверена'],
                [/\bя\s+рад\b/gi, 'я рада'],
                [/\bя\s+согласен\b/gi, 'я согласна'],
                [/\bя\s+обязан\b/gi, 'я обязана'],
                [/\bя\s+постарался\b/gi, 'я постаралась'],
                [/\bя\s+разобрал\b/gi, 'я разобрала']
            ];
            for (var i = 0; i < rules.length; i++) {
                t = t.replace(rules[i][0], rules[i][1]);
            }
            // Исправляем ошибку вида: "Какой именно вам нужна помощь..."
            t = t.replace(/\b(какой)\s+(именно\s+)?(вам\s+)?нужна\s+помощь\b/gi, function(_full, qWord, exactly, you) {
                var lead = (qWord && qWord.charAt(0) === qWord.charAt(0).toUpperCase()) ? 'Какая' : 'какая';
                var parts = [lead];
                if (exactly) parts.push('именно');
                if (you) parts.push('вам');
                parts.push('нужна');
                parts.push('помощь');
                return parts.join(' ');
            });
            return t;
        }
        function runFemalePostFilterSanityCheck() {
            // Лёгкая dev-проверка, чтобы быстро увидеть качество замен без тестового раннера.
            if (!/localhost|127\.0\.0\.1/.test(location.host)) return;
            var samples = [
                ['Я обнаружил проблему и исправил её.', 'я обнаружила проблему и исправила её.'],
                ['Я попробовал несколько вариантов и убедился.', 'я попробовала несколько вариантов и убедилась.'],
                ['Я разобрался и нашелся ответ.', 'я разобралась и нашлась ответ.'],
                ['Я готов помочь и я уверен в результате.', 'я готова помочь и я уверена в результате.'],
                ['Какой именно вам нужна помощь сегодня?', 'какая именно вам нужна помощь сегодня?']
            ];
            var failed = [];
            samples.forEach(function(pair) {
                var got = applyFemalePostFilter(pair[0]).toLowerCase();
                if (got !== pair[1]) failed.push({ input: pair[0], got: got, expected: pair[1] });
            });
            if (failed.length) {
                console.warn('[manyasha:female-post-filter] sanity check failed', failed);
            } else {
                console.info('[manyasha:female-post-filter] sanity check passed');
            }
        }
        runFemalePostFilterSanityCheck();
        document.querySelectorAll('.manyasha-q-btn[data-q]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var q = QUICK_QUESTIONS[btn.getAttribute('data-q')];
                if (!q) return;
                chatInput.value = q;
                chatForm.dispatchEvent(new Event('submit'));
            });
        });
        var chatTransportManager = null;
        if (window.ManyashaWidgetChatTransport && typeof window.ManyashaWidgetChatTransport.createChatTransport === 'function') {
            chatTransportManager = window.ManyashaWidgetChatTransport.createChatTransport({
                demoModeEnabled: demoModeEnabled,
                getDemoApi: getManyashaDemoApi,
                ensureManyashaBackendContext: ensureManyashaBackendContext,
                buildWidgetAuthHeaders: buildWidgetAuthHeaders,
                fetchWithRetry: manyashaFetchWithRetry,
                apiChatPath: API_CHAT_PATH,
                chatContextBudgetMs: CHAT_CONTEXT_BUDGET_MS,
                embedContractVersion: EMBED_CONTRACT_VERSION || '',
                outboxKey: OUTBOX_KEY,
                showNonCriticalBootstrapStatus: showNonCriticalBootstrapStatus,
                isFilePreview: isFilePreview,
                getProfile: getManyashaProfileForChat,
                getExperimentVariants: function() { return abVariants || {}; },
                getTriggerSource: function() {
                    return (triggerMem && triggerMem.last_source) ? String(triggerMem.last_source) : null;
                },
                getBackendLastError: function() {
                    try { return String((backendCtx && backendCtx._lastError) || ''); } catch (_eBackendErr) { return ''; }
                },
                getChatHistory: function() { return chatHistory; },
                setOperationalState: setOperationalState,
                trackEvent: trackEvent,
                addChatMsg: addChatMsg,
                applyFemalePostFilter: applyFemalePostFilter,
                saveHistory: saveHistory
            });
        }

            function sendChatRequest(messageText, historyPayload, options) {
                if (chatTransportManager && typeof chatTransportManager.sendChatRequest === 'function') {
                    return chatTransportManager.sendChatRequest(messageText, historyPayload, options);
                }
                if (demoModeEnabled) {
                    var demoApi = getManyashaDemoApi();
                    if (demoApi && typeof demoApi.sendDemoChatRequest === 'function') {
                        return demoApi.sendDemoChatRequest(messageText, options);
                    }
                }
                function buildBody(ctx) {
                var body = {
                        message: messageText,
                    history: historyPayload,
                    embed_contract_version: EMBED_CONTRACT_VERSION || '',
                    profile: getManyashaProfileForChat(),
                    experiment_variants: abVariants || {},
                    trigger_source: (triggerMem && triggerMem.last_source) ? String(triggerMem.last_source) : null
                };
                if (ctx && ctx.partnerId && ctx.userId && ctx.dialogSessionId) {
                    body.partner_id = ctx.partnerId;
                    body.user_id = ctx.userId;
                    body.dialog_session_id = ctx.dialogSessionId;
                }
                return body;
                }
                var ctxBudgetPromise = new Promise(function(resolve) {
                    var settled = false;
                    var timer = setTimeout(function() {
                        if (settled) return;
                        settled = true;
                        resolve(null);
                    }, CHAT_CONTEXT_BUDGET_MS);
                    ensureManyashaBackendContext()
                        .then(function(ctx) {
                            if (settled) return;
                            settled = true;
                            clearTimeout(timer);
                            resolve(ctx || null);
                        })
                        .catch(function() {
                            if (settled) return;
                            settled = true;
                            clearTimeout(timer);
                            resolve(null);
                        });
                });
                return ctxBudgetPromise.then(function(ctx) {
                    return manyashaFetchWithRetry(API_CHAT_PATH, {
                        method: 'POST',
                        headers: buildWidgetAuthHeaders({ 'Content-Type': 'application/json' }),
                        signal: options && options.signal ? options.signal : null,
                        body: JSON.stringify(buildBody(ctx))
                    }, { retries: 2, retryDelayMs: 320, timeoutMs: 15000 });
                });
            }

        function loadChatOutbox() {
            if (chatTransportManager && typeof chatTransportManager.loadChatOutbox === 'function') {
                return chatTransportManager.loadChatOutbox();
            }
            try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]') || []; } catch (e) { return []; }
        }
        function saveChatOutbox(queue) {
            if (chatTransportManager && typeof chatTransportManager.saveChatOutbox === 'function') {
                return chatTransportManager.saveChatOutbox(queue);
            }
            try { localStorage.setItem(OUTBOX_KEY, JSON.stringify((queue || []).slice(-10))); } catch (e) {}
        }
        function getChatOfflineHint(err) {
            if (chatTransportManager && typeof chatTransportManager.getChatOfflineHint === 'function') {
                return chatTransportManager.getChatOfflineHint(err);
            }
            var reason = '';
            try { reason = String(err && err.message ? err.message : err || ''); } catch (e) {}
            var backendErr = '';
            try { backendErr = String((backendCtx && backendCtx._lastError) || ''); } catch (e) {}
            var combined = reason || backendErr;
            if (!showNonCriticalBootstrapStatus) {
                if (combined.indexOf('request_timeout') !== -1 || combined.indexOf('AbortError') !== -1) {
                    return ' Сервер временно не отвечает. Попробуйте чуть позже.';
                }
                return '';
            }
            if (combined.indexOf('api_response_is_not_json') !== -1 || combined.indexOf('retry-non-json') !== -1) {
                return ' Проверьте корректный `api_origin` (для локалки добавь `?api_origin=http://localhost:8000`).';
            }
            if (combined.indexOf('widget-context-http-404') !== -1) {
                return ' Не удалось создать контекст с параметром `pid` (проверь `pid`, `site_key`, `install_token`).';
            }
            if (combined.indexOf('widget-context-http-401') !== -1 || combined.indexOf('widget-token') !== -1) {
                return ' Проблема с токеном виджета: обнови установочный конфиг.';
            }
            if (combined.indexOf('chat_http_') === 0) {
                return ' Эндпоинт чата недоступен: проверь backend и CORS.';
            }
            var combinedLc = String(combined || '').toLowerCase();
            if (
                combinedLc.indexOf('failed to fetch') !== -1 ||
                combinedLc.indexOf('networkerror') !== -1 ||
                combinedLc.indexOf('load failed') !== -1 ||
                combinedLc.indexOf('manyasha_fetch_failed') !== -1
            ) {
                return ' Похоже на проблему CORS/сети между браузером и API. Проверь `api_origin` и CORS backend для текущего origin.';
            }
            if (combined.indexOf('request_timeout') !== -1 || combined.indexOf('AbortError') !== -1) {
                return ' Сервер отвечает слишком долго. Проверь доступность API или повторите через пару секунд.';
            }
            if (combined.indexOf('backend-context') !== -1 || combined === 'backend-context') {
                return ' Не удаётся инициализировать сессию с backend. Проверь конфиг embed.';
            }
            return '';
        }
        function parseHttpStatusFromError(prefix, err) {
            if (chatTransportManager && typeof chatTransportManager.parseHttpStatusFromError === 'function') {
                return chatTransportManager.parseHttpStatusFromError(prefix, err);
            }
            var reason = '';
            try { reason = String(err && err.message ? err.message : err || ''); } catch (e) {}
            if (reason.indexOf(prefix) !== 0) return 0;
            var raw = reason.slice(prefix.length);
            var status = parseInt(raw, 10);
            if (!isFinite(status)) return 0;
            return status;
        }
        function isRetryableHttpStatus(status) {
            if (chatTransportManager && typeof chatTransportManager.isRetryableHttpStatus === 'function') {
                return chatTransportManager.isRetryableHttpStatus(status);
            }
            if (!status) return true;
            return status >= 500 || status === 429 || status === 425 || status === 409 || status === 408;
        }
        function isTransientChatFailure(err) {
            if (chatTransportManager && typeof chatTransportManager.isTransientChatFailure === 'function') {
                return chatTransportManager.isTransientChatFailure(err);
            }
            var reason = '';
            try { reason = String(err && err.message ? err.message : err || ''); } catch (e) {}
            var backendReason = '';
            try { backendReason = String((backendCtx && backendCtx._lastError) || ''); } catch (e) {}
            var combined = reason || backendReason;
            if (!combined) return true;
            if (combined.indexOf('request_timeout') !== -1 || combined.indexOf('AbortError') !== -1) return true;
            if (combined.indexOf('api_response_is_not_json') !== -1 || combined.indexOf('retry-non-json') !== -1) return true;
            if (combined.indexOf('widget-context-http-') === 0) {
                return isRetryableHttpStatus(parseHttpStatusFromError('widget-context-http-', combined));
            }
            if (combined.indexOf('create-user') !== -1 || combined.indexOf('create-session') !== -1 || combined.indexOf('cached-user-miss') !== -1) {
                return false;
            }
            if (combined.indexOf('backend-context') !== -1) return false;
            if (combined.indexOf('manyasha_fetch_failed') !== -1) return true;
            if (combined.indexOf('chat_http_') === 0) {
                return isRetryableHttpStatus(parseHttpStatusFromError('chat_http_', combined));
            }
            if (combined.indexOf('queue_http_') === 0) {
                return isRetryableHttpStatus(parseHttpStatusFromError('queue_http_', combined));
            }
            return true;
        }
        function getTransientQueueStateMessage(err) {
            if (chatTransportManager && typeof chatTransportManager.getTransientQueueStateMessage === 'function') {
                return chatTransportManager.getTransientQueueStateMessage(err);
            }
            var reason = '';
            try { reason = String(err && err.message ? err.message : err || ''); } catch (e) {}
            var status = parseHttpStatusFromError('chat_http_', reason) || parseHttpStatusFromError('queue_http_', reason);
            if (status === 429) {
                return 'Сервис перегружен. Сообщение поставлено в очередь и отправится автоматически.';
            }
            if (status >= 500) {
                return 'Сервис временно недоступен. Сообщение поставлено в очередь и отправится автоматически.';
            }
            if (
                reason.indexOf('request_timeout') !== -1 ||
                reason.indexOf('AbortError') !== -1 ||
                reason.indexOf('manyasha_fetch_failed') !== -1
            ) {
                return 'Связь с сервером нестабильна. Сообщение поставлено в очередь и отправится автоматически.';
            }
            return 'Связь потеряна. Сообщение поставлено в очередь и отправится автоматически.';
        }
        function queueChatMessageForRetry(item, err) {
            if (chatTransportManager && typeof chatTransportManager.queueChatMessageForRetry === 'function') {
                return chatTransportManager.queueChatMessageForRetry(item, err);
            }
            var queue = loadChatOutbox();
            queue.push(item);
            saveChatOutbox(queue);
            trackEvent('message_queued', { queue_size: queue.length });
            setOperationalState('offline', getTransientQueueStateMessage(err));
        }
        var outboxFlushing = false;
        function flushQueuedMessages() {
            if (chatTransportManager && typeof chatTransportManager.flushQueuedMessages === 'function') {
                return chatTransportManager.flushQueuedMessages();
            }
            if (outboxFlushing) return;
            var queue = loadChatOutbox();
            if (!queue.length) {
                setOperationalState('normal');
                return;
            }
            outboxFlushing = true;
            var item = queue[0];
            setOperationalState('degraded', 'Восстанавливаю и отправляю сообщения из очереди...');
            sendChatRequest(item.text, item.history || chatHistory.slice(-10))
                .then(function(res) {
                    if (!res || !res.ok) throw new Error('queue_http_' + (res ? res.status : '0'));
                    return res.json();
                })
                .then(function(data) {
                    var reply = applyFemalePostFilter((data && data.reply) || 'Связь восстановлена, продолжаем работу.');
                    addChatMsg(reply, 'bot');
                    chatHistory.push({ role: 'assistant', content: reply });
                    saveHistory();
                    queue.shift();
                    saveChatOutbox(queue);
                    trackEvent('queued_message_delivered', { remaining_queue: queue.length });
                    outboxFlushing = false;
                    if (queue.length) {
                        setTimeout(flushQueuedMessages, 300);
                    } else {
                        setOperationalState('normal');
                    }
                })
                .catch(function(err) {
                    try { console.warn('[manyasha-chat][outbox-flush] failed', err); } catch (_eLogOutbox) {}
                    outboxFlushing = false;
                    if (!isTransientChatFailure(err)) {
                        queue.shift();
                        saveChatOutbox(queue);
                        trackEvent('queued_message_dropped', {
                            remaining_queue: queue.length,
                            reason: String(err && err.message ? err.message : err || 'non_retryable')
                        });
                        setOperationalState('degraded', 'Одно сообщение из очереди отклонено сервером и удалено из повтора.');
                        if (queue.length) {
                            setTimeout(flushQueuedMessages, 300);
                        }
                        return;
                    }
                    setOperationalState('offline', getTransientQueueStateMessage(err));
                    trackEvent('retry_exhausted', { source: 'chat_outbox_flush' });
                });
        }
        window.addEventListener('online', flushQueuedMessages);
        setInterval(flushQueuedMessages, 12000);
        setTimeout(flushQueuedMessages, 800);

        function evaluateEscalation(messageText) {
            if (handoffManager && typeof handoffManager.evaluateEscalation === 'function') {
                return handoffManager.evaluateEscalation(messageText);
            }
            return manyashaFetchWithRetry('/api/manyasha/escalation/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageText,
                    history: chatHistory.slice(-8),
                    context: getManyashaProfileForChat()
                })
            }, { retries: 1, retryDelayMs: 220 })
                .then(function(res) {
                    if (!res.ok) throw new Error('escalation_http');
                    return res.json();
                })
                .catch(function() {
                    return {
                        should_handoff: false,
                        risk_level: 'medium',
                        priority: 'normal',
                        category: 'general',
                        sla_seconds: 180,
                        reasons: []
                    };
                });
        }
        function hasExplicitConsultIntent(messageText) {
            if (handoffManager && typeof handoffManager.hasExplicitConsultIntent === 'function') {
                return handoffManager.hasExplicitConsultIntent(messageText);
            }
            var text = String(messageText || '').toLowerCase();
            if (!text) return false;
            if (/не\s+нужн[аоы]\s+консультац|без\s+консультац|пока\s+не\s+нужно/.test(text)) return false;
            return /хочу\s+консультац|нужен\s+юрист|нужна\s+консультац|перезвон|позвоните|свяжитесь|запишите\s+на\s+консультац|живой\s+специалист/.test(text);
        }
        function hasConsultPressureContext(messageText) {
            if (handoffManager && typeof handoffManager.hasConsultPressureContext === 'function') {
                return handoffManager.hasConsultPressureContext(messageText);
            }
            var text = String(messageText || '').toLowerCase();
            if (!text) return false;
            return /пристав|арест|удержан|взыскан|исполнительн|коллектор|судебн|блокировк|зарплат|имуществ|ипотек|единственн\s+жиль/.test(text);
        }
        function getUserMessageCount() {
            if (handoffManager && typeof handoffManager.getUserMessageCount === 'function') {
                return handoffManager.getUserMessageCount();
            }
            return chatHistory.filter(function(m){ return m.role === 'user'; }).length;
        }
        function shouldShowAutoConsultOffer(messageText, data, escalation) {
            if (!CHAT_CONSULT_OFFERS_ENABLED) return false;
            if (handoffManager && typeof handoffManager.shouldShowAutoConsultOffer === 'function') {
                return handoffManager.shouldShowAutoConsultOffer(messageText, data, escalation);
            }
            if (demoModeEnabled) return false;
            if (consultOfferDismissed) return false;
            if (consultOffersCount >= MAX_CONSULT_OFFERS) return false;
            if ((Date.now() - consultLastOfferedAt) < CONSULT_AUTO_COOLDOWN_MS) return false;

            var explicitIntent = hasExplicitConsultIntent(messageText);
            if (explicitIntent) return true;

            var userCount = getUserMessageCount();
            if (userCount < CONSULT_AUTO_MIN_USER_MESSAGES) return false;

            var risk = String((escalation && escalation.risk_level) || '').toLowerCase();
            var priority = String((escalation && escalation.priority) || '').toLowerCase();
            var highRisk = risk === 'high' || risk === 'critical' || priority === 'high' || priority === 'urgent';
            var backendWantsHandoff = !!(escalation && escalation.should_handoff);
            var backendSuggestConsult = !!(data && data.suggest_consultation);
            if (highRisk || backendWantsHandoff) return true;
            return backendSuggestConsult && hasConsultPressureContext(messageText);
        }
        function incrementConsultOffersCount() {
            if (handoffManager && typeof handoffManager.incrementConsultOffersCount === 'function') {
                handoffManager.incrementConsultOffersCount();
                return;
            }
            consultOffersCount++;
        }

        function appendCxFeedback() {
            var wrap = document.createElement('div');
            wrap.className = 'cx-feedback';
            var actions = [
                { label: 'Полезно', payload: { sentiment: 'positive', resolved: true } },
                { label: 'Не помогло', payload: { sentiment: 'negative', resolved: false } },
                { label: 'Нужен юрист', payload: { sentiment: 'escalate', resolved: false, request_handoff: true } }
            ];
            actions.forEach(function(a) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'cx-feedback-btn';
                btn.textContent = a.label;
                btn.addEventListener('click', function() {
                    trackEvent('cx_feedback', a.payload);
                    if (a.payload.resolved) trackEvent('chat_resolved', { source: 'feedback' });
                    if (a.payload.request_handoff) {
                        var handoffBtn = document.getElementById('manyasha-handoff-btn');
                        if (handoffBtn) handoffBtn.click();
                        else if (typeof openConsultModal === 'function') openConsultModal('cx_feedback');
                    }
                    wrap.remove();
                });
                wrap.appendChild(btn);
            });
            chatMessages.appendChild(wrap);
            scrollChatToBottomIfPinned(true);
        }

        function isAbortError(err) {
            if (!err) return false;
            if (err.name === 'AbortError') return true;
            var message = String(err.message || err || '').toLowerCase();
            return message.indexOf('abort') !== -1 || message.indexOf('aborted') !== -1;
        }

        chatForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (voiceListening) stopVoiceInput();
            clearBrowserSpeechQueue();
            var text = chatInput.value.trim();
            if (!text) return;
            hideQuickPanel();
            primeSpeechPlaybackOnGesture();
            addChatMsg(text, 'user');
            chatHistory.push({role: 'user', content: text});
            if (diagnosticsManager && typeof diagnosticsManager.updateFromMessage === 'function' && !demoModeEnabled) {
                diagnosticsManager.updateFromMessage(text);
            }
            chatInput.value = '';
            resizeChatInputHeight();
            if (chatSend) chatSend.disabled = true;
            chatInput.disabled = true;
            isRequestPending = true;
            trackEvent('message_sent', { question: text.slice(0, 200) });
            var requestStartedAt = performance.now();
            var waitingPhraseSpeech = null;
            var waitingSpeechDonePromise = Promise.resolve();
            var replyStartTimer = null;
            var replyStarted = false;
            var flowId = ++currentReplyFlowId;

            stopActiveReplyFlowContext();
            activeReplyAbortController = new AbortController();

            warmManyashaMediaOnIntent();
            setFlowState('thinking');
            var waitingPhrase = WAITING_PHRASE_IMMEDIATE;
            var waitingDiv = addChatMsg(waitingPhrase, 'bot waiting');
            activeWaitingBubbleEl = waitingDiv;

            function stopPendingWaitingPhrase() {
                if (waitingPhraseSpeech && waitingPhraseSpeech.stop) {
                    waitingPhraseSpeech.stop();
                }
                waitingPhraseSpeech = null;
                waitingSpeechDonePromise = Promise.resolve();
            }
            function cancelReplyStartTimer() {
                if (replyStartTimer) {
                    clearTimeout(replyStartTimer);
                    replyStartTimer = null;
                }
            }

            var historyPayload = chatHistory.slice(-10);
            var chatRequestPromise = sendChatRequest(text, historyPayload, { signal: activeReplyAbortController.signal });

            if (voiceAutoMode && !voiceListening) setVoiceStatus('thinking', waitingPhrase);
            if (!isMuted && voiceConsentState === 'granted') {
                waitingPhraseSpeech = playWaitingPhraseFast(waitingPhrase);
                if (waitingPhraseSpeech && waitingPhraseSpeech.donePromise) {
                    waitingSpeechDonePromise = waitingPhraseSpeech.donePromise.catch(function() { return null; });
                }
            }

            chatRequestPromise
            .then(function(res) {
                if (flowId !== currentReplyFlowId) return;
                if (!res || !res.ok) throw new Error('chat_http_' + (res ? res.status : '0'));
                return res.json();
            })
            .then(function(data) {
                if (flowId !== currentReplyFlowId) return;
                trackEvent('first_response_ms', {
                    ms: Math.round(performance.now() - requestStartedAt),
                    target_ms: 1000,
                });
                var reply = applyFemalePostFilter(data.reply || 'Что-то пошло не так...');
                var replyMood = data.mood || 'neutral';
                var speechText = String(data.speech_reply || '').trim();
                if (!speechText) {
                    speechText = fallbackSpeechFromReply(reply);
                }
                var mainSpeechPreloadPromise = null;
                if (!isMuted && voiceConsentState === 'granted' && speechText) {
                    var replySpeechChunks = chunkTTS(speechText, ttsProfileForMood(replyMood));
                    if (replySpeechChunks && replySpeechChunks.length) {
                        mainSpeechPreloadPromise = fetchTTSBlob(replySpeechChunks[0]).catch(function() { return null; });
                    }
                }
                function finalizeReplyIfNeeded(replyState, botDiv, reply) {
                    if (flowId !== currentReplyFlowId) return;
                    if (replyState.finalized || !replyState.textDone || !replyState.speechDone) return;
                    replyState.finalized = true;
                    stopActiveSpeechTypingFlow();
                    isRequestPending = false;
                    if (chatSend) chatSend.disabled = false;
                    chatInput.disabled = false;
                    focusChatInputIfSafe();

                    if (replyState.speechUnavailable && !isMuted) {
                        setOperationalState('degraded', 'Голос недоступен, продолжу текстом.');
                    } else {
                        setOperationalState('normal');
                    }
                    if (replyState && typeof replyState.stopAnsweringFallback === 'function') {
                        replyState.stopAnsweringFallback();
                    }
                    setTimeout(function() {
                        if (!isRequestPending && !voiceListening) {
                            setFlowState('idle');
                            if (voiceAutoMode) setVoiceStatus('idle', '');
                        }
                    }, getAnsweringIdleDelayMs());

                    if (demoModeEnabled) return;
                    evaluateEscalation(text).then(function(escalation) {
                        if (shouldShowAutoConsultOffer(text, data, escalation)) {
                            incrementConsultOffersCount();
                            showConsultOffer({
                                source: hasExplicitConsultIntent(text) ? 'explicit_request' : 'chat_flow'
                            });
                            trackEvent('handoff_escalated', {
                                risk_level: escalation.risk_level || 'medium',
                                category: escalation.category || 'general',
                                source: 'chat_evaluator'
                            });
                        }
                    });
                }

                function startReplyPresentation() {
                    if (replyStarted || flowId !== currentReplyFlowId || !isRequestPending) return;
                    replyStarted = true;
                    cancelReplyStartTimer();
                    if (activeWaitingBubbleEl === waitingDiv) {
                        activeWaitingBubbleEl = null;
                    }

                    setOperationalState('normal');
                    setFlowState('thinking');
                    var botDiv = document.createElement('div');
                    botDiv.className = 'chat-msg bot';
                    chatMessages.appendChild(botDiv);
                    scrollChatToBottomIfPinned(false);

                    var replyState = {
                        textStarted: false,
                        textScheduled: false,
                        textDone: false,
                        speechDone: false,
                        speechUnavailable: false,
                        finalized: false,
                        inputUnlocked: false,
                        stopAnsweringFallback: null
                    };
                    var mainSpeechVisualStarted = false;
                    var replyAnsweringFallbackActive = false;
                    function unlockChatInputAfterTextDone() {
                        if (replyState.inputUnlocked || flowId !== currentReplyFlowId) return;
                        replyState.inputUnlocked = true;
                        if (chatSend) chatSend.disabled = false;
                        chatInput.disabled = false;
                        focusChatInputIfSafe();
                    }
                    function startReplyTypingNow() {
                        if (replyState.textStarted || flowId !== currentReplyFlowId) return;
                        replyState.textScheduled = false;
                        replyState.textStarted = true;
                        activeSpeechTypingFlow = typewriterEffect(botDiv, reply, function() {
                            if (replyState.textDone) return;
                            replyState.textDone = true;
                            chatHistory.push({role: 'assistant', content: reply || ''});
                            saveHistory();
                            updateQuickPanel(text, reply);
                            renderDiagnosticSummaryIfNeeded();
                            appendCxFeedback();
                            addCopyButton(botDiv, reply);
                            updateScrollBottomBtn();
                            unlockChatInputAfterTextDone();
                            finalizeReplyIfNeeded(replyState, botDiv, reply);
                        });
                    }
                    function startReplyTypingAfterVoice(delayMs) {
                        if (replyState.textStarted || replyState.textScheduled || flowId !== currentReplyFlowId) return;
                        replyState.textScheduled = true;
                        var safeDelay = Math.max(80, Math.min(120, typeof delayMs === 'number' ? delayMs : VOICE_TEXT_START_DELAY_MS));
                        setTimeout(function() {
                            replyState.textScheduled = false;
                            if (flowId !== currentReplyFlowId) return;
                            startReplyTypingNow();
                        }, safeDelay);
                    }
                    function keepReplyFallbackLoop() {
                        if (!replyAnsweringFallbackActive || flowId !== currentReplyFlowId) return;
                        if (window.manyashaSetLoop) window.manyashaSetLoop(true);
                    }
                    function startReplyAnsweringFallback() {
                        if (mainSpeechVisualStarted || flowId !== currentReplyFlowId) return;
                        mainSpeechVisualStarted = true;
                        replyAnsweringFallbackActive = true;
                        replyState.speechDone = true;
                        keepReplyFallbackLoop();
                        setTimeout(keepReplyFallbackLoop, 0);
                        setFlowState('speaking');
                        if (voiceAutoMode && !voiceListening) {
                            setVoiceStatus('speaking', 'Пишу ответ…');
                        }
                        startReplyTypingAfterVoice(VOICE_TEXT_START_DELAY_MS);
                    }
                    function stopReplyAnsweringFallback() {
                        if (!replyAnsweringFallbackActive) return;
                        replyAnsweringFallbackActive = false;
                        if (window.manyashaSetLoop) window.manyashaSetLoop(false);
                    }
                    replyState.stopAnsweringFallback = stopReplyAnsweringFallback;
                    function markMainSpeechStarted() {
                        if (mainSpeechVisualStarted || flowId !== currentReplyFlowId) return;
                        mainSpeechVisualStarted = true;
                        setFlowState('speaking');
                        if (voiceAutoMode && !voiceListening) {
                            setVoiceStatus('speaking', 'Отвечаю…');
                        }
                        startReplyTypingAfterVoice(VOICE_TEXT_START_DELAY_MS);
                    }

                    var speechFlow = speakReplyWithSyncState(speechText, replyMood, {
                        initialDelayMs: 0,
                        preloadBlobPromise: mainSpeechPreloadPromise,
                        source: 'chat_submit_main_reply',
                        onStart: function() {
                            markMainSpeechStarted();
                        },
                        onChunkStart: function() {
                            markMainSpeechStarted();
                        },
                        onDone: function() {
                            if (flowId !== currentReplyFlowId) return;
                            replyState.speechDone = true;
                            finalizeReplyIfNeeded(replyState, botDiv, reply);
                        },
                        onUnavailable: function() {
                            if (flowId !== currentReplyFlowId) return;
                            replyState.speechUnavailable = true;
                            replyState.speechDone = true;
                            startReplyAnsweringFallback();
                            finalizeReplyIfNeeded(replyState, botDiv, reply);
                        }
                    });

                    if (speechFlow && speechFlow.done) {
                        replyState.speechDone = true;
                    }

                    speechFlow.donePromise.then(function() {
                        if (flowId !== currentReplyFlowId) return;
                        replyState.speechDone = true;
                        finalizeReplyIfNeeded(replyState, botDiv, reply);
                    }, function() {
                        if (flowId !== currentReplyFlowId) return;
                        replyState.speechUnavailable = true;
                        replyState.speechDone = true;
                        finalizeReplyIfNeeded(replyState, botDiv, reply);
                    });
                    if (!speechFlow.queued && !replyState.speechDone) {
                        replyState.speechDone = true;
                    }
                    if (!speechFlow.queued && !replyState.textStarted) {
                        startReplyAnsweringFallback();
                    }
                }

                var replyDelayMs = Math.max(0, MIN_THINK_MS - (performance.now() - requestStartedAt));
                replyStartTimer = setTimeout(function() {
                    var waitingGate = waitingPhraseSpeech
                        ? waitingSpeechDonePromise
                        : Promise.resolve();
                    Promise.resolve(waitingGate).finally(function() {
                        if (flowId !== currentReplyFlowId) return;
                        function startReplyAfterThinkingMedia() {
                            waitForThinkingMediaBeforeReply().finally(function() {
                                if (flowId !== currentReplyFlowId) return;
                                startReplyPresentation();
                            });
                        }
                        var transitionPause = (waitingPhraseSpeech && waitingPhraseSpeech.started) ? WAITING_TO_MAIN_PAUSE_MS : 0;
                        if (transitionPause > 0) {
                            replyStartTimer = setTimeout(function() {
                                if (flowId !== currentReplyFlowId) return;
                                startReplyAfterThinkingMedia();
                            }, transitionPause);
                            return;
                        }
                        startReplyAfterThinkingMedia();
                    });
                }, replyDelayMs);
            })
            .catch(function(err) {
                if (flowId !== currentReplyFlowId || isAbortError(err)) {
                    return;
                }
                try { console.warn('[manyasha-chat][send] failed', err); } catch (_eLogSend) {}
                stopPendingWaitingPhrase();
                cancelReplyStartTimer();
                if (replyStarted && activeSpeechTypingFlow) {
                    stopActiveSpeechTypingFlow();
                }
                replyStarted = true;
                if (activeWaitingBubbleEl === waitingDiv) {
                    if (waitingDiv && waitingDiv.parentNode) waitingDiv.parentNode.removeChild(waitingDiv);
                    activeWaitingBubbleEl = null;
                }
                setFlowState('error');
                if (voiceAutoMode) setVoiceStatus('error', 'Проблема с подключением');
                var offlineMsg = 'Не удалось связаться с Маняшей. Проверьте подключение.';
                var hint = getChatOfflineHint(err);
                if (hint) {
                    offlineMsg += hint;
                }
                if (isFilePreview) {
                    offlineMsg += ' Для локального предпросмотра нужен API на http://localhost:8000 или параметр ?api_origin=...';
                }
                var transientFailure = isTransientChatFailure(err);
                addChatMsg(offlineMsg, 'bot');
                if (transientFailure) {
                    queueChatMessageForRetry({
                        text: text,
                        history: historyPayload,
                        queued_at: Date.now()
                    }, err);
                } else {
                    setOperationalState('degraded', 'Сообщение не поставлено в очередь: сервер отклонил запрос.');
                }
                trackEvent('chat_failed', {
                    reason: transientFailure ? 'network_or_backend' : 'non_retryable_response',
                    error_code: String(err && err.message ? err.message : err || 'unknown')
                });
                if (chatSend) chatSend.disabled = false;
                chatInput.disabled = false;
                focusChatInputIfSafe();
                isRequestPending = false;
                setTimeout(function() {
                    if (!isRequestPending && !voiceListening) {
                        setFlowState('idle');
                        if (voiceAutoMode) setVoiceStatus('idle', '');
                    }
                }, 1400);
            })
            .finally(function() {
                // finally срабатывает до typewriter — поэтому управление вводом в then/catch
            });
        });

        // ── Human handoff orchestration ──
        var handoffBtn = document.getElementById('manyasha-handoff-btn');
        var handoffStatusEl = document.getElementById('manyasha-handoff-status');
        var handoffChannelSelect = document.getElementById('manyasha-handoff-channel');
        var HANDOFF_TICKET_KEY = 'manyasha_handoff_ticket_v1';

        function updateHandoffStatusText(text) {
            if (handoffManager && typeof handoffManager.updateHandoffStatusText === 'function') {
                handoffManager.updateHandoffStatusText(text);
                return;
            }
            if (!handoffStatusEl) return;
            handoffStatusEl.textContent = text || '';
        }
        function stopHandoffPolling() {
            if (handoffManager && typeof handoffManager.stopHandoffPolling === 'function') {
                handoffManager.stopHandoffPolling();
                return;
            }
            if (!handoffPollTimer) return;
            clearInterval(handoffPollTimer);
            handoffPollTimer = null;
        }
        function startHandoffPolling(ticketId) {
            if (handoffManager && typeof handoffManager.startHandoffPolling === 'function') {
                handoffManager.startHandoffPolling(ticketId);
                return;
            }
            stopHandoffPolling();
            if (!ticketId) return;
            handoffActiveTicketId = ticketId;
            handoffPollTimer = setInterval(function() {
                manyashaFetchWithRetry('/api/handoff/status/' + encodeURIComponent(ticketId), {
                    headers: buildWidgetAuthHeaders({})
                }, { retries: 1, retryDelayMs: 250 })
                    .then(function(res) {
                        if (!res.ok) throw new Error('handoff_status_http');
                        return res.json();
                    })
                    .then(function(ticket) {
                        var status = String(ticket.status || '').toLowerCase();
                        if (status === 'queued') {
                            updateHandoffStatusText('В очереди: #' + (ticket.queue_position || '?') + ' · ETA ' + (ticket.eta_seconds || '?') + ' сек');
                        } else if (status === 'assigned' || status === 'active') {
                            updateHandoffStatusText('Юрист подключен: ' + (ticket.operator_name || 'оператор в линии'));
                            stopHandoffPolling();
                            try { localStorage.removeItem(HANDOFF_TICKET_KEY); } catch (e) {}
                        } else if (status === 'resolved') {
                            updateHandoffStatusText('Запрос закрыт юристом. При необходимости открою новый.');
                            stopHandoffPolling();
                            try { localStorage.removeItem(HANDOFF_TICKET_KEY); } catch (e) {}
                        } else if (status === 'failed' || status === 'canceled') {
                            updateHandoffStatusText('Передача не завершена. Можно отправить повторно.');
                            stopHandoffPolling();
                            try { localStorage.removeItem(HANDOFF_TICKET_KEY); } catch (e) {}
                        }
                    })
                    .catch(function() {});
            }, 9000);
        }
        function requestHumanHandoff(source) {
            if (handoffManager && typeof handoffManager.requestHumanHandoff === 'function') {
                return handoffManager.requestHumanHandoff(source);
            }
            if (!handoffBtn) return Promise.reject(new Error('handoff_btn_missing'));
            var lastUser = '';
            for (var i = chatHistory.length - 1; i >= 0; i--) {
                if ((chatHistory[i].role || '').toLowerCase() === 'user') {
                    lastUser = chatHistory[i].content || '';
                    break;
                }
            }
            handoffBtn.disabled = true;
            updateHandoffStatusText('Передаю контекст юристу...');
            return evaluateEscalation(lastUser || 'handoff_request').then(function(escalation) {
                return ensureManyashaBackendContext().catch(function() { return {}; }).then(function(ctx) {
                    var payload = {
                        session_id: sessionId,
                        reason: lastUser || 'Клиент запросил консультацию юриста',
                        category: escalation.category || 'general',
                        risk_level: escalation.risk_level || 'medium',
                        priority: escalation.priority || 'normal',
                        requested_channel: 'web_chat',
                        preferred_channel: handoffChannelSelect ? handoffChannelSelect.value : 'phone',
                        context: buildLeadContext({
                            source: source || 'manual_handoff',
                            escalation_reasons: escalation.reasons || []
                        }),
                        transcript_tail: chatHistory.slice(-12),
                        captcha_token: getCaptchaToken() || null,
                        website: ''
                    };
                    if (ctx && ctx.partnerId) payload.partner_id = ctx.partnerId;
                    if (ctx && ctx.userId) payload.user_id = ctx.userId;
                    if (ctx && ctx.dialogSessionId) payload.dialog_session_id = ctx.dialogSessionId;
                    return manyashaFetchWithRetry('/api/handoff/request', {
                        method: 'POST',
                        headers: buildWidgetAuthHeaders({ 'Content-Type': 'application/json' }),
                        body: JSON.stringify(payload)
                    }, { retries: 2, retryDelayMs: 280 });
                });
            }).then(function(res) {
                if (!res.ok) throw new Error('handoff_http_' + res.status);
                return res.json();
            }).then(function(ticket) {
                var queueText = 'Передала запрос юристу. Очередь #' + (ticket.queue_position || '?')
                    + ', ETA ' + (ticket.eta_seconds || '?') + ' сек.';
                addChatMsg(queueText, 'bot');
                updateHandoffStatusText('В очереди: #' + (ticket.queue_position || '?') + ' · ETA ' + (ticket.eta_seconds || '?') + ' сек');
                trackEvent('handoff_requested', {
                    ticket_id: ticket.ticket_id,
                    risk_level: ticket.risk_level,
                    priority: ticket.priority,
                    target_channel: ticket.target_channel
                });
                try { localStorage.setItem(HANDOFF_TICKET_KEY, String(ticket.ticket_id || '')); } catch (e) {}
                startHandoffPolling(ticket.ticket_id);
                return ticket;
            }).catch(function() {
                updateHandoffStatusText('Не удалось передать. Проверьте связь и попробуйте ещё раз.');
                trackEvent('handoff_failed', { source: source || 'manual_handoff' });
                throw new Error('handoff_failed');
            }).finally(function() {
                handoffBtn.disabled = false;
            });
        }
        function restoreHandoffTicketIfAny() {
            if (handoffManager && typeof handoffManager.restoreHandoffTicketIfAny === 'function') {
                handoffManager.restoreHandoffTicketIfAny();
                return;
            }
            try {
                var lastTicket = localStorage.getItem(HANDOFF_TICKET_KEY) || '';
                if (handoffBtn && lastTicket) {
                    updateHandoffStatusText('Проверяю статус предыдущей передачи...');
                    startHandoffPolling(lastTicket);
                }
            } catch (e) {}
        }
        if (handoffBtn) {
            handoffBtn.addEventListener('click', function() {
                requestHumanHandoff('handoff_panel').catch(function() {});
            });
        }

        // ── Консультация: модальное окно ──
        var consultModal  = document.getElementById('manyasha-consult-modal');
        var consultBackdrop = document.getElementById('manyasha-consult-backdrop');
        var consultModalClose = document.getElementById('manyasha-consult-modal-close');
        var consultCtaBtn = document.getElementById('manyasha-consult-cta');
        var cpName        = document.getElementById('cp-name');
        var cpPhone       = document.getElementById('cp-phone');
        var cpEmail       = document.getElementById('cp-email');
        var cpSubmit      = document.getElementById('cp-submit-btn');
        var cpCancel      = document.getElementById('cp-cancel-btn');
        var cpError       = document.getElementById('cp-error-msg');
        if (window.ManyashaWidgetHandoff && typeof window.ManyashaWidgetHandoff.createHandoffManager === 'function') {
            handoffManager = window.ManyashaWidgetHandoff.createHandoffManager({
                fetchWithRetry: manyashaFetchWithRetry,
                buildWidgetAuthHeaders: buildWidgetAuthHeaders,
                ensureManyashaBackendContext: ensureManyashaBackendContext,
                getCaptchaToken: getCaptchaToken,
                trackEvent: trackEvent,
                addChatMsg: addChatMsg,
                scrollChatToBottomIfPinned: scrollChatToBottomIfPinned,
                getChatHistory: function() { return chatHistory; },
                getProfile: getManyashaProfileForChat,
                getDiagnosticsLeadPacket: getDiagnosticsLeadPacket,
                getSessionId: function() { return sessionId; },
                isDemoMode: function() { return demoModeEnabled; },
                getHandoffBtn: function() { return handoffBtn; },
                getHandoffStatusEl: function() { return handoffStatusEl; },
                getHandoffChannelValue: function() { return handoffChannelSelect ? handoffChannelSelect.value : 'phone'; },
                getChatMessagesEl: function() { return chatMessages; },
                getConsultModal: function() { return consultModal; },
                getConsultNameInput: function() { return cpName; },
                getConsultPhoneInput: function() { return cpPhone; },
                getConsultEmailInput: function() { return cpEmail; },
                getConsultErrorEl: function() { return cpError; },
                dispatchQuickReply: function(text) {
                    dispatchQuickReplyText(text);
                },
                getConsultOffersCount: function() { return consultOffersCount; },
                setConsultOffersCount: function(nextCount) {
                    consultOffersCount = Math.max(0, parseInt(nextCount, 10) || 0);
                },
                getConsultOfferVisible: function() { return consultOfferVisible; },
                setConsultOfferVisible: function(nextVisible) { consultOfferVisible = !!nextVisible; },
                getConsultOfferDismissed: function() { return consultOfferDismissed; },
                setConsultOfferDismissed: function(nextDismissed) { consultOfferDismissed = !!nextDismissed; },
                getConsultLastOfferedAt: function() { return consultLastOfferedAt; },
                setConsultLastOfferedAt: function(nextTs) {
                    consultLastOfferedAt = Math.max(0, parseInt(nextTs, 10) || 0);
                },
                chatConsultOffersEnabled: CHAT_CONSULT_OFFERS_ENABLED,
                maxConsultOffers: MAX_CONSULT_OFFERS,
                consultAutoMinUserMessages: CONSULT_AUTO_MIN_USER_MESSAGES,
                consultAutoCooldownMs: CONSULT_AUTO_COOLDOWN_MS,
                handoffTicketKey: HANDOFF_TICKET_KEY
            });
        }
        restoreHandoffTicketIfAny();

        function openConsultModal(source) {
            if (handoffManager && typeof handoffManager.openConsultModal === 'function') {
                handoffManager.openConsultModal(source);
                return;
            }
            if (!consultModal) return;
            consultModal.removeAttribute('inert');
            consultModal.classList.add('open');
            consultModal.setAttribute('aria-hidden', 'false');
            trackEvent('consult_modal_opened', { source: source || 'chat_offer' });
            if (cpPhone) cpPhone.focus();
        }

        function closeConsultModal() {
            if (handoffManager && typeof handoffManager.closeConsultModal === 'function') {
                handoffManager.closeConsultModal();
                return;
            }
            if (!consultModal) return;
            try {
                var active = document.activeElement;
                if (active && consultModal.contains(active) && typeof active.blur === 'function') active.blur();
            } catch (_eFocus) {}
            consultModal.classList.remove('open');
            consultModal.setAttribute('aria-hidden', 'true');
            consultModal.setAttribute('inert', '');
            if (cpName) cpName.value = '';
            if (cpPhone) cpPhone.value = '';
            if (cpEmail) cpEmail.value = '';
            if (cpError) cpError.classList.remove('visible');
        }

        if (consultBackdrop) {
            consultBackdrop.addEventListener('click', function() {
                closeConsultModal();
            });
        }
        if (consultModalClose) {
            consultModalClose.addEventListener('click', function() {
                closeConsultModal();
            });
        }
        if (consultCtaBtn) {
            if (abVariants.consult_cta === 'contrast_brand') {
                consultCtaBtn.classList.add('ab-contrast');
                consultCtaBtn.textContent = 'Нужен юрист?';
            } else {
                consultCtaBtn.textContent = 'Консультация юриста';
            }
            consultCtaBtn.addEventListener('click', function() {
                trackEvent('consult_cta_clicked', {
                    source: 'sticky_widget_cta',
                    variant: abVariants.consult_cta
                });
                openConsultModal('sticky_widget_cta');
            });
        }
        var consultCtaAccentTimer = null;
        function scheduleConsultCtaAccent() {
            if (!consultCtaBtn) return;
            if (consultCtaAccentTimer) {
                clearInterval(consultCtaAccentTimer);
                consultCtaAccentTimer = null;
            }
            consultCtaAccentTimer = setInterval(function() {
                if (!consultCtaBtn || !widget || widget.style.display === 'none') return;
                if (consultModal && consultModal.classList.contains('open')) return;
                if (isRequestPending || voiceListening) return;
                if (getWidgetVisualState() !== 'idle') return;
                consultCtaBtn.classList.remove('state-idle-accent');
                void consultCtaBtn.offsetWidth;
                consultCtaBtn.classList.add('state-idle-accent');
                setTimeout(function() {
                    if (consultCtaBtn) consultCtaBtn.classList.remove('state-idle-accent');
                }, 520);
            }, 24000);
        }
        scheduleConsultCtaAccent();
        document.addEventListener('keydown', function(ev) {
            if (ev.key === 'Escape' && consultModal && consultModal.classList.contains('open')) {
                closeConsultModal();
            }
        });

        function showConsultOffer(options) {
            if (handoffManager && typeof handoffManager.showConsultOffer === 'function') {
                handoffManager.showConsultOffer(options);
                return;
            }
            if (demoModeEnabled) return;
            if (consultOfferVisible) return;
            consultOfferVisible = true;
            consultLastOfferedAt = Date.now();
            var source = (options && options.source) ? String(options.source) : 'chat_flow';
            trackEvent('consult_offer_shown', { source: source });
            var offerDiv = document.createElement('div');
            offerDiv.className = 'chat-msg bot consult-offer-bubble';
            offerDiv.innerHTML =
                '<div class="consult-offer-card">' +
                '<p>Если хотите, подключу живого юриста и помогу записаться на консультацию в удобное время.</p>' +
                '<button class="consult-offer-btn" type="button" data-action="book">📞 Записаться на консультацию</button>' +
                '<button class="consult-offer-btn secondary" type="button" data-action="later">Пока не нужно</button>' +
                '</div>';
            chatMessages.appendChild(offerDiv);
            scrollChatToBottomIfPinned(true);

            var bookBtn = offerDiv.querySelector('[data-action="book"]');
            var laterBtn = offerDiv.querySelector('[data-action="later"]');
            if (bookBtn) {
                bookBtn.addEventListener('click', function() {
                    trackEvent('consult_offer_clicked', { action: 'book' });
                    consultOfferDismissed = true;
                    openConsultModal('chat_offer');
                });
            }
            if (laterBtn) {
                laterBtn.addEventListener('click', function() {
                    trackEvent('consult_offer_clicked', { action: 'later' });
                    consultOfferDismissed = true;
                    consultOfferVisible = false;
                    var laterDiv = document.createElement('div');
                    laterDiv.className = 'chat-msg bot';
                    laterDiv.textContent = 'Хорошо, продолжаем в чате. Если понадобится, консультацию можно открыть кнопкой ниже.';
                    chatMessages.appendChild(laterDiv);
                    scrollChatToBottomIfPinned(true);
                    offerDiv.remove();
                });
            }
            setTimeout(function() {
                consultOfferVisible = false;
            }, 45000);
        }

        function appendConsultFollowUpActions() {
            if (handoffManager && typeof handoffManager.appendConsultFollowUpActions === 'function') {
                handoffManager.appendConsultFollowUpActions();
                return;
            }
            var wrap = document.createElement('div');
            wrap.className = 'quick-replies';
            var actions = [
                { label: 'Как подготовиться к звонку?', text: 'Как мне подготовиться к консультации, чтобы звонок был максимально полезным?' },
                { label: 'Сколько по срокам?', text: 'Подскажите ориентировочные сроки по моей ситуации?' },
                { label: 'Какие документы нужны?', text: 'Какие документы лучше подготовить заранее?' }
            ];
            actions.forEach(function(a) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'quick-reply-btn';
                btn.textContent = a.label;
                btn.addEventListener('click', function() {
                    dispatchQuickReplyText(a.text);
                });
                wrap.appendChild(btn);
            });
            chatMessages.appendChild(wrap);
            scrollChatToBottomIfPinned(true);
        }

        if (cpCancel) {
            cpCancel.addEventListener('click', function() {
                closeConsultModal();
            });
        }

        if (cpSubmit) {
            cpSubmit.addEventListener('click', function() {
                var name  = (cpName && cpName.value || '').trim();
                var phone = (cpPhone && cpPhone.value || '').trim();
                var email = cpEmail ? (cpEmail.value || '').trim() : '';
                if (!name || !phone || !email) {
                    if (cpError) {
                        cpError.textContent = 'Укажите телефон, почту и имя';
                        cpError.classList.add('visible');
                    }
                    return;
                }
                if (cpError) cpError.classList.remove('visible');
                cpSubmit.disabled = true;
                cpSubmit.textContent = 'Отправляем...';

                ensureManyashaBackendContext().then(function() {
                    var diagnosticsPacket = getDiagnosticsLeadPacket();
                    var consultPayload = {
                        name: name,
                        phone: phone,
                        email: email,
                        question: (chatHistory.slice().reverse().find(function(m){ return m.role === 'user'; }) || {}).content || '',
                        session_id: sessionId,
                        captcha_token: getCaptchaToken() || null,
                        website: ''
                    };
                    if (diagnosticsPacket) {
                        consultPayload.diagnostics = diagnosticsPacket;
                        consultPayload.diagnostic_summary = diagnosticsPacket;
                    }
                    return manyashaFetchWithRetry('/api/consultation-request', {
                        method: 'POST',
                        headers: buildWidgetAuthHeaders({'Content-Type': 'application/json'}),
                        body: JSON.stringify(consultPayload)
                    }, { retries: 2, retryDelayMs: 260 });
                })
                .then(function(res) {
                    if (!res.ok) throw new Error('server error');
                    return res.json();
                })
                .then(function() {
                    if (name) {
                        userName = name;
                        localStorage.setItem(NAME_KEY, name);
                    }
                    trackEvent('consultation_submitted', { name: name });
                    closeConsultModal();
                    cpSubmit.disabled = false;
                    cpSubmit.textContent = 'Записаться';
                    if (window.manyashaPlay) window.manyashaPlay('success');
                    var confirmDiv = document.createElement('div');
                    confirmDiv.className = 'chat-msg bot';
                    chatMessages.appendChild(confirmDiv);
                    scrollChatToBottomIfPinned(false);
                    var confirmText = 'Отлично, ' + name + '! Записала вас 🌸 Специалист свяжется с вами по номеру ' + phone;
                    if (email) confirmText += ' и напишет на ' + email;
                    confirmText += '. Если появятся вопросы — я здесь!';
                    typewriterEffect(confirmDiv, confirmText, function() {
                        appendConsultFollowUpActions();
                    });
                })
                .catch(function() {
                    cpSubmit.disabled = false;
                    cpSubmit.textContent = 'Записаться';
                    trackEvent('consultation_submit_failed', { source: 'modal' });
                    if (cpError) {
                        cpError.textContent = 'Ошибка сети. Попробуйте ещё раз.';
                        cpError.classList.add('visible');
                    }
                });
            });
        }

        console.log('✅ Маняша полностью инициализирована!');
    })();
