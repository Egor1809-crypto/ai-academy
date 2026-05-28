(function (global) {
    function createChatTransport(options) {
        var opts = options || {};
        var demoModeEnabled = !!opts.demoModeEnabled;
        var getDemoApi = typeof opts.getDemoApi === 'function' ? opts.getDemoApi : function () { return null; };
        var ensureManyashaBackendContext = typeof opts.ensureManyashaBackendContext === 'function'
            ? opts.ensureManyashaBackendContext
            : function () { return Promise.reject(new Error('backend-context')); };
        var buildWidgetAuthHeaders = typeof opts.buildWidgetAuthHeaders === 'function'
            ? opts.buildWidgetAuthHeaders
            : function (baseHeaders) { return baseHeaders || {}; };
        var fetchWithRetry = typeof opts.fetchWithRetry === 'function'
            ? opts.fetchWithRetry
            : function () { return Promise.reject(new Error('manyasha_fetch_failed')); };
        var apiChatPath = String(opts.apiChatPath || '/api/manyasha/chat');
        var chatContextBudgetMs = Math.max(0, parseInt(opts.chatContextBudgetMs, 10) || 90);
        var embedContractVersion = String(opts.embedContractVersion || '');
        var outboxKey = String(opts.outboxKey || 'manyasha_chat_outbox_v2');
        var showNonCriticalBootstrapStatus = !!opts.showNonCriticalBootstrapStatus;
        var isFilePreview = !!opts.isFilePreview;

        var getProfile = typeof opts.getProfile === 'function' ? opts.getProfile : function () { return {}; };
        var getExperimentVariants = typeof opts.getExperimentVariants === 'function' ? opts.getExperimentVariants : function () { return {}; };
        var getTriggerSource = typeof opts.getTriggerSource === 'function' ? opts.getTriggerSource : function () { return null; };
        var getBackendLastError = typeof opts.getBackendLastError === 'function' ? opts.getBackendLastError : function () { return ''; };
        var getChatHistory = typeof opts.getChatHistory === 'function' ? opts.getChatHistory : function () { return []; };

        var setOperationalState = typeof opts.setOperationalState === 'function' ? opts.setOperationalState : function () {};
        var trackEvent = typeof opts.trackEvent === 'function' ? opts.trackEvent : function () {};
        var addChatMsg = typeof opts.addChatMsg === 'function' ? opts.addChatMsg : function () {};
        var applyFemalePostFilter = typeof opts.applyFemalePostFilter === 'function'
            ? opts.applyFemalePostFilter
            : function (text) { return String(text || ''); };
        var saveHistory = typeof opts.saveHistory === 'function' ? opts.saveHistory : function () {};

        function sendChatRequest(messageText, historyPayload, options) {
            if (demoModeEnabled) {
                var demoApi = getDemoApi();
                if (demoApi && typeof demoApi.sendDemoChatRequest === 'function') {
                    return demoApi.sendDemoChatRequest(messageText, options);
                }
            }
            function buildBody(ctx) {
                var body = {
                    message: messageText,
                    history: historyPayload,
                    embed_contract_version: embedContractVersion || '',
                    profile: getProfile() || {},
                    experiment_variants: getExperimentVariants() || {},
                    trigger_source: getTriggerSource()
                };
                if (ctx && ctx.partnerId && ctx.userId && ctx.dialogSessionId) {
                    body.partner_id = ctx.partnerId;
                    body.user_id = ctx.userId;
                    body.dialog_session_id = ctx.dialogSessionId;
                }
                return body;
            }
            var ctxBudgetPromise = new Promise(function (resolve) {
                var settled = false;
                var timer = setTimeout(function () {
                    if (settled) return;
                    settled = true;
                    resolve(null);
                }, chatContextBudgetMs);
                ensureManyashaBackendContext()
                    .then(function (ctx) {
                        if (settled) return;
                        settled = true;
                        clearTimeout(timer);
                        resolve(ctx || null);
                    })
                    .catch(function () {
                        if (settled) return;
                        settled = true;
                        clearTimeout(timer);
                        resolve(null);
                    });
            });
            return ctxBudgetPromise.then(function (ctx) {
                return fetchWithRetry(apiChatPath, {
                    method: 'POST',
                    headers: buildWidgetAuthHeaders({ 'Content-Type': 'application/json' }),
                    signal: options && options.signal ? options.signal : null,
                    body: JSON.stringify(buildBody(ctx))
                }, { retries: 2, retryDelayMs: 320, timeoutMs: 15000 });
            });
        }

        function loadChatOutbox() {
            try { return JSON.parse(localStorage.getItem(outboxKey) || '[]') || []; } catch (_e) { return []; }
        }

        function saveChatOutbox(queue) {
            try { localStorage.setItem(outboxKey, JSON.stringify((queue || []).slice(-10))); } catch (_e) {}
        }

        function getChatOfflineHint(err) {
            var reason = '';
            try { reason = String(err && err.message ? err.message : err || ''); } catch (_e0) {}
            var backendErr = '';
            try { backendErr = String(getBackendLastError() || ''); } catch (_e1) {}
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
            var reason = '';
            try { reason = String(err && err.message ? err.message : err || ''); } catch (_e) {}
            if (reason.indexOf(prefix) !== 0) return 0;
            var raw = reason.slice(prefix.length);
            var status = parseInt(raw, 10);
            if (!isFinite(status)) return 0;
            return status;
        }

        function isRetryableHttpStatus(status) {
            if (!status) return true;
            return status >= 500 || status === 429 || status === 425 || status === 409 || status === 408;
        }

        function isTransientChatFailure(err) {
            var reason = '';
            try { reason = String(err && err.message ? err.message : err || ''); } catch (_e0) {}
            var backendReason = '';
            try { backendReason = String(getBackendLastError() || ''); } catch (_e1) {}
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
            var reason = '';
            try { reason = String(err && err.message ? err.message : err || ''); } catch (_e) {}
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
            var queue = loadChatOutbox();
            queue.push(item);
            saveChatOutbox(queue);
            trackEvent('message_queued', { queue_size: queue.length });
            setOperationalState('offline', getTransientQueueStateMessage(err));
        }

        var outboxFlushing = false;
        function flushQueuedMessages() {
            if (outboxFlushing) return;
            var queue = loadChatOutbox();
            if (!queue.length) {
                setOperationalState('normal');
                return;
            }
            outboxFlushing = true;
            var item = queue[0];
            setOperationalState('degraded', 'Восстанавливаю и отправляю сообщения из очереди...');
            var history = getChatHistory();
            var historyTail = Array.isArray(history) ? history.slice(-10) : [];
            sendChatRequest(item.text, item.history || historyTail)
                .then(function (res) {
                    if (!res || !res.ok) throw new Error('queue_http_' + (res ? res.status : '0'));
                    return res.json();
                })
                .then(function (data) {
                    var reply = applyFemalePostFilter((data && data.reply) || 'Связь восстановлена, продолжаем работу.');
                    addChatMsg(reply, 'bot');
                    var historyRef = getChatHistory();
                    if (Array.isArray(historyRef)) {
                        historyRef.push({ role: 'assistant', content: reply });
                    }
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
                .catch(function (err) {
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

        return {
            sendChatRequest: sendChatRequest,
            loadChatOutbox: loadChatOutbox,
            saveChatOutbox: saveChatOutbox,
            getChatOfflineHint: getChatOfflineHint,
            parseHttpStatusFromError: parseHttpStatusFromError,
            isRetryableHttpStatus: isRetryableHttpStatus,
            isTransientChatFailure: isTransientChatFailure,
            getTransientQueueStateMessage: getTransientQueueStateMessage,
            queueChatMessageForRetry: queueChatMessageForRetry,
            flushQueuedMessages: flushQueuedMessages
        };
    }

    global.ManyashaWidgetChatTransport = {
        createChatTransport: createChatTransport
    };
})(window);
