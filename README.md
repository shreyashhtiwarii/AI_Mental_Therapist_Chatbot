# MindCare AI – AI Mental Wellness Chatbot (educational project)
Not a substitute for professional care. It never diagnoses and cannot contact anyone on your behalf.

## Run locally (needs Python 3.10+ and Node 18+)
**Backend**
```
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example ../.env      # Windows: copy ..\.env.example ..\.env
python app.py                   # http://localhost:5000
```
**Frontend** (new terminal)
```
cd frontend
npm install
npm run dev                     # http://localhost:5173
```
**Tests:** `cd backend && python -m pytest tests -v`

## Demo Mode / enabling a real LLM
With `AI_API_KEY` empty, `services/ai_service.py` uses a local emotion-based response engine ("Demo AI Mode" badge).
Set `AI_API_KEY` in `.env` (Anthropic key; optional `AI_MODEL`) and restart; on any API failure it falls back to demo replies.

## Admin
Set `ADMIN_EMAIL`/`ADMIN_PASSWORD` in `.env`; that account is created on first start. Log in and open /admin.

## Structure
backend/app.py (routes), models.py, services/{ai,emotion,safety}_service.py, tests/ · frontend/src/{App.jsx,api.js}

## API
POST /api/auth/register|login|logout · GET /api/auth/me · POST /api/chat · GET /api/conversations · GET|DELETE /api/conversations/:id
· GET|POST /api/moods · GET|PUT /api/profile · GET /api/dashboard · GET /api/admin/stats|users · DELETE /api/admin/users/:id

## Security & limits
PBKDF2 password hashing, JWT, per-user authorization, SQLAlchemy ORM, secrets via env. Risk detection is keyword-based and can miss
or over-flag; set `EMERGENCY_INFO` for your region. Switch to PostgreSQL by changing `DATABASE_URL`.
