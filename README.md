MATERIAL IQ

AI-Powered Predictive Material Intelligence & Smart Factory Digital Twin Platform

«See the Damage. Predict the Risk. Protect the Production.»

---

Quick Start

Backend

cd backend

python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt

# Copy environment configuration
# Windows PowerShell:
Copy-Item .env.example .env

# Mac/Linux:
cp .env.example .env

uvicorn main:app --reload --host 127.0.0.1 --port 8001

Frontend

cd frontend

# Optional: configure environment variables
npm install

npm run dev

Open: http://localhost:5173

Authentication Setup

1. Create a project at https://supabase.com.
2. Enable Google OAuth in Authentication → Providers.
3. Enable Email OTP in Authentication settings.
4. Configure "VITE_SUPABASE_URL" and "VITE_SUPABASE_ANON_KEY" in "frontend/.env.local".
5. To protect backend API routes, configure "MATERIAL_IQ_AUTH_REQUIRED=true", "SUPABASE_URL", and "SUPABASE_JWT_SECRET" in "backend/.env".

For production, configure a unique "SECRET_KEY" of at least 32 characters.

Generate one using:

python -c "import secrets; print(secrets.token_urlsafe(48))"

The backend currently validates Supabase HS256 access tokens. Configure your Supabase project accordingly.

Without authentication credentials, the application can offer an unauthenticated local demo mode. Do not expose an unauthenticated backend to untrusted networks.

---

Architecture

- Frontend: React, Vite, TypeScript, Tailwind CSS and Three.js.
- Backend: Python, FastAPI, SQLAlchemy and SQLite.
- AI/ML: Scikit-learn Isolation Forest and explainable risk scoring.
- Factory Graph: NetworkX dependency analysis.
- Virtual Sensors: Python-based IoT data simulation.

Application Pages

Route| Description
"/dashboard"| Command Centre and factory overview
"/materials"| Material Intelligence and digital passports
"/predictions"| AI predictions and what-if analysis
"/simulation"| Interactive 3D simulation lab
"/factory-impact"| Factory dependency and production impact analysis
"/maintenance"| Maintenance task priorities
"/reports"| Analytics and CSV export
"/settings"| Account and system preferences

API Endpoints

Method| Endpoint| Description
GET| "/health"| Health check
GET| "/api/v1/overview/stats"| Dashboard and report overview
GET| "/api/v1/materials/"| List all materials
GET| "/api/v1/materials/{id}/analyze"| Material risk analysis
GET| "/api/v1/sensors/timeseries"| Virtual sensor time series
GET| "/api/v1/ai/analyze"| AI anomaly detection
POST| "/api/v1/ai/analyze"| Analyze custom sensor readings
GET| "/api/v1/factory/graph"| Factory dependency graph
GET| "/api/v1/factory/impact/{id}"| Downstream impact analysis
GET| "/api/v1/alerts/"| List alerts
POST| "/api/v1/alerts/{id}/acknowledge"| Acknowledge an alert
GET| "/api/v1/maintenance/"| List maintenance tasks
GET| "/api/v1/reports/summary"| Summary report
GET| "/api/v1/reports/export/csv"| Export material data

Interactive API documentation:

http://127.0.0.1:8001/docs

Key Features

- AI-powered material anomaly detection.
- Material Safe Index and risk assessment.
- Interactive 3D digital twin simulations.
- Virtual IoT sensor monitoring.
- Explainable AI insights.
- Factory dependency and impact analysis.
- Predictive maintenance recommendations.
- What-if scenario analysis.
- Material monitoring and analytics.

Disclaimer

MATERIAL IQ is a college hackathon prototype. Sensor readings are simulated unless explicitly identified otherwise. Risk scores are prototype calculations and are not certified industrial safety ratings or validated failure predictions.

Future Scope

- Integration with real industrial IoT sensors.
- Advanced material inspection systems.
- Real-time industrial monitoring.
- Improved predictive analytics.
- Integration with production management systems.

---

MATERIAL IQ — See the Damage. Predict the Risk. Protect the Production.