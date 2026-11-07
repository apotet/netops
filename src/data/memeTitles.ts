export type MemeSetId = 'career' | 'diagnosis' | 'admin' | 'apocalypse';

export interface MemeTitle {
  title: string;
  comment: string;
}

export const MEME_SETS: Record<MemeSetId, { name: string; titles: MemeTitle[] }> = {
  career: {
    name: 'Карьерная лестница',
    titles: [
      { title: 'Повелитель патч-корда', comment: 'Пока уверенно соединяешь кабель с полом.' },
      { title: 'Младший укротитель пингов', comment: 'Если ping прошёл — интернет работает. Наверное.' },
      { title: 'VLAN-шаман', comment: 'Настраиваешь по инструкции. Иногда помогает бубен.' },
      { title: 'Повелитель broadcast-домена', comment: 'Уже знаешь, где петля. Иногда сам её создаёшь.' },
      { title: 'Сетевой некромант', comment: 'Поднимаешь мёртвые линки. Коллеги верят в магию.' },
      { title: 'Архимаг маршрутизации', comment: 'BGP не пугает. Пугает документация предшественника.' },
      { title: 'Тот, кому отвечает 8.8.8.8', comment: 'Сеть работает. Даже подозрительно.' },
    ],
  },
  diagnosis: {
    name: 'ИТ-диагноз',
    titles: [
      { title: 'Синдром одного пинга', comment: 'Один пакет прошёл — инцидент закрыт.' },
      { title: 'Острая VLAN-недостаточность', comment: 'Тегов много, понимания мало.' },
      { title: 'Хронический Layer 8', comment: 'Проблема между креслом и клавиатурой.' },
      { title: 'STP головного мозга', comment: 'При любой непонятной ситуации блокируешь порт.' },
      { title: 'Синдром Шрёдингера', comment: 'Линк одновременно UP и DOWN, пока не пришёл на объект.' },
      { title: 'Терминальная BGP-зависимость', comment: 'Без show ip bgp уже не засыпаешь.' },
      { title: 'Клинически здоров', comment: 'Даже traceroute не к чему придраться.' },
    ],
  },
  admin: {
    name: 'Админское звание',
    titles: [
      { title: 'Пингвин без sudo', comment: 'Права есть только на Enter.' },
      { title: 'Стажёр с root-доступом', comment: 'Можешь всё. Понимаешь пока не всё.' },
      { title: 'Жертва DHCP', comment: 'Адрес выдали. Кто и зачем — вопрос открытый.' },
      { title: 'Укротитель 404', comment: 'Находишь, куда делся сервис. Обычно.' },
      { title: 'Бог забытых VLAN', comment: 'Помнишь тег, который все остальные забыли.' },
      { title: 'Последний живой админ', comment: 'Все ушли. Ты ещё держишь сеть.' },
      { title: 'sudo make me a network engineer', comment: 'Команда выполнена. Сеть подтверждает.' },
    ],
  },
  apocalypse: {
    name: 'Сетевой апокалипсис',
    titles: [
      { title: 'Пациент ноль', comment: 'Заразил коммутатор неизвестной конфигурацией.' },
      { title: 'Ходячий broadcast', comment: 'Разносишь пакеты без понимания маршрута.' },
      { title: 'Зомби с патч-кордом', comment: 'Линк поднял, мозг ещё загружается.' },
      { title: 'Выживший после петли', comment: 'Один раз видел broadcast storm и больше не смеёшься.' },
      { title: 'Охотник за мёртвыми портами', comment: 'От тебя не скроется даже SFP с −30 dBm.' },
      { title: 'Последний инженер ЦОДа', comment: 'Все ушли, а ты всё ещё держишь сеть.' },
      { title: 'Root апокалипсиса', comment: 'Даже зомби спрашивают у тебя шлюз по умолчанию.' },
    ],
  },
};

export const MEME_SET_ORDER: MemeSetId[] = ['career', 'diagnosis', 'admin', 'apocalypse'];

/** 0–19, 20–39, 40–59, 60–74, 75–89, 90–99, 100 */
export function memeBand(percent: number): number {
  if (percent >= 100) return 6;
  if (percent >= 90) return 5;
  if (percent >= 75) return 4;
  if (percent >= 60) return 3;
  if (percent >= 40) return 2;
  if (percent >= 20) return 1;
  return 0;
}

const ROTATION_KEY = 'osi_meme_rotation_v1';
const ASSIGN_KEY = 'osi_meme_assign_v1';

function storage(): Storage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}
function readMap(key: string): Record<string, string> {
  try {
    const raw = storage()?.getItem(key);
    const value = raw ? JSON.parse(raw) : {};
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

/** Stable title for this attempt. New attempts rotate sets. Refresh does not change it. */
export function getOrAssignMemeTitle(attemptId: string, percent: number): MemeTitle & { set: MemeSetId; setName: string } {
  const band = memeBand(percent);
  const assigned = readMap(ASSIGN_KEY);
  let setId = assigned[attemptId] as MemeSetId | undefined;
  if (!setId || !MEME_SETS[setId]) {
    const rotation = readMap(ROTATION_KEY);
    const next = Number(rotation.next || 0) % MEME_SET_ORDER.length;
    setId = MEME_SET_ORDER[next];
    assigned[attemptId] = setId;
    rotation.next = String(next + 1);
    try {
      storage()?.setItem(ASSIGN_KEY, JSON.stringify(assigned));
      storage()?.setItem(ROTATION_KEY, JSON.stringify(rotation));
    } catch { /* Title still works for this render. */ }
  }
  const set = MEME_SETS[setId];
  return { ...set.titles[band], set: setId, setName: set.name };
}
