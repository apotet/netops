import { Lesson } from './types';
import { LESSON_TLS_SNI } from './tls-sni';
import { LESSON_L2_ACCESS_GUARD } from './l2-access-guard';
import { LESSON_L3_VRRP } from './l3-vrrp';
import { LESSON_TS_COPP_STORM } from './ts-copp-storm';
import { LESSON_L2_ACCESS_AUTH } from './l2-access-auth';
import { LESSON_L3_RPKI } from './l3-rpki';
import { LESSON_L4_TCP_LOSS } from './l4-tcp-loss';
import { LESSON_TCPIP_MODEL } from './tcpip-model';
import { LESSON_OSI_PDU } from './osi-pdu';
import { LESSON_L7_DNS } from './l7-dns';
import { LESSON_L7_DHCP } from './l7-dhcp';
import { LESSON_L4_TCP } from './l4-tcp';
import { LESSON_L2_VLAN } from './l2-vlan';
import { LESSON_L2_STP } from './l2-stp';
import { LESSON_L2_ETHERNET } from './l2-ethernet';
import { LESSON_L3_OSPF } from './l3-ospf';
import { LESSON_L3_ARP } from './l3-arp';
import { LESSON_L3_NAT } from './l3-nat';
import { LESSON_L3_IPV6 } from './l3-ipv6';
import { LESSON_TS_METHOD } from './ts-method';
import { LESSON_QOS_BASICS } from './qos-basics';

export const LESSONS: Lesson[] = [LESSON_TLS_SNI, LESSON_L2_ACCESS_GUARD, LESSON_L3_VRRP, LESSON_TS_COPP_STORM, LESSON_L2_ACCESS_AUTH, LESSON_L3_RPKI, LESSON_L4_TCP_LOSS, LESSON_TCPIP_MODEL, LESSON_OSI_PDU, LESSON_L7_DNS, LESSON_L7_DHCP, LESSON_L4_TCP, LESSON_L2_VLAN, LESSON_L2_STP, LESSON_L2_ETHERNET, LESSON_L3_OSPF, LESSON_L3_ARP, LESSON_L3_NAT, LESSON_L3_IPV6, LESSON_TS_METHOD, LESSON_QOS_BASICS];

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export function getLessonForQuestion(questionId: string): Lesson | undefined {
  return LESSONS.find((l) => l.relatedQuestionIds.includes(questionId));
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
