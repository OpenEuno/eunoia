const { loadMemory, appendMemory } = require('./memory.js');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const EUNOIA_PERSONALITY = require('./eunoia-personality.js'); // ⬅️ IMPORT PERSONALITY

// 🔹 Konfigurasi Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSyArRoFaxGa83OMUHFjt_6L71kN_jF2whcM");

// 🔹 Cache untuk response cepat
let responseCache = new Map();

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "ai-coaching-bot"
  }),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// 🔹 Inisialisasi users
let users = [];
const USERS_FILE = "users.json";
const EXPIRY_NOTIFICATION_DAYS = [7, 3, 1];

// 🔹 Load & Save Users
function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      users = JSON.parse(data);
      console.log(`✅ Loaded ${users.length} users`);
    }
  } catch (error) {
    console.error('❌ Error loading users:', error);
    users = [];
  }
}

function saveUsers() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('❌ Error saving users:', error);
  }
}

function findUser(number) {
  return users.find(u => u.number === number);
}

// 🔹 Gemini AI Integration DENGAN PERSONALITY KOMPLEKS
async function generateAIResponse(userMessage, userData) {
  const userNumber = userData.number;
  const memory = loadMemory(userNumber);
  
  // Gabungkan konteks dari percakapan terakhir
  const memoryContext = memory.history
    .slice(-10)
    .map(h => `${h.role === "user" ? "User" : "Eunoia"}: ${h.content}`)
    .join("\n");

  const cacheKey = userMessage.substring(0, 50).toLowerCase();
  if (responseCache.has(cacheKey)) {
    return responseCache.get(cacheKey);
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        maxOutputTokens: 200,  // agak panjang
        temperature: 0.7,
      }
    });

    const systemPrompt = EUNOIA_PERSONALITY.getSystemPrompt();
    const fullPrompt = `${systemPrompt}\n\nBerikut percakapan terakhir:\n${memoryContext}\n\nUser: ${userMessage}\nEunoia:`;

    const result = await model.generateContent(fullPrompt);
    const response = result.response.text();

    let cleanResponse = response;

    // Hapus "(Ketik.)" dan instruksi aneh
    cleanResponse = cleanResponse.replace(/\(Ketik.*?\)/gi, '');

    // Hapus markdown **teks**
    cleanResponse = cleanResponse.replace(/\*\*(.*?)\*\*/g, '$1');

    // Hapus bullet point berlebihan
    cleanResponse = cleanResponse.replace(/^[\*\-]\s*/gm, '');

    // Kurangi spam emoji (biar max 1 berurutan)
    cleanResponse = cleanResponse.replace(/([^\w\s])\1{1,}/g, '$1');

    // Hapus potongan kalimat ngegantung kayak "Leb."
    cleanResponse = cleanResponse.replace(/\bLeb\.$/gi, '');

    // Simpan ke memory
    appendMemory(userNumber, "user", userMessage);
    appendMemory(userNumber, "assistant", response);

    // SMART CHUNKING - bagi berdasarkan kalimat natural
    const chunks = [];
    const sentences = cleanResponse.split(/[.!?]+/).filter(s => s.trim().length > 3);
    
    let currentChunk = "";
    for (let sentence of sentences) {
      sentence = sentence.trim() + '.';
      
      // Jika chunk sekarang + kalimat baru terlalu panjang, push chunk sekarang
      if ((currentChunk + sentence).length > 50 && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += " " + sentence;
      }
    }
    
    // Push chunk terakhir
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    // Pastikan minimal 1 chunk
    if (chunks.length === 0) {
      chunks.push(cleanResponse);
    }

    console.log(`🤖 Generated ${chunks.length} chunks:`, chunks);
    
    // Cache result
    responseCache.set(cacheKey, chunks);
    setTimeout(() => responseCache.delete(cacheKey), 60000);

    return chunks; // ✅ return array
  } catch (error) {
    console.error("❌ Gemini Error:", error);
    return ["bentar-bentar, lagi gangguan nih, kalo ga selesai2 hubungi si owner sialan aja"];
  }
}

// 🔹 Expiry check
function checkExpired(user) {
  if (user.status === "paid" && user.expireAt && Date.now() > user.expireAt) {
    user.status = "expired";
    saveUsers();
    return true;
  }
  return false;
}

function getRemainingDays(user) {
  if (user.status === "paid" && user.expireAt) {
    const diff = user.expireAt - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }
  return 0;
}

// 🔹 WhatsApp Events
client.on('qr', qr => {
  console.log('📱 SCAN QR INI DENGAN WHATSAPP ANDA:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ Bot WhatsApp siap!');
  loadUsers();
});

client.on('message', async msg => {
  try {
    if (msg.fromMe) return;
    
    const from = msg.from;
    const body = msg.body.trim();

    // === OWNER COMMANDS ===
    if (body.startsWith("/add")) {
      const parts = body.split(" ");
      if (parts.length < 3) return msg.reply("❌ Format: /add [nomor] [hari] [kuota?]");
      
      const target = parts[1] + "@c.us";
      const days = parseInt(parts[2]) || 30;
      const quota = parts[3] ? parseInt(parts[3]) : undefined;

      let user = findUser(target);
      if (!user) {
        user = { number: target, registeredAt: Date.now(), usageCount: 0 };
        users.push(user);
      }

      user.status = "paid";
      user.expireAt = Date.now() + days * 24 * 60 * 60 * 1000;
      if (quota !== undefined) user.quota = quota;
      saveUsers();
      
      msg.reply(`✅ User ${target} aktif ${days} hari. Quota: ${quota ?? "Unlimited"}`);
      return;
    }

    if (body.startsWith("/cek")) {
      const parts = body.split(" ");
      const target = parts[1] + "@c.us";
      const user = findUser(target);
      
      if (user) {
        const days = getRemainingDays(user);
        msg.reply(`📊 Status: ${user.status} (${days} hari)\nQuota: ${user.quota ?? "Unlimited"}`);
      } else {
        msg.reply("❌ User tidak ditemukan.");
      }
      return;
    }

    // === USER MESSAGES ===
    let user = findUser(from);
    if (!user) {
      msg.reply("👋 Kamu belum terdaftar. Hubungi 6282229301962 owner untuk akses.");
      return;
    }

    if (checkExpired(user) || user.status !== "paid") {
      msg.reply("⛔ Aksesmu tidak aktif. Hubungi owner untuk perpanjangan.");
      return;
    }

    // Cek kuota
    if (user.quota !== undefined) {
      if (user.quota <= 0) {
        msg.reply("⚠️ Kuotamu habis. Hubungi 6282229301962 owner untuk top-up.");
        return;
      }
      user.quota -= 1;
    }

    user.usageCount = (user.usageCount || 0) + 1;
    saveUsers();

    // Generate AI response
    console.log('🔄 Attempting to send typing indicator...');
    try {
      await msg.getChat().then(chat => chat.sendStateTyping());
      console.log('✅ Typing indicator successful');
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (typingError) {
      console.log('❌ Typing indicator error:', typingError.message);
    }

    // ✅ PANGGIL AI DAN REPLY
    console.log('🤖 Calling AI response...');
    const chunks = await generateAIResponse(body, user);
    console.log(`🤖 AI Response chunks:`, chunks);

    for (let i = 0; i < chunks.length; i++) {
      try {
        // kasih typing effect biar natural
        await msg.getChat().then(chat => chat.sendStateTyping());
        await new Promise(resolve => setTimeout(resolve, 8000)); // delay tiap part

        await client.sendMessage(msg.from, chunks[i]);
        console.log(`✅ Sent chunk ${i + 1}/${chunks.length}`);
      } catch (err) {
        console.error("❌ Error sending chunk:", err.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}); // ⬅️ INI PENUTUP client.on('message')

client.initialize();

// 🔹 ✅✅✅ EXPORT FUNGSI - TARUH DI PALING BAWAH SETELAH client.initialize()
module.exports = {
  generateAIResponse,
  findUser,
  checkExpired,
  getRemainingDays,
  loadUsers,
  saveUsers
};