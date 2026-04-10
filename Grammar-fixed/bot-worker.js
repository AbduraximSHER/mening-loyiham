// ═══════════════════════════════════════════
// Telegram Bot — Cloudflare Worker
// /start bosilganda Mini App tugmasi yuboradi
// ═══════════════════════════════════════════

const BOT_TOKEN = "YOUR_BOT_TOKEN_HERE"; // BotFather dan olgan token
const MINI_APP_URL = "https://abduraximsher.github.io/Grammar/";
const BOT_USERNAME = "abgrammar_bot";

// Bindings expected in wrangler.toml:
//   [[kv_namespaces]]
//   binding = "PROGRESS"
//   id = "..."
//
// The PROGRESS KV namespace stores one JSON blob per user at key `u:<telegram_user_id>`.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ─── sync API ───────────────────────────────────────────────
    // Client sends initData on every request; we verify the HMAC so
    // users can only read/write their own blob.
    if (url.pathname === "/sync") {
      return handleSync(request, env);
    }

    // ─── Telegram webhook (unchanged) ──────────────────────────
    if (request.method === "POST") {
      const body = await request.json();

      if (body.message) {
        const chatId = body.message.chat.id;
        const text = body.message.text || "";
        const firstName = body.message.from?.first_name || "do'stim";

        if (text === "/start") {
          await sendStartMessage(chatId, firstName);
        } else if (text === "/help") {
          await sendHelpMessage(chatId);
        } else if (text === "/daily") {
          await sendDailyMessage(chatId);
        } else {
          await sendDefaultMessage(chatId);
        }
      }

      return new Response("OK");
    }

    return new Response("EnglishMaster Bot is running! 🎓");
  }
};

// ─────────────────────────────────────────────────────────────────
// Sync handler
// ─────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

async function handleSync(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Read initData from header (POST/GET both)
  const initData = request.headers.get("X-Telegram-Init-Data") || "";
  const verified = await verifyInitData(initData, BOT_TOKEN);
  if (!verified) {
    return json({ error: "unauthorized" }, 401);
  }

  const userId = verified.user?.id;
  if (!userId) return json({ error: "no user in initData" }, 400);

  const key = `u:${userId}`;

  if (request.method === "GET") {
    const stored = await env.PROGRESS.get(key, { type: "json" });
    return json({ ok: true, data: stored || null });
  }

  if (request.method === "POST") {
    let body;
    try { body = await request.json(); }
    catch { return json({ error: "bad json" }, 400); }

    if (!body || typeof body !== "object") {
      return json({ error: "body must be object" }, 400);
    }

    // Merge against existing so a stale client can't blow away newer fields.
    const existing = (await env.PROGRESS.get(key, { type: "json" })) || {};
    const merged = mergeByTimestamp(existing, body);

    await env.PROGRESS.put(key, JSON.stringify(merged));
    return json({ ok: true, data: merged });
  }

  return json({ error: "method not allowed" }, 405);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS }
  });
}

/**
 * Field-level last-write-wins merge.
 * Each top-level field in the blob has a sibling `_ts:<field>` timestamp;
 * the newer timestamp wins. Fields without timestamps just use the incoming value.
 */
function mergeByTimestamp(existing, incoming) {
  const out = { ...existing };
  for (const k of Object.keys(incoming)) {
    if (k.startsWith("_ts:")) continue;
    const tsKey = `_ts:${k}`;
    const incTs = incoming[tsKey] || 0;
    const oldTs = existing[tsKey] || 0;
    if (incTs >= oldTs) {
      out[k] = incoming[k];
      out[tsKey] = incTs || Date.now();
    }
  }
  return out;
}

/**
 * Verify Telegram Mini App initData per
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Procedure: pull out `hash`, sort remaining params alphabetically as k=v
 * joined by \n, compute HMAC-SHA256 where the key is HMAC-SHA256("WebAppData", BOT_TOKEN),
 * and compare hex digest to `hash`.
 */
async function verifyInitData(initDataStr, botToken) {
  if (!initDataStr) return null;
  const params = new URLSearchParams(initDataStr);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const pairs = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = pairs.map(([k, v]) => `${k}=${v}`).join("\n");

  const enc = new TextEncoder();
  const secret = await crypto.subtle.importKey(
    "raw", enc.encode("WebAppData"),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const secretKeyBytes = await crypto.subtle.sign("HMAC", secret, enc.encode(botToken));

  const checkKey = await crypto.subtle.importKey(
    "raw", secretKeyBytes,
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sigBytes = await crypto.subtle.sign("HMAC", checkKey, enc.encode(dataCheckString));

  const sigHex = [...new Uint8Array(sigBytes)]
    .map(b => b.toString(16).padStart(2, "0")).join("");

  if (sigHex !== hash) return null;

  // Reject if initData is older than 1 day (replay protection)
  const authDate = parseInt(params.get("auth_date") || "0", 10);
  if (!authDate || Date.now() / 1000 - authDate > 86400) return null;

  try {
    const user = JSON.parse(params.get("user") || "null");
    return { user, authDate };
  } catch {
    return null;
  }
}

async function sendStartMessage(chatId, name) {
  const text = `Salom, ${name}! 👋

🎓 <b>EnglishMaster</b> — ingliz tili lug'atini o'rganishning eng oson yo'li.

📚 60 ta mavzu
📝 1000+ mashq
🇺🇿 O'zbek tilida tarjima
🤖 AI tekshirish
🃏 Flashcards
🔊 Talaffuz

Pastdagi tugmani bosib boshlang 👇`;

  await sendTelegramMessage(chatId, text, {
    inline_keyboard: [
      [{ text: "📚 Ilovani ochish", web_app: { url: MINI_APP_URL } }],
      [
        { text: "⚡ Kunlik mashq", web_app: { url: MINI_APP_URL + "advanced-vocabulary.html" } },
      ],
      [
        { text: "📤 Do'stga ulashish", switch_inline_query: "Ingliz tili lug'atini o'rganish uchun zo'r bot! 🎓" },
      ]
    ]
  });
}

async function sendHelpMessage(chatId) {
  const text = `🆘 <b>Yordam</b>

/start — Botni boshlash
/daily — Kunlik mashq
/help — Yordam

<b>Qanday ishlaydi?</b>
1. "📚 Ilovani ochish" tugmasini bosing
2. Mavzuni tanlang
3. Theory ni o'qing
4. Mashqlarni yeching
5. Har kuni takrorlang! 🔥

Savol bo'lsa: @AbduraximSHER`;

  await sendTelegramMessage(chatId, text, {
    inline_keyboard: [
      [{ text: "📚 Ilovani ochish", web_app: { url: MINI_APP_URL } }]
    ]
  });
}

async function sendDailyMessage(chatId) {
  // Word of the day
  const words = [
    { w: "precarious", d: "ishonchsiz, xavfli", e: "He made a precarious living as a freelance writer." },
    { w: "ubiquitous", d: "hamma joyda mavjud", e: "Mobile phones have become ubiquitous." },
    { w: "lucrative", d: "foyda keltiradigan", e: "She started a lucrative business." },
    { w: "meticulous", d: "puxta, ehtiyotkor", e: "He kept meticulous records." },
    { w: "eloquent", d: "notiq, so'zamol", e: "She gave an eloquent speech." },
    { w: "resilient", d: "chidamli", e: "Children are remarkably resilient." },
    { w: "diligent", d: "mehnatkash", e: "She was a diligent student." },
    { w: "compelling", d: "jozibali", e: "The film presented a compelling story." },
    { w: "impeccable", d: "benuqson", e: "The hotel has impeccable service." },
    { w: "unprecedented", d: "misli ko'rilmagan", e: "The pandemic caused unprecedented disruption." },
  ];

  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  const word = words[dayOfYear % words.length];

  const text = `📅 <b>Bugungi so'z</b>

🔤 <b>${word.w}</b>
🇺🇿 ${word.d}

💬 <i>"${word.e}"</i>

Mashq qilish uchun ilovani oching 👇`;

  await sendTelegramMessage(chatId, text, {
    inline_keyboard: [
      [{ text: "⚡ Mashq qilish", web_app: { url: MINI_APP_URL + "advanced-vocabulary.html" } }]
    ]
  });
}

async function sendDefaultMessage(chatId) {
  const text = `Ilovani ochish uchun pastdagi tugmani bosing 👇

Yoki /help buyrug'ini yuboring.`;

  await sendTelegramMessage(chatId, text, {
    inline_keyboard: [
      [{ text: "📚 Ilovani ochish", web_app: { url: MINI_APP_URL } }]
    ]
  });
}

async function sendTelegramMessage(chatId, text, replyMarkup) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: "HTML",
  };

  if (replyMarkup) {
    body.reply_markup = JSON.stringify(replyMarkup);
  }

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
