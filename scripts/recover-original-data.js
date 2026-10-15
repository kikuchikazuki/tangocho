const fs = require("node:fs");
const path = require("node:path");

const source = "C:/Users/kikuchi/.codex/attachments/cf5e4d7c-b6e0-4b1a-83ed-8e0a642f77da/pasted-text.txt";
const dataFile = "C:/Users/kikuchi/Desktop/僕だけの単語帳/data/anki-data.json";
const state = JSON.parse(fs.readFileSync(dataFile, "utf8"));
const sourceText = fs.readFileSync(source, "utf8");
const cards = sourceText
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.includes("=") || line.includes("＝"))
  .map((line, index) => {
    const separator = line.includes("=") ? "=" : "＝";
    const position = line.indexOf(separator);
    return {
      id: `recovered-${Date.now()}-${index}`,
      left: line.slice(0, position).replace(/\*\*/g, "").trim(),
      right: line.slice(position + 1).replace(/\*\*/g, "").trim(),
      leftReveal: true,
      rightReveal: true,
      leftProgress: 0,
      rightProgress: 0,
    };
  })
  .filter((card) => card.left && card.right);

if (!state.pages.some((page) => page.name === "AWS暗記帳（元データ）")) {
  const page = { id: `recovered-page-${Date.now()}`, name: "AWS暗記帳（元データ）", cards };
  state.pages.push(page);
  if (!state.activePageId) state.activePageId = page.id;
  fs.writeFileSync(dataFile, JSON.stringify(state, null, 2), "utf8");
}

console.log(`復元ページを追加しました: ${cards.length}問`);
