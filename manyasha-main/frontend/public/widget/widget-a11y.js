(function (global) {
    function isVisible(element) {
        if (!element) return false;
        if (element.hidden) return false;
        var style;
        try { style = global.getComputedStyle(element); } catch (e) { style = null; }
        if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
        return true;
    }

    function setupFocusTrap(container) {
        if (!container) return function () {};
        function onKeyDown(event) {
            if (event.key !== 'Tab') return;
            var focusable = container.querySelectorAll('a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])');
            var list = Array.prototype.filter.call(focusable, isVisible);
            if (!list.length) return;
            var first = list[0];
            var last = list[list.length - 1];
            var active = document.activeElement;

            if (event.shiftKey && active === first) {
                event.preventDefault();
                last.focus();
                return;
            }
            if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
            }
        }
        container.addEventListener('keydown', onKeyDown);
        return function cleanup() {
            container.removeEventListener('keydown', onKeyDown);
        };
    }

    function setDefaults(options) {
        var opts = options || {};
        var widget = opts.widget;
        var showButton = opts.showButton;
        var hideButton = opts.hideButton;
        var menuButton = opts.menuButton;
        var input = opts.chatInput;
        var cleanupTrap = setupFocusTrap(widget);

        if (showButton) {
            showButton.setAttribute('aria-label', showButton.getAttribute('aria-label') || 'Открыть чат с Маняшей');
            showButton.setAttribute('aria-expanded', 'false');
        }
        if (hideButton) {
            hideButton.setAttribute('aria-label', hideButton.getAttribute('aria-label') || 'Свернуть чат Маняши');
        }
        if (menuButton) {
            menuButton.setAttribute('aria-label', menuButton.getAttribute('aria-label') || 'Меню виджета');
        }
        if (input) {
            input.setAttribute('aria-label', input.getAttribute('aria-label') || 'Введите вопрос Маняше');
        }
        if (widget) {
            widget.setAttribute('role', widget.getAttribute('role') || 'dialog');
            widget.setAttribute('aria-live', widget.getAttribute('aria-live') || 'polite');
        }

        function updateExpanded(isOpen) {
            if (showButton) showButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }

        return {
            updateExpanded: updateExpanded,
            destroy: cleanupTrap
        };
    }

    global.ManyashaWidgetA11y = {
        setDefaults: setDefaults
    };
})(window);
