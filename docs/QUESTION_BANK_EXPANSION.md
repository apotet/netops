# Расширение банка вопросов

Текущий срез (ориентир): ~502 вопроса. Перекос: visual-l1 и L3/подсети доминируют; L5–L7 и deep troubleshooting тоньше.

## Целевая матрица (к наполнению)

| Блок | Сейчас (примерно) | Цель | Приоритет |
|------|-------------------|------|-----------|
| visual-l1 (фото) | ~200 | 120–150 (качество > количество) | Аудит шаблонов |
| l1-l2 текст | ~40 | 70–80 | Высокий |
| l3 (вкл. подсети) | ~130 | 120–140, меньше шаблонных масок | Средний |
| l4 TCP/UDP | ~45 | 70 | Высокий |
| l5-l7 | ~30 | 80 | **Критичный** |
| tcpip / инкапсуляция | ~20 | 40 | Средний |
| troubleshooting / CLI | ~35 | 60 | Высокий |

Сложность (`difficulty`): `basic` | `applied` | `advanced`  
В каждом блоке ориентир: 40% basic / 40% applied / 20% advanced.

## Темы на наращивание

### L2
- STP/RSTP (роли, состояния, BPDUguard — conceptual)
- EtherChannel / LACP vs static
- MAC table, unknown unicast flood
- 802.1Q tag fields (VID, PCP)

### L3
- Меньше «ещё одна /27», больше: longest prefix, AD/metric, connected vs static
- ACL basics (where applied, implicit deny) — conceptual
- IPv6 addressing (GUA/ULA/link-local), SLAAC vs DHCPv6 overview

### L4
- TCP window / retransmission concept
- Well-known ports mapping (HTTP/S, DNS, SSH, RDP)
- UDP use-cases vs TCP
- NAT and ports (PAT)

### L5–L7
- DNS resolve path, recursive vs authoritative
- HTTP methods / status classes
- TLS handshake high-level (cert role)
- DHCP DORA sequence
- SSH vs Telnet

### Troubleshooting
- Layered isolation (ping ok / TCP fail)
- Read `show` / `ip` symptoms → layer
- Связка с CLI Lab scenarios (`concepts[]`)

## Правила качества

1. Не плодить template-масок без новой учебной идеи.
2. У каждого вопроса: explanation ≥ 1–2 предложений, не только «верно потому что верно».
3. `family` для связанных вариантов; не дублировать один и тот же stem.
4. Photo L1: только при реальном фото + credits.
5. Сложность advanced — без трюков на двусмысленности формулировки.

## Мастерство специалиста (заготовка под будущий промпт)

Позже: skill vectors по `group` + `topic` + `difficulty` + CLI scenario success.  
Пока достаточно писать вопросы с корректными `group`, `topic`, `difficulty`, `family`.

## Очередь контента (первые 30)

1. 10 × L5–L7 DNS/HTTP/DHCP (basic+applied)
2. 8 × L4 ports + TCP flags (basic+applied)
3. 6 × L2 STP/MAC (applied)
4. 6 × troubleshooting multi-layer (applied+advanced)
