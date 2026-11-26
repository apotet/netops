const BASE_CALCULATIONS: Readonly<Record<string, number>> = {
  'l3-06': 24,
  'l3-08': 26,
  'l3-09': 26,
  'l3-10': 27,
  'l3-d01': 30,
  'l3-d02': 27,
  'new-l3-23': 23,
};

export function ipv4CalculationPrefix(questionId: string): number | undefined {
  const generated = questionId.match(/^gen-(?:(?:net|bc)-(2[5-9]|30)-[0-4]|(?:mask|hosts|block)-(2[5-9]|30))$/);
  return generated ? Number(generated[1] ?? generated[2]) : BASE_CALCULATIONS[questionId];
}

export function explainGeneratedMask(questionId: string) {
  if (!questionId.startsWith('gen-mask-')) return;
  const prefix = ipv4CalculationPrefix(questionId);
  if (prefix === undefined) return;
  const ones = prefix - 24;
  const zeros = 8 - ones;
  const lastOctet = 256 - 2 ** zeros;
  const bits = '1'.repeat(ones) + '0'.repeat(zeros);
  return {
    brief: `/${prefix} означает ${prefix} единичных битов слева. Первые 24 бита дают три октета по 255, оставшиеся ${ones} — последний октет ${lastOctet}.`,
    deep: `1. Запиши по восемь битов в каждом октете. Первые три октета уже заполнены единицами, поэтому каждый равен 255.
2. В последнем октете запиши ${ones} единичных битов слева и ${zeros} нулевых справа: \`${bits}\`.
3. Все восемь единиц дали бы 255. Нулевой хвост убирает 2^${zeros} − 1, поэтому остаётся 256 − 2^${zeros} = ${lastOctet}. Маска: \`255.255.255.${lastOctet}\`.`,
  };
}
