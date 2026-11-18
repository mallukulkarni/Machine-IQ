# MATERIAL IQ
## AI-Powered Predictive Material Intelligence & Smart Factory Digital Twin Platform

> See the Damage. Predict the Risk. Protect the Production.

---

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Local demo defaults are unauthenticated; follow the authentication setup below before deployment.

uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

### Frontend

```bash
cd frontend
copy .env.local.example .env.local  # optional; fill in Supabase values to enable account sign-in
pnpm install   # or npm install
pnpm dev       # or npm run dev
```

Open http://localhost:5173

### Authentication Setup

1. Create a project at https://supabase.com
2. Enable Google OAuth in Authentication > Providers
3. Enable Email OTP in Authentication > Settings
4. Copy `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `frontend/.env.local`
5. To protect backend API routes, set `MATERIAL_IQ_AUTH_REQUIRED=true`, `SUPABASE_URL`, and `SUPABASE_JWT_SECRET` in `backend/.env`. For production, set a unique `SECRET_KEY` of at least 32 characters. Generate one with `python -c "import secrets; print(secrets.token_urlsafe(48))"`. The backend currently validates Supabase HS256 access tokens; configure your Supabase project to issue that JWT signing algorithm.

Email and Google sign-in use Supabase only when configured. Without credentials, the login page disables account sign-in and offers an explicitly unauthenticated demo mode; keep backend authentication disabled only for local demos. Do not expose a demo-mode backend to an untrusted network.

## Architecture

- **Frontend**: React + Vite + TypeScript + Tailwind CSS + Three.js
- **Backend**: Python + FastAPI + SQLAlchemy + SQLite
- **AI/ML**: Scikit-learn Isolation Forest + explainable risk scoring
- **Factory Graph**: NetworkX dependency analysis
- **Virtual Sensors**: Python-based IoT data simulation

## Application pages

- `/dashboard` — Command Centre and fleet snapshot
- `/materials` — Material Intelligence and digital passports
- `/predictions` — Isolation Forest predictions and custom what-if readings
- `/simulation` — Dedicated Three.js roller simulation lab
- `/factory-impact` — Factory dependency and production what-if analysis
- `/maintenance` — Maintenance task priorities
- `/reports` — Analytics and CSV export
- `/settings` — Account and system preferences

The Material Safe Index is calculated as 100 minus the mean prototype AI risk score across the current simulated material readings. It is a demo index, not a certified safety rating. Sensor values are simulated unless explicitly identified otherwise.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /api/v1/overview/stats | Shared dashboard and report snapshot |
| GET | /api/v1/materials/ | List all materials |
| GET | /api/v1/materials/{id}/analyze | AI risk analysis for a material |
| GET | /api/v1/sensors/timeseries | Virtual sensor time series |
| GET | /api/v1/ai/analyze | Isolation Forest anomaly detection |
| POST | /api/v1/ai/analyze | Analyze a custom sensor reading |
| GET | /api/v1/factory/graph | Factory dependency graph |
| GET | /api/v1/factory/impact/{id} | Downstream impact analysis |
| GET | /api/v1/alerts/ | List alerts |
| POST | /api/v1/alerts/{id}/acknowledge | Acknowledge an alert |
| GET | /api/v1/maintenance/ | List maintenance tasks |
| GET | /api/v1/reports/summary | Summary report |
| GET | /api/v1/reports/export/csv | Export current material snapshot |

Full interactive docs at: http://127.0.0.1:8001/docs

## Disclaimer

This is a college hackathon prototype. All sensor readings are simulated. Risk estimates are prototype calculations, not certified industrial safety limits.
