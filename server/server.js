// プロジェクト内のJSONファイルを読み書きする保存サーバーです。
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const port = 8787;
const dataFile = path.join(__dirname, "..", "data", "anki-data.json");
const backupDirectory = path.join(__dirname, "..", "data", "backups");

// 文字化けした置換文字を保存しないための検査です。
function containsBrokenText(value) {
  if (typeof value === "string") return value.includes("�");
  if (Array.isArray(value)) return value.some(containsBrokenText);
  if (value && typeof value === "object")
    return Object.values(value).some(containsBrokenText);
  return false;
}

function createBackup() {
  if (!fs.existsSync(dataFile)) return;
  fs.mkdirSync(backupDirectory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[.:]/g, "-");
  fs.copyFileSync(
    dataFile,
    path.join(backupDirectory, `anki-data-${stamp}.json`),
  );
  const backups = fs
    .readdirSync(backupDirectory)
    .filter((name) => name.startsWith("anki-data-") && name.endsWith(".json"))
    .sort()
    .reverse();
  for (const oldBackup of backups.slice(30)) {
    fs.unlinkSync(path.join(backupDirectory, oldBackup));
  }
}

const server = http.createServer((request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }
  if (request.method === "GET" && request.url === "/api/state") {
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(fs.readFileSync(dataFile, "utf8"));
    return;
  }
  if (request.method === "PUT" && request.url === "/api/state") {
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => {
      try {
        const parsed = JSON.parse(body);
        if (containsBrokenText(parsed)) {
          response.writeHead(422);
          response.end("Broken text detected");
          return;
        }
        createBackup();
        fs.copyFileSync(dataFile, `${dataFile}.bak`);
        fs.writeFileSync(dataFile, JSON.stringify(parsed, null, 2), "utf8");
        response.writeHead(204);
        response.end();
      } catch {
        response.writeHead(400);
        response.end("Invalid state data");
      }
    });
    return;
  }
  response.writeHead(404);
  response.end();
});
server.listen(port, "0.0.0.0", () =>
  console.log(`データ保存サーバー: http://localhost:${port}`),
);
