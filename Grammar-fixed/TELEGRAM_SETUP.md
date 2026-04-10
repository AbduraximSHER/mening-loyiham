# Telegram Mini App Setup Guide

## 1. BotFather da bot yaratish

Telegram da @BotFather ni oching va quyidagi buyruqlarni yuboring:

```
/newbot
```

Bot nomi: `English Vocabulary Bot`
Username: `engvocab_uz_bot` (yoki boshqa bo'sh nom)

BotFather sizga **BOT TOKEN** beradi. Uni saqlang.

## 2. Mini App qo'shish

BotFather ga quyidagi buyruqni yuboring:

```
/newapp
```

- Bot tanlang: yuqorida yaratgan botingiz
- App nomi: `English Vocabulary`
- App qisqa nomi: `vocab`
- App URL: `https://abduraximsher.github.io/Grammar/`
- App tavsifi: `1000+ mashq, 60 unit, o'zbek tiliga tarjima. Bepul ingliz tili lug'ati!`

## 3. Menu tugmasini qo'shish

```
/setmenubutton
```

- Bot tanlang
- URL: `https://abduraximsher.github.io/Grammar/`
- Tugma nomi: `📚 Vocabulary`

## 4. Bot tavsifi

```
/setdescription
```

```
🎓 English Vocabulary in Use — Advanced

📚 60 ta unit
📝 1000+ mashq (6 xil tur)
🇺🇿 O'zbek tilida tarjima
🤖 AI yordamida tekshirish
🔊 Talaffuz (audio)
🃏 Flashcards
📊 Progress tracking

Boshlash uchun pastdagi tugmani bosing! 👇
```

## 5. Bot komandalari

```
/setcommands
```

```
start - Boshlash
vocab - Vocabulary mashq
daily - Kunlik mashq
progress - Progressni ko'rish
```

## 6. Start xabari uchun bot kodi (ixtiyoriy)

Agar bot serveringiz bo'lsa, /start komandasiga javob:

```
Salom! 🎓

Men English Vocabulary botman.

📚 1000+ mashq
🇺🇿 O'zbek tilida tarjima
🤖 AI tekshirish

Boshlash uchun pastdagi "📚 Vocabulary" tugmasini bosing!
```

## 7. Mini App URL

Foydalanuvchilar uchun to'g'ridan-to'g'ri link:

```
https://t.me/abgrammar_bot/vocab
```

(abgrammar_bot ni o'zingizning bot username ga almashtiring)

## 8. Telegram guruhlariga ulashish

Quyidagi xabarni Telegram English-learning guruhlariga yuboring:

```
🎓 Bepul English Vocabulary Mini App!

📚 60 unit, 1000+ mashq
🇺🇿 Hammasini o'zbek tilida tarjima
🤖 AI tekshiradigan yozma mashqlar
🔊 Talaffuz eshitish
🃏 Flashcards + Spaced Repetition

📱 Telegram ichida ishlaydi — hech narsa yuklab olish shart emas!

👉 https://t.me/abgrammar_bot/vocab
```

## Texnik ma'lumot

- Mini App URL: `https://abduraximsher.github.io/Grammar/`
- telegram.js avtomatik ravishda Telegram muhitini aniqlaydi
- Telegram Cloud Storage orqali progress sinxronlanadi
- Haptic feedback (tebranish) to'g'ri/noto'g'ri javobda ishlaydi
- Telegram Dark/Light theme avtomatik qo'llanadi
- MainButton "⚡ Kunlik mashq" ko'rsatadi
- BackButton orqaga qaytish uchun ishlaydi
