<div align="center">
  <br />
  <h1>⚽ Football League Manager</h1>
  <p><strong>Open-source football league management, reimagined.</strong></p>
  <p><em>Fully self-hosted. You bring the database. Nothing is pre-configured.</em></p>
  <br />
  <p>
    <a href="#features">Features</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#local-setup">Local Setup</a> •
    <a href="#free-hosting">Free Hosting</a> •
    <a href="#tech-stack">Tech Stack</a>
  </p>
  <br />
</div>

---

Create, manage, and track football leagues — round-robin or knockout — with standings, player profiles, match scoring, playoffs, and a Hall of Fame. 100% self-hostable, zero vendor lock-in, no telemetry, no accounts required.

---

## ✨ Features

<table>
  <tr>
    <td align="center">🏆</td>
    <td><strong>League &amp; Cup Modes</strong><br/>Round-robin leagues or knockout brackets, single or double legs.</td>
    <td align="center">📊</td>
    <td><strong>Live Standings</strong><br/>Auto-calculated tables with Pts, W, D, L, GD, GF.</td>
  </tr>
  <tr>
    <td align="center">⚡</td>
    <td><strong>Auto-Fixtures</strong><br/>One-click generation of schedules and brackets.</td>
    <td align="center">🎯</td>
    <td><strong>Score Entry</strong><br/>Record match results with penalty support for draws.</td>
  </tr>
  <tr>
    <td align="center">🏅</td>
    <td><strong>Playoffs</strong><br/>Auto-detect top players and generate semi-final + final.</td>
    <td align="center">👑</td>
    <td><strong>Hall of Fame</strong><br/>Permanent record of champions and their win counts.</td>
  </tr>
  <tr>
    <td align="center">👤</td>
    <td><strong>Player Profiles</strong><br/>Career wins, match history, and star ratings.</td>
    <td align="center">🎉</td>
    <td><strong>Champion Celebration</strong><br/>Confetti, crown, and POWER animation on title win.</td>
  </tr>
  <tr>
    <td align="center">📱</td>
    <td><strong>Mobile-First UI</strong><br/>Apple-inspired dark design, responsive, touch-friendly.</td>
    <td align="center">🔌</td>
    <td><strong>Any PostgreSQL</strong><br/>Works with Neon, Supabase, AWS RDS, local Docker, etc.</td>
  </tr>
</table>

---

## 🚀 Quick Start

```bash
git clone https://github.com/your-username/football-league-manager.git
cd football-league-manager
cp .env.example .env
npm install
```

Then set up a PostgreSQL database (see below), put your connection string in `.env`, and:

```bash
npm run dev
```

Open **http://localhost:3001** — the app is a **blank slate**. No data, no users, no leagues. Create everything yourself.

---

## 🐘 Bring Your Own Database

This app requires a PostgreSQL database. It does not ship with one, seed data, or any pre-configured connection. You must provide your own.

### Option A — Docker (easiest, local)

```bash
docker run --name flm-pg \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:16

docker exec -it flm-pg psql -U postgres -c "CREATE DATABASE football_league_manager;"
```

Then in `.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/football_league_manager
```

### Option B — Cloud (free)

| Provider | Free Tier | How to Get URL |
|----------|-----------|----------------|
| [Neon](https://neon.tech) | 0.5 GB, always-free | Dashboard → Connection Details → copy string |
| [Supabase](https://supabase.com) | 500 MB, always-free | Project → Database Settings → Connection string |
| [Aiven](https://aiven.io) | 5 GB, 30-day free | Create PostgreSQL service → copy URI |
| [Railway](https://railway.app) | $5 free credit | New Project → PostgreSQL → connect |

### Option C — Local install

Install PostgreSQL from [postgresql.org](https://www.postgresql.org/download/), create a database, and use your local connection string.

### How it works

On the first API call, `lib/db.js` **auto-creates all tables** — no migrations, no CLI commands. Your database starts completely empty. Start by adding players, creating leagues, and generating fixtures from the UI.

---## ☁️ Free Hosting

### Database (PostgreSQL)

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| [Neon](https://neon.tech) | 0.5 GB, always-free | Serverless, works with `@neondatabase/serverless` |
| [Supabase](https://supabase.com) | 500 MB, always-free | Includes auth if you want it |
| [Render](https://render.com) | 1 GB RAM, spins down | Slower cold starts |

### Frontend (Next.js)

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| [Cloudflare Pages](https://pages.cloudflare.com) | Unlimited requests, 500 builds/mo | Native via `@opennextjs/cloudflare` |
| [Vercel](https://vercel.com) | 100 GB bandwidth | Seamless Next.js support |
| [Netlify](https://netlify.com) | 100 GB bandwidth | Needs adapter |

### Recommended Stack (100% Free)

```
Frontend: Cloudflare Pages  ← $0, unlimited
Database: Neon              ← $0, 0.5 GB
```

Deploy to Cloudflare:
```bash
npm run deploy
```

Set `DATABASE_URL` as an environment variable in your Cloudflare dashboard.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org) (React 19) |
| **Styling** | Pure CSS (Apple-inspired dark design) |
| **Database** | PostgreSQL (any provider — you choose) |
| **Driver** | [@neondatabase/serverless](https://neondatabase.dev) (works with any PG) |
| **Hosting** | Cloudflare Pages via [@opennextjs/cloudflare](https://opennextjs.org) |

No ORM. No runtime deps beyond Next.js + PG driver. Zero bloat.

---

## 🔧 Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ Yes | Your PostgreSQL connection string |

Tables auto-create on first API call — no manual migration.

---

## 📁 Project Structure

```
├── app/
│   ├── api/              # REST API routes (leagues, matches, players, etc.)
│   ├── hall-of-fame/     # Hall of Fame page
│   ├── leagues/[id]/     # League detail page
│   ├── players/          # Players management page
│   ├── globals.css       # Global styles
│   ├── layout.js         # Root layout
│   └── page.js           # Home page
├── components/           # Reusable React components
├── lib/
│   ├── db.js             # Database pool, schema init, champion detection
│   └── constants.js      # Colors, helpers, league status logic
├── public/               # Static assets (replace with your own hero image)
├── .env.example          # Environment variable template (copy to .env)
├── wrangler.jsonc        # Cloudflare Workers config
└── package.json
```

---

## 🤝 Contributing

1. Fork the repo
2. `git checkout -b feat/your-idea`
3. Make changes, commit
4. Push and open a PR

No comments in code, consistent naming, functional components.

---

## 📄 License

MIT

---

<div align="center">
  <sub>Built with ⚽ for the love of the game</sub>
  <br />
  <sub>Star on GitHub if you find this useful</sub>
</div>
