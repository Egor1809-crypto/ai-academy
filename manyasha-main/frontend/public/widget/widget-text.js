(function (global) {
    function ttsPlural(n, one, few, many) {
        var num = Math.abs(parseInt(n, 10) || 0);
        var mod10 = num % 10;
        var mod100 = num % 100;
        if (mod10 === 1 && mod100 !== 11) return one;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
        return many;
    }

    function ttsRuUnderThousand(num, feminine) {
        var n = Math.max(0, Math.floor(num || 0));
        if (!n) return '';
        var hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
        var tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
        var teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
        var unitsMasc = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
        var unitsFem = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
        var out = [];
        var h = Math.floor(n / 100);
        var rest = n % 100;
        if (h) out.push(hundreds[h]);
        if (rest >= 10 && rest <= 19) {
            out.push(teens[rest - 10]);
        } else {
            var t = Math.floor(rest / 10);
            var u = rest % 10;
            if (t) out.push(tens[t]);
            if (u) out.push((feminine ? unitsFem : unitsMasc)[u]);
        }
        return out.join(' ').trim();
    }

    function ttsNumberToWords(raw, options) {
        var opts = options || {};
        var n = parseInt(raw, 10);
        if (isNaN(n)) return String(raw || '');
        if (n === 0) return 'ноль';
        if (Math.abs(n) > 999999) return String(n);
        if (n < 0) return 'минус ' + ttsNumberToWords(Math.abs(n), opts);
        var parts = [];
        var thousands = Math.floor(n / 1000);
        var rest = n % 1000;
        if (thousands) {
            parts.push(ttsRuUnderThousand(thousands, true));
            parts.push(ttsPlural(thousands, 'тысяча', 'тысячи', 'тысяч'));
        }
        if (rest) parts.push(ttsRuUnderThousand(rest, !!opts.feminine));
        return parts.join(' ').replace(/\s+/g, ' ').trim();
    }

    function ttsNumberToWordsSafe(raw, options) {
        var text = ttsNumberToWords(raw, options);
        return text || String(raw || '');
    }

    function ttsLawNominative(raw) {
        var key = String(parseInt(raw, 10));
        if (key === '127') return 'сто двадцать седьмой федеральный закон';
        if (key === '152') return 'сто пятьдесят второй федеральный закон';
        if (key === '229') return 'двести двадцать девятый федеральный закон';
        if (key === '230') return 'двести тридцатый федеральный закон';
        if (key === '353') return 'триста пятьдесят третий федеральный закон';
        return 'федеральный закон номер ' + ttsNumberToWordsSafe(key);
    }

    function ttsLawDative(raw) {
        var key = String(parseInt(raw, 10));
        if (key === '127') return 'сто двадцать седьмому федеральному закону';
        if (key === '152') return 'сто пятьдесят второму федеральному закону';
        if (key === '229') return 'двести двадцать девятому федеральному закону';
        if (key === '230') return 'двести тридцатому федеральному закону';
        if (key === '353') return 'триста пятьдесят третьему федеральному закону';
        return 'федеральному закону номер ' + ttsNumberToWordsSafe(key);
    }

    function normalizeTTSPronunciation(text) {
        var t = String(text || '');
        if (!t) return '';
        t = t.replace(/\u00A0/g, ' ');
        t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/gi, '$1');
        t = t.replace(/[\[\]{}<>]/g, ' ');
        t = t.replace(/[()]/g, ' ');
        t = t.replace(/Сформулируйте задачу в\s*1\s*[-–—]\s*2\s*предложениях/gi, 'Опишите ваш вопрос в одном-двух предложениях');
        t = t.replace(/\bв\s*1\s*[-–—]\s*2\s*предложени(?:ях|и)\b/gi, 'в одном-двух предложениях');
        t = t.replace(/(^|[^A-Za-zА-ЯЁа-яё0-9])90\s*\+\s*дн(?:ей|я|\.?)(?=$|[^A-Za-zА-ЯЁа-яё0-9])/gi, function (_, prefix) {
            return (prefix || '') + 'больше девяноста дней';
        });
        t = t.replace(/\b1\s*[-–—]\s*2\b/g, 'один-два');
        t = t.replace(/\b(\d{1,3})\s*[-–—]\s*(\d{1,3})\s*сек(?:унд(?:ы|у)?|\.?)\b/gi, function (_, from, to) {
            return ttsNumberToWordsSafe(from) + '–' + ttsNumberToWordsSafe(to) + ' секунд';
        });
        t = t.replace(/\b(\d{1,3})\s*[-–—]\s*(\d{1,3})\s*мин(?:ут(?:ы|у)?|\.?)\b/gi, function (_, from, to) {
            return ttsNumberToWordsSafe(from) + '–' + ttsNumberToWordsSafe(to) + ' минут';
        });
        t = t.replace(/\b(\d{1,2})\s*[-–—]\s*(\d{1,2})\s*час(?:а|ов)?\b/gi, function (_, from, to) {
            return ttsNumberToWordsSafe(from) + '–' + ttsNumberToWordsSafe(to) + ' часов';
        });
        t = t.replace(/(^|[^A-Za-zА-ЯЁа-яё0-9])по\s*(?:фз\s*№?\s*([0-9]{1,4})|([0-9]{1,4})\s*[-–—]?\s*фз)(?=$|[^A-Za-zА-ЯЁа-яё0-9])/gi, function (_, prefix, n1, n2) {
            return (prefix || '') + 'по ' + ttsLawDative(n1 || n2);
        });
        t = t.replace(/(^|[^A-Za-zА-ЯЁа-яё0-9])(?:фз\s*№?\s*([0-9]{1,4})|([0-9]{1,4})\s*[-–—]?\s*фз)(?=$|[^A-Za-zА-ЯЁа-яё0-9])/gi, function (_, prefix, n1, n2) {
            return (prefix || '') + ttsLawNominative(n1 || n2);
        });
        t = t.replace(/\bгк\s*рф\b/gi, 'Гражданский кодекс Российской Федерации');
        t = t.replace(/\bгпк\s*рф\b/gi, 'Гражданский процессуальный кодекс Российской Федерации');
        t = t.replace(/\bапк\s*рф\b/gi, 'Арбитражный процессуальный кодекс Российской Федерации');
        t = t.replace(/\bнк\s*рф\b/gi, 'Налоговый кодекс Российской Федерации');
        t = t.replace(/\bтк\s*рф\b/gi, 'Трудовой кодекс Российской Федерации');
        t = t.replace(/\bук\s*рф\b/gi, 'Уголовный кодекс Российской Федерации');
        t = t.replace(/\bкоап\s*рф\b/gi, 'Кодекс Российской Федерации об административных правонарушениях');
        t = t.replace(/\bцб\s*рф\b/gi, 'Банк России');
        t = t.replace(/\bрф\b/g, 'Российская Федерация');
        t = t.replace(/(^|[^A-Za-zА-ЯЁа-яё0-9])фссп(?=$|[^A-Za-zА-ЯЁа-яё0-9])/gi, function (_, prefix) {
            return (prefix || '') + 'служба судебных приставов';
        });
        t = t.replace(/\bфнс\b/gi, 'Федеральная налоговая служба');
        t = t.replace(/(^|[^A-Za-zА-ЯЁа-яё0-9])мфц(?=$|[^A-Za-zА-ЯЁа-яё0-9])/gi, function (_, prefix) {
            return (prefix || '') + 'многофункциональный центр';
        });
        t = t.replace(/\bсро\b/gi, 'саморегулируемая организация');
        t = t.replace(/\bооо\b/gi, 'общество с ограниченной ответственностью');
        t = t.replace(/\bпао\b/gi, 'публичное акционерное общество');
        t = t.replace(/(^|[^А-ЯЁа-яёA-Za-z])ао(?=[^А-ЯЁа-яёA-Za-z]|$)/gi, function (match, prefix) {
            return (prefix || '') + 'акционерное общество';
        });
        t = t.replace(/(^|[^A-Za-zА-ЯЁа-яё0-9])ип(?=\s*(?:у|по|в)?\s*пристав)/gi, function (_, prefix) {
            return (prefix || '') + 'исполнительное производство';
        });
        t = t.replace(/(^|[^A-Za-zА-ЯЁа-яё0-9])ип(?=\s*(?:возбуждено|открыто|ид[её]т|в\s*работе))/gi, function (_, prefix) {
            return (prefix || '') + 'исполнительное производство';
        });
        t = t.replace(/(^|[^A-Za-zА-ЯЁа-яё0-9])ип(?=$|[^A-Za-zА-ЯЁа-яё0-9])/gi, function (_, prefix) {
            return (prefix || '') + 'индивидуальный предприниматель';
        });
        t = t.replace(/№\s*([0-9]{1,6})\b/g, function (_, num) {
            return 'номер ' + ttsNumberToWordsSafe(num);
        });
        t = t.replace(/\b([0-9]{1,3})\s*%\b/g, function (_, num) {
            var n = parseInt(num, 10) || 0;
            return ttsNumberToWordsSafe(n) + ' ' + ttsPlural(n, 'процент', 'процента', 'процентов');
        });
        t = t.replace(/\b([0-9]{1,6})\s*(?:₽|руб(?:лей|ля|\.|ль)?)\b/gi, function (_, num) {
            var n = parseInt(num, 10) || 0;
            return ttsNumberToWordsSafe(n) + ' ' + ttsPlural(n, 'рубль', 'рубля', 'рублей');
        });
        return t;
    }

    function sanitizeTTS(text) {
        var t = String(text || '');
        t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/gi, '$1');
        t = t.replace(/\*\*(.*?)\*\*/g, '$1');
        t = t.replace(/`{1,3}/g, '');
        t = t.replace(/\[?\s*КОНСУЛЬТАЦИЯ\s*\]?/gi, '');
        t = t.replace(/\[?\s*НАСТР\s*:\s*[А-ЯЁA-Z_]+\s*\]?/gi, '');
        t = t.replace(/^\s*#{1,6}\s*/gm, '');
        t = t.replace(/^\s*[-*•]+\s+/gm, '');
        t = t.replace(/^\s*\d+[.)]\s+/gm, '');
        t = t.replace(/https?:\/\/\S+/gi, '');
        t = normalizeTTSPronunciation(t);
        t = t.replace(/№/g, ' номер ');
        t = t.replace(/[#_~|]+/g, ' ');
        t = t.replace(/[\[\]{}()<>]/g, ' ');
        t = t.replace(/\s[-–—]\s/g, ', ');
        t = t.replace(/[;:]{2,}/g, '.');
        t = t.replace(/[!?.,]{2,}/g, '.');
        t = t.replace(/\s+/g, ' ').trim();
        return t.slice(0, 800);
    }

    function ttsProfileForMood(mood) {
        var m = String(mood || 'neutral').toLowerCase();
        var base = {
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
        var map = {
            good: {
                maxChunkLen: 260,
                maxChunks: 4,
                delayShort: 400,
                delayMed: 600,
                delayLong: 780,
                jitter: 200,
                pauseBetween: 90,
                pauseLast: 120,
                pushToTalkDelay: 70
            },
            empathy: {
                maxChunkLen: 220,
                maxChunks: 5,
                delayShort: 700,
                delayMed: 960,
                delayLong: 1220,
                jitter: 380,
                pauseBetween: 140,
                pauseLast: 170,
                pushToTalkDelay: 140
            },
            confused: {
                maxChunkLen: 235,
                maxChunks: 4,
                delayShort: 580,
                delayMed: 820,
                delayLong: 1060,
                jitter: 340,
                pauseBetween: 120,
                pauseLast: 150,
                pushToTalkDelay: 110
            },
            motivate: {
                maxChunkLen: 245,
                maxChunks: 4,
                delayShort: 560,
                delayMed: 800,
                delayLong: 1020,
                jitter: 220,
                pauseBetween: 95,
                pauseLast: 130,
                pushToTalkDelay: 95
            }
        };
        var p = map[m];
        if (!p) return base;
        return {
            maxChunkLen: p.maxChunkLen,
            maxChunks: p.maxChunks,
            delayShort: p.delayShort,
            delayMed: p.delayMed,
            delayLong: p.delayLong,
            jitter: p.jitter,
            pauseBetween: p.pauseBetween,
            pauseLast: p.pauseLast,
            pushToTalkDelay: p.pushToTalkDelay
        };
    }

    function splitTextForVoiceSync(text, profile) {
        var prof = profile || ttsProfileForMood('neutral');
        var src = String(text || '').replace(/\s+/g, ' ').trim();
        if (!src) return [];
        if (src.length <= 280) return [src];

        var parts = src
            .replace(/([.!?…;:])\s+/g, '$1|')
            .split('|')
            .map(function (s) { return s.trim(); })
            .filter(Boolean);

        var grouped = [];
        var cur = '';
        var maxLen = Math.max(120, Math.min(360, Math.floor((prof.maxChunkLen || 250) * 1.12)));

        parts.forEach(function (p) {
            if (!p) return;
            if (!cur) {
                cur = p;
                return;
            }
            if ((cur + ' ' + p).length <= maxLen) {
                cur += ' ' + p;
            } else {
                grouped.push(cur);
                cur = p;
            }
        });
        if (cur) grouped.push(cur);
        if (!grouped.length) grouped.push(src);

        var out = [];
        var maxWords = Math.max(10, Math.min(24, Math.floor(maxLen / 14)));
        var i;
        for (i = 0; i < grouped.length; i += 1) {
            var chunk = grouped[i];
            var words = chunk.split(/\s+/).filter(Boolean);
            if (!words.length) continue;
            if (chunk.length <= maxLen && words.length <= maxWords) {
                out.push(chunk);
                continue;
            }
            var take = Math.max(4, maxWords);
            for (var j = 0; j < words.length; j += take) {
                var sub = words.slice(j, j + take).join(' ');
                if (!sub) continue;
                out.push(sub);
            }
        }
        if (src.length <= 360 && out.length > 2) {
            var half = Math.ceil(out.length / 2);
            var first = out.slice(0, half).join(' ').trim();
            var second = out.slice(half).join(' ').trim();
            var compact = [];
            if (first) compact.push(first);
            if (second) compact.push(second);
            if (compact.length) return compact;
        }
        return out;
    }

    function chunkTTS(text, profile) {
        var prof = profile || ttsProfileForMood('neutral');
        var safeWhole = sanitizeTTS(text);
        if (safeWhole && safeWhole.length <= 280) {
            return [safeWhole];
        }
        var rawChunks = splitTextForVoiceSync(text, prof);
        var chunks = [];
        rawChunks.forEach(function (chunk) {
            var safe = sanitizeTTS(chunk);
            if (safe) chunks.push(safe);
        });
        if (!chunks.length) {
            if (safeWhole) chunks.push(safeWhole);
        }
        if (safeWhole && safeWhole.length <= 360 && chunks.length > 2) {
            var half = Math.ceil(chunks.length / 2);
            var merged = [];
            var left = chunks.slice(0, half).join(' ').trim();
            var right = chunks.slice(half).join(' ').trim();
            if (left) merged.push(left);
            if (right) merged.push(right);
            if (merged.length) chunks = merged;
        }
        return chunks.slice(0, prof.maxChunks);
    }

    function fallbackSpeechFromReply(reply) {
        var sanitized = sanitizeTTS(String(reply || ''));
        if (!sanitized) return '';
        var banned = [
            /не\s+является\s+юридической\s+консультацией/gi,
            /не\s+заменяет\s+юридическую\s+консультацию/gi,
            /без\s+юридических\s+гарантий/gi,
            /я\s+не\s+могу/gi,
            /не\s+могу\s+нести\s+ответственность/gi
        ];
        var chunks = sanitized.match(/[^.!?…\n]+[.!?…]?/g) || [];
        if (!chunks.length) {
            chunks = [sanitized];
        }
        var out = [];
        var totalLen = 0;
        for (var i = 0; i < chunks.length; i += 1) {
            var seg = String(chunks[i] || '').trim();
            if (!seg) continue;
            var hasLetters = /[а-яёa-z]/i.test(seg);
            if (!hasLetters) continue;
            var skip = false;
            var j;
            for (j = 0; j < banned.length; j += 1) {
                if (banned[j].test(seg)) {
                    skip = true;
                    break;
                }
            }
            if (skip) continue;
            out.push(seg);
            totalLen += seg.length + 1;
            if (out.length >= 2) break;
        }
        var speech = (out.join(' ') || sanitized).trim();
        if (speech.length > 260) {
            speech = speech.slice(0, 260).trim();
            var lastSpace = speech.lastIndexOf(' ');
            if (lastSpace > 0) {
                speech = speech.slice(0, lastSpace);
            }
        }
        return speech;
    }

    function applyFemalePostFilter(text) {
        var t = String(text || '');
        if (!t) return t;
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
        t = t.replace(/\b(какой)\s+(именно\s+)?(вам\s+)?нужна\s+помощь\b/gi, function (_full, qWord, exactly, you) {
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

    global.ManyashaWidgetText = {
        ttsPlural: ttsPlural,
        ttsRuUnderThousand: ttsRuUnderThousand,
        ttsNumberToWords: ttsNumberToWords,
        ttsNumberToWordsSafe: ttsNumberToWordsSafe,
        ttsLawNominative: ttsLawNominative,
        ttsLawDative: ttsLawDative,
        normalizeTTSPronunciation: normalizeTTSPronunciation,
        sanitizeTTS: sanitizeTTS,
        ttsProfileForMood: ttsProfileForMood,
        splitTextForVoiceSync: splitTextForVoiceSync,
        chunkTTS: chunkTTS,
        fallbackSpeechFromReply: fallbackSpeechFromReply,
        applyFemalePostFilter: applyFemalePostFilter
    };
})(window);
