import type { Card } from "./types";
// 表記ゆれを減らしてから、問題同士の近さを比べます。
const normalize = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, "");
const similarity = (a: string, b: string) => {
  const x = normalize(a),
    y = normalize(b);
  if (x === y) return 1;
  const shorter = x.length < y.length ? x : y,
    longer = x.length < y.length ? y : x;
  if (!shorter) return 0;
  let hit = 0;
  for (const ch of shorter) if (longer.includes(ch)) hit++;
  return hit / longer.length;
};
export const findDuplicateGroups = (cards: Card[]) => {
  const groups: { cards: Card[]; score: number }[] = [];
  for (let i = 0; i < cards.length; i++)
    for (let j = i + 1; j < cards.length; j++) {
      const score =
        (similarity(cards[i].left, cards[j].left) +
          similarity(cards[i].right, cards[j].right)) /
        2;
      if (score >= 0.82) groups.push({ cards: [cards[i], cards[j]], score });
    }
  return groups;
};
