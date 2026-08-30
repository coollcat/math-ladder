/* 粗略估宽（px）：CJK/全角/省略号按 12px，大写与数字按 7.5px，其余按 6.2px。
   只用于"是否需要截断"的判断，宁宽勿窄。 */
export function estW(s) {
  let w = 0;
  for (const c of s) {
    if (/[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF\u2026\u00B7\u2010-\u2027]/.test(c)) w += 12;
    else if (/[A-Z0-9@#%&]/.test(c)) w += 7.5;
    else w += 6.2;
  }
  return w;
}

/* 把标题截断到 maxW 内；至少保留 1 个字符 + 省略号 */
export function fitText(s, maxW) {
  if (estW(s) <= maxW) return s;
  const chars = [...s];
  let n = chars.length - 1;
  while (n > 1 && estW(chars.slice(0, n).join('') + '…') > maxW) n--;
  return chars.slice(0, n).join('') + '…';
}
