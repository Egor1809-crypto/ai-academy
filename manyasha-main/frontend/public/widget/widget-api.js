(function (global) {
    function normalizeApiOrigin(origin) {
        var clean = String(origin || '').trim().replace(/\/+$/, '');
        if (!clean) return '';
        if (!/^https?:\/\//i.test(clean)) return '';
        return clean;
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

    function createApiClient(options) {
        var opts = options || {};
        var storageKey = String(opts.storageKey || 'manyasha_api_origin');
        var requestedApiOrigin = normalizeApiOrigin(opts.requestedApiOrigin || '');
        var runtimeApiOriginCandidates = [];
        var retryCooldownUntilByKey = {};

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
            try { localStorage.setItem(storageKey, clean); } catch (e) {}
        }

        if (Array.isArray(opts.candidates)) {
            opts.candidates.forEach(pushApiOriginCandidate);
        }
        if (!requestedApiOrigin && runtimeApiOriginCandidates.length) {
            requestedApiOrigin = runtimeApiOriginCandidates[0];
        }

        function apiUrl(path) {
            var normalizedPath = String(path || '');
            if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath;
            if (!normalizedPath) return requestedApiOrigin || '';
            if (normalizedPath.charAt(0) !== '/') normalizedPath = '/' + normalizedPath;
            return requestedApiOrigin ? (requestedApiOrigin + normalizedPath) : normalizedPath;
        }

        function shouldRetryWithNextApiOrigin(status) {
            return status === 0 || status === 404 || status === 405 || status >= 500;
        }

        function fetchApi(path, init) {
            var normalizedPath = String(path || '');
            if (normalizedPath.charAt(0) !== '/') normalizedPath = '/' + normalizedPath;

            var urls = [];
            function pushUrl(url) {
                if (!url) return;
                if (urls.indexOf(url) !== -1) return;
                urls.push(url);
            }

            pushUrl(apiUrl(normalizedPath));
            runtimeApiOriginCandidates.forEach(function (origin) {
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
                return fetch(url, init).then(function (res) {
                    if (isApiUrl && !isApiNonJsonPath) {
                        var contentType = '';
                        try { contentType = String((res.headers && res.headers.get('content-type')) || '').toLowerCase(); } catch (e) {}
                        if (res && contentType.indexOf('application/json') === -1 && contentType.indexOf('application/problem+json') === -1) {
                            if (idx < urls.length) throw new Error('retry-non-json');
                            return Promise.reject(new Error('api_response_is_not_json'));
                        }
                    }
                    if (res && shouldRetryWithNextApiOrigin(res.status) && idx < urls.length) {
                        throw new Error('retry-next-origin');
                    }
                    if (/^https?:\/\//i.test(url)) {
                        try { rememberApiOrigin(new URL(url).origin); } catch (e) {}
                    }
                    return res;
                }).catch(function (err) {
                    return attempt(err);
                });
            }

            return attempt();
        }

        function cloneFetchInit(init) {
            var src = init || {};
            var out = {};
            Object.keys(src).forEach(function (k) {
                if (k === 'headers') {
                    var hdr = src.headers || {};
                    var copy = {};
                    Object.keys(hdr).forEach(function (hk) { copy[hk] = hdr[hk]; });
                    out.headers = copy;
                } else {
                    out[k] = src[k];
                }
            });
            return out;
        }

        function fetchWithRetry(path, init, options) {
            var optsRetry = options || {};
            var maxRetries = typeof optsRetry.retries === 'number' ? Math.max(0, optsRetry.retries) : 2;
            var retryDelayMs = typeof optsRetry.retryDelayMs === 'number' ? Math.max(120, optsRetry.retryDelayMs) : 320;
            var retryJitterMs = typeof optsRetry.retryJitterMs === 'number' ? Math.max(0, optsRetry.retryJitterMs) : 80;
            var retryOnStatus = optsRetry.retryOnStatus || function (status) { return status >= 500 || status === 429 || status === 0; };
            var timeoutMs = typeof optsRetry.timeoutMs === 'number' ? Math.max(600, optsRetry.timeoutMs) : 0;
            var cooldownKey = String(optsRetry.cooldownKey || '').trim();
            var cooldownMs = typeof optsRetry.cooldownMs === 'number' ? Math.max(0, optsRetry.cooldownMs) : 0;
            var attemptNo = 0;

            if (cooldownKey && retryCooldownUntilByKey[cooldownKey] && Date.now() < retryCooldownUntilByKey[cooldownKey]) {
                return Promise.reject(new Error('backend-offline-cooldown'));
            }

            function fetchAttempt(reqInit) {
                if (!timeoutMs) return fetchApi(path, reqInit);
                var timeoutTimer = null;
                var localInit = reqInit || {};
                var promise;
                if (!localInit.signal && typeof AbortController === 'function') {
                    var ctrl = new AbortController();
                    localInit.signal = ctrl.signal;
                    timeoutTimer = setTimeout(function () {
                        try { ctrl.abort(); } catch (e) {}
                    }, timeoutMs);
                    promise = fetchApi(path, localInit);
                } else {
                    promise = Promise.race([
                        fetchApi(path, localInit),
                        new Promise(function (_resolve, reject) {
                            timeoutTimer = setTimeout(function () {
                                reject(new Error('request_timeout'));
                            }, timeoutMs);
                        })
                    ]);
                }
                return promise.finally(function () {
                    if (timeoutTimer) clearTimeout(timeoutTimer);
                });
            }

            function doAttempt(lastError) {
                var reqInit = cloneFetchInit(init || {});
                return fetchAttempt(reqInit).then(function (res) {
                    if (res && retryOnStatus(res.status) && attemptNo < maxRetries) {
                        attemptNo += 1;
                        var retryWaitMs = (retryDelayMs * Math.pow(2, attemptNo - 1)) + Math.floor(Math.random() * (retryJitterMs + 1));
                        return new Promise(function (resolve, reject) {
                            setTimeout(function () {
                                doAttempt(new Error('retry_status_' + res.status)).then(resolve).catch(reject);
                            }, retryWaitMs);
                        });
                    }
                    return res;
                }).catch(function (err) {
                    if (attemptNo >= maxRetries) {
                        if (cooldownKey && cooldownMs > 0) {
                            retryCooldownUntilByKey[cooldownKey] = Date.now() + cooldownMs;
                        }
                        throw (err || lastError || new Error('manyasha_fetch_failed'));
                    }
                    attemptNo += 1;
                    var retryWaitMs = (retryDelayMs * Math.pow(2, attemptNo - 1)) + Math.floor(Math.random() * (retryJitterMs + 1));
                    return new Promise(function (resolve, reject) {
                        setTimeout(function () {
                            doAttempt(err || lastError).then(resolve).catch(reject);
                        }, retryWaitMs);
                    });
                });
            }

            return doAttempt();
        }

        return {
            apiUrl: apiUrl,
            fetchApi: fetchApi,
            fetchWithRetry: fetchWithRetry,
            rememberApiOrigin: rememberApiOrigin,
            pushApiOriginCandidate: pushApiOriginCandidate,
            getRequestedApiOrigin: function () { return requestedApiOrigin; },
            getCandidates: function () { return runtimeApiOriginCandidates.slice(); }
        };
    }

    global.ManyashaWidgetApi = {
        normalizeApiOrigin: normalizeApiOrigin,
        createApiClient: createApiClient
    };
})(window);
