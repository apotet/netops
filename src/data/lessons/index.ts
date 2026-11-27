import { applyInDepthLesson, IN_DEPTH_LESSON_LINKS } from '../inDepth';
import { ipv4CalculationPrefix } from '../ipv4ExplanationPractice';
import { FOUNDATION_ADDITIONAL_LESSONS, FOUNDATION_EXISTING_LESSON_LINKS } from './foundation-coverage';
import { WIFI_CASES } from '../wifiCases';
import { EXPERT_CASES_225 } from '../expertCases225';
import { LESSON_L12_WIFI_STANDARDS_ROAMING } from './l12-wifi-standards-roaming';
import { LESSON_L2_WIFI_SECURITY_DIAGNOSTICS } from './l2-wifi-security-diagnostics';
import { MONITORING_CASES } from '../monitoringCases';
import { LESSON_L7_MONITORING_SNMP_SYSLOG } from './l7-monitoring-snmp-syslog';
import { LESSON_TS_ZABBIX_MONITORING } from './ts-zabbix-monitoring';
import { EXPERT_LESSONS_177 } from '../expertCases177';
import { DIAGNOSTIC_CASES_177 } from '../diagnosticCases177';
import { LESSON_L2_IGMP_SNOOPING } from './l2-igmp-snooping';
import { LESSON_L7_DNS_TTL } from './l7-dns-ttl';
import { LESSON_L2_DAI } from './l2-dai';
import { LESSON_L2_IPSG } from './l2-ipsg';
import { LESSON_L2_BPDU_GUARD } from './l2-bpdu-guard';
import { LESSON_TS_OPTICS } from './ts-optics';
import { LESSON_L1_FIBER_HARDWARE } from './l1-fiber-hardware';
import { LESSON_L1_COPPER_CABLE } from './l1-copper-cable';
import { LESSON_L1_COPPER_INSTALLATION } from './l1-copper-installation';
import { LESSON_L1_FIBER_SPLICING } from './l1-fiber-splicing';
import { LESSON_L1_OPTICAL_TESTING_EQUIPMENT } from './l1-optical-testing-equipment';
import { LESSON_L4_DIRECTORY_REMOTE_INDUSTRIAL_PORTS } from './l4-directory-remote-industrial-ports';
import { LESSON_L2_HSR_REDUNDANCY } from './l2-hsr-redundancy';
import { LESSON_L1_COPPER_FAULT_POE } from './l1-copper-fault-poe';
import { LESSON_L1_POE_BUDGET } from './l1-poe-budget';
import { LESSON_L1_POE_INJECTORS_SPLITTERS } from './l1-poe-injectors-splitters';
import { LESSON_L7_HTTP_STATUS_BASICS } from './l7-http-status-basics';
import { LESSON_L3_MASKS } from './l3-masks';
import { LESSON_L3_PRIVATE_IPV4 } from './l3-private-ipv4';
import { LESSON_L3_SUBNETS } from './l3-subnets';
import { LESSON_CLI_SAVE_CONFIG } from './cli-save-config';
import { LESSON_CLI_TRUNK_VLAN_DIAGNOSTICS } from './cli-trunk-vlan-diagnostics';
import { LESSON_L3_EIGRP } from './l3-eigrp';
import { LESSON_L3_BGP } from './l3-bgp';
import { LESSON_L4_LOAD_BALANCING } from './l4-load-balancing';
import { LESSON_CLI_VLAN_TRUNK } from './cli-vlan-trunk';
import { LESSON_CLI_IP_STATIC_ROUTE } from './cli-ip-static-route';
import { LESSON_L2_VLAN_SECURITY } from './l2-vlan-security';
import { LESSON_L2_STP_GUARD_DESIGN } from './l2-stp-guard-design';
import { LESSON_L4_APPLIED_TCP_SESSION_FLOWS } from './l4-applied-tcp-session-flows';
import { LESSON_L7_UDP_TRANSACTIONS } from './l7-udp-transactions-tftp-ntp-snmp';
import { Lesson } from './types';
import { LESSON_L2_SVI } from './l2-svi';
import { LESSON_L2_STP_ELECTION } from './l2-stp-election';
import { LESSON_L2_RSTP_CONVERGENCE } from './l2-rstp-convergence';
import { LESSON_L2_STP_PROTECTION } from './l2-stp-protection';
import { LESSON_L2_MSTP_ADVANCED } from './l2-mstp-advanced';
import { LESSON_CLI_IOS_MODES } from './cli-ios-modes';
import { LESSON_CLI_ACCESS } from './cli-console-ssh-telnet';
import { LESSON_CLI_SHOW_HELP_TAB } from './cli-show-help-tab';
import { LESSON_CLI_POE_DIAGNOSTICS } from './cli-poe-diagnostics';
import { LESSON_TLS_SNI } from './tls-sni';
import { LESSON_L2_ACCESS_GUARD } from './l2-access-guard';
import { LESSON_L3_VRRP } from './l3-vrrp';
import { LESSON_TS_COPP_STORM } from './ts-copp-storm';
import { LESSON_L2_ACCESS_AUTH } from './l2-access-auth';
import { LESSON_L3_RPKI } from './l3-rpki';
import { LESSON_L4_TCP_LOSS } from './l4-tcp-loss';
import { LESSON_L4_TCP_OPTIONS_KEEPALIVE } from './l4-tcp-options-keepalive';
import { LESSON_TCP_WINDOW_RETRANSMIT } from './tcp-window-retransmit';
import { LESSON_TCPIP_MODEL } from './tcpip-model';
import { LESSON_TCPIP_ENCAPSULATION } from './tcpip-encapsulation';
import { LESSON_OSI_PDU } from './osi-pdu';
import { LESSON_OSI_SESSION_PRESENTATION } from './osi-session-presentation';
import { LESSON_L3_ROUTE_SELECTION } from './l3-route-selection';
import { LESSON_L4_SERVICE_PORTS } from './l4-service-ports';
import { LESSON_L3_ICMP_BASICS } from './l3-icmp-basics';
import { LESSON_L7_DNS } from './l7-dns';
import { LESSON_L7_DHCP } from './l7-dhcp';
import { LESSON_L7_DNS_DHCP } from './l7-dns-dhcp';
import { LESSON_L7_SERVICES } from './l7-services';
import { LESSON_L4_TCP } from './l4-tcp';
import { LESSON_L2_VLAN } from './l2-vlan';
import { LESSON_L2_STP } from './l2-stp';
import { LESSON_L2_LACP_ETHERCHANNEL } from './l2-lacp-etherchannel';
import { LESSON_L2_LLDP_NEIGHBORS } from './l2-lldp-neighbors';
import { LESSON_L2_PTP_TIME_SYNC } from './l2-ptp-time-sync';
import { LESSON_L3_MTU_MSS_FRAGMENTATION } from './l3-mtu-mss-fragmentation';
import { LESSON_L3_ACL_FILTERING } from './l3-acl-filtering';
import { LESSON_L2_ETHERNET } from './l2-ethernet';
import { LESSON_L3_OSPF } from './l3-ospf';
import { LESSON_L3_ARP } from './l3-arp';
import { LESSON_L3_NAT } from './l3-nat';
import { LESSON_L3_IPV6 } from './l3-ipv6';
import { LESSON_TS_METHOD } from './ts-method';
import { LESSON_QOS_BASICS } from './qos-basics';
import { LESSON_L3_LINUX_POLICY_ROUTING } from './l3-linux-policy-routing';
import { LESSON_L2_PORT_ISOLATION_PVLAN } from './l2-port-isolation-pvlan';
import { LESSON_L2_PRP_REDUNDANCY } from './l2-prp-redundancy';
import { LESSON_L7_TLS_HANDSHAKE_ALPN } from './l7-tls-handshake-alpn';
import { LESSON_L7_SMTP_DELIVERY_QUEUES } from './l7-smtp-delivery-queues';
import { LESSON_L3_TUNNELS_GRE_VXLAN } from './l3-tunnels-gre-vxlan';
import { LESSON_L7_SSH_TUNNELING_PROXYJUMP } from './l7-ssh-tunneling-proxyjump';

import { LESSON_L7_HTTP_FRAMING_RANGES_ETAG } from './l7-http-framing-ranges-etag';
import { LESSON_TS_WIRESHARK_CRC_DIAGNOSTICS } from './ts-wireshark-crc-diagnostics';

export const LESSONS: Lesson[] = [LESSON_L4_APPLIED_TCP_SESSION_FLOWS, LESSON_L7_UDP_TRANSACTIONS, LESSON_L4_DIRECTORY_REMOTE_INDUSTRIAL_PORTS, LESSON_L2_HSR_REDUNDANCY, LESSON_L1_POE_BUDGET, LESSON_L1_POE_INJECTORS_SPLITTERS, LESSON_L1_COPPER_FAULT_POE, LESSON_L7_HTTP_STATUS_BASICS, LESSON_L1_FIBER_SPLICING, LESSON_L1_OPTICAL_TESTING_EQUIPMENT, LESSON_L1_COPPER_CABLE, LESSON_L1_COPPER_INSTALLATION, LESSON_L1_FIBER_HARDWARE, LESSON_L3_ROUTE_SELECTION, LESSON_L4_SERVICE_PORTS, LESSON_L12_WIFI_STANDARDS_ROAMING, LESSON_L2_WIFI_SECURITY_DIAGNOSTICS, LESSON_L7_MONITORING_SNMP_SYSLOG, LESSON_TS_ZABBIX_MONITORING, LESSON_L2_IGMP_SNOOPING, LESSON_L7_DNS_TTL, LESSON_L2_DAI, LESSON_L2_IPSG, LESSON_L2_BPDU_GUARD, LESSON_TS_OPTICS, LESSON_L3_MASKS, LESSON_L3_PRIVATE_IPV4, LESSON_L3_SUBNETS, LESSON_CLI_SAVE_CONFIG, LESSON_CLI_TRUNK_VLAN_DIAGNOSTICS, LESSON_L3_EIGRP, LESSON_L3_BGP, LESSON_L4_LOAD_BALANCING, LESSON_CLI_VLAN_TRUNK, LESSON_CLI_IP_STATIC_ROUTE, LESSON_L2_VLAN_SECURITY, LESSON_L2_STP_GUARD_DESIGN, LESSON_CLI_IOS_MODES, LESSON_CLI_ACCESS, LESSON_CLI_SHOW_HELP_TAB, LESSON_CLI_POE_DIAGNOSTICS, LESSON_L2_SVI, LESSON_TLS_SNI, LESSON_L2_ACCESS_GUARD, LESSON_L3_VRRP, LESSON_TS_COPP_STORM, LESSON_L2_ACCESS_AUTH, LESSON_L3_RPKI, LESSON_L4_TCP_LOSS, LESSON_TCP_WINDOW_RETRANSMIT, LESSON_TCPIP_MODEL, LESSON_L3_ICMP_BASICS, LESSON_TCPIP_ENCAPSULATION, LESSON_OSI_SESSION_PRESENTATION, LESSON_OSI_PDU, LESSON_L7_DNS, LESSON_L7_DHCP, LESSON_L7_DNS_DHCP, LESSON_L7_SERVICES, LESSON_L4_TCP, LESSON_L2_VLAN, LESSON_L2_STP, LESSON_L2_ETHERNET, LESSON_L2_LACP_ETHERCHANNEL, LESSON_L2_LLDP_NEIGHBORS, LESSON_L2_PTP_TIME_SYNC, LESSON_L3_MTU_MSS_FRAGMENTATION, LESSON_L3_ACL_FILTERING, LESSON_L3_OSPF, LESSON_L3_ARP, LESSON_L3_NAT, LESSON_L3_IPV6, LESSON_TS_METHOD, LESSON_QOS_BASICS, LESSON_L2_STP_ELECTION, LESSON_L2_RSTP_CONVERGENCE, LESSON_L2_STP_PROTECTION, LESSON_L2_MSTP_ADVANCED, LESSON_L2_PRP_REDUNDANCY, LESSON_L7_TLS_HANDSHAKE_ALPN, LESSON_L7_SMTP_DELIVERY_QUEUES, LESSON_L3_TUNNELS_GRE_VXLAN, LESSON_L7_SSH_TUNNELING_PROXYJUMP, LESSON_L3_LINUX_POLICY_ROUTING, LESSON_L2_PORT_ISOLATION_PVLAN, LESSON_L4_TCP_OPTIONS_KEEPALIVE, LESSON_L7_HTTP_FRAMING_RANGES_ETAG, LESSON_TS_WIRESHARK_CRC_DIAGNOSTICS, ...EXPERT_LESSONS_177, ...FOUNDATION_ADDITIONAL_LESSONS].map(original => {
  const lesson = applyInDepthLesson(original);
  const addedIds = [
    ...Object.entries(IN_DEPTH_LESSON_LINKS).filter(([, id]) => id === lesson.id).map(([questionId]) => questionId),
    ...(FOUNDATION_EXISTING_LESSON_LINKS[lesson.id] ?? []),
    ...(lesson.id === 'tcpip-model' ? ['tcp-08', 'tcpip-x12'] : []),
    ...(lesson.id === 'osi-pdu' ? ['gen-osi-a-12'] : []),
    ...(lesson.id === 'l4-tcp' ? ['tcpip-x13', 'tcpip-x16'] : []),
    ...(lesson.id === 'tcpip-encapsulation' ? ['tcpip-x15', 'k-06', 'new-tcpip-payload'] : []),
    ...(lesson.id === 'tcpip-model' ? ['tcpip-x19'] : []),
    ...(lesson.id === 'osi-pdu' ? ['k-08'] : []),
    ...(lesson.id === 'osi-session-presentation' ? ['new-l6-format'] : []),
    ...DIAGNOSTIC_CASES_177.filter(item => item.lessonId === lesson.id).map(item => item.id),
    ...MONITORING_CASES.filter(item => item.lessonId === lesson.id).map(item => item.id),
    ...WIFI_CASES.filter(item => item.lessonId === lesson.id).map(item => item.id),
    ...EXPERT_CASES_225.filter(item => item.lessonId === lesson.id).map(item => item.id),
  ];
  const relatedQuestionIds = [...new Set([...lesson.relatedQuestionIds, ...addedIds])].filter(id => !Object.hasOwn(IN_DEPTH_LESSON_LINKS, id) || IN_DEPTH_LESSON_LINKS[id] === lesson.id);
  return { ...lesson, relatedQuestionIds };
});

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export function getLessonForQuestion(questionId: string): Lesson | undefined {
  if (Object.hasOwn(IN_DEPTH_LESSON_LINKS, questionId)) return getLesson(IN_DEPTH_LESSON_LINKS[questionId]);
  // The encapsulation walkthrough is more specific than the existing model overview.
  if (questionId === 'tcpip-x15') return getLesson('tcpip-encapsulation');
  const related = LESSONS.find((l) => l.relatedQuestionIds.includes(questionId));
  if (related || ipv4CalculationPrefix(questionId) === undefined) return related;
  return getLesson(questionId.startsWith('gen-mask-') || questionId === 'l3-06' ? 'l3-masks' : 'l3-subnets');
}

export function searchLessons(query: string, layer?: string): Lesson[] {
  const q = query.trim().toLowerCase();
  return LESSONS.filter((l) => {
    if (layer && layer !== 'all' && !l.osiLayers.some((x) => x.toLowerCase().includes(layer.toLowerCase()))) {
      return false;
    }
    if (!q) return true;
    const hay = [l.title, l.summary, l.category, ...l.terms, ...l.osiLayers].join(' ').toLowerCase();
    return hay.includes(q);
  });
}
