(function (global) {
    function createDiagnostics(options) {
        var opts = options || {};
        var storageKey = String(opts.storageKey || 'manyasha_diagnostics_v1');
        var isDemoMode = typeof opts.isDemoMode === 'function' ? opts.isDemoMode : function () { return false; };
        var state = loadState();

        function blankState() {
            return {
                debt_amount: '',
                debt_amount_value: 0,
                debt_types: [],
                bailiffs: '',
                income: '',
                property: [],
                collectors: '',
                overdue_stage: '',
                route_hint: 'needs_check',
                risk_level: 'low',
                risk_reasons: [],
                consult_recommended: false,
                progress_total: 7,
                known_count: 0,
                missing_fields: [],
                summary_shown: false,
                updated_at: 0
            };
        }

        function loadState() {
            try {
                var raw = localStorage.getItem(storageKey);
                if (!raw) return blankState();
                return normalizeState(JSON.parse(raw) || {});
            } catch (_e) {
                return blankState();
            }
        }

        function saveState() {
            try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (_e) {}
        }

        function uniquePush(list, value) {
            if (!value) return list;
            if (list.indexOf(value) === -1) list.push(value);
            return list;
        }

        function normalizeState(input) {
            var out = blankState();
            Object.keys(out).forEach(function (key) {
                if (typeof input[key] !== 'undefined') out[key] = input[key];
            });
            out.debt_types = Array.isArray(out.debt_types) ? out.debt_types.slice(0, 6) : [];
            out.property = Array.isArray(out.property) ? out.property.slice(0, 6) : [];
            out.risk_reasons = Array.isArray(out.risk_reasons) ? out.risk_reasons.slice(0, 5) : [];
            out.debt_amount_value = Number(out.debt_amount_value || 0) || 0;
            return recalc(out);
        }

        function formatRubAmount(amount) {
            var value = Number(amount || 0) || 0;
            if (!value) return '';
            return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' рублей';
        }

        function extractAmount(text) {
            var source = String(text || '').toLowerCase().replace(/\u00a0/g, ' ');
            var re = /(\d[\d\s.,]{0,16})\s*(млн|миллион[а-я]*|тыс|тысяч[а-я]*)?/gi;
            var best = 0;
            var match;
            while ((match = re.exec(source))) {
                var raw = String(match[1] || '').trim();
                var digitsOnly = raw.replace(/[^\d]/g, '');
                if (!digitsOnly) continue;
                var value = 0;
                if (digitsOnly.length > 4) {
                    value = parseInt(digitsOnly, 10) || 0;
                } else {
                    value = Number(raw.replace(/\s/g, '').replace(',', '.')) || 0;
                }
                var suffix = String(match[2] || '').toLowerCase();
                if (/^млн|^миллион/.test(suffix)) value *= 1000000;
                if (/^тыс|^тысяч/.test(suffix)) value *= 1000;
                if (value > best) best = value;
            }
            return best;
        }

        function evaluateRisk(input) {
            var out = input || state;
            var score = 0;
            var reasons = [];
            var bailiffsText = String(out.bailiffs || '').toLowerCase();
            var incomeText = String(out.income || '').toLowerCase();
            var collectorsText = String(out.collectors || '').toLowerCase();
            var propertyText = Array.isArray(out.property) ? out.property.join(' ').toLowerCase() : '';

            if (out.debt_amount_value >= 500000) {
                score += 2;
                reasons.push('крупная сумма долга');
            }
            if (bailiffsText) {
                score += /спис|удерж|арест|блок/.test(bailiffsText) ? 2 : 1;
                reasons.push(/спис|удерж/.test(bailiffsText) ? 'приставы списывают деньги' : 'есть приставы или ИП');
            }
            if (propertyText) {
                score += /ипотек|залог|квартир|дол/.test(propertyText) ? 2 : 1;
                reasons.push(/ипотек|залог/.test(propertyText) ? 'есть ипотека или залог' : 'есть имущество');
            }
            if (collectorsText) {
                score += /угрож|давлен|давят/.test(collectorsText) ? 2 : 1;
                reasons.push(/угрож|давлен|давят/.test(collectorsText) ? 'есть давление коллекторов' : 'звонят коллекторы');
            }
            if (/официаль/.test(incomeText) && /спис|удерж|арест|блок/.test(bailiffsText)) {
                score += 1;
                reasons.push('официальный доход и удержания');
            }
            if (out.debt_amount_value >= 500000 && out.missing_fields && out.missing_fields.length >= 3) {
                score += 1;
                reasons.push('при крупном долге ещё не хватает данных');
            }

            var riskLevel = score >= 3 ? 'high' : (score >= 1 ? 'medium' : 'low');
            return {
                risk_level: riskLevel,
                risk_reasons: reasons.slice(0, 4),
                consult_recommended: riskLevel === 'high'
            };
        }

        function recalc(input) {
            var out = input || state;
            var known = 0;
            if (out.debt_amount) known++;
            if (out.debt_types && out.debt_types.length) known++;
            if (out.bailiffs) known++;
            if (out.income) known++;
            if (out.property && out.property.length) known++;
            if (out.collectors) known++;
            if (out.overdue_stage) known++;
            out.known_count = known;

            var missing = [];
            if (!out.debt_amount) missing.push('сумма долга');
            if (!out.debt_types.length) missing.push('тип долгов');
            if (!out.bailiffs) missing.push('есть ли приставы');
            if (!out.income) missing.push('официальный доход');
            if (!out.property.length) missing.push('имущество или жильё');
            if (!out.collectors) missing.push('есть ли коллекторы');
            out.missing_fields = missing.slice(0, 3);

            if (out.debt_amount_value > 0 && out.debt_amount_value <= 500000 && out.bailiffs === 'closed') {
                out.route_hint = 'mfc_possible';
            } else if (out.debt_amount_value >= 500000 || out.bailiffs || (out.property && out.property.length)) {
                out.route_hint = 'court_or_check';
            } else {
                out.route_hint = 'needs_check';
            }
            var risk = evaluateRisk(out);
            out.risk_level = risk.risk_level;
            out.risk_reasons = risk.risk_reasons;
            out.consult_recommended = risk.consult_recommended;
            out.progress_total = 7;
            return out;
        }

        function updateFromMessage(messageText) {
            if (isDemoMode()) return getState();
            var text = String(messageText || '').toLowerCase();
            if (!text) return getState();
            var amount = extractAmount(text);
            if (amount > 0) {
                state.debt_amount_value = amount;
                state.debt_amount = formatRubAmount(amount);
            }
            if (/кредит|кредитк|карта|банковск/.test(text)) uniquePush(state.debt_types, 'кредиты/карты');
            if (/микрозайм|мфо|займ/.test(text)) uniquePush(state.debt_types, 'микрозаймы/МФО');
            if (/жкх|коммунал/.test(text)) uniquePush(state.debt_types, 'ЖКХ');
            if (/налог/.test(text)) uniquePush(state.debt_types, 'налоги');

            if (/пристав|фссп|исполнительн/.test(text)) state.bailiffs = 'есть ИП';
            if (/списыва|удержан/.test(text)) state.bailiffs = 'есть списания';
            if (/арест|блокиров/.test(text)) state.bailiffs = 'арест/блокировка';

            if (/официальн.*работ|работаю\s+официальн|официальн.*доход|белая\s+зарплат/.test(text)) state.income = 'официальный доход';
            else if (/без\s+доход|нет\s+доход|не\s+работ/.test(text)) state.income = 'дохода нет';
            else if (/неофициальн|сер[ао]я\s+зарплат/.test(text)) state.income = 'неофициальный доход';
            else if (/зарплат|доход/.test(text) && !state.income) state.income = 'доход нужно уточнить';

            if (/квартир/.test(text)) uniquePush(state.property, 'квартира');
            if (/единственн.*жиль|единственн.*квартир/.test(text)) uniquePush(state.property, 'единственное жильё');
            if (/ипотек|залог/.test(text)) uniquePush(state.property, 'ипотека/залог');
            if (/машин|авто|автомобил/.test(text)) uniquePush(state.property, 'авто');

            if (/коллектор/.test(text)) state.collectors = 'звонят коллекторы';
            if (/угрож|давят|давлен/.test(text) && /коллектор|звон/.test(text)) state.collectors = 'давление коллекторов';

            if (/просроч/.test(text)) state.overdue_stage = 'просрочка';
            if (/суд|иск|заседан/.test(text)) state.overdue_stage = 'суд';
            if (/пристав|исполнительн|арест|списыва|удержан/.test(text)) state.overdue_stage = 'приставы';

            state.updated_at = Date.now();
            state = recalc(state);
            saveState();
            return getState();
        }

        function getProfileAddon() {
            var out = getState();
            delete out.summary_shown;
            return out;
        }

        function buildLeadPacket(input) {
            var current = input || getState();
            return {
                debt_amount: String(current.debt_amount || ''),
                debt_types: Array.isArray(current.debt_types) ? current.debt_types.slice(0, 6) : [],
                bailiffs: String(current.bailiffs || ''),
                income: String(current.income || ''),
                property: Array.isArray(current.property) ? current.property.slice(0, 6) : [],
                collectors: String(current.collectors || ''),
                route_hint: String(current.route_hint || ''),
                risk_level: String(current.risk_level || 'low'),
                risk_reasons: Array.isArray(current.risk_reasons) ? current.risk_reasons.slice(0, 5) : [],
                missing_fields: Array.isArray(current.missing_fields) ? current.missing_fields.slice(0, 5) : [],
                known_count: Math.max(0, Number(current.known_count || 0) || 0)
            };
        }

        function getState() {
            return JSON.parse(JSON.stringify(recalc(state)));
        }

        function shouldShowSummary(userMessageCount) {
            if (isDemoMode()) return false;
            if (state.summary_shown) return false;
            var count = Number(userMessageCount || 0) || 0;
            return count >= 3 && count <= 4 && state.known_count >= 2;
        }

        function markSummaryShown() {
            state.summary_shown = true;
            state.updated_at = Date.now();
            saveState();
        }

        function missingActionFor(field) {
            var text = String(field || '').toLowerCase();
            if (/сумм/.test(text)) {
                return { label: 'Указать сумму', value: 'Хочу уточнить сумму долга' };
            }
            if (/тип|долг/.test(text)) {
                return { label: 'Кредиты/МФО', value: 'Долги по кредитам и микрозаймам' };
            }
            if (/пристав/.test(text)) {
                return { label: 'Есть приставы', value: 'Есть приставы' };
            }
            if (/доход|официаль/.test(text)) {
                return { label: 'Доход официальный', value: 'Работаю официально' };
            }
            if (/имуществ|жиль|квартир/.test(text)) {
                return { label: 'Есть квартира', value: 'Есть квартира' };
            }
            if (/коллектор/.test(text)) {
                return { label: 'Есть коллекторы', value: 'Есть коллекторы' };
            }
            return null;
        }

        function buildSummary() {
            var current = getState();
            var known = [];
            if (current.debt_amount) known.push('долг примерно ' + current.debt_amount);
            if (current.debt_types.length) known.push('тип долгов: ' + current.debt_types.slice(0, 2).join(', '));
            if (current.bailiffs) known.push('приставы: ' + current.bailiffs);
            if (current.income) known.push('доход: ' + current.income);
            if (current.property.length) known.push('имущество: ' + current.property.slice(0, 2).join(', '));
            if (current.collectors) known.push(current.collectors);
            var missing = current.missing_fields.slice(0, 2);
            var missingActions = [];
            missing.forEach(function (field) {
                var action = missingActionFor(field);
                if (action) missingActions.push(action);
            });
            var total = current.progress_total || 7;
            var progressKnown = Math.min(total, current.known_count || known.length);
            var next = missing.length
                ? 'Следующий безопасный шаг — уточнить ' + missing.join(' и ') + ', без финальных выводов по процедуре.'
                : 'Следующий безопасный шаг — сверить вводные с документами и выбрать маршрут без обещаний результата.';
            if (current.route_hint === 'mfc_possible') {
                next = 'Предварительно можно проверить внесудебный маршрут через МФЦ, но только после проверки условий и исполнительных производств.';
            } else if (current.route_hint === 'court_or_check') {
                next = 'Похоже, стоит аккуратно проверить судебный маршрут и риски по доходу, приставам и имуществу.';
            }
            if (current.consult_recommended && current.risk_reasons.length) {
                next = 'Из-за факторов риска лучше проверить документы с юристом, но без обещаний результата: ' + current.risk_reasons.slice(0, 2).join(', ') + '.';
            }
            return {
                known: known.slice(0, 5),
                missing: missing,
                missing_actions: missingActions.slice(0, 2),
                next_step: next,
                route_hint: current.route_hint,
                risk_level: current.risk_level,
                risk_reasons: current.risk_reasons.slice(0, 4),
                consult_recommended: current.consult_recommended,
                progress: {
                    known: progressKnown,
                    total: total,
                    label: 'Диагностика: ' + progressKnown + ' из ' + total + ' пунктов',
                    percent: Math.round((progressKnown / total) * 100)
                }
            };
        }

        function reportKnownFacts(current) {
            var known = [];
            if (current.debt_amount) known.push('Долг: примерно ' + current.debt_amount + ' по вашим словам.');
            if (current.debt_types.length) known.push('Тип долгов: ' + current.debt_types.slice(0, 3).join(', ') + '.');
            if (current.bailiffs) known.push('Приставы/ИП: ' + current.bailiffs + '.');
            if (current.income) known.push('Доход: ' + current.income + '.');
            if (current.property.length) known.push('Имущество: ' + current.property.slice(0, 3).join(', ') + '.');
            if (current.collectors) known.push('Коллекторы: ' + current.collectors + '.');
            return known.slice(0, 6);
        }

        function reportChecks(current) {
            var checks = [];
            if (current.risk_reasons.length) {
                checks.push('Факторы риска: ' + current.risk_reasons.slice(0, 3).join(', ') + '.');
            }
            if (current.missing_fields.length) {
                checks.push('Уточнить: ' + current.missing_fields.slice(0, 2).join(' и ') + '.');
            }
            if (current.property.length) {
                checks.push('Проверить документы по имуществу, залогу, долям и сделкам.');
            }
            if (current.bailiffs) {
                checks.push('Проверить исполнительные производства, основания и размер удержаний.');
            }
            if (!checks.length) {
                checks.push('Сверить сумму долга, типы обязательств, доход и имущество по документам.');
            }
            return checks.slice(0, 4);
        }

        function reportNextStep(current) {
            if (current.consult_recommended && current.risk_reasons.length) {
                return 'Следующий безопасный шаг — подготовить документы и проверить ситуацию с юристом: ' + current.risk_reasons.slice(0, 2).join(', ') + '.';
            }
            if (current.route_hint === 'mfc_possible') {
                return 'Следующий безопасный шаг — проверить, подходит ли внесудебный маршрут через МФЦ и закрыты ли исполнительные производства.';
            }
            if (current.route_hint === 'court_or_check') {
                return 'Следующий безопасный шаг — проверить судебный маршрут, доход, приставов и имущество без обещаний результата.';
            }
            if (current.missing_fields.length) {
                return 'Следующий безопасный шаг — уточнить ' + current.missing_fields.slice(0, 2).join(' и ') + ', затем выбрать маршрут.';
            }
            return 'Следующий безопасный шаг — сверить вводные с документами и выбрать маршрут без финальных выводов.';
        }

        function reportDocuments(current) {
            var docs = ['список кредиторов и примерные суммы', 'паспортные данные и СНИЛС/ИНН', 'сведения о доходе'];
            if (current.bailiffs) docs.push('данные по ФССП и постановлениям');
            if (current.property.length) docs.push('документы по имуществу и залогам');
            if (current.collectors) docs.push('звонки/сообщения коллекторов');
            return docs.slice(0, 5);
        }

        function buildClientReport() {
            var current = getState();
            var known = reportKnownFacts(current);
            var missing = current.missing_fields.slice(0, 2);
            var disclaimer = 'Предварительно, по вашим словам. Это не юридическое заключение и не гарантия списания долгов; всё нужно проверить документами.';
            var sufficient = current.known_count >= 2;
            if (!sufficient) {
                var needs = missing.length ? missing : ['сумма долга', 'доход'];
                var prompt = 'Чтобы сделать итог точнее, уточните: ' + needs.slice(0, 2).join(' и ') + '.';
                return {
                    sufficient: false,
                    title: 'Предварительный итог',
                    known: known,
                    missing: needs.slice(0, 2),
                    message: prompt,
                    sections: [
                        { title: 'Что уточнить перед итогом', items: [prompt] }
                    ],
                    disclaimer: disclaimer,
                    copy_text: 'Предварительный итог Маняши\n\n' + prompt + '\n\n' + disclaimer
                };
            }
            var sections = [
                { title: 'Что уже понятно', items: known.length ? known : ['Пока мало исходных данных.'] },
                { title: 'Что важно проверить', items: reportChecks(current) },
                { title: 'Следующий безопасный шаг', items: [reportNextStep(current)] },
                { title: 'Что подготовить', items: reportDocuments(current) }
            ];
            var lines = ['Предварительный итог Маняши'];
            sections.forEach(function (section) {
                lines.push('', section.title + ':');
                section.items.forEach(function (item) { lines.push('- ' + item); });
            });
            lines.push('', disclaimer);
            return {
                sufficient: true,
                title: 'Предварительный итог',
                known: known,
                missing: missing,
                sections: sections,
                disclaimer: disclaimer,
                copy_text: lines.join('\n')
            };
        }

        return {
            updateFromMessage: updateFromMessage,
            updateFromQuickReply: function (text) { return updateFromMessage(text); },
            getState: getState,
            getProfileAddon: getProfileAddon,
            getLeadPacket: function () { return buildLeadPacket(getState()); },
            evaluateRisk: function () { return evaluateRisk(getState()); },
            shouldShowSummary: shouldShowSummary,
            buildSummary: buildSummary,
            buildClientReport: buildClientReport,
            markSummaryShown: markSummaryShown
        };
    }

    global.ManyashaWidgetDiagnostics = {
        createDiagnostics: createDiagnostics
    };
})(window);
