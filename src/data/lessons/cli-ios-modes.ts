import type { Lesson } from './types';

/**
 * CLI 3.0: first reference lesson.
 * Kept separate from OSI protocol layers: CLI is an equipment management skill.
 * "Смысл" is the default lesson, "По делу" is the professional counterpart.
 */
export const LESSON_CLI_IOS_MODES: Lesson = {
  id: 'cli-ios-modes',
  title: 'Режимы Cisco IOS: как не заблудиться в консоли',
  category: 'CLI · Управление оборудованием',
  osiLayers: ['CLI'],
  difficulty: 'beginner',
  summary: 'Почему приглашение меняется с > на # и (config)#, где смотреть состояние, а где менять настройки. Как выйти обратно, не потеряв конфигурацию.',
  terms: ['CLI', 'Cisco IOS', 'User EXEC', 'Privileged EXEC', 'Global Configuration', 'Interface Configuration', 'enable', 'exit', 'end', 'do'],
  blocks: [
    {
      heading: 'Консоль — это несколько комнат, а не одна строка',
      body: 'Представь техническое здание. В коридоре можно посмотреть информацию, но нельзя менять всё подряд. Чтобы попасть в щитовую, сначала получаешь доступ, затем открываешь нужный шкаф. В Cisco IOS примерно так устроены режимы командной строки.\n\nПо значку справа в приглашении видно, где ты находишься. «>» — обычный режим, «#» — расширенные возможности, «(config)#» — настройка всего устройства, а «(config-if)#» — настройка выбранного интерфейса.\n\nОдна и та же команда может работать только в определённой комнате. Если IOS не принимает команду, сначала посмотри на приглашение, а не долби Enter до посинения.'
    },
    {
      heading: 'Как войти в настройки',
      body: 'После подключения обычно видишь Switch>. Команда enable переводит в Switch# (при настроенной защите может потребоваться пароль). Чтобы начать менять настройки, вводишь configure terminal или короткое conf t. Появится Switch(config)#.\n\nТеперь можно выбрать порт: interface FastEthernet0/1. Приглашение станет Switch(config-if)#. Команды внутри этого режима относятся именно к выбранному интерфейсу.\n\nНаличие символа # ещё не означает, что ты сохранял конфигурацию: это всего лишь обозначение режима.'
    },
    {
      heading: 'Как вернуться и не потеряться',
      body: 'exit обычно возвращает на один уровень назад: из настройки порта — к общим настройкам, затем — в привилегированный режим. end из режима конфигурации сразу возвращает к Switch#. На Cisco IOS обычно для этого подходит и Ctrl+Z.\n\nКоманда disable из привилегированного режима возвращает к Switch>. Не путай её с exit: выход из сессии и понижение уровня доступа — разные действия.\n\nЕсли заблудился, посмотри на приглашение и используй exit или end, а не перезагружай коммутатор.'
    },
    {
      heading: 'Посмотреть состояние, не выходя из настройки',
      body: 'В режиме настройки порта хочется узнать его состояние. Но диагностическая команда show обычно относится к режимам просмотра. Для этого существует do: например, do show interfaces FastEthernet0/1. Она выполнит команду просмотра, не закрывая настройку порта.\n\nСокращения вроде sh и int допустимы, когда IOS однозначно понимает их. Набери ? для подсказки, а TAB — для дополнения известного начала команды. Помни: доступные команды зависят от конкретного устройства и версии IOS.'
    },
    {
      heading: 'Самая частая ловушка: настроить — не значит сохранить',
      body: 'Команды в режиме настройки обычно меняют текущую конфигурацию (running-config). Она начинает действовать без отдельной команды «применить». Но после перезагрузки несохранённые изменения могут исчезнуть.\n\nВернись в Switch# и выполни copy running-config startup-config, если нужно сохранить изменения. Для проверки воспользуйся show running-config и show startup-config. Не путай выход из режима с сохранением.\n\nВ учебном стенде NetOps попробуй сначала enter/enable, затем conf t, interface, exit, end и do show. Теперь для режимов есть отдельная лаборатория: пройди шаги, измени hostname и сохрани конфигурацию.',
      practiceLink: 'cli-modes'
    }
  ],
  commands: [
    { title: 'Перейти к привилегированному режиму', cmd: 'enable', note: 'Из Switch> в Switch#; при соответствующей конфигурации будет запрос пароля.' },
    { title: 'Перейти к общей конфигурации', cmd: 'configure terminal', note: 'Сокращение conf t допустимо при однозначном разрешении.' },
    { title: 'Выбрать интерфейс', cmd: 'interface FastEthernet0/1', note: 'Нужно находиться в глобальном режиме конфигурации; порт должен существовать на выбранном устройстве.' },
    { title: 'Вернуться на уровень выше', cmd: 'exit', note: 'В режиме config-if возвращает к config; в других режимах поведение зависит от контекста.' },
    { title: 'Вернуться в привилегированный EXEC', cmd: 'end', note: 'Работает из режимов конфигурации.' },
    { title: 'Проверить интерфейс из конфигурации', cmd: 'do show interfaces FastEthernet0/1', note: 'Не меняет режим конфигурации.' },
    { title: 'Сохранить конфигурацию', cmd: 'copy running-config startup-config', note: 'Из привилегированного EXEC; выход через end сам по себе не сохраняет изменения.' }
  ],
  relatedQuestionIds: [],
  sources: [
    'Cisco IOS Configuration Fundamentals Configuration Guide — Using the Cisco IOS Command-Line Interface (учитывайте версию IOS и платформу)',
    'Cisco IOS Fundamentals Command Reference — enable, configure terminal, exit, end, do',
    'NetOps Cisco IOS CLI Lab — реализованный учебный поднабор команд, не полная эмуляция IOS'
  ],
  professional: {
    summary: 'User EXEC, Privileged EXEC и конфигурационные submodes: привилегии, область допустимых команд, переходы, EXEC-команды через do и различие running/startup configuration.',
    terms: ['User EXEC', 'Privileged EXEC', 'Global Configuration', 'Interface Configuration', 'CLI', 'Cisco IOS', 'privilege level', 'command parser', 'running-config', 'startup-config'],
    blocks: [
      {
        heading: 'Command modes и контекст разбора',
        body: 'Cisco IOS CLI — модальная командная среда: доступный набор команд определяется текущим command mode, уровнем привилегий, платформой, feature set и конфигурацией авторизации. User EXEC обычно обозначается знаком > и предоставляет ограниченную диагностику. Privileged EXEC (#) открывает команды администрирования, включая configure terminal и просмотр текущей конфигурации, при наличии достаточных прав.\n\nРежимы конфигурации вложены: global configuration — (config)#, interface configuration — (config-if)#. Существуют также config-line, config-router и другие submodes, но их наличие определяется поддержкой конкретного IOS и сценария.'
      },
      {
        heading: 'Переходы и уровни доступа',
        body: 'enable переводит из User EXEC в Privileged EXEC после требуемой аутентификации; команда не обязана автоматически давать privilege 15 на любой платформе с произвольной AAA-конфигурацией. configure terminal из Privileged EXEC открывает global configuration. interface <name> выбирает физический или логический интерфейс, поддерживаемый конкретной платформой.\n\nexit поднимает на родительский уровень конфигурации, end возвращает из конфигурации в Privileged EXEC, а Ctrl+Z в типовом IOS является эквивалентом end. disable переводит из Privileged EXEC в User EXEC; logout/exit на верхнем уровне может завершить удалённую сессию. В CLI Lab реализован ограниченный учебный набор этих переходов.'
      },
      {
        heading: 'EXEC-команды в configuration mode',
        body: 'Команда do позволяет вызвать поддерживаемую EXEC-команду из configuration mode без выхода из текущего контекста. Пример: находясь в (config-if)#, выполнить do show interfaces FastEthernet0/1. Это полезно для read-only диагностики при изменении интерфейса.\n\nКонтекстная справка ? и TAB должны учитывать текущий mode, привилегии и грамматику команды. Аббревиатуры допустимы только при однозначном разрешении: conf t — форма configure terminal, но неоднозначный префикс не должен автоматически выбирать ветку. Не переносите правила одного профиля IOS на все модели оборудования.'
      },
      {
        heading: 'Configuration state и persistence',
        body: 'Конфигурационные команды изменяют running-config. Обычный переход exit/end не копирует её в startup-config. Для записи используют copy running-config startup-config (или поддерживаемый синоним write memory). При reload сохраняется только записанная конфигурация, если иное не предусмотрено платформой и механизмами хранения.\n\nОперационное состояние интерфейсов (например, наличие линка) не является конфигурацией и определяется отдельно. Интерфейс может быть administratively up, но operationally down. Команда no shutdown снимает административное отключение, а не гарантирует установление carrier.'
      },
      {
        heading: 'Проверка понимания на оборудовании',
        body: 'Проверяйте mode переходами enable → configure terminal → interface → exit/end; сравнивайте prompt до и после. В config-if выполните do show interfaces, затем вернитесь к Privileged EXEC и отдельно проверьте сохранение конфигурации.\n\nВ CLI-практике NetOps доступен отдельный сценарий для переходов между режимами, смены hostname и сохранения running-config. Он не претендует на полную реализацию Cisco IOS.',
        practiceLink: 'cli-modes'
      }
    ],
    commands: [
      { title: 'Режимы и просмотр конфигурации', cmd: 'enable', note: 'Доступ к Privileged EXEC зависит от авторизации.' },
      { title: 'Конфигурация через терминал', cmd: 'configure terminal', note: 'Из Privileged EXEC.' },
      { title: 'Диагностика из config-if', cmd: 'do show interfaces FastEthernet0/1', note: 'Команда EXEC, выполненная в контексте configuration mode.' },
      { title: 'Сохранение running-config', cmd: 'copy running-config startup-config', note: 'Не выполняется автоматически при end или exit.' }
    ],
    sources: [
      'Cisco IOS Configuration Fundamentals Configuration Guide — Using the Cisco IOS Command-Line Interface',
      'Cisco IOS Fundamentals Command Reference — Using the Command-Line Interface',
      'Cisco IOS Configuration Fundamentals — Configuration Files and Saving Changes'
    ],
    sourceCommit: 'a1717787e00706af5114d5e857526aff0966c2a8'
  }
};
