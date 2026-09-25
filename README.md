# Payza Console

A self-hosted test bench for every feature in the [Payzaapi](https://payzaapi.co.ke/docs) API: pay-ins in all 14 currencies, verify, refunds, payouts, customers, plans & subscriptions, invoices, POS, and a live webhook log with signature verification.

Your Payzaapi keys are typed into the console's **Settings** page and stored in your own Postgres database. The Node server signs every request server-side — your secret key never reaches the browser.

## How it's built

- **Server:** Node.js + Express. One `server/` app that proxies every Payzaapi endpoint (adding your keys), logs each request/response to Postgres, and receives real webhooks on `/webhooks/payza`.
- **Database:** Postgres (built for [Neon](https://neon.tech)) — stores your API keys, a log of every request this console has made, and every webhook delivery it has received.
- **Frontend:** A single static page (`public/`) — no build step, no framework, just HTML/CSS/JS served by the same Express app.

Because it's one Node service, it deploys to Render as a single Web Service.

## 1. Run it locally first (optional but recommended)

```bash
npm install
cp .env.example .env
# edit .env and set DATABASE_URL to a Postgres instance (a free Neon project works great)
npm start
```

Open `http://localhost:3000`. Go to **Settings**, paste in your Payzaapi test keys (`pk_test_…` / `sk_test_…`) and your webhook signing secret, then save.

For webhooks to reach your machine locally you'd need a tunnel (e.g. `ngrok http 3000`) and to use that URL as your callback — otherwise everything except live webhook delivery works fine against `localhost`.

## 2. Create your database on Neon

1. Go to [neon.tech](https://neon.tech) and create a free project.
2. Open your project's **Dashboard → Connection Details** and copy the connection string. Make sure it ends with `?sslmode=require`, e.g.:
   ```
   postgresql://neondb_owner:abc123@ep-cool-name-12345.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Keep this handy — it becomes the `DATABASE_URL` environment variable on Render. You don't need to run any SQL yourself; the app creates its own tables (`settings`, `transactions`, `webhook_events`) the first time it starts.

## 3. Push this project to GitHub

```bash
cd payza-console
git init
git add .
git commit -m "Payza Console: a test bench for the Payzaapi API"
git branch -M main
git remote add origin https://github.com/<your-username>/payza-console.git
git push -u origin main
```

(`.env` is already in `.gitignore`, so your local secrets won't be pushed. Real secrets live only in Render's environment variables, set in the next step.)

## 4. Deploy on Render

**Option A — Blueprint (fastest):** this repo includes `render.yaml`. In the Render dashboard, choose **New → Blueprint**, point it at your GitHub repo, and Render will read `render.yaml` and create the web service for you. It will prompt you for the two environment variables below since they're marked `sync: false`.

**Option B — Manual:**
1. In Render, choose **New → Web Service** and connect your GitHub repo.
2. Runtime: **Node**. Build command: `npm install`. Start command: `npm start`.
3. Under **Environment**, add:
   - `DATABASE_URL` — the Neon connection string from step 2.
   - `CONSOLE_PASSWORD` *(optional)* — set this to put a simple password screen in front of the whole console, since it can move real money once you add live keys.
4. Click **Create Web Service**. Render builds and starts it, and gives you a URL like `https://payza-console.onrender.com`.

## 5. Finish setup in the deployed app

1. Open your Render URL. If you set `CONSOLE_PASSWORD`, enter it at the lock screen.
2. Go to **Settings**, paste in your Payzaapi keys and webhook signing secret (found in Payzaapi's Dashboard → API keys), and save.
3. Copy the **callback URL** shown on that page — it's `https://payza-console.onrender.com/webhooks/payza`. Every payment you create from the **Pay in** tab uses it automatically, so real signed webhooks flow back into the **Webhooks** tab.
4. Go to **Pay in**, pick a currency, and send a test payment. Test-mode keys succeed instantly and produce a real webhook.

## What each tab does

| Tab | Covers |
|---|---|
| Dashboard | Totals, pay-ins by currency, recent requests, recent webhooks |
| Pay in | `POST /pay` for all 14 currencies, with the KES M-Pesa / hosted-checkout switch |
| Verify a payment | `GET /verify/{reference}` |
| Refunds | `POST /refund`, `GET /refunds` |
| Payouts | `GET /payout-methods`, `GET /banks`, `POST /payout`, `GET /payouts` |
| Customers | `POST /customers`, `GET /customers` |
| Plans & subscriptions | `POST /plans`, `GET /plans`, `POST /subscriptions`, `GET /subscriptions`, `POST /subscription-cancel` |
| Invoices | `POST /invoices`, `GET /invoices`, `POST /invoice` (send / mark paid / cancel) |
| POS till | `POST /pos/session-open`, `/pos/session-close`, `/pos/sale`, `/pos/refund`, `GET /pos/sales` |
| Webhooks | Live events received on `/webhooks/payza` (with HMAC verification) plus Payzaapi's own delivery log and resend |
| Currencies | The reference table of currencies, methods and minimums from the docs |
| Settings | Your keys, base URL, callback URL, and the go-live checklist |

## Notes

- Free Render web services and free Neon databases both spin down when idle, so the first request after a quiet period can take a few seconds while things wake up.
- Switching from test to live is just pasting in your `pk_live_` / `sk_live_` keys in Settings — nothing else changes.
- If you ever regenerate your webhook signing secret in the Payzaapi dashboard, update it here too, or deliveries will show as "unverified."
