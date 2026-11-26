import type { InDepthTermPatch } from './types';

/** Existing shared lesson tags made interactive; good definitions retained.
 * Generic words explicitly distinguish physical, transport and protocol-specific meanings. */
export const IN_DEPTH_SHARED_TERMS: Record<string, InDepthTermPatch> = {
  "порт": {
    "english": "Port",
    "russian": "Физический интерфейс или транспортная конечная точка",
    "abbreviation": false,
    "description": "Порт может означать физический интерфейс устройства или логическую транспортную конечную точку TCP/UDP — смысл определяется контекстом. Транспортный номер имеет 16 бит (0–65535); пространства TCP и UDP отдельны и не равны номерам гнёзд коммутатора.",
    "relatesTo": "Физические интерфейсы L1/L2 и транспортная демультиплексация L4 — разные значения одного слова."
  },
  "Modbus TCP": {
    "english": "Modbus over TCP",
    "russian": "Промышленный Modbus поверх TCP",
    "abbreviation": false
  },
  "RJ-45": {
    "english": "RJ-45 / Ethernet 8P8C connector",
    "russian": "Распространённое название Ethernet-соединителя 8P8C",
    "abbreviation": true
  },
  "pass-through": {
    "english": "Pass-through modular plug",
    "russian": "Сквозной модульный штекер",
    "abbreviation": false
  },
  "Cat6A": {
    "english": "Category 6A",
    "russian": "Категория 6A медной СКС",
    "abbreviation": true
  },
  "wiremap": {
    "english": "Wire map",
    "russian": "Карта электрических соединений кабеля",
    "abbreviation": false
  },
  "HTTP 301": {
    "english": "HTTP 301 Moved Permanently",
    "russian": "Постоянное перенаправление HTTP",
    "abbreviation": false
  },
  "HTTP 404": {
    "english": "HTTP 404 Not Found",
    "russian": "HTTP: ресурс не найден",
    "abbreviation": false
  },
  "redirect": {
    "english": "HTTP redirect",
    "russian": "Перенаправление HTTP-клиента",
    "abbreviation": false
  },
  "стриппер оптический": {
    "english": "Optical fibre stripper",
    "russian": "Инструмент снятия покрытия оптоволокна",
    "abbreviation": false
  },
  "скалыватель": {
    "english": "Precision fibre cleaver",
    "russian": "Прецизионный скалыватель волокна",
    "abbreviation": false
  },
  "сварочный аппарат": {
    "english": "Fusion splicer",
    "russian": "Аппарат для сварки оптических волокон",
    "abbreviation": false
  },
  "КДЗС": {
    "english": "Fibre splice protection sleeve assembly",
    "russian": "Комплект деталей защиты сварного соединения",
    "abbreviation": true
  },
  "сплайс-кассета": {
    "english": "Fibre splice tray",
    "russian": "Кассета организации оптических сварок",
    "abbreviation": false
  },
  "пигтейл": {
    "english": "Optical pigtail",
    "russian": "Волокно с коннектором на одном конце",
    "abbreviation": false
  },
  "LC": {
    "english": "Lucent Connector",
    "russian": "Компактный оптический разъём с защёлкой",
    "abbreviation": true
  },
  "OM3": {
    "english": "Optical Multimode 3",
    "russian": "Класс многомодового оптического волокна OM3",
    "abbreviation": true
  },
  "арамид": {
    "english": "Aramid strength member",
    "russian": "Арамидный силовой элемент кабеля",
    "abbreviation": false
  },
  "буферное покрытие": {
    "english": "Fibre buffer coating",
    "russian": "Защитный буфер оптоволокна",
    "abbreviation": false
  },
  "оптическая муфта": {
    "english": "Optical fibre splice closure",
    "russian": "Защитная муфта оптических соединений",
    "abbreviation": false
  },
  "оптический измеритель мощности": {
    "english": "Optical Power Meter",
    "russian": "Измеритель уровня оптической мощности",
    "abbreviation": false
  },
  "инспекция торца": {
    "english": "Optical connector endface inspection",
    "russian": "Осмотр поверхности оптического торца",
    "abbreviation": false
  },
  "100BASE-TX": {
    "english": "100BASE-TX Fast Ethernet",
    "russian": "Fast Ethernet по медной витой паре",
    "abbreviation": true
  },
  "100BASE-FX": {
    "english": "100BASE-FX Fast Ethernet",
    "russian": "Оптический Fast Ethernet",
    "abbreviation": true
  },
  "медиаконвертер": {
    "english": "Media converter",
    "russian": "Активный преобразователь среды передачи",
    "abbreviation": false
  },
  "витая пара": {
    "english": "Twisted pair",
    "russian": "Пара скрученных медных проводников",
    "abbreviation": false
  },
  "Cat5e": {
    "english": "Category 5e",
    "russian": "Категория 5e медной СКС",
    "abbreviation": true
  },
  "Cat6": {
    "english": "Category 6",
    "russian": "Категория 6 медной СКС",
    "abbreviation": true
  },
  "Category 7A": {
    "english": "Category 7A",
    "russian": "Категория 7A кабельного изделия",
    "abbreviation": false
  },
  "4P": {
    "english": "Four pairs",
    "russian": "Четыре пары проводников",
    "abbreviation": true
  },
  "SC": {
    "english": "Subscriber Connector",
    "russian": "Оптический соединитель с фиксацией push-pull",
    "abbreviation": true
  },
  "ST": {
    "english": "Straight Tip",
    "russian": "Оптический соединитель с байонетной фиксацией",
    "abbreviation": true
  },
  "FC": {
    "english": "Ferrule Connector",
    "russian": "Оптический соединитель с резьбовой фиксацией",
    "abbreviation": true
  },
  "GBIC": {
    "english": "Gigabit Interface Converter",
    "russian": "Сменный интерфейсный модуль форм-фактора GBIC",
    "abbreviation": true
  },
  "патч-корд": {
    "english": "Patch cord",
    "russian": "Готовый соединительный кабель с оконцеваниями",
    "abbreviation": false
  },
  "оптический кросс": {
    "english": "Optical Distribution Frame",
    "russian": "Пассивное оконцевание и коммутация волокон",
    "abbreviation": false
  },
  "Telnet": {
    "english": "Telnet remote terminal protocol",
    "russian": "Протокол удалённого терминала без шифрования",
    "abbreviation": false
  },
  "Wireshark": {
    "english": "Wireshark packet analyser",
    "russian": "Анализатор сетевого трафика",
    "abbreviation": false
  },
  "ICMPv4": {
    "english": "Internet Control Message Protocol version 4",
    "russian": "Служебные и диагностические сообщения IPv4",
    "abbreviation": true
  },
  "Time Exceeded": {
    "english": "ICMP Time Exceeded",
    "russian": "ICMP: истекло время жизни пакета",
    "abbreviation": false
  },
  "GRE": {
    "english": "Generic Routing Encapsulation",
    "russian": "Туннельное обрамление сетевого пакета",
    "abbreviation": true
  },
  "сеанс": {
    "english": "Application session",
    "russian": "Логический диалог приложения",
    "abbreviation": false
  },
  "кодировка": {
    "english": "Character encoding",
    "russian": "Правила представления символов байтами",
    "abbreviation": false
  },
  "сериализация": {
    "english": "Data serialisation",
    "russian": "Представление структуры данных последовательностью байтов",
    "abbreviation": false
  },
  "кримпер": {
    "english": "Modular plug crimping tool",
    "russian": "Обжимной инструмент для модульных штекеров",
    "abbreviation": false
  },
  "MX": {
    "english": "Mail Exchange DNS record",
    "russian": "DNS-запись маршрутизации почты",
    "abbreviation": true,
    "description": "Ресурсная запись DNS типа MX содержит preference и exchange — предпочтение и доменное имя почтового узла. Меньшее preference пробуют раньше; адрес A/AAAA выбранного имени получают отдельно. Наличие MX не доказывает успешную доставку SMTP.",
    "relatesTo": "Поиск почтового сервера для домена и отличие MX от адресных/обратных записей.",
    "lessonId": "l7-mail-mx"
  },
  "T568A": {
    "english": "T568A pair assignment",
    "russian": "Схема расположения пар T568A",
    "abbreviation": false,
    "description": "Схема распиновки четырёхпарного медного соединителя: зелёная пара занимает контакты 1/2, оранжевая — 3/6. От T568B отличается перестановкой этих двух пар; синие и коричневые позиции не меняются. Схему выбирают по проекту и маркировке конкретного компонента.",
    "relatesTo": "Распиновка 8P8C и проверка правильных пар, не сертификация категории.",
    "lessonId": "l1-copper-fault-poe"
  },
  "T568B": {
    "english": "T568B pair assignment",
    "russian": "Схема расположения пар T568B",
    "abbreviation": false,
    "description": "Схема распиновки четырёхпарного медного соединителя: оранжевая пара занимает контакты 1/2, зелёная — 3/6. От T568A отличается перестановкой этих пар. Для прямого соединения согласуют схемы на концах; одно совпадение цветов не заменяет wiremap и измерения канала.",
    "relatesTo": "Распиновка 8P8C, проектная схема и контроль оконцеваний.",
    "lessonId": "l1-copper-fault-poe"
  },
  "NEXT": {
    "english": "Near-End Crosstalk",
    "russian": "Переходное затухание на ближнем конце",
    "abbreviation": true,
    "description": "Показатель развязки между парами по перекрёстной наводке, измеряемый со стороны источника сигнала. Для сопоставимого частотного измерения больший NEXT в dB означает лучшую развязку; критерий PASS зависит от профиля канала и частоты. Простая прозвонка этот параметр не измеряет.",
    "relatesTo": "Частотная приёмка медной СКС и последствия расплетения/ошибки пар.",
    "lessonId": "l1-copper-fault-poe"
  },
  "развивка пары": {
    "english": "Pair untwist",
    "russian": "Расплетение витой пары при оконцевании",
    "abbreviation": false,
    "description": "Участок, где проводники пары выпрямлены и больше не сохраняют штатную скрутку. Избыточное расплетение около контактов ухудшает баланс и перекрёстные наводки; допустимую длину определяют требования соединителя и системы, а не удобство монтажа.",
    "relatesTo": "Механика оконцевания и высокочастотные свойства витой пары.",
    "lessonId": "l1-copper-fault-poe"
  },
  "IEEE 802.3af": {
    "english": "IEEE 802.3af PoE Type 1",
    "russian": "Питание PoE типа 1",
    "abbreviation": false,
    "description": "Стандартная технология PoE Type 1 с обнаружением совместимого PD и питанием по двум парам проводников. Максимум на PSE составляет 15,4 Вт, у PD после нормируемых потерь доступно до 12,95 Вт; это предел профиля, не измеренная текущая мощность.",
    "relatesTo": "Соответствие PSE/PD, класса и доступного бюджета питания.",
    "lessonId": "l1-poe-screen-reading"
  },
  "IEEE 802.3at": {
    "english": "IEEE 802.3at PoE Type 2",
    "russian": "Питание PoE+ типа 2",
    "abbreviation": false,
    "description": "PoE Type 2, обычно называемый PoE+, предусматривает до 30 Вт на PSE и до 25,5 Вт на PD после нормируемых потерь. Фактическое питание зависит от согласования и бюджета; надпись PoE+ не доказывает потребление этих ватт подключённым устройством.",
    "relatesTo": "PoE-классификация, бюджет источника и отличие номинала от нагрузки.",
    "lessonId": "l1-poe-screen-reading"
  },
  "IEEE 802.3bt": {
    "english": "IEEE 802.3bt PoE Types 3 and 4",
    "russian": "Четырёхпарное PoE типов 3 и 4",
    "abbreviation": false,
    "description": "Расширение PoE типами 3/4 и четырёхпарными режимами питания; максимальный профиль Type 4 допускает до 90 Вт на PSE. Доступная мощность PD меньше из-за потерь и зависит от согласованного класса и устройства. Не каждый порт с пометкой 802.3bt предоставляет максимальный профиль.",
    "relatesTo": "Класс и тип PoE, число парных наборов и бюджет мощности.",
    "lessonId": "l1-poe-screen-reading"
  },
  "Class": {
    "english": "Class: PoE power, QoS traffic or legacy IPv4",
    "russian": "Класс конкретного механизма: питание, трафик или адресация",
    "abbreviation": false,
    "description": "Class означает класс конкретного механизма: в PoE это категория мощности, в QoS — класс трафика, а в старой IPv4-адресации — класс адресов. В PoE Requested/Received Class не равны измеренному потреблению; нумерацию нельзя переносить между этими разными контекстами.",
    "relatesTo": "Точное чтение PoE-дисплея без смешения с QoS или classful IPv4.",
    "lessonId": "l1-poe-screen-reading"
  },
  "OFNR": {
    "english": "Optical Fiber Nonconductive Riser",
    "russian": "Непроводящий оптический кабель для riser-применения",
    "abbreviation": true,
    "description": "Обозначение непроводящего оптического кабеля с riser-пожарным исполнением в соответствующей нормативной системе, например NEC. Не задаёт модальность OM/OS или оптическую дальность; допустимость применения на объекте проверяют по местным нормам и документам изделия.",
    "relatesTo": "Маркировка пожарного исполнения оптического кабеля, не параметр трансивера.",
    "lessonId": "l1-fiber-identification"
  },
  "OFNP": {
    "english": "Optical Fiber Nonconductive Plenum",
    "russian": "Непроводящий оптический кабель для plenum-применения",
    "abbreviation": true,
    "description": "Обозначение непроводящего оптического кабеля с plenum-пожарным исполнением в соответствующей нормативной системе, например NEC. Не определяет скорость, длину волны или дальность линии; требуемый допуск и документы проверяют для конкретного места прокладки.",
    "relatesTo": "Пожарное применение кабеля и отличие от класса оптического волокна.",
    "lessonId": "l1-fiber-identification"
  },
  "QSFP": {
    "english": "Quad Small Form-factor Pluggable",
    "russian": "Семейство сменных модулей QSFP",
    "abbreviation": true,
    "description": "Семейство компактных сменных модулей с несколькими каналами передачи. Скорость, число волокон, PMD и распиновка зависят от конкретного варианта; название QSFP само по себе не означает одноволоконный BiDi, duplex LC или взаимозаменяемость любых модулей.",
    "relatesTo": "Механическая и оптическая совместимость трансиверов.",
    "lessonId": "l1-fiber-identification"
  },
  "1310 нм": {
    "english": "Nominal wavelength 1310 nm",
    "russian": "Номинальная оптическая длина волны 1310 нм",
    "abbreviation": false,
    "description": "Номинальная длина волны оптического излучения: 1310 нанометров, а не скорость и не дальность. Совместимость определяется диапазонами передатчика/приёмника, PMD и волокном конкретного интерфейса; одно число не гарантирует работу пары модулей.",
    "relatesTo": "Чтение длины волны на оптической маркировке и проверка совместимости.",
    "lessonId": "l1-fiber-identification"
  },
  "1550 нм": {
    "english": "Nominal wavelength 1550 nm",
    "russian": "Номинальная оптическая длина волны 1550 нм",
    "abbreviation": false,
    "description": "Номинальная длина волны оптического излучения: 1550 нанометров, не паспортный километраж линии. Проверяют спектральную совместимость TX/RX, уровни мощности и бюджет потерь; для BiDi важна комплементарность обоих направлений.",
    "relatesTo": "Оптический спектр, пара трансиверов и бюджет линии.",
    "lessonId": "l1-fiber-identification"
  },
  "combo port": {
    "english": "Combo physical interfaces of one logical port",
    "russian": "Альтернативные среды одного логического порта",
    "abbreviation": false,
    "description": "Логический порт с альтернативными физическими интерфейсами, например медным T и оптическим F с одним номером. Два гнезда не обещают две независимые одновременно работающие линии; приоритет и допустимые режимы задаёт модель устройства.",
    "relatesTo": "Чтение панели коммутатора и проверка port map производителя.",
    "lessonId": "l1-switch-panel-identification"
  },
  "SFP+": {
    "english": "Enhanced Small Form-factor Pluggable",
    "russian": "Сменный интерфейсный модуль SFP+",
    "abbreviation": true,
    "description": "Форм-фактор и электрический интерфейс семейства SFP+, распространённый для 10-гигабитных соединений. Тип среды, скорость и допустимость SFP/SFP+ в конкретном порту проверяют по матрице совместимости; похожий корпус не гарантирует поддержку модуля.",
    "relatesTo": "Форм-фактор трансивера и возможности порта, не универсальный оптический стандарт.",
    "lessonId": "l1-switch-panel-identification"
  },
  "LED": {
    "english": "Light-Emitting Diode",
    "russian": "Светодиодный индикатор",
    "abbreviation": true,
    "description": "Светодиод, используемый как индикатор состояния устройства или порта. Значение цвета и мигания определяет легенда конкретной модели: нельзя без документации вывести скорость, STP-состояние или исправность линии только из зелёного свечения.",
    "relatesTo": "Чтение индикаторов панели и подтверждение операционного состояния.",
    "lessonId": "l1-switch-panel-identification"
  },
  "duplex": {
    "english": "Duplex communication or paired optical assembly",
    "russian": "Двусторонний обмен или парная оптическая сборка",
    "abbreviation": false,
    "description": "Duplex относится к двум направлениям: full-duplex допускает одновременные передачу и приём, half-duplex — по очереди; в оптической маркировке duplex также может означать парную двухволоконную сборку. Эти значения различают по контексту, а не по цвету разъёма.",
    "relatesTo": "Режим Ethernet и физическая оптическая полярность — связанные, но разные признаки.",
    "lessonId": "l1-switch-panel-identification"
  },
  "baud": {
    "english": "Baud: symbols per second",
    "russian": "Бод: символьных интервалов в секунду",
    "abbreviation": false,
    "description": "Единица символьной скорости: один бод соответствует одному символу в секунду. Это не обязательно один бит и не число обязательных изменений уровня сигнала: соседние символы могут иметь одинаковое значение. Полезную битовую скорость считают с учётом кодирования.",
    "relatesTo": "Физический уровень: символьная и битовая скорости.",
    "lessonId": "l1-phy-symbol-rate"
  },
  "символ": {
    "english": "Signal symbol or encoded text character",
    "russian": "Символ сигнала или знак текста — по контексту",
    "abbreviation": false,
    "description": "В PHY символ — одно состояние сигнала на символьном интервале; в тексте символ означает знак, представляемый выбранной кодировкой. В M-уровневой передаче сырой информационный объём символа может составлять log2(M) бит; это не правило размера любого текстового знака.",
    "relatesTo": "Различение модуляционного символа L1 и символа текста/кодировки.",
    "lessonId": "l1-phy-symbol-rate"
  },
  "PAM4": {
    "english": "Four-level Pulse Amplitude Modulation",
    "russian": "Импульсно-амплитудная модуляция с четырьмя уровнями",
    "abbreviation": true,
    "description": "Модуляция с четырьмя различимыми уровнями амплитуды, кодирующими два сырых бита на символ при обычном двоичном отображении. Скорость полезных данных ниже сырой при наличии кодовых расходов/FEC; PAM4 само по себе не задаёт число линий или скорость интерфейса.",
    "relatesTo": "Соотношение бит/символ, бод и полезной скорости PHY.",
    "lessonId": "l1-phy-symbol-rate"
  },
  "бит/с": {
    "english": "Bits per second",
    "russian": "Количество бит в секунду",
    "abbreviation": false,
    "description": "Единица битовой скорости, отличная от байт/с и символов/с. При сравнении указывают, идёт ли речь о сырой передаче, скорости после кодирования или полезных данных приложения; одинаковое число без этих границ может означать разный объём полезной информации.",
    "relatesTo": "Единицы измерения передачи данных и границы учёта служебной избыточности.",
    "lessonId": "l1-phy-symbol-rate"
  },
  "символьная скорость": {
    "english": "Symbol rate",
    "russian": "Число символьных интервалов в секунду",
    "abbreviation": false,
    "description": "Количество передаваемых символов в секунду, измеряемое в бодах. Не обязано равняться битовой скорости: при M различимых состояниях обычное двоичное отображение даёт log2(M) сырых бит на символ до учёта кодирования.",
    "relatesTo": "Расчёт PHY: бод, M-уровневая модуляция и битовая скорость.",
    "lessonId": "l1-phy-symbol-rate"
  },
  "битовая скорость": {
    "english": "Bit rate",
    "russian": "Скорость двоичных данных",
    "abbreviation": false,
    "description": "Количество двоичных бит в секунду с явно указанной границей измерения. Сырая скорость многопозиционного сигнала связана с символьной скоростью и отображением битов на символ; кодирование, FEC и заголовки отличают её от полезной скорости приложения.",
    "relatesTo": "Соотношение бит/с, символ/с и полезного потока.",
    "lessonId": "l1-phy-symbol-rate"
  },
  "TIME-WAIT": {
    "english": "TCP TIME-WAIT state",
    "russian": "Состояние ожидания после завершения TCP",
    "abbreviation": false,
    "description": "Состояние TCP, обычно после активного закрытия, позволяющее повторно подтвердить FIN другой стороны и отделить старые дубликаты сегментов от нового соединения. Нормативное ожидание связано с 2×MSL; конкретные таймеры реализации не выводят из номера TCP-порта.",
    "relatesTo": "TCP FIN/ACK, старые дубликаты и корректное завершение соединения.",
    "lessonId": "l4-tcp-connection-closing"
  },
  "MSL": {
    "english": "Maximum Segment Lifetime",
    "russian": "Максимальное время жизни TCP-сегмента",
    "abbreviation": true,
    "description": "Предельное время, в течение которого старый TCP-сегмент предполагается сохраняющимся в сети. Связано с нормативным TIME-WAIT длительностью 2×MSL; это не текущий RTT и не число переходов IP TTL. Конкретное значение таймера зависит от реализации.",
    "relatesTo": "TCP TIME-WAIT и защита от старых сегментов.",
    "lessonId": "l4-tcp-connection-closing"
  },
  "PTR": {
    "english": "Pointer DNS record",
    "russian": "DNS-запись указателя для обратного разрешения",
    "abbreviation": true,
    "description": "Ресурсная запись DNS с доменным именем-указателем, обычно используемая для обратного поиска имени по IP через in-addr.arpa или ip6.arpa. PTR не заменяет MX для маршрутизации почты и сам по себе не доказывает подлинность узла.",
    "relatesTo": "Обратное разрешение IP→имя и отличие от прямых/почтовых записей.",
    "lessonId": "l7-mail-mx"
  },
  "preference": {
    "english": "Protocol-specific preference; MX preference field",
    "russian": "Предпочтение по правилам протокола; поле MX",
    "abbreviation": false,
    "description": "Preference — предпочтение по правилам конкретного протокола; в DNS MX это 16-битное число, у которого меньшее значение предпочтительнее. Правило MX нельзя переносить на BGP Local Preference, где обычный выбор предпочитает большее значение.",
    "relatesTo": "Порядок выбора почтового узла и недопустимость общего правила для всех протоколов.",
    "lessonId": "l7-mail-mx"
  },
  "exchange": {
    "english": "MX exchange field or OSPF Exchange state",
    "russian": "Имя почтового узла MX или стадия OSPF Exchange",
    "abbreviation": false,
    "description": "В DNS MX exchange — доменное имя почтового узла; в OSPF Exchange — стадия обмена описаниями базы LSDB, а не адрес сервера. Имя exchange из MX отдельно разрешают в A/AAAA; оно не содержит готовый IP и не является статусом TCP.",
    "relatesTo": "Контекст DNS MX и отличное от него состояние обмена базы OSPF.",
    "lessonId": "l7-mail-mx"
  },
  "next-hop": {
    "description": "Следующий узел, которому передаётся пакет по выбранному маршруту. Для удалённого сервера это обычно ближайший маршрутизатор, а не сам конечный сервер.",
    "relatesTo": "Маршрутизация и локальная доставка.",
    "lessonId": "l3-arp",
    "english": "Next Hop",
    "russian": "Следующий узел",
    "abbreviation": false
  }
};
