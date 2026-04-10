# Deploying GrammarHub to Cloudflare Pages

Your live URL: **https://grammar-a7x.pages.dev**

---

## Option A — Drag and drop (fastest, 2 minutes)

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Pages**
2. Click your project **grammar-a7x**
3. Click **Create new deployment** → **Upload assets**
4. Drag the entire contents of this `Grammar-fixed/` folder into the upload area  
   *(or zip the folder and upload the zip)*
5. Click **Deploy site**

Done. The new version is live in ~30 seconds.

---

## Option B — Wrangler CLI (repeatable)

```sh
# Install once
npm install -g wrangler

# Authenticate once
wrangler login

# Deploy from the Grammar-fixed directory
cd Grammar-fixed
wrangler pages deploy . --project-name=grammar-a7x
```

---

## After deploying

### Verify it worked
Open https://grammar-a7x.pages.dev and check:
- [ ] Title says **GrammarHub** (not EnglishMaster)
- [ ] Dark mode works on exercise cards
- [ ] Unit 1 → do exercises → score below 70% → see "Try again" button
- [ ] Score above 70% → see "Mark unit complete" button
- [ ] Mark complete with score ≥ 80% → certificate appears
- [ ] Dashboard → "Your data" section → "Download backup" works

### Check analytics are collecting
Open the browser console on any page and type:
```js
Analytics.report()
```
You should see page view counts, session data, and any actions tracked.

---

## Telegram bot (optional)

If you want cross-device sync via Telegram:

1. Create a Cloudflare KV namespace:
   ```sh
   wrangler kv:namespace create PROGRESS
   ```

2. Add the KV ID to `wrangler.toml`:
   ```toml
   [[kv_namespaces]]
   binding = "PROGRESS"
   id = "<your-kv-id>"
   ```

3. Set your bot token as a secret:
   ```sh
   wrangler secret put BOT_TOKEN
   ```

4. Deploy the worker:
   ```sh
   wrangler deploy bot-worker.js
   ```

5. Edit `sync.js` — set `WORKER_URL` to your deployed worker URL.

See `TELEGRAM_SETUP.md` for the full bot setup walkthrough.
