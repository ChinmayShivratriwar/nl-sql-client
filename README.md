# NL-SQL Engine 🚀

> **Transform plain English into powerful SQL queries — instantly.**

NL-SQL Engine is an AI-powered natural language to SQL converter. Type a question in plain English, and the engine generates and executes the SQL query — returning formatted results in real time.

![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7.3-646CFF?logo=vite&logoColor=white)
![Axios](https://img.shields.io/badge/Axios-1.13-5A29E4?logo=axios&logoColor=white)
![Deploy](https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render&logoColor=white)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🗣️ **Natural Language Input** | Ask questions in plain English — no SQL knowledge required |
| ⚡ **Instant SQL Generation** | AI generates and executes the SQL, returning results in milliseconds |
| 📊 **Rich Results Table** | Query results displayed in a clean, sortable data table |
| 🔧 **Generated SQL Preview** | See exactly what SQL was generated with syntax highlighting |
| 📋 **One-Click Copy** | Copy generated SQL to clipboard instantly |
| ⚡ **Cache Indicators** | See if results were served from cache for faster response |
| 🕐 **Execution Time** | Every query shows execution time in milliseconds |
| `{ }` **Raw JSON View** | Collapsible raw JSON response for debugging |
| ☕ **Slow Request Warning** | Smart notification when Render's free tier is cold-starting |
| 💓 **Lazy Heartbeat** | Silent background ping to prevent Render from sleeping |
| 🌙 **Premium Dark UI** | Handcrafted dark theme with glassmorphism and micro-animations |

---

## 🏗️ Architecture

```
┌──────────────────────────────┐       ┌──────────────────────────────┐
│        FRONTEND (React)      │       │     BACKEND (Spring Boot)    │
│                              │       │                              │
│  ┌────────────────────────┐  │       │  ┌────────────────────────┐  │
│  │   Question Input       │──┼──POST─┼──▶  /api/v1/query         │  │
│  │   (Natural Language)   │  │       │  │  AI SQL Generation     │  │
│  └────────────────────────┘  │       │  │  Query Execution       │  │
│                              │       │  └───────────┬────────────┘  │
│  ┌────────────────────────┐  │       │              │              │
│  │   Results Display      │◀─┼──JSON─┼──────────────┘              │
│  │   • SQL Preview        │  │       │  ┌────────────────────────┐  │
│  │   • Data Table         │  │       │  │  /api/v1/query/health  │  │
│  │   • Raw JSON           │  │       │  │  (Heartbeat Endpoint)  │  │
│  └────────────────────────┘  │       │  └────────────────────────┘  │
│                              │       │                              │
│  ┌────────────────────────┐  │       │                              │
│  │   Heartbeat Service    │──┼─GET───┼──▶  every 13 min (silent)   │
│  │   (Background)         │  │       │                              │
│  └────────────────────────┘  │       └──────────────────────────────┘
│                              │         Deployed on Render (Free Tier)
└──────────────────────────────┘
   Deployed on Vercel / Netlify
```

### Request Flow

1. User types a natural language question
2. Frontend sends `POST /api/v1/query` with `{ question: "..." }`
3. Backend uses AI to generate SQL from the question
4. Backend executes the SQL against the database
5. Response includes: `generatedSql`, `results[]`, `executionTimeMs`, `fromCache`, and any `error`
6. Frontend renders SQL preview, data table, and raw JSON

---

## 🎨 Design System

The UI is built on a **premium dark design system** defined in `index.css` — no CSS frameworks, all handcrafted.

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#06060b` | Page background |
| `--accent` | `#6366f1` | Indigo — buttons, links, focus |
| `--text-primary` | `#e8e8ef` | Main text |
| `--success` | `#22c55e` | Cache badges, status dot |
| `--warning` | `#f59e0b` | Slow request warning |
| `--error` | `#ef4444` | Error states |

### Typography

- **Sans-serif:** [Inter](https://fonts.google.com/specimen/Inter) — UI text, headings, labels
- **Monospace:** [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) — SQL code, JSON output

### Visual Effects

- **Glassmorphism** — Semi-transparent card backgrounds with `rgba` borders
- **Gradient header** — Animated gradient text (`#fff → #a78bfa → indigo`)
- **Skeleton loaders** — Shimmer animation while queries are processing
- **Micro-animations** — `fadeInUp`, `pulse-glow`, `spin` for interactive feedback
- **Glow shadows** — Subtle indigo box-shadow on focus states
- **Custom scrollbars** — Minimal styled scrollbars matching the dark theme

---

## 📁 Project Structure

```
frontend/
├── public/
│   └── vite.svg                # Favicon
├── src/
│   ├── assets/
│   │   └── react.svg           # React logo
│   ├── App.jsx                 # Main app component (all features)
│   ├── App.css                 # Component styles (700+ lines)
│   ├── index.css               # Design system & global tokens
│   └── main.jsx                # React DOM entry point
├── .gitignore
├── eslint.config.js            # ESLint config
├── index.html                  # HTML shell with font preloads
├── package.json                # Dependencies & scripts
├── vite.config.js              # Vite configuration
└── README.md
```

### Key Files Explained

| File | Lines | Responsibility |
|------|-------|----------------|
| `App.jsx` | ~360 | Query input, API calls, result rendering, slow-request warning, lazy heartbeat, JSON viewer |
| `App.css` | ~720 | All component styles — cards, tables, skeleton loaders, responsive breakpoints, animations |
| `index.css` | ~180 | CSS custom properties (colors, spacing, typography, shadows), global resets, keyframe animations |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### Installation

```bash
# Clone the repository
git clone https://github.com/ChinmayShivratriwar/nl-sql-engine.git
cd nl-sql-engine/frontend

# Install dependencies
npm install
```

### Development

```bash
# Start dev server (defaults to http://localhost:5173)
npm run dev
```

By default, the frontend points to `http://localhost:8080` as the backend. To override:

```bash
# Create a .env file in the frontend root
echo VITE_API_URL=https://your-backend.onrender.com > .env

# Restart the dev server
npm run dev
```

### Production Build

```bash
npm run build    # Output in dist/
npm run preview  # Preview the production build locally
```

---

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | `http://localhost:8080` | Backend base URL (no trailing slash) |

> **Note:** Vite injects `VITE_*` variables at **build time**, not runtime. Set the variable *before* running `npm run build`.

---

## 🧠 Smart Features for Render Free Tier

Since the backend is deployed on Render's free tier (which spins down after 15 minutes of inactivity), the frontend includes two built-in mitigations:

### ☕ Slow Request Warning

If a query takes longer than **30 seconds**, an amber warning banner appears:

> *"Render is waking up after inactivity, first request may take up to 60 seconds. Please wait..."*

The warning auto-dismisses once the response arrives. It only triggers on slow requests — not every request.

### 💓 Lazy Heartbeat

A silent background service pings `GET /api/v1/query/health` every **13 minutes** to prevent Render from sleeping. Key behaviors:

- ✅ Only runs when the browser tab is **visible** (uses `visibilitychange` API)
- ✅ Stops when the tab is hidden or the component unmounts
- ✅ Completely silent — no UI, no error popups
- ✅ Managed via `useEffect` + `useRef` for proper cleanup

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **UI Library** | React | 19.2 |
| **Build Tool** | Vite | 7.3 |
| **HTTP Client** | Axios | 1.13 |
| **Styling** | Vanilla CSS (custom design system) | — |
| **Fonts** | Inter, JetBrains Mono (Google Fonts) | — |
| **Linting** | ESLint + React Hooks plugin | 9.39 |
| **Backend** | Spring Boot (separate repo) | — |
| **Hosting** | Render (backend) / Vercel or Netlify (frontend) | — |

---

## 📡 API Reference

### `POST /api/v1/query`

Send a natural language question.

**Request:**
```json
{
  "question": "Show all engineers with salary above 90000"
}
```

**Response:**
```json
{
  "generatedSql": "SELECT * FROM employees WHERE role = 'Engineer' AND salary > 90000",
  "results": [
    { "id": 1, "name": "Alice", "role": "Engineer", "salary": 120000 }
  ],
  "executionTimeMs": 42,
  "fromCache": false,
  "error": null
}
```

### `GET /api/v1/query/health`

Health check endpoint (used by heartbeat).

**Response:** `200 OK`

---

## 👨‍💻 Author

**Chinmay Shivratriwar**

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
