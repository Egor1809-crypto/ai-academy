(function (global) {
    function startTeaserRotation(options) {
        var opts = options || {};
        var phrases = Array.isArray(opts.phrases) && opts.phrases.length
            ? opts.phrases
            : [
                "Разберу вашу ситуацию спокойно и по шагам.",
                "Объясню варианты банкротства простыми словами.",
                "Покажу риски и безопасный план действий.",
                "Подскажу, какие документы лучше подготовить.",
                "Ответы без давления и сложных формулировок."
            ];
        var messageNode = document.getElementById(opts.messageId || 'manyasha-teaser-msg');
        var avatarNode = document.getElementById(opts.avatarId || 'manyasha-teaser-avatar');
        var widgetNode = document.getElementById(opts.widgetId || 'manyasha-widget');
        var timers = [];
        var idx = 0;

        if (messageNode) {
            timers.push(setInterval(function () {
                idx = (idx + 1) % phrases.length;
                messageNode.style.opacity = '0';
                messageNode.style.transition = 'opacity 0.55s ease';
                setTimeout(function () {
                    messageNode.textContent = phrases[idx];
                    messageNode.style.opacity = '1';
                }, 550);
            }, 6200));
        }

        if (avatarNode) {
            timers.push(setInterval(function () {
                if (!widgetNode || widgetNode.style.display !== 'none') return;
                avatarNode.classList.remove('teaser-attn');
                void avatarNode.offsetWidth;
                avatarNode.classList.add('teaser-attn');
            }, 10000));
        }

        return function stopTeaserRotation() {
            while (timers.length) clearInterval(timers.pop());
        };
    }

    global.ManyashaWidgetUi = {
        startTeaserRotation: startTeaserRotation
    };

    startTeaserRotation();
})(window);
