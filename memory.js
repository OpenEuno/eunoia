// ===== 🧠 MEMORY SYSTEM TANPA LIMIT =====
const fs = require("fs");
const MEMORY_DIR = "./memory";

if (!fs.existsSync(MEMORY_DIR)) {
  fs.mkdirSync(MEMORY_DIR);
}

function getMemoryPath(userNumber) {
  return `${MEMORY_DIR}/${userNumber}.json`;
}

function loadMemory(userNumber) {
  const path = getMemoryPath(userNumber);
  if (fs.existsSync(path)) {
    const data = JSON.parse(fs.readFileSync(path, "utf8"));
    return data;
  }
  return { history: [], lastUpdated: Date.now() };
}

function saveMemory(userNumber, memoryData) {
  const path = getMemoryPath(userNumber);
  fs.writeFileSync(path, JSON.stringify(memoryData, null, 2));
}

function appendMemory(userNumber, role, content) {
  const mem = loadMemory(userNumber);
  mem.history.push({ role, content });
  // ❌ Hapus pembatasan 20 percakapan
  mem.lastUpdated = Date.now();
  saveMemory(userNumber, mem);
}

module.exports = { loadMemory, saveMemory, appendMemory };
