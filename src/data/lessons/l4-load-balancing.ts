import type { Lesson } from './types';

export const LESSON_L4_LOAD_BALANCING: Lesson = {
  "id": "l4-lb",
  "title": "Load Balancing: проверки, распределение и сессии",
  "category": "L4–L7 · Балансировка",
  "osiLayers": [
    "L4",
    "L7"
  ],
  "difficulty": "applied",
  "summary": "Как выбирать сервер для нового подключения, исключать неисправный узел и сохранять авторизацию пользователя при переключении между серверами.",
  "terms": [
    "Load Balancing",
    "Health Check",
    "backend",
    "Least Connections",
    "Round Robin",
    "Persistence",
    "sticky session",
    "session store"
  ],
  "blocks": [
    {
      "heading": "Проверка сервера и новые подключения",
      "body": "Сервер может принимать TCP-соединение, но отвечать ошибкой приложения. Поэтому важно знать, что именно проверяется и после скольких ошибок узел исключается из выбора. Например, три подряд HTTP 503 могут сделать сервер недоступным для новых соединений, пока остальные продолжают работу.\n\nHealth Check не определяет автоматически судьбу уже открытых соединений. Их можно завершать или обрывать по отдельной политике. Также нельзя безоговорочно повторять любой пользовательский запрос: повтор операции может дать нежелательный результат."
    },
    {
      "heading": "Очередь или число активных соединений",
      "body": "Round Robin последовательно чередует допустимые серверы. Это простой выбор для одинаковых серверов и примерно одинаковой работы. Но долго живущие подключения могут накопиться на одном узле, хотя новые выдавались по очереди.\n\nLeast Connections смотрит на текущее число соединений. Если на одинаковых серверах A и B их 80 и 2, при отсутствии привязки новый клиент пойдёт на B. Это оценка конкурентных подключений, а не точное измерение вычислительной нагрузки каждого сервера."
    },
    {
      "heading": "Привязка к серверу и сохранность сессии",
      "body": "Persistence, или sticky session, направляет связанные обращения к одному backend. Это помогает приложению, которое хранит авторизацию локально: пока пользователь возвращается на тот же сервер, его состояние доступно.\n\nОднако привязка не копирует данные. После отказа A переключение на B может потерять авторизацию, а долгие привязки способны перегрузить отдельный сервер. Для сохранения сессии при переключении нужно общее хранилище или подходящая репликация состояния. Более долгий срок cookie и другой алгоритм выбора сервера этого не заменяют."
    }
  ],
  "relatedQuestionIds": [
    "l4-lb-01",
    "l4-lb-02",
    "l4-lb-03"
  ],
  "sources": [
    "HAProxy Configuration Manual — balance, health checks, persistence: https://docs.haproxy.org/3.0/configuration.html",
    "NGINX — HTTP Load Balancing: https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/"
  ],
  "professional": {
    "summary": "Прикладная диагностика балансировщика: eligibility по health status, выбор Round Robin/Least Connections и различие session affinity, draining и сохранности session state.",
    "terms": [
      "Load Balancing",
      "Health Check",
      "backend",
      "Least Connections",
      "Round Robin",
      "Persistence",
      "sticky session",
      "session store"
    ],
    "blocks": [
      {
        "heading": "Health state, eligibility и текущие соединения",
        "body": "Application-level HTTP probe может считать 503 ошибкой даже при исправном TCP. При failure threshold=3 backend исключается из eligibility для новых соединений после фиксации третьей последовательной ошибки, если политика так задана и fail-open не действует. Interval=5 s не гарантирует ровно 15 секунд от начала неисправности: влияют фаза первой проверки, timeout и планирование.\n\nConnection draining, принудительное закрытие текущих соединений, retry запросов и recovery threshold настраиваются отдельно. Неидемпотентный запрос нельзя считать безусловно безопасным для автоматического повтора. Health status — вход в политику балансировщика, а не универсальная команда переноса всей работы."
      },
      {
        "heading": "Round Robin и Least Connections",
        "body": "Обычный Round Robin выбирает следующий eligible backend в очереди, не корректируя её по active connections. Least Connections при equal-capacity и equal-weight серверах выбирает минимальный текущий счётчик; для A=80 и B=2 это B, если persistence или другая политика не переопределяет выбор.\n\nПри сильно разной длительности соединений Least Connections обычно лучше распределяет конкурентные подключения. При однородной работе Round Robin часто достаточен. Число соединений не равно CPU, длине очереди или числу запросов: keepalive, HTTP/2 multiplexing и неодинаковая стоимость работы могут требовать других сигналов. Weighted-варианты алгоритмов нужно учитывать отдельно."
      },
      {
        "heading": "Session affinity не реплицирует состояние",
        "body": "Persistence закрепляет клиента за backend по cookie, source IP или другому ключу. Это может изменить обычный выбор балансировщика и ухудшить равномерность нагрузки. Такая привязка не переносит память приложения и не гарантирует доступность локального session state после отказа выбранного узла.\n\nЕсли после health exclusion запрос ушёл с A на B, авторизация сохраняется только при наличии доступного B состояния или другой соответствующей архитектуры приложения. Shared session store, репликация и проверяемые stateless credentials решают разные варианты этой задачи. Срок cookie, согласованность, безопасность и доступность хранилища задаются отдельно; увеличение TTL привязки не заменяет эти механизмы."
      }
    ],
    "sources": [
      "HAProxy Configuration Manual — balance, health checks, persistence: https://docs.haproxy.org/3.0/configuration.html",
      "NGINX — HTTP Load Balancing: https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/"
    ],
    "sourceCommit": "new-2026-11-13"
  }
};
