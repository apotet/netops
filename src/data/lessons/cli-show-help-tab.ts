import type { Lesson } from './types';

/** CLI curriculum #3: help and diagnostics, aligned with actual lab capabilities. */
export const LESSON_CLI_SHOW_HELP_TAB: Lesson = {
  id: 'cli-show-help-tab',
  title: 'Cisco IOS: show, TAB и ? — диагностика без угадайки',
  category: 'CLI · Управление оборудованием',
  osiLayers: ['CLI'],
  difficulty: 'beginner',
  summary: 'Как находить команды через ?, пользоваться TAB, читать show и разбираться с неоднозначными сокращениями.',
  terms: ['Cisco IOS', 'CLI', 'show', 'TAB', 'context-sensitive help', 'running-config', 'trunk', 'VLAN', 'do'],
  blocks: [
    {
      heading: 'Не помнишь команду? Спроси у консоли',
      body: 'На Cisco IOS не обязательно запоминать весь справочник. Введи ? в текущем режиме, чтобы увидеть доступные команды. После ключевого слова введи пробел и ?: show ? покажет следующие возможные слова.\n\nБез пробела смысл другой. Например, sh? ищет продолжения текущего слова, а show ? — дочерние команды. NetOps сохраняет это различие в пределах своего учебного поднабора.\n\nПодсказки зависят от режима и прав. Switch> и Switch# показывают не одно и то же, а внутри настройки интерфейса обычный show может требовать префикс do.'
    },
    {
      heading: 'TAB дополняет, но не выбирает за тебя',
      body: 'Начни писать команду и нажми TAB. Если подходящее слово одно, терминал дополнит его: conf → configure, а затем t → terminal. Так проще пользоваться длинными командами, не ошибаясь в написании.\n\nЕсли вариантов несколько, IOS не должен угадывать. В нашем стенде после switchport trunk allowed vlan a возможны add и all: нужно уточнить ввод.\n\nTAB не запускает команду и не должен сам придумывать IP-адрес, VLAN или интерфейс. Сейчас NetOps дополняет ключевые слова, но не все типы аргументов.'
    },
    {
      heading: 'Диагностика через show: три простых вопроса',
      body: 'Сначала спроси себя: «Что настроено?», «Какое сейчас состояние?» или «Что реально разрешено?». Для настроек подходит show running-config. Для интерфейсов — show interfaces и show ip interface brief. Для VLAN — show vlan brief, для trunk — show interfaces trunk.\n\nПроверяй и конфигурацию, и реальное состояние. no shutdown означает лишь отсутствие административной блокировки: без активного соединения интерфейс может оставаться down/down.\n\nКогда выводы расходятся с ожиданиями, ищи причину на обоих концах линка. Настроенный trunk ещё не гарантирует прохождение кадров.'
    },
    {
      heading: 'Сокращения и ошибки — это тоже информация',
      body: 'sh run и show running-config в нашем стенде означают одно и то же. Но сокращение работает, только если его можно однозначно разрешить. Если две команды начинаются одинаково, нужно написать больше символов.\n\nТипичные сообщения IOS: % Incomplete command — не хватает обязательных параметров; % Ambiguous command — несколько допустимых продолжений; % Invalid input — ввод не соответствует синтаксису или текущему контексту. Сначала уточни подсказку через ?, а потом повторяй команду.\n\nНаш движок ещё совершенствует проверку аргументов и позицию символа ^ в ошибках. Не воспринимай текущий вывод NetOps как полный эталон любого Cisco IOS.'
    },
    {
      heading: 'Практика: как найти проблему на порту',
      body: 'Открой CLI-стенд диагностики. Выполни enable, затем show vlan brief и show interfaces. Войди через configure terminal, выбери interface FastEthernet0/1 и посмотри, что изменилось в приглашении. Попробуй do show interfaces FastEthernet0/1, не выходя из настройки.\n\nПроверь TAB на conf и контекстную подсказку на show ?. Заметь, что команда просмотра не изменяет конфигурацию, а команда настройки изменяет её.\n\nЕсли подсказка не предлагает ожидаемую команду, проверь режим и возможности самого симулятора. Это упражнение закрепляет диагностику, а не эмулирует все возможности IOS.',
      practiceLink: 'cli-diagnostic'
    }
  ],
  commands: [
    { title: 'Список команд в текущем режиме', cmd: '?', note: 'Контекстная справка, не изменяющая конфигурацию.' },
    { title: 'Подкоманды show', cmd: 'show ?', note: 'Пробел перед ? запрашивает следующий элемент синтаксиса.' },
    { title: 'Краткое состояние интерфейсов', cmd: 'show ip interface brief', note: 'Показывает адрес и состояние; наличие admin up не гарантирует линк.' },
    { title: 'Подробности интерфейса', cmd: 'show interfaces FastEthernet0/1', note: 'Имя интерфейса должно существовать в выбранном сценарии.' },
    { title: 'Активная конфигурация', cmd: 'show running-config', note: 'В текущем NetOps требует Privileged EXEC.' },
    { title: 'Диагностика в конфигурационном режиме', cmd: 'do show interfaces FastEthernet0/1', note: 'Выполняется без выхода из config-if.' }
  ],
  relatedQuestionIds: [],
  sources: [
    'Cisco IOS Configuration Fundamentals Configuration Guide — Using the Cisco IOS Command-Line Interface',
    'Cisco IOS Fundamentals Command Reference — show, configure terminal and contextual help',
    'NetOps CLI Lab — фактически реализованный поднабор команд и справки'
  ],
  professional: {
    summary: 'Контекстное разрешение ключевых слов, уникальные сокращения, справка ? и TAB, диагностика show, привилегии и ограничения учебного парсера.',
    terms: ['command parser', 'context-sensitive help', 'privilege level', 'User EXEC', 'Privileged EXEC', 'configuration mode', 'operational state', 'running-config', 'VTY'],
    blocks: [
      {
        heading: 'Контекстная грамматика IOS',
        body: 'Командный интерпретатор IOS разрешает доступные команды в текущем CLI mode с учётом полномочий пользователя, платформы и feature set. Символ ? без предшествующего пробела показывает возможные продолжения текущего keyword; после пробела — ожидаемые элементы следующей позиции синтаксиса.\n\nВ NetOps help строится из зарегистрированных исполняемых CommandSpec и не рекламирует несуществующие ветки. Отдельные динамические аргументы имеют специальную обработку: это ограничение симулятора, а не универсальный формат команды Cisco IOS.'
      },
      {
        heading: 'Однозначные префиксы, TAB и разбор Enter',
        body: 'IOS допускает сокращение ключевого слова до уникального префикса в текущем контексте; при неоднозначности команда должна быть уточнена. Слово, введённое полностью, имеет приоритет перед более длинными словами с тем же префиксом.\n\nTAB завершает однозначное ключевое слово, но не обязан подставлять произвольные параметры. В NetOps начиная с PR #79 сокращения конфигурации, show running-config и write memory проходят через канонические команды, а TAB, ? и Enter используют общую логику разрешения. Остаются ограничения: позиция курсора, динамические аргументы и полноценная проверка хвостовых параметров.'
      },
      {
        heading: 'Оперативное состояние против configured state',
        body: 'show running-config демонстрирует текущую конфигурацию, show ip interface brief — IP и состояние интерфейсов, show interfaces — подробную информацию, а show interfaces trunk — сведения о настроенных trunk. Одни и те же admin/oper состояния должны интерпретироваться согласованно.\n\nВ текущем CLI Lab effective operUp вычисляется из административного состояния локального порта, существования активного NetworkLink и административного состояния peer. Это учебная модель: она не симулирует PHY negotiation, STP forwarding, DTP, MAC learning или ICMP. Отсутствие линка даёт down/down, даже когда интерфейс administratively up.'
      },
      {
        heading: 'Режим, привилегии и do',
        body: 'Команды диагностики могут быть доступны в User EXEC либо требовать Privileged EXEC. Для просмотра running-config нужны соответствующие права. Команда do вызывает поддерживаемую EXEC-команду из configuration mode, не изменяя сам режим конфигурации.\n\nВыводы IOS зависят от модели и версии. NetOps реализует ограниченный Cisco IOS subset; show version, pipe-фильтры вида | include и некоторые платформенные формы пока отсутствуют. Нельзя считать, что команда поддерживается симулятором только потому, что она существует в документации Cisco.'
      },
      {
        heading: 'Алгоритм диагностики, который масштабируется',
        body: '1. Зафиксируйте текущий CLI mode и полномочия. 2. Уточните синтаксис через ?. 3. Сначала соберите read-only диагностику show, не меняя конфигурацию. 4. Разделите административный shutdown, operational carrier, VLAN/trunk-ограничения и маршрутизацию. 5. Только после проверки гипотезы меняйте настройки и перепроверяйте результат.\n\nДля закрепления доступен отдельный сценарий CLI-диагностики. Он проверяет конфигурационную модель L2, а не доставку реальных пакетов.',
        practiceLink: 'cli-diagnostic'
      }
    ],
    commands: [
      { title: 'Справка по подкомандам', cmd: 'show ?', note: 'Доступность ветвей зависит от CLI mode и privilege level.' },
      { title: 'IP и статус интерфейсов', cmd: 'show ip interface brief', note: 'Сверить с show interfaces и топологией.' },
      { title: 'Trunk и его статус', cmd: 'show interfaces trunk', note: 'Lab отображает и настроенные неактивные trunk с явным down.' },
      { title: 'Show из режима конфигурации', cmd: 'do show interfaces FastEthernet0/1', note: 'Не изменяет конфигурационный контекст.' }
    ],
    sources: [
      'Cisco IOS Configuration Fundamentals Configuration Guide — Using the Cisco IOS Command-Line Interface',
      'Cisco IOS Fundamentals Command Reference — EXEC Commands',
      'NetOps CLI 3.0 — CommandResolution, ContextualHelp, OperationalState'
    ],
    sourceCommit: 'a1717787e00706af5114d5e857526aff0966c2a8'
  }
};
