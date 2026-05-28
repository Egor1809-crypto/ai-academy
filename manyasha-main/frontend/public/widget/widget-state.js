(function (global) {
    var VISUAL_STATE_PRIORITY = {
        idle: 1,
        thinking: 2,
        listening: 3,
        speaking: 4,
        error: 5
    };

    function normalizeVisualState(state) {
        var raw = String(state || '').trim().toLowerCase();
        if (!raw) return 'idle';
        if (raw === 'ready') return 'idle';
        if (raw === 'answering' || raw === 'speaking') return 'speaking';
        if (raw === 'listening' || raw === 'thinking' || raw === 'error' || raw === 'idle') return raw;
        return 'idle';
    }

    function createVisualStateController(options) {
        var opts = options || {};
        var onApply = typeof opts.onApply === 'function' ? opts.onApply : function () {};
        var machine = {
            current: normalizeVisualState(opts.initialState || 'idle'),
            requested: normalizeVisualState(opts.initialState || 'idle'),
            appliedAt: 0,
            timer: null,
            debounceMs: typeof opts.debounceMs === 'number' ? Math.max(0, opts.debounceMs) : 280,
            minStateMs: typeof opts.minStateMs === 'number' ? Math.max(0, opts.minStateMs) : 700
        };

        function apply(nextState) {
            machine.current = nextState;
            machine.appliedAt = Date.now();
            onApply(nextState);
        }

        function setState(state) {
            var nextState = normalizeVisualState(state);
            var currentState = machine.current;
            machine.requested = nextState;

            if (nextState === currentState) {
                onApply(nextState);
                return nextState;
            }

            if (machine.timer) {
                clearTimeout(machine.timer);
                machine.timer = null;
            }

            var now = Date.now();
            var elapsed = now - (machine.appliedAt || 0);
            var currentPriority = VISUAL_STATE_PRIORITY[currentState] || 0;
            var nextPriority = VISUAL_STATE_PRIORITY[nextState] || 0;
            var holdMs = 0;
            var urgentState = nextState === 'listening' || nextState === 'thinking' || nextState === 'speaking';
            if (!urgentState && elapsed < machine.minStateMs && nextPriority <= currentPriority) {
                holdMs = machine.minStateMs - elapsed;
            }
            var debounceMs = nextState === 'error' ? 120 : machine.debounceMs;
            if (nextPriority > currentPriority) debounceMs = Math.min(debounceMs, 120);
            if (urgentState) debounceMs = 0;
            var waitMs = Math.max(holdMs, debounceMs);

            if (waitMs <= 0) {
                apply(nextState);
                return nextState;
            }

            machine.timer = setTimeout(function () {
                machine.timer = null;
                if (machine.requested !== nextState) return;
                apply(nextState);
            }, waitMs);

            return nextState;
        }

        function forceState(state) {
            if (machine.timer) {
                clearTimeout(machine.timer);
                machine.timer = null;
            }
            var normalized = normalizeVisualState(state);
            machine.requested = normalized;
            apply(normalized);
            return normalized;
        }

        function destroy() {
            if (machine.timer) {
                clearTimeout(machine.timer);
                machine.timer = null;
            }
        }

        return {
            getState: function () { return machine.current; },
            getRequestedState: function () { return machine.requested; },
            setState: setState,
            forceState: forceState,
            destroy: destroy
        };
    }

    global.ManyashaWidgetState = {
        normalizeVisualState: normalizeVisualState,
        createVisualStateController: createVisualStateController
    };
})(window);
