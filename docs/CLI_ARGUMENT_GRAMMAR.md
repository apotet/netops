# CLI-B2: argument grammar and Enter / TAB / ? contract

Issue: [#88](https://github.com/apotet/my-gemini-mirror-site/issues/88).
Starting staging `main`: `9014a6ecd6ef445c44346fa0533dddde4d1f7fa6`.

## Contract and implementation

The existing `CommandSpec.match`, handlers, mode/privilege checks and canonical
abbreviation rules are retained. `CommandSpec.arguments` adds alternative typed
suffix paths. If omitted, the command accepts exactly its keyword path, without
extra tokens. All 35 executable registered commands have a valid witness and a
negative arity test in `scripts/cli-arguments.test.mjs`; the final VLAN-name
argument is explicitly free text rather than an accidental ignored tail.

`inspectCommand` walks the same keyword and argument nodes for Enter, contextual
help and TAB. A valid prefix with missing required nodes is incomplete; an
unrecognized/invalid argument or trailing token is invalid; multiple matching
keywords are ambiguous. Exact keyword precedence, unique abbreviations,
mode/privilege gates and `do`/`d` EXEC delegation from configuration are retained.
Handlers execute only after syntax acceptance. Handler-level error results cannot
commit state or a mode change, even if a handler returns a modified working clone.

`?` uses those nodes and validators without calling a handler or mutating state.
With a separating space, `<cr>` means the syntax is complete and valid. Without
a space, word help lists matching keywords/valid argument forms and does not turn
into end-of-command help. The old separate `argumentHelp` table and special-case
VLAN/interface regex branches have been removed. Three unreachable pseudo-command
handlers (`?`, `show ?`, and the generic `show` error fallback) were removed so
that they cannot act as accepting grammar terminals; real `show` branches now
produce incomplete/invalid results through the common walker.

TAB reads the same next keyword nodes, including `switchport` after a dynamic
interface argument. It does not invent argument values or submit commands.
Repeated TAB after the completion's trailing space does not construct the next
word. A previously invalid completed argument cannot be skipped to complete a
later keyword. Completion still normalizes spacing and operates at the end of
the input; cursor-aware editing remains a separate task.

### Policies and bounds

- IPv4: exactly four nonempty decimal octets, 0–255. Signs, exponent/hex notation,
  missing/extra octets and nonnumeric components are invalid. Leading-zero octets
  such as `01.2.3.4` are rejected as an explicit canonical decimal **lab policy**;
  this is not a claim that every IOS/platform/version rejects the same spelling.
- Masks: the same lexical IPv4 rules plus contiguous bits. All /0 through /32
  remain accepted. Address values `0.0.0.0`, `255.255.255.255` and network/broadcast
  values are not newly prohibited by a host-address policy. This is syntax
  validation, not a new routing/interface-role model.
- VLAN ID: decimal integer 1–4094. Trunk lists use the **same existing parser** for
  IDs/ranges, both in the grammar and operations. Replace/add/remove/all/none keep
  their previous behavior, including the distinction between none and default all.
- Interfaces: the inventory must contain the normalized interface. Global config
  also retains `interface Fa 0/1` as an explicit two-argument path; arbitrary extra
  tokens and nonexistent ports are rejected. Show accepts the existing compact
  interface spelling, optionally followed by the abbreviatable keyword switchport.
- Hostname: exactly one WORD, retaining the previous value policy; extra words are
  rejected. Full RFC hostname policy was not added.
- VLAN name: one or more words, 1–32 printable ASCII characters in total. All words
  are saved, not silently truncated to the first word. Internal whitespace is
  normalized by the existing tokenizer. No general quoting/escaping or description
  command has been added. Platform-specific name uniqueness/character policies
  remain outside this limited simulator.

Cisco's [Catalyst 9200 IOS XE 17.18 VLAN command reference](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9200/software/release/17-18/command_reference/b_1718_9200_cr/vlan_commands.html)
describes the VLAN name as an ASCII string of 1–32 characters. There is also
[an upstream IOS integration report demonstrating names containing spaces](https://github.com/ansible/ansible/issues/75261).
These sources justify preserving the full name rather than treating every word
after the first as junk; they do not establish a universal hardware profile.

## Captured before/after

The real baseline and branch engines were executed with identical input and
fixture state. The baseline accepted `enable junk`, `configure terminal junk`,
`hostname NETOPS junk`, an IPv4 with an empty octet, and extra IP arguments;
several of those changed configuration/mode. The branch rejects each, leaving
the full NetworkState unchanged. `show ip interface brief junk` was accepted
by the baseline and is now rejected, also without state changes.

| Example | Baseline | Branch |
| --- | --- | --- |
| `ip address 192..1.1 255.255.255.0` | accepted, IP changed | Invalid; state unchanged |
| `ip address 192.0.2.1 255.255.255.0 extra` | accepted, IP changed | Invalid; state unchanged |
| `switchport trunk allowed vlan 5000 ?` | **`<cr>`** despite Enter rejection | no `<cr>`; Enter Invalid |
| `switchport trunk allowed vlan 20-10 ?` | **`<cr>`** despite Enter rejection | no `<cr>`; Enter Invalid |
| `interface Fa0/1 ?` | Unrecognized despite valid Enter | `<cr>`; Enter accepts |
| `show interfaces Fa0/1 sw` | Invalid | accepts; TAB → switchport; help agrees |
| `name Users West` | accepted but stored only `Users` | accepted; stores `Users West` |

The raw acceptance matrix can be reproduced and exported with:

```sh
node scripts/cli-arguments.test.mjs --matrix > /tmp/cli-arguments-matrix.json
```

Every row actually executes Enter, syntax `?` and TAB against an independent
fixture, verifies full-state immutability for help/TAB and rejected commands,
and records the result and whether successful execution changed state.

## Selected acceptance rows from the actual run

For IP rows, config-if is an existing Fa0/1; trunk rows use a configured trunk.
State `changed` refers to the complete NetworkState, including mode/privilege
and startup, not just displayed configuration. `unchanged` on accepted show
commands is expected. A missing TAB result means it does not invent a value.

| Mode / command | Enter | `?` | TAB | State after Enter |
| --- | --- | --- | --- | --- |
| `config-if: ip address 192.0.2.1 255.255.255.0` | accept | `<cr>` | `—` | changed |
| `config-if: ip address 0.0.0.0 255.255.255.0` | accept | `<cr>` | `—` | changed |
| `config-if: ip address 255.255.255.255 255.255.255.0` | accept | `<cr>` | `—` | changed |
| `config-if: ip address 192.0.2.1 0.0.0.0` | accept | `<cr>` | `—` | changed |
| `config-if: ip address 192.0.2.1 255.255.255.255` | accept | `<cr>` | `—` | changed |
| `config-if: ip address 192..1.1 255.255.255.0` | Invalid | `Unrecognized` | `—` | unchanged |
| `config-if: ip address 1.2.3. 255.255.255.0` | Invalid | `Unrecognized` | `—` | unchanged |
| `config-if: ip address .1.2.3 255.255.255.0` | Invalid | `Unrecognized` | `—` | unchanged |
| `config-if: ip address 1.2.3.256 255.255.255.0` | Invalid | `Unrecognized` | `—` | unchanged |
| `config-if: ip address 1.2.x.4 255.255.255.0` | Invalid | `Unrecognized` | `—` | unchanged |
| `config-if: ip address -1.2.3.4 255.255.255.0` | Invalid | `Unrecognized` | `—` | unchanged |
| `config-if: ip address 1.2.3.4.5 255.255.255.0` | Invalid | `Unrecognized` | `—` | unchanged |
| `config-if: ip address 01.2.3.4 255.255.255.0` | Invalid | `Unrecognized` | `—` | unchanged |
| `config-if: ip address +1.2.3.4 255.255.255.0` | Invalid | `Unrecognized` | `—` | unchanged |
| `config-if: ip address 1e1.2.3.4 255.255.255.0` | Invalid | `Unrecognized` | `—` | unchanged |
| `config-if: ip address 0x1.2.3.4 255.255.255.0` | Invalid | `Unrecognized` | `—` | unchanged |
| `config-if: ip address 1.2.3 255.255.255.0` | Invalid | `Unrecognized` | `—` | unchanged |
| `config-if: ip address 1.2.3.-1 255.255.255.0` | Invalid | `Unrecognized` | `—` | unchanged |
| `config-if: ip address 1.2.3.+4 255.255.255.0` | Invalid | `Unrecognized` | `—` | unchanged |
| `config-if: ip address 000.0.0.0 255.255.255.0` | Invalid | `Unrecognized` | `—` | unchanged |
| `config-if: ip address 192.0.2.1 255.0.255.0` | Invalid | `Unrecognized` | `—` | unchanged |
| `config-if: ip address` | Incomplete | `A.B.C.D` | `→ ip address ` | unchanged |
| `config-if: ip address 192.0.2.1` | Incomplete | `A.B.C.D` | `—` | unchanged |
| `exec: enable junk` | Invalid | `Unrecognized` | `—` | unchanged |
| `privileged: configure terminal junk` | Invalid | `Unrecognized` | `—` | unchanged |
| `config: hostname NETOPS junk` | Invalid | `Unrecognized` | `—` | unchanged |
| `config: interface Fa0/1` | accept | `<cr>` | `—` | changed |
| `config-if: no shutdown junk` | Invalid | `Unrecognized` | `—` | unchanged |
| `config-if: shutdown junk` | Invalid | `Unrecognized` | `—` | unchanged |
| `exec: show ip interface brief junk` | Invalid | `Unrecognized` | `—` | unchanged |
| `privileged: show` | Incomplete | `interfaces; ip; running-config; startup-config; vlan` | `→ show ` | unchanged |
| `privileged: show frog` | Invalid | `Unrecognized` | `—` | unchanged |
| `privileged: show run \| include hostname` | Invalid | `Unrecognized` | `—` | unchanged |
| `config: interface Fa0/999` | Invalid | `Unrecognized` | `—` | unchanged |
| `config: interface Fa0/1 extra` | Invalid | `Unrecognized` | `—` | unchanged |
| `config: vlan 0` | Invalid | `Unrecognized` | `—` | unchanged |
| `config: vlan 4095` | Invalid | `Unrecognized` | `—` | unchanged |
| `config: vlan 1` | accept | `<cr>` | `—` | changed |
| `config: vlan 4094` | accept | `<cr>` | `—` | changed |
| `config-if: sw tr al vl 5000` | Invalid | `Unrecognized` | `—` | unchanged |
| `config-if: sw tr al vl 20-10` | Invalid | `Unrecognized` | `—` | unchanged |
| `config-if: sw tr al vl add` | Incomplete | `<vlan-list>` | `→ sw tr al vl add ` | unchanged |
| `config-if: sw tr al vl a` | Ambiguous | `add; all` | `add, all` | unchanged |
| `config: do sh ip int br junk` | Invalid | `Unrecognized` | `—` | unchanged |
| `config: do sh ip` | Incomplete | `interface; route` | `→ do sh ip ` | unchanged |
| `config-vlan: name Users West` | accept | `<cr>; WORD` | `—` | changed |

## Verification and remaining REVIEW

- PASS: new 291-row matrix, 35 registered-command valid/negative witnesses, all
  contiguous masks, missing/extra/invalid/ambiguous cases, do/d across config modes,
  privilege rejection, canonical abbreviations, repeated TAB, dynamic suffix
  keyword, multiword names and transactional handler errors.
- PASS: the original VLAN/Trunk/Gateway solutions, multi-switch path/diagnostic
  regressions, operational-state and persistence tests. No goal predicates,
  topology, operational-state logic or routing behavior were changed.
- PASS: an independent engine execution of all seven IOS modes scenario steps,
  final goals and save/reload. This was also completed through the actual UI on
  both browser viewports below.
- PASS: typecheck (`npm run lint`), build including prebuild validator, and
  `git diff --check`. Build reported a chunk-size warning and succeeded.
- PASS: local headless Chromium desktop 1440×1000 and mobile 390×844 with touch
  emulation: malformed/extra inputs, unchanged running config on rejection,
  word/syntax help, TAB, genuine ambiguity, trunk add, multiword name, and all
  seven IOS modes steps/save/reload. No page errors. Physical iOS/Android
  keyboards and Safari were not tested.
- BASELINE FAIL / REVIEW: of the 14 CLI scripts (13 existing plus this test),
  13 passed. `cli-ios-modes-lab.test.mjs:30` fails on both unchanged baseline and
  branch: its last-lesson-block practiceLink assertion gets `cli-vlan`, expects
  `cli-modes`. The existing test and lesson were not changed or weakened. Its
  early lesson assertion prevents its later engine checks from running; the
  independent modes checks above cover those flows without claiming that the
  lesson-link defect is fixed.
- BASELINE FAIL / REVIEW: `npm run test:logic` fails on both baseline and branch,
  `mixed-exam.test.mjs:34`, `717 !== 657`. The expanding question bank and exam
  test were not modified. CI currently checks exam logic before CLI/typecheck/
  build, so the overall CI is not claimed green; explicit local results are
  reported separately. Local Node is 24.22.1; CI uses Node 22.

`<cr>` is a syntax contract, not a claim of packet delivery or successful
state-dependent operations. Existing semantic checks (for example, the lab's
requirement to configure trunk mode before changing its allowed list) remain
in handlers and can return a semantic error for syntactically complete input.
This PR does not add missing IOS commands, filters, enable-level arguments,
profile-specific argument variants, quoting/escaping, full hostname/name policy,
route-prefix/next-hop reachability policy, caret offsets, cursor-aware editing,
or new device capabilities. Unsupported tails are rejected rather than silently
accepted. Device/profile/network simulation and learning content are unchanged.
