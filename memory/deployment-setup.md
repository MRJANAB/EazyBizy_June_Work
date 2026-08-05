---
name: deployment-setup
description: How this project is deployed — Vercel frontend, Render backend, Supabase
metadata:
  type: reference
---

Three-part app:
- **Frontend** (Vite/React SPA, `src/`) → **Vercel** at https://easybizyjunework.vercel.app . Config: `vercel.json` (SPA rewrites). Env vars set in Vercel dashboard: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `VITE_CMA_API_URL`, `VITE_DPR_API_URL` (last two point at the Render URL). Vite bakes env at build time — must redeploy after changing them.
- **Backend** (FastAPI, `backend/`, uvicorn) → **Render** Blueprint (`render.yaml`) as service `eazybizy-api` at https://eazybizy-api.onrender.com . Free tier sleeps after 15 min (first request ~50s). Auto-deploys on push to `main`; build takes a few minutes. Set `ALLOWED_ORIGINS` env to the Vercel URL for CORS.
- **Supabase** — auth + edge functions (`supabase/functions`), deployed separately on Supabase.

`backend/requirements.txt` must include pandas + openpyxl (Excel export) — these were missing and broke deploys early on.

GitHub: MRJANAB/EazyBizy_June_Work, default branch `main`. Repo convention is to commit/push directly to main (solo project, Render auto-deploys from main).
