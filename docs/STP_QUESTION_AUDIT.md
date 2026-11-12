# Добавление stp-new-01 … stp-new-15

База сравнения: staging `apotet/my-gemini-mirror-site`,
`eaa38a30e733e8d675843222dbfef69c4c179262` (main). Production `apotet/netops`
не изменяется. Это проверка автора изменения, а не независимый аудит.

## Область изменения

15 текстовых вопросов `l1-l2`: 5 applied, 10 advanced. Значения сложности уже
поддерживаются типом Question и действующим загрузчиком. У каждого четыре
варианта, один ключ, короткое explanation и индивидуальные brief/trap/plain/pro.
Совместимое поле deep равно plain; переключатель существующих TheoryRazbory и
ExamReview получает pro через действующий адаптер professional.

У нового текста нет исторического sourceCommit. Адаптер больше не приписывает
ему коммит прежней пачки gap-pack; исторические разборы сохраняют свои значения.
Изменения UI, уроков, режимов экзамена, фильтров beginner/mixed, CLI, конфигурации
сборки и ссылок на стенды отсутствуют. В study-text.test.mjs добавлены новые ID
к проверяемому набору; старые утверждения о каталоге уроков не исправлялись.

## Источники и границы утверждений

Нормативный ориентир — IEEE 802.1Q, раздел о spanning tree protocols.
[IEEE Std 802.1Q-2022](https://standards.ieee.org/ieee/802.1Q/10323/)
не заявляется здесь как полностью прочитанный актуальный платный текст.
Для открытой проверки порядка векторов использован материал IEEE из рабочего
процесса стандартизации, а эксплуатационные реакции подтверждены официальными
документами Cisco. Старый рабочий материал IEEE не выдаётся за финальную редакцию.

1. [IEEE: Spanning Tree Protocols, публичный материал 2009 года](https://www.ieee802.org/1/files/public/docs2009/aq-seaman-merged-spanning-tree-protocols-0509.pdf)
   — 13.9–13.12: порядок priority vectors, receiving port как последний локальный
   tie-breaker, отдельные CIST/MSTI векторы; 13.16–13.17: безопасные переходы.
2. [Cisco: Configuring Spanning Tree Protocol, Catalyst 9400 IOS XE 17.12](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9400/software/release/17-12/configuration_guide/lyr2/b_1712_lyr2_9400_cg/configuring_spanning_tree_protocol.html)
   — Bridge ID, priority, 12-битный Extended System ID, VLAN ID, path cost.
3. [Cisco: Understand Rapid Spanning Tree Protocol (802.1w)](https://www.cisco.com/c/en/us/support/docs/lan-switching/spanning-tree-protocol/24062-146.html)
   — Alternate/Backup, rapid transitions, operational edge, sync и Proposal/Agreement.
4. [Cisco: Configuring MSTP, Catalyst 3560 15.0(1)SE](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst3560/software/release/15-0_1_se/configuration/guide/scg3560/swmstp.html)
   — region configuration, CIST Regional Root, независимые MSTI, external information,
   Master у root-порта CIST Regional Root и зависимость других внешних ролей от CIST.
5. [Cisco: Understand STP Loop Guard and UDLD Features](https://www.cisco.com/c/en/us/support/docs/lan-switching/spanning-tree-protocol-stp-8021d/218321-configure-stp-with-loop-guard-and-bpdu-s.html)
   — потеря BPDU, риск открытия non-designated порта, loop-inconsistent,
   автоматическое снятие ограничения после восстановления BPDU.
6. [Cisco: Enhance STP with Root Guard](https://www.cisco.com/c/en/us/support/docs/lan-switching/spanning-tree-protocol/10588-74.html)
   — superior BPDU, root-inconsistent, автоматическое восстановление.
7. [Cisco: Spanning Tree PortFast BPDU Guard Enhancement](https://www.cisco.com/c/en/us/support/docs/lan-switching/spanning-tree-protocol/10586-65.html)
   — BPDU Guard, отключение интерфейса и errdisable recovery.
8. [Cisco: UDLD, IOS XE 17.1.1](https://www.cisco.com/c/en/us/td/docs/routers/ncs4200/configuration/guide/lanswitch/17-1-1/b-lans-switch-xe-17-1-1-ncs4200/b-lans-switch-xe-17-1-1-ncs4200_chapter_010.html)
   — ранее подтверждённый bidirectional сосед, aggressive retries, error-disable;
   физическое обнаружение отказа и логическая двунаправленность различаются.

## Проверка ключей и отличий от существующих навыков

Номер ключа в таблице считается с 1; в JSON используется индекс с 0.
Существующий урок l2-stp и билеты l2-09, l12-x01, l12-x02, l12-d01, l12-d05
прочитаны. Проверен полный загруженный банк, включая questionsExtra и
questionsExtraDifficulty, а не только questions.json.

| ID | Ключ | Проверяемый вывод и существенные условия | Источники |
| --- | --- | --- | --- |
| stp-new-01 | 3 | Rapid PVST+, одна VLAN 100: B, 28672 + 100 = 28772; MAC сравнивается позже | 1, 2 |
| stp-new-02 | 2 | Равные Root ID и cost; Sender BID → Sender Port ID → Local Port ID дают P2. P1/P2 получают одну BPDU через shared LAN | 1 |
| stp-new-03 | 4 | После изменения local cost: P1 = 60, P2 = 40; прогноз нового пути, а не общая рекомендация проверить cost | 1, 2 |
| stp-new-04 | 1 | Обнаруженный физический down исключает старый Root Port; свежий Alternate и заданные условия rapid transition позволяют открыть резерв | 3 |
| stp-new-05 | 3 | Для S путь через N = 25 хуже 10, но на LAN N объявляет 5 против 10. Различаются выбор Root, Designated и случай Backup | 1, 3 |
| stp-new-06 | 2 | Non-edge Designated/Forwarding P3 ещё не in-sync: его блокируют; edge P2 уже in-sync | 3 |
| stp-new-07 | 4 | Сравнение двух портов: без Guard теряется operational edge, с явно включённым Guard — err-disabled | 3, 7 |
| stp-new-08 | 1 | Классический PVST+, защиты отключены: expiry BPDU может открыть прежде блокировавшийся порт; локальный up задан наблюдением | 5 |
| stp-new-09 | 3 | Подтверждённый UDLD-сосед потерян, aggressive retries исчерпаны: err-disabled; оба oper up явно наблюдались именно здесь | 8 |
| stp-new-10 | 2 | Конфигурации A/B: name одинаков, списки 10-19 и 10-14,15-19 эквивалентны, как и 20-29 / 20-24,25-29; mismatch revision 12/21 требует revision 12 на B | 4 |
| stp-new-11 | 4 | CIST Root R / CIST Regional Root A / MSTI 1 Regional Root B: единственный внешний выход A и отдельный BID MSTI 1 | 1, 4 |
| stp-new-12 | 1 | Треугольник A/B/S, cost 10: приоритеты дают root A для MSTI 1 и B для MSTI 2; из требований к Root Port S для VLAN 10/20/30 выводится перенос только VLAN 20 в MSTI 2 | 1, 4 |
| stp-new-13 | 2 | Единственный мост региона, внешние пути 10/20: P1 CIST Root и MSTI Master, P2 CIST Alternate; роль не следует просто из факта границы | 1, 4 |
| stp-new-14 | 3 | Superior BPDU на Root Guard: root-inconsistent VLAN и автоматическое восстановление после прекращения superior-информации | 6 |
| stp-new-15 | 4 | Потеря BPDU при Loop Guard: loop-inconsistent; возврат прежних BPDU снимает ограничение, но сохраняет Alternate/Discarding | 5 |

Смысловые пересечения проверены вручную. l2-09 проверяет связное дерево по снимкам
графа, l12-x01 — Alternate в симметричном треугольнике, l12-x02 — обработку кадров
на уже назначенном Alternate, l12-d01 — задержку конечного порта, l12-d05 — шторм
без защиты. Новые 02/03/05 требуют других сравнений векторов; 07 проверяет реакцию
на BPDU, а не устранение задержки PortFast. ts-pack1-08 спрашивает, что сопоставить
с проектом при нежелательном uplink; новый 03 требует рассчитать результат изменения.

Внутри пачки 08/15 намеренно различают незащищённое старение и защитное состояние
с восстановлением. 09 проверяет отдельную проверку двунаправленности UDLD.
10 — диагностику revision при семантически одинаковых списках VLAN, 12 — вывод
правки mapping из приоритетов, стоимости путей и требований для трёх VLAN.
11 — выбор корней, 13 — роли внешних портов по заданным BPDU.
Одинаковых проверяемых исходов в существующем банке не обнаружено; это экспертная
проверка содержания, а не доказательство семантической уникальности автоматом.

В 08 не утверждается неизбежное возникновение петли или состояние carrier второго
конца. В 09 oper up обоих концов — исходное наблюдение. Ни один билет не объявляет
любой односторонний оптический отказ обязательно оставляющим оба интерфейса up.

## Выполненные проверки

`node scripts/stp-questions.test.mjs`: PASS — все 15 ID через реальный загрузчик,
четыре разных варианта, один ключ, 5 applied/10 advanced, четыре абзаца plain,
три абзаца pro, индивидуальный resolver, 15 SSR-переключателей ExamReview,
выбранные записи TheoryRazbory, неизменные правила beginner/mixed.
Числовые ключи дополнительно проверены независимым сравнением priority vectors
и расчётами стоимости. Проверка протокольной корректности ключей выполнена также
вручную по таблице и источникам выше; наличие строки в тесте само по себе её не доказывает.

Снимки до изменений подтвердили неизменность всех 717 старых вопросов и их
результатов getQuestionDeepDive. Все 562 исходные JSON-записи сохранены; добавлено
ровно 15 (577 JSON-записей, 732 в совокупном банке). Исходник applied-разборов
побайтно совпал после исключения нового helper и 15 новых записей.

Полный прогон `scripts/*.test.mjs`: **24 PASS / 4 FAIL** (28 файлов).
До изменений: **23 PASS / те же 4 FAIL** (27 файлов).
Новые ID внесены в whitelist study-text, но существующий сбой каталога уроков
не исправлялся. Точные неизменившиеся причины:

| Тест | Результат и причина |
| --- | --- |
| answer-shuffle.test.mjs | FAIL: `Error: Dynamic require of "react" is not supported` в esbuild ESM bundle при загрузке react-dom; Node v24.22.1 |
| glossary.test.mjs | FAIL: `AssertionError: missing definition: FIN` |
| practice-links.test.mjs | FAIL: `l2-07: deliberate coverage only`, actual `undefined`, expected `cli-trunk` |
| study-text.test.mjs | FAIL: whitelist профессиональных уроков не содержит существующие cli-console-ssh-telnet, cli-ios-modes, cli-show-help-tab |

Остальные тесты прошли: base-exam, mixed-exam, quiz-logic, review, progress,
glossary-hover и все 17 cli-*.test.mjs, плюс новый stp-questions.

`npm run validate:questions`: PASS, 732 уникальных ID, 0 структурных ошибок;
beginner 244, applied 424, advanced 64. `npm run coverage:explanations`: PASS,
все новые ID имеют индивидуальный разбор. В старом банке остаются 214 applied
и 7 advanced без индивидуального разбора и 2 коротких engineering-текста;
это не новые пропуски этой пачки.

`npm run lint` (TypeScript): PASS. `npm run build`: PASS; стандартное предупреждение
Vite о чанках более 500 kB сохранено. Конфигурация сборки не менялась.

Браузерная проверка выполняется на временной локальной странице с настоящими
TheoryRazbory/ExamReview и CSS production build; тестовые UI-файлы не входят в PR.
**PASS: 60 сочетаний** — 15 ID × два компонента × desktop 1280 / 390 px.
В каждом открыты карточка и полный длинный текст (где он свёрнут), проверены
plain и pro после реального нажатия переключателя; на 390 px использовано touch.
Горизонтального переполнения и pageerror не обнаружено. Скриншоты новых 02 и 13
дополнительно просмотрены для оценки переноса текста на узком экране.
Публикация staging/production и слияние PR не выполняются.

## Доработка PR #97 после независимого аудита

База доработки — `88494e34d2cb63bba3a8628969285ddc199a3702`. Переписаны только
вопросы stp-new-10 и stp-new-12 (text/answers/correct/explanation) и их
brief/trap/plain/pro. Индексы ключей сохранены: соответственно `[1]` и `[0]`;
они повторно проверены по новым исходным данным, а не перенесены без проверки.

В 10 причина boundary не сообщается готовым выводом: нужно сопоставить name,
revision, два эквивалентных представления диапазонов и отличить региональные
параметры от bridge priority/port cost. В 12 не задан целевой MSTI для VLAN 20:
из приоритетов выводятся корни, из треугольника — прямые пути 10 против обходных
20, из требований всех трёх VLAN — единственная подходящая правка. Смена root
или стоимости всего MSTI 1 повредит пути VLAN 10; перенос VLAN 30 повредит её пути.

Тест stp-questions дополнен разбором конфигурационных параметров из условия,
сравнением множеств VLAN и независимым расчётом результата каждого из четырёх
вариантов правки mapping. Только вариант 0 выполняет все три требования.
Одинаковые навыки в других 730 вопросах не обнаружены при повторной проверке:
10 проверяет mismatch revision при эквивалентном mapping; 12 — исправление
распределения VLAN с учётом всех путей, а не просто выбор root из приоритетов.

Снимок реального загрузчика до доработки подтвердил: изменены ровно 2 вопроса
и 2 результата getQuestionDeepDive. **Остальные 13 STP и старые 717 вопросов
вместе с разборами неизменны.** Весь остальной текст applied-исходника побайтно
совпал после исключения двух изменённых записей. UI, уроки, CLI, конфигурация
сборки, логика экзамена и фильтры сложности не менялись.

Повторный прогон: **24 PASS / те же 4 FAIL** в 28 тестовых файлах, с причинами
из таблицы выше. validate:questions, coverage:explanations, lint и build — PASS;
банк остаётся 732 ID. Предупреждение о чанках >500 kB сохранено.

После доработки повторно проверены в Chromium **8/8 сочетаний**: два изменённых
ID × TheoryRazbory/ExamReview × 1280/390 px. Для каждого фактически переключены
«Смысл / По делу», на узком экране — коротким касанием; полный текст раскрыт.
Оба новых текста соответствуют resolver, горизонтального переполнения и pageerror нет.
Проверка локальная, на настоящих компонентах и существующем CSS, без публикации.
