(function (global) {
    function createBackendContextManager(options) {
        var opts = options || {};
        var fetchWithRetry = typeof opts.fetchWithRetry === 'function'
            ? opts.fetchWithRetry
            : function () { return Promise.reject(new Error('manyasha_fetch_failed')); };
        var getSessionId = typeof opts.getSessionId === 'function'
            ? opts.getSessionId
            : function () { return ''; };
        var setSessionId = typeof opts.setSessionId === 'function'
            ? opts.setSessionId
            : function () {};
        var getUserName = typeof opts.getUserName === 'function'
            ? opts.getUserName
            : function () { return ''; };
        var storageGet = typeof opts.storageGetByKey === 'function'
            ? opts.storageGetByKey
            : function (_key) { return null; };
        var storageSet = typeof opts.storageSetByKey === 'function'
            ? opts.storageSetByKey
            : function (_key, _value) {};
        var storageRemove = typeof opts.storageRemoveByKey === 'function'
            ? opts.storageRemoveByKey
            : function (_key) {};
        var onBootstrapWarn = typeof opts.onBootstrapWarn === 'function'
            ? opts.onBootstrapWarn
            : function (_message) {};
        var onBootstrapError = typeof opts.onBootstrapError === 'function'
            ? opts.onBootstrapError
            : function (_message) {};
        var onRequestInstallHealth = typeof opts.onRequestInstallHealth === 'function'
            ? opts.onRequestInstallHealth
            : function (_force) {};

        var embedPid = String(opts.embedPid || 'default');
        var embedSiteKey = String(opts.embedSiteKey || '');
        var embedInstallToken = String(opts.embedInstallToken || '');
        var embedContractVersion = String(opts.embedContractVersion || '1') || '1';

        var backendPartnerKey = String(opts.backendPartnerKey || '');
        var backendUserKey = String(opts.backendUserKey || '');
        var backendSessionKey = String(opts.backendSessionKey || '');
        var backendPersistenceDisabledUntilKey = String(opts.backendPersistenceDisabledUntilKey || '');

        var persistenceCooldownMs = Math.max(1000, parseInt(opts.persistenceCooldownMs, 10) || (5 * 60 * 1000));

        var backendCtx = opts.initialContext && typeof opts.initialContext === 'object'
            ? opts.initialContext
            : {
                partnerId: null,
                userId: null,
                dialogSessionId: null,
                widgetToken: '',
                widgetTokenExpiresAt: 0,
                persistenceDisabledUntil: 0,
                _promise: null,
                _lastError: ''
            };

        if (!backendCtx.persistenceDisabledUntil && opts.initialPersistenceDisabledUntil) {
            backendCtx.persistenceDisabledUntil = Number(opts.initialPersistenceDisabledUntil) || 0;
        }

        var backendContextFailureCount = 0;
        var backendContextNextRetryAt = 0;

        function clearPersistenceCooldown() {
            backendCtx.persistenceDisabledUntil = 0;
            if (backendPersistenceDisabledUntilKey) storageRemove(backendPersistenceDisabledUntilKey);
        }

        function setPersistenceCooldown(ms) {
            var cooldownMs = Math.max(1000, parseInt(ms, 10) || persistenceCooldownMs);
            var until = Date.now() + cooldownMs;
            backendCtx.persistenceDisabledUntil = until;
            if (backendPersistenceDisabledUntilKey) storageSet(backendPersistenceDisabledUntilKey, String(until));
        }

        function getCaptchaToken() {
            try {
                if (typeof global.__manyashaGetCaptchaToken === 'function') {
                    return String(global.__manyashaGetCaptchaToken() || '').trim();
                }
                if (typeof global.__manyashaCaptchaToken === 'function') {
                    return String(global.__manyashaCaptchaToken() || '').trim();
                }
                if (typeof global.__manyashaCaptchaToken === 'string') {
                    return String(global.__manyashaCaptchaToken || '').trim();
                }
            } catch (e) {}
            return '';
        }

        function buildWidgetAuthHeaders(baseHeaders) {
            var out = {};
            var src = baseHeaders || {};
            Object.keys(src).forEach(function (k) { out[k] = src[k]; });
            if (backendCtx && backendCtx.widgetToken) {
                out.Authorization = 'Bearer ' + backendCtx.widgetToken;
            }
            return out;
        }

        function ensureManyashaBackendContext() {
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

            var sidNow = String(getSessionId() || '');
            var ctxUrl = '/api/manyasha/widget-context?pid=' + encodeURIComponent(embedPid) + '&sid=' + encodeURIComponent(sidNow);
            if (embedSiteKey) ctxUrl += '&site_key=' + encodeURIComponent(embedSiteKey);
            if (embedInstallToken) ctxUrl += '&install_token=' + encodeURIComponent(embedInstallToken);
            ctxUrl += '&embed_contract_version=' + encodeURIComponent(embedContractVersion || '');

            backendCtx._promise = fetchWithRetry(ctxUrl, {}, { retries: 1, retryDelayMs: 320 })
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

                    var sessionCurrent = String(getSessionId() || '');
                    if (data.session_id && data.session_id !== sessionCurrent) {
                        setSessionId(String(data.session_id));
                        sessionCurrent = String(data.session_id);
                    }

                    if (backendCtx.persistenceDisabledUntil && backendCtx.persistenceDisabledUntil > Date.now()) {
                        backendCtx.userId = null;
                        backendCtx.dialogSessionId = null;
                        return backendCtx;
                    }
                    if (backendCtx.persistenceDisabledUntil && backendCtx.persistenceDisabledUntil <= Date.now()) {
                        clearPersistenceCooldown();
                    }

                    if (backendPartnerKey && storageGet(backendPartnerKey) !== backendCtx.partnerId) {
                        if (backendUserKey) storageRemove(backendUserKey);
                        if (backendSessionKey) storageRemove(backendSessionKey);
                    }
                    if (backendPartnerKey) storageSet(backendPartnerKey, backendCtx.partnerId);

                    var uid = backendUserKey ? storageGet(backendUserKey) : null;
                    var sid = backendSessionKey ? storageGet(backendSessionKey) : null;
                    var userName = String(getUserName() || '');

                    function createDialogSession() {
                        return fetchWithRetry('/api/dialog/sessions', {
                            method: 'POST',
                            headers: buildWidgetAuthHeaders({ 'Content-Type': 'application/json' }),
                            body: JSON.stringify({
                                partner_id: backendCtx.partnerId,
                                user_id: backendCtx.userId,
                                channel: 'chat',
                                metadata: { widget_local_session: sessionCurrent }
                            })
                        }, { retries: 0, retryDelayMs: 120 }).then(function (r) {
                            if (!r.ok) { throw new Error('create-session'); }
                            return r.json();
                        }).then(function (s) {
                            backendCtx.dialogSessionId = s.session_id;
                            if (backendSessionKey) storageSet(backendSessionKey, s.session_id);
                            return backendCtx;
                        });
                    }

                    function createUserAndSession() {
                        return fetchWithRetry('/api/users', {
                            method: 'POST',
                            headers: buildWidgetAuthHeaders({ 'Content-Type': 'application/json' }),
                            body: JSON.stringify({
                                partner_id: backendCtx.partnerId,
                                external_subject: ('widget:' + sessionCurrent).slice(0, 255),
                                nickname: userName ? userName.slice(0, 240) : null
                            })
                        }, { retries: 0, retryDelayMs: 120 }).then(function (r) {
                            if (!r.ok) { throw new Error('create-user'); }
                            return r.json();
                        }).then(function (u) {
                            backendCtx.userId = u.user_id;
                            if (backendUserKey) storageSet(backendUserKey, u.user_id);
                            return createDialogSession();
                        });
                    }

                    if (uid) {
                        return fetchWithRetry(
                            '/api/users/' + encodeURIComponent(uid) + '?partner_id=' + encodeURIComponent(backendCtx.partnerId),
                            { headers: buildWidgetAuthHeaders({}) },
                            { retries: 1, retryDelayMs: 120 }
                        ).then(function (r) {
                            if (!r.ok) {
                                if (r.status >= 500 || r.status === 429 || r.status === 408 || r.status === 425 || r.status === 409) {
                                    throw new Error('cached-user-unavailable-' + r.status);
                                }
                                throw new Error('cached-user-miss-' + r.status);
                            }
                            return r.json();
                        }).then(function () {
                            backendCtx.userId = uid;
                            if (sid) backendCtx.dialogSessionId = sid;
                            return createDialogSession();
                        }).catch(function (err) {
                            var reason = String(err && err.message ? err.message : err || '').toLowerCase();
                            var skipUserRecreate = (
                                reason.indexOf('cached-user-unavailable-') === 0 ||
                                reason.indexOf('request_timeout') !== -1 ||
                                reason.indexOf('aborterror') !== -1 ||
                                reason.indexOf('manyasha_fetch_failed') !== -1 ||
                                reason.indexOf('retry_status_500') !== -1 ||
                                reason.indexOf('retry_status_502') !== -1 ||
                                reason.indexOf('retry_status_503') !== -1 ||
                                reason.indexOf('retry_status_504') !== -1
                            );
                            if (skipUserRecreate) {
                                throw new Error('create-user');
                            }
                            if (backendUserKey) storageRemove(backendUserKey);
                            if (backendSessionKey) storageRemove(backendSessionKey);
                            backendCtx.userId = null;
                            backendCtx.dialogSessionId = null;
                            return createUserAndSession();
                        });
                    }

                    return createUserAndSession();
                })
                .catch(function (e) {
                    try { backendCtx._lastError = String(e && e.message ? e.message : e || 'backend-context'); } catch (_ctxErr) { backendCtx._lastError = 'backend-context'; }
                    var tokenOnlyFallbackAllowed = !!(backendCtx && backendCtx.partnerId && backendCtx.widgetToken);
                    if (tokenOnlyFallbackAllowed) {
                        var reason = String(backendCtx._lastError || '').toLowerCase();
                        var isPersistenceFailure = (
                            reason.indexOf('create-user') !== -1 ||
                            reason.indexOf('create-session') !== -1 ||
                            reason.indexOf('cached-user-miss') !== -1 ||
                            reason.indexOf('http-500') !== -1 ||
                            reason.indexOf('api_response_is_not_json') !== -1 ||
                            reason.indexOf('retry-non-json') !== -1 ||
                            reason.indexOf('manyasha_fetch_failed') !== -1 ||
                            reason.indexOf('retry_status_500') !== -1 ||
                            reason.indexOf('retry_status_502') !== -1 ||
                            reason.indexOf('retry_status_503') !== -1 ||
                            reason.indexOf('retry_status_504') !== -1 ||
                            reason.indexOf('request_timeout') !== -1 ||
                            reason.indexOf('aborterror') !== -1
                        );
                        if (isPersistenceFailure) {
                            backendCtx.userId = null;
                            backendCtx.dialogSessionId = null;
                            setPersistenceCooldown(persistenceCooldownMs);
                            if (backendUserKey) storageRemove(backendUserKey);
                            if (backendSessionKey) storageRemove(backendSessionKey);
                            onBootstrapWarn('CRM/БД временно недоступны. Продолжаю чат без сохранения кейса.');
                            return backendCtx;
                        }
                    }
                    backendContextFailureCount = Math.min(8, backendContextFailureCount + 1);
                    var cooldownMs = Math.min(30000, 1500 * Math.pow(2, Math.min(backendContextFailureCount - 1, 4)));
                    backendContextNextRetryAt = Date.now() + cooldownMs;
                    backendCtx._promise = null;
                    backendCtx.partnerId = backendCtx.userId = backendCtx.dialogSessionId = null;
                    backendCtx.widgetToken = '';
                    backendCtx.widgetTokenExpiresAt = 0;
                    onBootstrapError();
                    onRequestInstallHealth(false);
                    throw new Error('backend-context');
                });

            return backendCtx._promise;
        }

        return {
            getContext: function () { return backendCtx; },
            clearPersistenceCooldown: clearPersistenceCooldown,
            setPersistenceCooldown: setPersistenceCooldown,
            getCaptchaToken: getCaptchaToken,
            buildWidgetAuthHeaders: buildWidgetAuthHeaders,
            ensureManyashaBackendContext: ensureManyashaBackendContext
        };
    }

    global.ManyashaWidgetContext = {
        createBackendContextManager: createBackendContextManager
    };
})(window);
