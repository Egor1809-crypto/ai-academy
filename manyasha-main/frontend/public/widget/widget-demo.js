(function(global) {
    function isTruthyFlag(value) {
        return /^(1|true|yes|on)$/i.test(String(value || '').trim());
    }

    function readDemoFlagFromQuery() {
        try {
            var params = new URLSearchParams(global.location && global.location.search ? global.location.search : '');
            return isTruthyFlag(params.get('demo_mode') || params.get('demoMode'));
        } catch (_err) {
            return false;
        }
    }

    var DEMO_QUESTIONS = [
        'У меня 2 млн долгов, что делать?',
        'Чем МФЦ отличается от суда?',
        'Приставы списывают деньги, что делать?'
    ];

    var DEMO_RESPONSE_MAP = {
        debt: {
            delayMs: 3400,
            reply: 'Понимаю. При долге около 2 млн рублей банкротство можно рассмотреть, но сначала важно проверить состав долгов, доход, имущество и исполнительные производства. Первый шаг: собрать список кредиторов, суммы и документы от приставов, после этого выбрать безопасный формат процедуры и порядок действий.',
            speech_reply: 'При таком долге банкротство можно проверить, но сначала нужно оценить доход, имущество и ситуацию у приставов. Начнем со списка долгов и документов.',
            mood: 'neutral'
        },
        mfc_vs_court: {
            delayMs: 3600,
            reply: 'Коротко: МФЦ — это внесудебное банкротство по строгим условиям, когда обычно нет активных взысканий и подходит ограниченный диапазон долгов. Судебная процедура гибче и применяется в более сложных ситуациях, в том числе при имуществе и нескольких кредиторах. Чтобы выбрать вариант, нужно проверить ваши текущие данные.',
            speech_reply: 'МФЦ — это упрощенный внесудебный вариант по строгим условиям, а суд — более универсальная процедура. Точный выбор зависит от ваших данных.',
            mood: 'neutral'
        },
        bailiffs: {
            delayMs: 3500,
            reply: 'Если приставы уже списывают деньги, сначала зафиксируйте номера исполнительных производств и основания удержаний, затем проверьте размер списаний и наличие защищенных выплат. Параллельно стоит подготовить документы для банкротства, чтобы перейти от точечных действий к системному решению и снизить нагрузку.',
            speech_reply: 'Если уже идут списания, сначала проверим исполнительные производства и размер удержаний, затем соберем шаги к банкротству. Так ситуация станет управляемой.',
            mood: 'empathy'
        },
        generic: {
            delayMs: 3200,
            reply: 'Я помогаю по долгам, приставам и банкротству. Опишите коротко вашу ситуацию: сумма долга, кто взыскивает и что происходит сейчас, и я предложу безопасный следующий шаг.',
            speech_reply: 'Я помогу разобраться с долгами и банкротством. Опишите ситуацию коротко, и я подскажу следующий шаг.',
            mood: 'neutral'
        }
    };

    function detectIntent(messageText) {
        var text = String(messageText || '').toLowerCase();
        if (/мфц|внесудеб|суд/.test(text)) return 'mfc_vs_court';
        if (/пристав|списыва|арест|исполнительн/.test(text)) return 'bailiffs';
        if (/долг|долгов|миллион|млн|кредит|микрозайм/.test(text)) return 'debt';
        return 'generic';
    }

    function buildDemoReplyPayload(messageText) {
        var intent = detectIntent(messageText);
        var preset = DEMO_RESPONSE_MAP[intent] || DEMO_RESPONSE_MAP.generic;
        return {
            delayMs: Math.max(3000, Math.min(5000, Number(preset.delayMs || 3400))),
            payload: {
                reply: String(preset.reply || ''),
                speech_reply: String(preset.speech_reply || ''),
                suggest_consultation: false,
                mood: preset.mood || 'neutral'
            }
        };
    }

    function createLocalJsonResponse(payload, status) {
        var safeStatus = Number(status) || 200;
        return {
            ok: safeStatus >= 200 && safeStatus < 300,
            status: safeStatus,
            json: function() {
                return Promise.resolve(payload);
            }
        };
    }

    function makeAbortError() {
        var err = new Error('AbortError');
        err.name = 'AbortError';
        return err;
    }

    function sendDemoChatRequest(messageText, options) {
        var signal = options && options.signal ? options.signal : null;
        var demoResponse = buildDemoReplyPayload(messageText);
        return new Promise(function(resolve, reject) {
            var settled = false;
            var timer = null;
            function cleanup(onAbort) {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
                if (signal && typeof signal.removeEventListener === 'function') {
                    signal.removeEventListener('abort', onAbort);
                }
            }
            function onAbort() {
                if (settled) return;
                settled = true;
                cleanup(onAbort);
                reject(makeAbortError());
            }
            if (signal && signal.aborted) {
                onAbort();
                return;
            }
            if (signal && typeof signal.addEventListener === 'function') {
                signal.addEventListener('abort', onAbort, { once: true });
            }
            timer = setTimeout(function() {
                if (settled) return;
                settled = true;
                cleanup(onAbort);
                resolve(createLocalJsonResponse(demoResponse.payload, 200));
            }, demoResponse.delayMs);
        });
    }

    function renderQuickPanel(cfg) {
        var config = cfg || {};
        var quickPanel = config.quickPanel;
        var quickRepliesEl = config.quickRepliesEl;
        var suggestedEl = config.suggestedEl;
        var chatInput = config.chatInput;
        var chatForm = config.chatForm;
        if (!quickPanel || !quickRepliesEl || !suggestedEl || !chatInput || !chatForm) return;

        quickRepliesEl.innerHTML = '';
        suggestedEl.innerHTML = '';
        DEMO_QUESTIONS.forEach(function(question, index) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'quick-reply-btn';
            btn.textContent = question;
            btn.style.animationDelay = (index * 40) + 'ms';
            btn.onclick = function() {
                chatInput.value = question;
                chatForm.dispatchEvent(new Event('submit'));
            };
            quickRepliesEl.appendChild(btn);
        });
        quickPanel.classList.add('visible');
    }

    global.ManyashaWidgetDemo = {
        isEnabled: readDemoFlagFromQuery,
        sendDemoChatRequest: sendDemoChatRequest,
        renderQuickPanel: renderQuickPanel
    };
})(window);
