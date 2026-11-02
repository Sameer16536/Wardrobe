# 👗 Wardrobe AI

> AI-powered wardrobe management app — organize your clothes, create outfit playlists, get AI styling suggestions. **₹0 cost.**

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS v4 + Framer Motion
- **Backend**: FastAPI (Python)
- **Auth**: Google OAuth 2.0 (direct, no Firebase)
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage
- **AI**: Google Gemini 1.5 Flash (free tier)
- **Hosting**: Vercel (frontend) + Render.com (backend)

---

## 🚀 Getting Started

### Step 1 — Get your API Keys (all free)

1. **Google Cloud Console** (console.cloud.google.com)
   - Create project → Enable "Gemini API"
   - APIs & Services → Credentials → Create OAuth 2.0 Client (Web)
   - Authorized redirect URIs: `http://localhost:8000/auth/callback`
   - Save: Client ID, Client Secret, Gemini API Key

2. **Supabase** (supabase.com)
   - New project → Settings → API → copy `URL` and `anon key`
   - Storage → Create bucket named `wardrobe-images` (set to Public)

3. **Google AI Studio** (aistudio.google.com)
   - Get API Key → copy it

### Step 2 — Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your keys
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend runs at: http://localhost:8000
API docs at: http://localhost:8000/docs

### Step 3 — Frontend Setup

```bash
cd frontend
# .env is already set to http://localhost:8000
npm install
npm run dev
```

Frontend runs at: http://localhost:5173

---

## 📁 Project Structure

```
wardrobe/
├── backend/          FastAPI Python backend
│   ├── app/
│   │   ├── main.py          Entry point
│   │   ├── config.py        Settings from .env
│   │   ├── database.py      SQLAlchemy + Supabase
│   │   ├── models/          DB models (User, ClothingItem, Outfit)
│   │   ├── schemas/         Pydantic request/response schemas
│   │   ├── routers/         API endpoints (auth, clothes, outfits, ai)
│   │   └── services/        Business logic (gemini, storage, auth)
│   └── requirements.txt
│
└── frontend/         React + Vite
    └── src/
        ├── pages/           Login, Wardrobe, AddClothing, Outfits, AIStylist
        ├── components/      Layout, ProtectedRoute
        ├── store/           Zustand state management
        └── api/             Axios API client
```

---

## 🌐 Deploying for Free

### Backend → Render.com
1. Push repo to GitHub
2. render.com → New Web Service → Connect repo
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add all `.env` variables in Render's Environment tab

### Frontend → Vercel
1. vercel.com → Import Git Repository
2. Set `VITE_API_URL` to your Render backend URL
3. Deploy!

---

## 🆓 Free Tier Summary

| Service | What's free |
|---|---|
| Gemini API | 1M tokens/day, 15 req/min |
| Supabase | 500MB DB, 1GB Storage |
| Render.com | 512MB RAM (sleeps after 15min idle) |
| Vercel | 100GB bandwidth |
| Google OAuth | Unlimited |
