# NL-SQL Engine — Frontend

React + Vite frontend for the NL-SQL Engine. Ask questions in plain English, get SQL queries executed against a real PostgreSQL database.

**Live Demo**: https://nl-sql-client.vercel.app  
**Backend Repo**: https://github.com/ChinmayShivratriwar/nl-sql-engine

---

## Features

- Natural language query input
- Displays generated SQL and results in a table
- Execution time and cache hit indicator
- Slow request warning when backend is waking up from inactivity
- Lazy heartbeat — pings backend every 13 minutes when tab is visible to prevent cold starts

---

## Running Locally
```bash
npm install
npm run dev
```

Set environment variable:
```
VITE_API_URL=http://localhost:8080
```

---

## Deployment

Deployed on Vercel. Set `VITE_API_URL` to your backend URL in Vercel environment variables.
