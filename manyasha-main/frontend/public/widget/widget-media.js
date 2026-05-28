(function (global) {
    function createMediaController(options) {
        var opts = options || {};
        var stage = opts.stageElement || document.getElementById('manyasha-stage');
        var elA = opts.videoAElement || document.getElementById('mv-a');
        var elB = opts.videoBElement || document.getElementById('mv-b');
        var stageFallback = opts.fallbackElement || document.getElementById('manyasha-stage-fallback');
        var isFileProtocol = (typeof opts.isFileProtocol === 'boolean')
            ? opts.isFileProtocol
            : !!(global.location && global.location.protocol === 'file:');
        var BASE = (typeof opts.basePath === 'string' && opts.basePath)
            ? opts.basePath
            : (isFileProtocol ? './mascot/v/' : '/mascot/v/');
        var FADE = (typeof opts.fadeMs === 'number' && isFinite(opts.fadeMs))
            ? Math.max(0, opts.fadeMs)
            : 260;
        var STATES = {
            idle:      { src: null,                     loop: false, staticFallback: true },
            greeting:  { src: 'manyasha-greeting.mp4',  loop: false },
            listening: { src: 'manyasha-listening.mp4', loop: true  },
            thinking:  { src: 'manyasha-thinking.mp4',  loop: true  },
            answering: { src: 'manyasha-answering.mp4', loop: false }
        };
        var STATE_ALIASES = {
            ready: 'idle',
            speaking: 'answering',
            short: 'answering',
            long: 'answering',
            compliment: 'answering',
            thanks: 'answering',
            good: 'answering',
            empathy: 'answering',
            consult: 'answering',
            success: 'answering',
            motivate: 'answering',
            error: 'idle',
            confused: 'idle',
            goodbye: 'idle'
        };

        if (!elA || !elB) {
            return {
                init: function () { return false; },
                play: function () {},
                setLoop: function () {},
                getCurrentState: function () { return null; }
            };
        }

        var activeEl  = elA;
        var standbyEl = elB;
        var curState  = null;
        var blobs     = {};
        var switchSeq = 0;
        var activeEndedHandler = null;
        var activeFailSafeTimer = null;
        var playbackWatchdog = null;
        var stateSrcCache = {};
        var preloadHints = {};
        var warmVideoPool = {};
        var warmVideoReleaseTimer = null;
        var initialized = false;
        var curStateReadyAt = 0;
        var CORE_STATES = { greeting: true, listening: true, thinking: true, answering: true, idle: true };
        var STATE_MAX_DURATION_MS = { greeting: 1450 };
        var STATE_PLAYBACK_RATE = { greeting: 1.35 };
        var STATE_FALLBACK_FADE_MS = { listening: 120, thinking: 120, answering: 160 };
        var speakingLoopLocked = false;

        function clearStateFinishHandlers() {
            if (activeEndedHandler) {
                activeEl.removeEventListener('ended', activeEndedHandler);
                activeEndedHandler = null;
            }
            if (activeFailSafeTimer) {
                clearTimeout(activeFailSafeTimer);
                activeFailSafeTimer = null;
            }
        }

        function isStateLooped(name, stateCfg) {
            return !!(stateCfg && stateCfg.loop) || (name === 'answering' && speakingLoopLocked);
        }

        function setStageVideoReady(ready) {
            if (!stage) return;
            stage.classList.toggle('has-video', !!ready);
            stage.setAttribute('data-video-status', ready ? 'ready' : 'fallback');
            if (!ready) {
                curStateReadyAt = 0;
                stage.removeAttribute('data-video-ready-at');
            }
            if (stageFallback) stageFallback.style.opacity = ready ? '0' : '1';
        }

        function markStateVideoReady(name) {
            if (curState !== name) return;
            curStateReadyAt = Date.now();
            if (stage) stage.setAttribute('data-video-ready-at', String(curStateReadyAt));
        }

        function resolveCoreState(name) {
            var raw = String(name || 'idle').trim().toLowerCase();
            if (CORE_STATES[raw]) return raw;
            if (STATE_ALIASES[raw]) return STATE_ALIASES[raw];
            return 'idle';
        }

        function stateCandidates(name) {
            var s = STATES[resolveCoreState(name)];
            if (!s) return [];
            return s.src ? [BASE + s.src] : [];
        }

        function clearVideoElement(video) {
            if (!video) return;
            try { video.pause(); } catch (_ePause) {}
            try { video.removeAttribute('src'); } catch (_eRemoveSrc) {}
            try { video.load(); } catch (_eLoad) {}
            try {
                video.style.opacity = '0';
                video.style.zIndex = '1';
            } catch (_eStyle) {}
        }

        function showStaticFallbackState(name) {
            curState = name;
            curStateReadyAt = Date.now();
            switchSeq += 1;
            clearStateFinishHandlers();
            clearVideoElement(activeEl);
            clearVideoElement(standbyEl);
            setStageVideoReady(false);
            curStateReadyAt = Date.now();
            if (stage) {
                stage.classList.remove('playing', 'looping', 'stage-loop');
                stage.setAttribute('data-video-ready-at', String(curStateReadyAt));
            }
        }

        function resolveStateSource(name) {
            if (stateSrcCache[name]) return Promise.resolve(stateSrcCache[name]);
            var candidates = stateCandidates(name);
            if (!candidates.length) return Promise.resolve(null);
            if (!isFileProtocol) {
                stateSrcCache[name] = candidates[0];
                return Promise.resolve(candidates[0]);
            }
            var idx = 0;
            function isPlayableVideoUrl(url) {
                return new Promise(function (resolve) {
                    var probe = document.createElement('video');
                    var done = false;
                    var timer = setTimeout(function () {
                        if (done) return;
                        done = true;
                        cleanup();
                        resolve(false);
                    }, 2200);
                    function cleanup() {
                        clearTimeout(timer);
                        probe.removeAttribute('src');
                        try { probe.load(); } catch (_eProbeLoad) {}
                    }
                    function pass() {
                        if (done) return;
                        done = true;
                        cleanup();
                        resolve((probe.videoWidth || 0) > 0);
                    }
                    function fail() {
                        if (done) return;
                        done = true;
                        cleanup();
                        resolve(false);
                    }
                    probe.preload = 'metadata';
                    probe.muted = true;
                    probe.playsInline = true;
                    probe.addEventListener('loadedmetadata', pass, { once: true });
                    probe.addEventListener('canplay', pass, { once: true });
                    probe.addEventListener('error', fail, { once: true });
                    probe.src = url;
                    try { probe.load(); } catch (_eProbeInit) { fail(); }
                });
            }
            function next() {
                if (idx >= candidates.length) return Promise.resolve(null);
                var url = candidates[idx++];
                return isPlayableVideoUrl(url).then(function (playable) {
                    if (!playable) return next();
                    stateSrcCache[name] = url;
                    return url;
                });
            }
            return next();
        }

        function warmVideoSource(src, urgent) {
            if (!src || isFileProtocol) return;
            var warmKey = src + (urgent ? '#auto' : '#metadata');
            if (warmVideoPool[warmKey]) return;
            if (Array.isArray(global.__manyashaColdStartMedia)) {
                for (var i = 0; i < global.__manyashaColdStartMedia.length; i += 1) {
                    var externalVideo = global.__manyashaColdStartMedia[i];
                    var externalSrc = externalVideo && (externalVideo.currentSrc || externalVideo.src);
                    if (externalSrc === src) {
                        warmVideoPool[warmKey] = externalVideo;
                        return;
                    }
                }
            }
            try {
                var video = document.createElement('video');
                video.preload = urgent ? 'auto' : 'metadata';
                video.muted = true;
                video.playsInline = true;
                video.setAttribute('playsinline', '');
                video.setAttribute('aria-hidden', 'true');
                video.style.cssText = 'position:fixed;width:1px;height:1px;left:-9999px;top:-9999px;opacity:0;pointer-events:none;';
                video.src = src;
                warmVideoPool[warmKey] = video;
                video.load();
            } catch (_eWarmVideo) {}
        }

        function releaseWarmVideosLater() {
            if (warmVideoReleaseTimer) return;
            warmVideoReleaseTimer = setTimeout(function () {
                var externalWarm = global.__manyashaColdStartMedia;
                Object.keys(warmVideoPool).forEach(function (key) {
                    var video = warmVideoPool[key];
                    try {
                        video.pause();
                        video.removeAttribute('src');
                        video.load();
                    } catch (_eReleaseWarmVideo) {}
                    delete warmVideoPool[key];
                });
                if (Array.isArray(externalWarm)) {
                    externalWarm.forEach(function (video) {
                        try {
                            video.pause();
                            video.removeAttribute('src');
                            video.load();
                        } catch (_eReleaseExternalWarmVideo) {}
                    });
                    externalWarm.length = 0;
                }
            }, 90000);
        }

        function addPreloadHint(src, urgent) {
            if (!src || isFileProtocol) return;
            warmVideoSource(src, !!urgent);
            if (!document.head) return;
            var hintKey = src + (urgent ? '#preload' : '#prefetch');
            if (preloadHints[hintKey]) return;
            preloadHints[hintKey] = true;
            try {
                if (urgent) return;
                var link = document.createElement('link');
                link.rel = 'prefetch';
                link.setAttribute('fetchpriority', 'low');
                link.type = 'video/mp4';
                link.href = src;
                document.head.appendChild(link);
            } catch (_ePreload) {}
        }

        function fetchBlob(name, urgent) {
            if (blobs[name] && blobs[name] !== 'loading') {
                if (urgent) addPreloadHint(blobs[name], true);
                return;
            }
            if (blobs[name] === 'loading') {
                if (urgent && stateSrcCache[name]) addPreloadHint(stateSrcCache[name], true);
                return;
            }
            var directCandidates = stateCandidates(name);
            if (!directCandidates.length) {
                blobs[name] = null;
                return;
            }
            if (!isFileProtocol && directCandidates.length) {
                stateSrcCache[name] = directCandidates[0];
                blobs[name] = directCandidates[0];
                addPreloadHint(directCandidates[0], !!urgent);
                return;
            }
            blobs[name] = 'loading';
            resolveStateSource(name)
                .then(function (src) {
                    if (!src) throw new Error('no-source');
                    blobs[name] = src;
                    addPreloadHint(src, !!urgent);
                })
                .catch(function () {
                    blobs[name] = null;
                });
        }

        var INITIAL_PRELOAD_SEQUENCE = ['greeting', 'listening', 'thinking', 'answering'];
        var EARLY_PRELOAD_SEQUENCE = ['listening'];
        var DEFERRED_PRELOAD_SEQUENCE = ['listening', 'thinking', 'answering'];
        var coreWarmStarted = false;
        var deferredWarmStarted = false;

        function runWhenIdle(fn, timeout) {
            if (typeof global.requestIdleCallback === 'function') {
                global.requestIdleCallback(fn, { timeout: timeout || 1800 });
                return;
            }
            setTimeout(fn, 0);
        }

        function warmSequence(sequence, spacing, initialDelay, urgent) {
            sequence.forEach(function (name, index) {
                setTimeout(function () {
                    if (urgent) {
                        fetchBlob(name, true);
                        return;
                    }
                    runWhenIdle(function () { fetchBlob(name, false); }, 1800);
                }, (initialDelay || 0) + (index * spacing));
            });
        }

        function warmDeferredCoreStates(urgent) {
            if (deferredWarmStarted && !urgent) return;
            deferredWarmStarted = true;
            warmSequence(DEFERRED_PRELOAD_SEQUENCE, urgent ? 80 : 900, 0, !!urgent);
        }

        function warmEarlyCoreStates() {
            warmSequence(EARLY_PRELOAD_SEQUENCE, 700, 0, false);
        }

        function warmCoreStates() {
            if (coreWarmStarted) return;
            coreWarmStarted = true;
            warmSequence(INITIAL_PRELOAD_SEQUENCE, 160, 0, true);
            setTimeout(function () { warmSequence(EARLY_PRELOAD_SEQUENCE, 160, 0, true); }, 920);
            setTimeout(function () { warmDeferredCoreStates(true); }, 1700);
        }

        function playState(name, onEnd) {
            name = resolveCoreState(name);
            var s = STATES[name];
            if (!s) { playState('idle'); return; }
            var shouldLoop = isStateLooped(name, s);
            var candidates = stateCandidates(name);
            if (!candidates.length || s.staticFallback) {
                showStaticFallbackState(name);
                return;
            }
            if (curState === name && activeEl.loop === shouldLoop && activeEl.readyState >= 2 && !activeEl.ended) {
                if (shouldLoop && activeEl.paused) activeEl.play().catch(function () {});
                return;
            }
            curState = name;
            curStateReadyAt = 0;
            switchSeq += 1;
            var localSeq = switchSeq;
            clearStateFinishHandlers();

            var src = (blobs[name] && blobs[name] !== 'loading')
                ? blobs[name]
                : (stateSrcCache[name] || candidates[0]);

            if (stage) {
                stage.classList.remove('playing', 'looping');
                stage.classList.toggle('stage-loop', shouldLoop);
                if (shouldLoop) stage.classList.add('looping');
                else stage.classList.add('playing');
            }

            var standbyCurrentSrc = standbyEl.currentSrc || standbyEl.src || '';
            var standbyHasSameSrc = standbyCurrentSrc === src;
            if (!standbyHasSameSrc) standbyEl.src = src;
            standbyEl.loop = shouldLoop;
            standbyEl.muted = true;
            standbyEl.playbackRate = STATE_PLAYBACK_RATE[name] || 1;
            try { standbyEl.currentTime = 0; } catch (_eCurrentTime) {}
            standbyEl.style.opacity = '0';
            standbyEl.style.zIndex = '1';

            var started = false;
            function doFade() {
                if (started) return;
                if (localSeq !== switchSeq) return;
                started = true;
                var effectiveLoop = isStateLooped(name, s);
                var standbyPlayable = ((standbyEl.videoWidth || 0) > 0 || standbyEl.readyState >= 2);
                setStageVideoReady(standbyPlayable);
                if (standbyPlayable) markStateVideoReady(name);
                standbyEl.style.opacity = '1';
                standbyEl.style.zIndex = '2';
                activeEl.style.opacity = '0';
                activeEl.style.zIndex = '1';

                var prev = activeEl;
                activeEl = standbyEl;
                standbyEl = prev;
                activeEl.loop = effectiveLoop;
                activeEl.playbackRate = STATE_PLAYBACK_RATE[name] || 1;
                if (stage) {
                    stage.classList.toggle('stage-loop', effectiveLoop);
                    if (effectiveLoop) {
                        stage.classList.remove('playing');
                        stage.classList.add('looping');
                    }
                }

                setTimeout(function () {
                    if (localSeq !== switchSeq) return;
                    standbyEl.pause();
                    standbyEl.removeAttribute('src');
                    standbyEl.load();
                }, FADE + 80);

                if (!effectiveLoop) {
                    activeFailSafeTimer = setTimeout(function () {
                        if (localSeq !== switchSeq) return;
                        if (curState === name) {
                            if (onEnd) onEnd();
                            else playState('idle');
                        }
                    }, STATE_MAX_DURATION_MS[name] || 12000);
                    activeEndedHandler = function h() {
                        activeEl.removeEventListener('ended', h);
                        activeEndedHandler = null;
                        if (activeFailSafeTimer) {
                            clearTimeout(activeFailSafeTimer);
                            activeFailSafeTimer = null;
                        }
                        if (curState === name) {
                            if (stage) stage.classList.remove('playing');
                            if (onEnd) onEnd();
                            else setTimeout(function () { playState('idle'); }, 90);
                        }
                    };
                    activeEl.addEventListener('ended', activeEndedHandler);
                }
            }

            function onVideoReady() {
                standbyEl.removeEventListener('loadeddata', onVideoReady);
                standbyEl.removeEventListener('canplay', onVideoReady);
                if (localSeq !== switchSeq || curState !== name) return;
                setStageVideoReady(true);
                markStateVideoReady(name);
                doFade();
            }
            standbyEl.addEventListener('loadeddata', onVideoReady, { once: true });
            standbyEl.addEventListener('canplay', onVideoReady, { once: true });
            standbyEl.addEventListener('playing', function onVideoPlaying() {
                if (localSeq !== switchSeq) return;
                setStageVideoReady(true);
                markStateVideoReady(name);
            }, { once: true });
            standbyEl.addEventListener('error', function onErr() {
                standbyEl.removeEventListener('error', onErr);
                standbyEl.removeEventListener('loadeddata', onVideoReady);
                standbyEl.removeEventListener('canplay', onVideoReady);
                if (localSeq !== switchSeq) return;
                setStageVideoReady(false);
                stateSrcCache[name] = null;
                blobs[name] = null;
                if (name !== 'idle') playState('idle');
            }, { once: true });
            setTimeout(doFade, STATE_FALLBACK_FADE_MS[name] || 650);
            if (!standbyHasSameSrc || standbyEl.readyState === 0) standbyEl.load();
            standbyEl.play().catch(function () {});
        }

        function setLoop(loop) {
            speakingLoopLocked = !!loop;
            if (!activeEl) return;
            var activeStateCfg = STATES[curState || 'idle'] || STATES.idle;
            var shouldLoop = isStateLooped(curState || 'idle', activeStateCfg);
            activeEl.loop = shouldLoop;
            if (shouldLoop) {
                clearStateFinishHandlers();
            }
            if (stage) {
                stage.classList.toggle('stage-loop', shouldLoop);
                if (shouldLoop) {
                    stage.classList.remove('playing');
                    stage.classList.add('looping');
                } else {
                    stage.classList.remove('looping');
                    if (curState && curState !== 'idle') stage.classList.add('playing');
                }
            }
        }

        function init() {
            if (initialized) return true;
            initialized = true;
            setStageVideoReady(false);
            try {
                elA.preload = 'auto';
                elB.preload = 'auto';
            } catch (_ePreloadAttr) {}
            warmCoreStates();
            releaseWarmVideosLater();

            global.manyashaPlay = playState;
            global.manyashaSetLoop = setLoop;
            global.manyashaWarmMedia = function () { warmDeferredCoreStates(true); };
            global.manyashaGetMediaState = function () {
                return {
                    state: curState,
                    readyAt: curStateReadyAt,
                    readyForMs: curStateReadyAt ? Math.max(0, Date.now() - curStateReadyAt) : 0
                };
            };

            playbackWatchdog = setInterval(function () {
                if (!activeEl || !curState) return;
                if (document.hidden) return;
                var stateCfg = STATES[curState];
                if (!stateCfg) return;
                if (isStateLooped(curState, stateCfg)) {
                    if (activeEl.ended || activeEl.paused) {
                        activeEl.play().catch(function () {});
                    }
                } else if (activeEl.ended && curState !== 'idle') {
                    playState('idle');
                }
            }, 1800);

            playState('greeting', function () { playState('idle'); });
            return true;
        }

        return {
            init: init,
            play: playState,
            setLoop: setLoop,
            getCurrentState: function () { return curState; },
            clearStateFinishHandlers: clearStateFinishHandlers
        };
    }

    global.ManyashaWidgetMedia = {
        createMediaController: createMediaController
    };
})(window);
