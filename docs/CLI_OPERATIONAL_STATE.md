# CLI-C1: effective Ethernet operational state

Issue: [#80](https://github.com/apotet/my-gemini-mirror-site/issues/80).
Baseline: `c1f3ab2b5a2a811ab2fcbaa9062d9f3e51921736`.

## Model and scope

`engine/OperationalState.ts:interfaceStatus` is the single read-only selector for
all interface status displays. For the existing Ethernet-only topology:

| Local admin | Matching link | Peer interface | Effective status | Port status | Configured trunk status |
| --- | --- | --- | --- | --- | --- |
| down | any | any | administratively down / down | disabled | down |
| up | absent or down | any | down / down | notconnect | down |
| up | up | absent or admin-down | down / down | notconnect | down |
| up | up | exists and admin-up | up / up | connected | trunking |

A missing link is **not** an implicit attached endpoint. No synthetic carrier is
invented to complete a configuration exercise. An endpoint would need an explicit
peer interface and link in `NetworkState`. Both link orientations are supported.
The selector is evaluated on demand: cable/peer changes take effect without
issuing another local `no shutdown` or mutating a cached boolean.

`no shutdown` and `shutdown` modify only `adminUp`. A legacy `operUp` input is
accepted for compatibility, discarded when loading/resetting state and ignored by
the selector. Effective operational status is derived, not persisted in a second
runtime cache.

The shared selector serves:

- `show interfaces` and `show interfaces <interface>`;
- `show interfaces status`;
- `show ip interface brief`;
- `show interfaces trunk`.

The trunk display intentionally retains configured down trunks with status
`down` and their allowed list, making configuration visible for diagnosis. This
is a documented lab display, not a byte-for-byte reproduction of every IOS
platform's output. `trunking` here means a configured local trunk with effective
Ethernet carrier; it does not validate DTP, compatible peer switchport mode,
STP forwarding, VLAN delivery or real traffic.

## Persistence and compatibility

`SavedDeviceConfig.interfaces` contains `InterfaceConfig`, excluding `operUp`.
Snapshots and configuration equality ignore that legacy runtime field. Constructor,
`setState`, `reset`, and reload normalize old snapshots, preserving hostname,
admin state, IP/mask, switchport/VLAN data, description and configured routes.
Existing genuine differences between running/startup configurations survive
migration. Reload restores configuration only; carrier is derived from the
current topology and peer configuration after reload. Physical links are not
saved or reset by save/reload.

No goal predicates or `VlanPath` semantics change. Standalone VLAN/Trunk/Gateway
exercises remain configuration exercises and can pass with an unmodeled physical
link. Their explanatory/success strings now say admin-up/configured rather than
claiming operational connectivity. Multi-switch path checks remain the existing
configuration-level checks; they are not ICMP/frame-forwarding tests. Existing
scenario inventories and topology are unchanged.

## Reproduction and observed before/after

The following outputs were captured by running the real bundled engine on the
baseline and the PR branch with identical commands and topology. Rows below
abbreviate only whitespace/header text.

Use the two-switch VLAN scenario; select SW1:

```text
enable
configure terminal
interface fa0/24
switchport mode trunk
no shutdown
```

Leave SW2 administratively down. Query using `do` from config-if:

| Command | Baseline | CLI-C1 |
| --- | --- | --- |
| `show interfaces fa0/24` | down, line protocol down | down, line protocol down |
| `show interfaces status` | notconnect | notconnect |
| `show ip interface brief` | **up / up** | down / down |
| `show interfaces trunk` | **trunking** | down; allowed list preserved |

Enable SW2 Fa0/24 through its console. All displays now agree on up/up,
connected, trunking on both revisions. Select SW1, `end`, then
`copy running-config startup-config`. Change `state.links[0].up` to `false`
using the engine's `getState`/`setState` API (the UI has no cable-toggle control).
The baseline brief/trunk still claim up/up and trunking, while detail/status
say down/notconnect. CLI-C1 makes all four agree on down/notconnect/down.

Reload SW1 with the cable still disconnected:

```text
SW1# reload
SW1> enable
SW1# configure terminal
SW1(config)# interface fa0/24
SW1(config-if)# do show interfaces fa0/24
FastEthernet0/24 is down, line protocol is down
SW1(config-if)# do show ip interface brief
FastEthernet0/24  unassigned  YES unset  down  down
SW1(config-if)# do show interfaces status
FastEthernet0/24  notconnect  trunk  auto  auto  simulated
SW1(config-if)# do show interfaces trunk
FastEthernet0/24  on  802.1q  down  1
```

Baseline after the same reload: detailed down/down and status notconnect, but
brief up/up and trunking, because cached `operUp:true` is restored from startup.
CLI-C1 saves no `operUp` key and uses the current disconnected link.

Finally remove all links using `setState`. Baseline displays up/up, connected,
trunking by trusting cached `operUp`. CLI-C1 displays down/down, notconnect, down.
The same missing-link behavior applies to the standalone trunk scenario after
`no shutdown`; no topology injection or external endpoint is required to
reproduce it there.

## Verification and limitations

`node scripts/cli-operational-state.test.mjs` checks 96 combinations of local
admin, peer admin, cable state, stale cache value, link orientation and access /
trunk / routed configuration. Each case checks all five show forms, read-only
state, and unchanged configuration goals. Additional cases cover missing peer
and port, missing/unrelated links, cable and peer toggles, admin-only commands,
reload, legacy snapshot migration and configuration preservation. Three standalone
solutions are checked without claiming physical connectivity. Existing tests
cover the three multi-switch scenarios, persistence, diagnostics and PR #79
canonical parsing/TAB/help behavior.

Browser checks use local Chromium at desktop 1440×1000 and mobile 390×844 with
touch emulation. Physical cable toggling is covered through the engine API;
console-based peer shutdown/recovery, save/reload and all five display forms
were also checked through the UI, with seven states per viewport and no page errors. These are not physical iOS/Android keyboard or Safari tests.

Explicitly out of scope: negotiation/PHY errors, up/down protocol states, STP,
SVI autostate, subinterfaces, SSH, device profiles, and routing logic. In
particular `show ip route` still uses the previous simplified configured-route /
admin-state logic; agreement with an installed operational RIB is a separate
routing task. This PR must not be interpreted as proof of routed connectivity.

Validation on Node 24.22.1: all 12 CLI test scripts, typecheck, build and
`git diff --check` passed. Build reported its chunk-size warning but succeeded.
The separate `test:logic` command failed at `scripts/mixed-exam.test.mjs:34`
(`717 !== 657`) both on the unchanged baseline and on this branch. The question
bank and exam code were not modified. The existing CI job runs this failing
exam check before CLI checks, so a failed overall job does not imply a failed
CLI regression; the CLI results here come from explicit local runs.
