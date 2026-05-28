(function (global) {
    function createHandoffManager(options) {
        var opts = options || {};
        var fetchWithRetry = typeof opts.fetchWithRetry === 'function'
            ? opts.fetchWithRetry
            : function () { return Promise.reject(new Error('manyasha_fetch_failed')); };
        var buildWidgetAuthHeaders = typeof opts.buildWidgetAuthHeaders === 'function'
            ? opts.buildWidgetAuthHeaders
            : function (headers) { return headers || {}; };
        var ensureManyashaBackendContext = typeof opts.ensureManyashaBackendContext === 'function'
            ? opts.ensureManyashaBackendContext
            : function () { return Promise.reject(new Error('backend-context')); };
        var getCaptchaToken = typeof opts.getCaptchaToken === 'function'
            ? opts.getCaptchaToken
            : function () { return ''; };
        var trackEvent = typeof opts.trackEvent === 'function'
            ? opts.trackEvent
            : function () {};
        var addChatMsg = typeof opts.addChatMsg === 'function'
            ? opts.addChatMsg
            : function () {};
        var scrollChatToBottomIfPinned = typeof opts.scrollChatToBottomIfPinned === 'function'
            ? opts.scrollChatToBottomIfPinned
            : function () {};
        var getChatHistory = typeof opts.getChatHistory === 'function'
            ? opts.getChatHistory
            : function () { return []; };
        var getProfile = typeof opts.getProfile === 'function'
            ? opts.getProfile
            : function () { return {}; };
        var getDiagnosticsLeadPacket = typeof opts.getDiagnosticsLeadPacket === 'function'
            ? opts.getDiagnosticsLeadPacket
            : function () { return null; };
        var getSessionId = typeof opts.getSessionId === 'function'
            ? opts.getSessionId
            : function () { return ''; };
        var isDemoMode = typeof opts.isDemoMode === 'function'
            ? opts.isDemoMode
            : function () { return false; };
        var getHandoffBtn = typeof opts.getHandoffBtn === 'function'
            ? opts.getHandoffBtn
            : function () { return null; };
        var getHandoffStatusEl = typeof opts.getHandoffStatusEl === 'function'
            ? opts.getHandoffStatusEl
            : function () { return null; };
        var getHandoffChannelValue = typeof opts.getHandoffChannelValue === 'function'
            ? opts.getHandoffChannelValue
            : function () { return 'phone'; };
        var getChatMessagesEl = typeof opts.getChatMessagesEl === 'function'
            ? opts.getChatMessagesEl
            : function () { return null; };
        var getConsultModal = typeof opts.getConsultModal === 'function'
            ? opts.getConsultModal
            : function () { return null; };
        var getConsultNameInput = typeof opts.getConsultNameInput === 'function'
            ? opts.getConsultNameInput
            : function () { return null; };
        var getConsultPhoneInput = typeof opts.getConsultPhoneInput === 'function'
            ? opts.getConsultPhoneInput
            : function () { return null; };
        var getConsultEmailInput = typeof opts.getConsultEmailInput === 'function'
            ? opts.getConsultEmailInput
            : function () { return null; };
        var getConsultErrorEl = typeof opts.getConsultErrorEl === 'function'
            ? opts.getConsultErrorEl
            : function () { return null; };
        var dispatchQuickReply = typeof opts.dispatchQuickReply === 'function'
            ? opts.dispatchQuickReply
            : function () {};

        var getConsultOffersCount = typeof opts.getConsultOffersCount === 'function'
            ? opts.getConsultOffersCount
            : function () { return 0; };
        var setConsultOffersCount = typeof opts.setConsultOffersCount === 'function'
            ? opts.setConsultOffersCount
            : function () {};
        var getConsultOfferVisible = typeof opts.getConsultOfferVisible === 'function'
            ? opts.getConsultOfferVisible
            : function () { return false; };
        var setConsultOfferVisible = typeof opts.setConsultOfferVisible === 'function'
            ? opts.setConsultOfferVisible
            : function () {};
        var getConsultOfferDismissed = typeof opts.getConsultOfferDismissed === 'function'
            ? opts.getConsultOfferDismissed
            : function () { return false; };
        var setConsultOfferDismissed = typeof opts.setConsultOfferDismissed === 'function'
            ? opts.setConsultOfferDismissed
            : function () {};
        var getConsultLastOfferedAt = typeof opts.getConsultLastOfferedAt === 'function'
            ? opts.getConsultLastOfferedAt
            : function () { return 0; };
        var setConsultLastOfferedAt = typeof opts.setConsultLastOfferedAt === 'function'
            ? opts.setConsultLastOfferedAt
            : function () {};

        var maxConsultOffers = Number(opts.maxConsultOffers || 1);
        var chatConsultOffersEnabled = opts.chatConsultOffersEnabled === true;
        var consultAutoMinUserMessages = Number(opts.consultAutoMinUserMessages || 3);
        var consultAutoCooldownMs = Number(opts.consultAutoCooldownMs || 180000);
        var handoffTicketKey = String(opts.handoffTicketKey || 'manyasha_handoff_ticket_v1');

        var handoffPollTimer = null;
        var handoffActiveTicketId = '';
        var lastConsultOfferReason = '';

        function escapeHtml(text) {
            return String(text || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function getDiagnosticsRisk() {
            var profile = getProfile() || {};
            var diagnostics = profile.diagnostics || {};
            var reasons = Array.isArray(diagnostics.risk_reasons) ? diagnostics.risk_reasons.slice(0, 4) : [];
            return {
                risk_level: String(diagnostics.risk_level || 'low').toLowerCase(),
                risk_reasons: reasons,
                consult_recommended: !!diagnostics.consult_recommended
            };
        }

        function buildDiagnosticsConsultReason(diagnosticRisk) {
            var reasons = diagnosticRisk && Array.isArray(diagnosticRisk.risk_reasons)
                ? diagnosticRisk.risk_reasons.slice(0, 3)
                : [];
            if (!reasons.length) {
                return 'По вашим ответам уже видны факторы риска. Тут лучше проверить документы с юристом, чтобы не ошибиться с процедурой.';
            }
            return 'По вашим ответам уже видно: ' + reasons.join(', ')
                + '. Тут лучше проверить документы с юристом, чтобы не ошибиться с процедурой.';
        }

        function normalizeList(value, limit) {
            var max = Math.max(1, Number(limit || 5) || 5);
            if (!Array.isArray(value)) return [];
            return value.map(function (item) {
                return String(item || '').replace(/\s+/g, ' ').trim();
            }).filter(Boolean).slice(0, max);
        }

        function normalizeDiagnosticsSnapshot(raw) {
            if (!raw || typeof raw !== 'object') return null;
            var packet = {
                debt_amount: String(raw.debt_amount || '').replace(/\s+/g, ' ').trim(),
                debt_types: normalizeList(raw.debt_types, 6),
                bailiffs: String(raw.bailiffs || '').replace(/\s+/g, ' ').trim(),
                income: String(raw.income || '').replace(/\s+/g, ' ').trim(),
                property: normalizeList(raw.property, 6),
                collectors: String(raw.collectors || '').replace(/\s+/g, ' ').trim(),
                route_hint: String(raw.route_hint || '').replace(/\s+/g, ' ').trim(),
                risk_level: String(raw.risk_level || 'low').replace(/\s+/g, ' ').trim(),
                risk_reasons: normalizeList(raw.risk_reasons, 5),
                missing_fields: normalizeList(raw.missing_fields, 5),
                known_count: Math.max(0, Number(raw.known_count || 0) || 0)
            };
            var hasValue = Object.keys(packet).some(function (key) {
                var value = packet[key];
                if (Array.isArray(value)) return value.length > 0;
                if (typeof value === 'number') return value > 0;
                return String(value || '').trim().length > 0;
            });
            return hasValue ? packet : null;
        }

        function getSafeDiagnosticsSnapshot() {
            var direct = normalizeDiagnosticsSnapshot(getDiagnosticsLeadPacket());
            if (direct) return direct;
            var profile = getProfile() || {};
            return normalizeDiagnosticsSnapshot(profile.diagnostics);
        }

        function buildLeadContext(extra) {
            var profile = getProfile() || {};
            var context = {};
            ['role', 'case_stage', 'debt_amount', 'debt_type', 'priority'].forEach(function (key) {
                var value = profile[key];
                if (typeof value === 'string' && value.trim()) context[key] = value.trim();
            });
            var snapshot = getSafeDiagnosticsSnapshot();
            if (snapshot) {
                context.diagnostics = snapshot;
                context.diagnostic_summary = snapshot;
            }
            return Object.assign(context, extra || {});
        }

        function evaluateEscalation(messageText) {
            return fetchWithRetry('/api/manyasha/escalation/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageText,
                    history: getChatHistory().slice(-8),
                    context: getProfile() || {}
                })
            }, { retries: 1, retryDelayMs: 220 })
                .then(function (res) {
                    if (!res.ok) throw new Error('escalation_http');
                    return res.json();
                })
                .catch(function () {
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
            var text = String(messageText || '').toLowerCase();
            if (!text) return false;
            if (/не\s+нужн[аоы]\s+консультац|без\s+консультац|пока\s+не\s+нужно/.test(text)) return false;
            return /хочу\s+консультац|нужен\s+юрист|нужна\s+консультац|перезвон|позвоните|свяжитесь|запишите\s+на\s+консультац|живой\s+специалист/.test(text);
        }

        function hasConsultPressureContext(messageText) {
            var text = String(messageText || '').toLowerCase();
            if (!text) return false;
            return /пристав|арест|удержан|взыскан|исполнительн|коллектор|судебн|блокировк|зарплат|имуществ|ипотек|единственн\s+жиль/.test(text);
        }

        function getUserMessageCount() {
            return getChatHistory().filter(function (m) { return m.role === 'user'; }).length;
        }

        function shouldShowAutoConsultOffer(messageText, data, escalation) {
            if (!chatConsultOffersEnabled) return false;
            if (isDemoMode()) return false;
            if (getConsultOfferDismissed()) return false;
            if (getConsultOffersCount() >= maxConsultOffers) return false;
            if ((Date.now() - getConsultLastOfferedAt()) < consultAutoCooldownMs) return false;

            var explicitIntent = hasExplicitConsultIntent(messageText);
            lastConsultOfferReason = '';
            if (explicitIntent) return true;

            var userCount = getUserMessageCount();
            if (userCount < consultAutoMinUserMessages) return false;

            var diagnosticRisk = getDiagnosticsRisk();
            var diagnosticsHighRisk = diagnosticRisk.consult_recommended && diagnosticRisk.risk_level === 'high';
            var risk = String((escalation && escalation.risk_level) || '').toLowerCase();
            var priority = String((escalation && escalation.priority) || '').toLowerCase();
            var highRisk = risk === 'high' || risk === 'critical' || priority === 'high' || priority === 'urgent';
            var backendWantsHandoff = !!(escalation && escalation.should_handoff);
            var backendSuggestConsult = !!(data && data.suggest_consultation);
            if (diagnosticsHighRisk) {
                lastConsultOfferReason = buildDiagnosticsConsultReason(diagnosticRisk);
                return true;
            }
            if (highRisk || backendWantsHandoff) {
                lastConsultOfferReason = 'По ответам видны признаки повышенного риска. Лучше сверить документы с юристом, прежде чем выбирать процедуру.';
                return true;
            }
            if (backendSuggestConsult && hasConsultPressureContext(messageText) && diagnosticRisk.risk_level !== 'low') {
                lastConsultOfferReason = 'Ситуация может требовать проверки документов, поэтому консультация может быть полезна как следующий шаг.';
                return true;
            }
            return false;
        }

        function updateHandoffStatusText(text) {
            var statusEl = getHandoffStatusEl();
            if (!statusEl) return;
            statusEl.textContent = text || '';
        }

        function stopHandoffPolling() {
            if (!handoffPollTimer) return;
            clearInterval(handoffPollTimer);
            handoffPollTimer = null;
        }

        function startHandoffPolling(ticketId) {
            stopHandoffPolling();
            if (!ticketId) return;
            handoffActiveTicketId = ticketId;
            handoffPollTimer = setInterval(function () {
                fetchWithRetry('/api/handoff/status/' + encodeURIComponent(ticketId), {
                    headers: buildWidgetAuthHeaders({})
                }, { retries: 1, retryDelayMs: 250 })
                    .then(function (res) {
                        if (!res.ok) throw new Error('handoff_status_http');
                        return res.json();
                    })
                    .then(function (ticket) {
                        var status = String(ticket.status || '').toLowerCase();
                        if (status === 'queued') {
                            updateHandoffStatusText('В очереди: #' + (ticket.queue_position || '?') + ' · ETA ' + (ticket.eta_seconds || '?') + ' сек');
                        } else if (status === 'assigned' || status === 'active') {
                            updateHandoffStatusText('Юрист подключен: ' + (ticket.operator_name || 'оператор в линии'));
                            stopHandoffPolling();
                            try { localStorage.removeItem(handoffTicketKey); } catch (_eAssigned) {}
                        } else if (status === 'resolved') {
                            updateHandoffStatusText('Запрос закрыт юристом. При необходимости открою новый.');
                            stopHandoffPolling();
                            try { localStorage.removeItem(handoffTicketKey); } catch (_eResolved) {}
                        } else if (status === 'failed' || status === 'canceled') {
                            updateHandoffStatusText('Передача не завершена. Можно отправить повторно.');
                            stopHandoffPolling();
                            try { localStorage.removeItem(handoffTicketKey); } catch (_eFailed) {}
                        }
                    })
                    .catch(function () {});
            }, 9000);
        }

        function requestHumanHandoff(source) {
            var handoffBtn = getHandoffBtn();
            if (!handoffBtn) return Promise.reject(new Error('handoff_btn_missing'));
            var chatHistory = getChatHistory();
            var lastUser = '';
            for (var i = chatHistory.length - 1; i >= 0; i--) {
                if ((chatHistory[i].role || '').toLowerCase() === 'user') {
                    lastUser = chatHistory[i].content || '';
                    break;
                }
            }
            handoffBtn.disabled = true;
            updateHandoffStatusText('Передаю контекст юристу...');
            return evaluateEscalation(lastUser || 'handoff_request').then(function (escalation) {
                return ensureManyashaBackendContext().catch(function () { return {}; }).then(function (ctx) {
                    var payload = {
                        session_id: getSessionId(),
                        reason: lastUser || 'Клиент запросил консультацию юриста',
                        category: escalation.category || 'general',
                        risk_level: escalation.risk_level || 'medium',
                        priority: escalation.priority || 'normal',
                        requested_channel: 'web_chat',
                        preferred_channel: getHandoffChannelValue(),
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
                    return fetchWithRetry('/api/handoff/request', {
                        method: 'POST',
                        headers: buildWidgetAuthHeaders({ 'Content-Type': 'application/json' }),
                        body: JSON.stringify(payload)
                    }, { retries: 2, retryDelayMs: 280 });
                });
            }).then(function (res) {
                if (!res.ok) throw new Error('handoff_http_' + res.status);
                return res.json();
            }).then(function (ticket) {
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
                try { localStorage.setItem(handoffTicketKey, String(ticket.ticket_id || '')); } catch (_eStoreTicket) {}
                startHandoffPolling(ticket.ticket_id);
                return ticket;
            }).catch(function () {
                updateHandoffStatusText('Не удалось передать. Проверьте связь и попробуйте ещё раз.');
                trackEvent('handoff_failed', { source: source || 'manual_handoff' });
                throw new Error('handoff_failed');
            }).finally(function () {
                handoffBtn.disabled = false;
            });
        }

        function restoreHandoffTicketIfAny() {
            try {
                var handoffBtn = getHandoffBtn();
                var lastTicket = localStorage.getItem(handoffTicketKey) || '';
                if (handoffBtn && lastTicket) {
                    updateHandoffStatusText('Проверяю статус предыдущей передачи...');
                    startHandoffPolling(lastTicket);
                }
            } catch (_eRestore) {}
        }

        function openConsultModal(source) {
            var consultModal = getConsultModal();
            if (!consultModal) return;
            consultModal.removeAttribute('inert');
            consultModal.classList.add('open');
            consultModal.setAttribute('aria-hidden', 'false');
            trackEvent('consult_modal_opened', { source: source || 'chat_offer' });
            var phoneInput = getConsultPhoneInput();
            if (phoneInput) phoneInput.focus();
        }

        function closeConsultModal() {
            var consultModal = getConsultModal();
            if (!consultModal) return;
            try {
                var active = document.activeElement;
                if (active && consultModal.contains(active) && typeof active.blur === 'function') active.blur();
            } catch (_eFocus) {}
            consultModal.classList.remove('open');
            consultModal.setAttribute('aria-hidden', 'true');
            consultModal.setAttribute('inert', '');
            var nameInput = getConsultNameInput();
            var phoneInput = getConsultPhoneInput();
            var emailInput = getConsultEmailInput();
            var errorEl = getConsultErrorEl();
            if (nameInput) nameInput.value = '';
            if (phoneInput) phoneInput.value = '';
            if (emailInput) emailInput.value = '';
            if (errorEl) errorEl.classList.remove('visible');
        }

        function showConsultOffer(options) {
            if (isDemoMode()) return;
            if (getConsultOfferVisible()) return;
            setConsultOfferVisible(true);
            setConsultLastOfferedAt(Date.now());
            var source = (options && options.source) ? String(options.source) : 'chat_flow';
            var reasonText = (options && options.reasonText) ? String(options.reasonText) : lastConsultOfferReason;
            if (!reasonText) {
                reasonText = 'Если хотите, подключу живого юриста и помогу записаться на консультацию в удобное время.';
            }
            trackEvent('consult_offer_shown', { source: source });
            var chatMessages = getChatMessagesEl();
            if (!chatMessages) return;
            var offerDiv = document.createElement('div');
            offerDiv.className = 'chat-msg bot consult-offer-bubble';
            offerDiv.innerHTML =
                '<div class="consult-offer-card">' +
                '<p>' + escapeHtml(reasonText) + '</p>' +
                '<button class="consult-offer-btn" type="button" data-action="book">📞 Записаться на консультацию</button>' +
                '<button class="consult-offer-btn secondary" type="button" data-action="later">Пока не нужно</button>' +
                '</div>';
            chatMessages.appendChild(offerDiv);
            scrollChatToBottomIfPinned(true);

            var bookBtn = offerDiv.querySelector('[data-action="book"]');
            var laterBtn = offerDiv.querySelector('[data-action="later"]');
            if (bookBtn) {
                bookBtn.addEventListener('click', function () {
                    trackEvent('consult_offer_clicked', { action: 'book' });
                    setConsultOfferDismissed(true);
                    openConsultModal('chat_offer');
                });
            }
            if (laterBtn) {
                laterBtn.addEventListener('click', function () {
                    trackEvent('consult_offer_clicked', { action: 'later' });
                    setConsultOfferDismissed(true);
                    setConsultOfferVisible(false);
                    var laterDiv = document.createElement('div');
                    laterDiv.className = 'chat-msg bot';
                    laterDiv.textContent = 'Хорошо, продолжаем в чате. Если понадобится, консультацию можно открыть кнопкой ниже.';
                    chatMessages.appendChild(laterDiv);
                    scrollChatToBottomIfPinned(true);
                    offerDiv.remove();
                });
            }
            setTimeout(function () {
                setConsultOfferVisible(false);
            }, 45000);
        }

        function appendConsultFollowUpActions() {
            var chatMessages = getChatMessagesEl();
            if (!chatMessages) return;
            var wrap = document.createElement('div');
            wrap.className = 'quick-replies';
            var actions = [
                { label: 'Как подготовиться к звонку?', text: 'Как мне подготовиться к консультации, чтобы звонок был максимально полезным?' },
                { label: 'Сколько по срокам?', text: 'Подскажите ориентировочные сроки по моей ситуации?' },
                { label: 'Какие документы нужны?', text: 'Какие документы лучше подготовить заранее?' }
            ];
            actions.forEach(function (a) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'quick-reply-btn';
                btn.textContent = a.label;
                btn.addEventListener('click', function () {
                    dispatchQuickReply(a.text);
                });
                wrap.appendChild(btn);
            });
            chatMessages.appendChild(wrap);
            scrollChatToBottomIfPinned(true);
        }

        return {
            evaluateEscalation: evaluateEscalation,
            hasExplicitConsultIntent: hasExplicitConsultIntent,
            hasConsultPressureContext: hasConsultPressureContext,
            getUserMessageCount: getUserMessageCount,
            shouldShowAutoConsultOffer: shouldShowAutoConsultOffer,
            updateHandoffStatusText: updateHandoffStatusText,
            stopHandoffPolling: stopHandoffPolling,
            startHandoffPolling: startHandoffPolling,
            requestHumanHandoff: requestHumanHandoff,
            restoreHandoffTicketIfAny: restoreHandoffTicketIfAny,
            openConsultModal: openConsultModal,
            closeConsultModal: closeConsultModal,
            showConsultOffer: showConsultOffer,
            appendConsultFollowUpActions: appendConsultFollowUpActions,
            incrementConsultOffersCount: function () {
                setConsultOffersCount((getConsultOffersCount() || 0) + 1);
            }
        };
    }

    global.ManyashaWidgetHandoff = {
        createHandoffManager: createHandoffManager
    };
})(window);
