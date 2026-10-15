// 貼り付けた文章を、左の項目と右の説明に分けます。
export function parseCards(input: string) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes("=") || line.includes("＝"))
    .map((line) => {
      const separator = line.includes("=") ? "=" : "＝";
      const index = line.indexOf(separator);
      return {
        left: line.slice(0, index).replace(/\*\*/g, "").trim(),
        right: line
          .slice(index + 1)
          .replace(/\*\*/g, "")
          .trim(),
      };
    })
    .filter((card) => card.left && card.right);
}
