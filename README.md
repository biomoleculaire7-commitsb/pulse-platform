# PULSE — المراقبة الصحية الحينية
### PULSE — Real-time Health Monitoring Platform

---

## هيكل المشروع

```
pulse-platform/
├── backend/
│   ├── app/
│   │   ├── main.py          ← FastAPI app, middleware
│   │   ├── config.py        ← Settings (env vars)
│   │   ├── database.py      ← Async SQLAlchemy + PostGIS
│   │   ├── models.py        ← DB tables (InfectionRecord, ApiKey, AuditLog)
│   │   ├── schemas.py       ← Pydantic request/response models
│   │   ├── auth.py          ← JWT + API Key authentication
│   │   ├── tasks.py         ← Celery (WHO data collection)
│   │   └── routers/
│   │       ├── infections.py  ← POST/GET /api/infections
│   │       ├── dashboard.py   ← GET /api/dashboard/*
│   │       ├── auth.py        ← POST /api/auth/token|keys
│   │       └── imports.py     ← POST /api/import/csv|webhook
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx           ← Root + state management
│   │   ├── api.js            ← Axios client
│   │   ├── styles.css        ← Dark command-center theme
│   │   ├── hooks/
│   │   │   └── usePolling.js ← Auto-refresh every 30s
│   │   └── components/
│   │       ├── Header.jsx    ← Live badge + last-update
│   │       ├── Sidebar.jsx   ← KPIs + chart + filters + disease list
│   │       └── MapView.jsx   ← Leaflet markers / heatmap toggle
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── nginx/nginx.conf          ← HTTPS reverse proxy
├── db/init.sql               ← PostGIS + uuid extensions
├── docker-compose.yaml
├── sample_data.csv           ← Test data for CSV import
└── .env.example
```

---

## التشغيل المحلي (خطوة بخطوة)

### المتطلبات
- Docker Desktop 4.x+
- Docker Compose v2+
- (اختياري) Node.js 22+ للتطوير المحلي

### الخطوة 1 — إعداد المتغيرات البيئية

```bash
cd pulse-platform
cp .env.example .env

# عدّل القيم في .env:
# DB_PASSWORD=كلمة-مرور-قوية
# SECRET_KEY=$(openssl rand -hex 32)
# MASTER_API_KEY=$(openssl rand -hex 24)
```

### الخطوة 2 — تشغيل قاعدة البيانات والـ Backend

```bash
# بناء وتشغيل جميع الخدمات
docker compose up --build -d

# تحقق من الحالة
docker compose ps

# تابع اللوجات
docker compose logs -f backend
```

### الخطوة 3 — فتح المنصة

| الخدمة         | الرابط                              |
|----------------|--------------------------------------|
| الواجهة الأمامية | http://localhost:3000               |
| API Docs       | http://localhost:8000/api/docs      |
| Backend مباشرة | http://localhost:8000               |

### الخطوة 4 — اختبار API

```bash
# تحقق من الصحة
curl http://localhost:8000/api/health

# أضف حالة إصابة (استخدم المفتاح من .env)
curl -X POST http://localhost:8000/api/infections \
  -H "X-API-Key: change-me-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "P-TEST-001",
    "disease": "COVID-19",
    "lat": 24.6877,
    "lng": 46.7219,
    "date": "2025-01-15",
    "severity": "moderate",
    "region": "الرياض"
  }'

# استيراد ملف CSV
curl -X POST http://localhost:8000/api/import/csv \
  -H "X-API-Key: change-me-api-key" \
  -F "file=@sample_data.csv"

# عرض إحصائيات لوحة التحكم
curl http://localhost:8000/api/dashboard/stats \
  -H "X-API-Key: change-me-api-key"
```

### الخطوة 5 — إنشاء مفتاح API جديد

```bash
# المفتاح الرئيسي (MASTER_API_KEY) يملك صلاحية admin
curl -X POST http://localhost:8000/api/auth/keys \
  -H "X-API-Key: change-me-api-key" \
  -H "Content-Type: application/json" \
  -d '{"name": "Mobile App Key", "permissions": {"read": true, "write": true}}'
```

---

## تفعيل Celery (جمع بيانات WHO تلقائياً)

```bash
docker compose --profile celery up -d
docker compose logs -f celery
```

---

## النشر على السحابة

### على Render.com

1. **قاعدة البيانات:**
   - New → PostgreSQL → Enable PostGIS extension في الإعدادات
   - انسخ `DATABASE_URL`

2. **Backend:**
   - New → Web Service → اربط بـ GitHub
   - Root Directory: `backend`
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - أضف Environment Variables من `.env`

3. **Frontend:**
   - New → Static Site
   - Root: `frontend`
   - Build: `npm install && npm run build`
   - Publish: `dist`
   - أضف: `VITE_API_URL=https://your-backend.onrender.com/api`

### على Railway.app

```bash
# ثبّت Railway CLI
npm install -g @railway/cli
railway login

# نشر
railway up --service backend
railway up --service frontend

# أضف PostgreSQL plugin من لوحة Railway مع تفعيل PostGIS:
# railway run psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

### متغيرات البيئة المطلوبة في الإنتاج

```
DATABASE_URL        = postgresql+asyncpg://user:pass@host:5432/db
SECRET_KEY          = (openssl rand -hex 32)
MASTER_API_KEY      = (openssl rand -hex 24)
REDIS_URL           = redis://your-redis:6379/0
ALLOWED_ORIGINS     = ["https://your-frontend-domain.com"]
```

---

## نقاط API الكاملة

| Method | Endpoint                     | الوصف                                    | Auth |
|--------|------------------------------|------------------------------------------|------|
| POST   | /api/infections              | إضافة حالة إصابة جديدة                  | Write|
| GET    | /api/infections              | جلب الحالات (مع فلاتر)                  | Read |
| GET    | /api/infections/{id}         | حالة واحدة بمعرّفها                     | Read |
| GET    | /api/dashboard/stats         | إحصائيات لوحة التحكم                   | Read |
| GET    | /api/dashboard/timeseries    | منحنى زمني يومي                         | Read |
| GET    | /api/dashboard/heatmap       | بيانات الخريطة الحرارية                 | Read |
| POST   | /api/import/csv              | استيراد ملف CSV                          | Write|
| POST   | /api/import/webhook          | استقبال بيانات Webhook                  | Write|
| POST   | /api/auth/token              | الحصول على JWT token                    | Key  |
| POST   | /api/auth/keys               | إنشاء مفتاح API جديد                   | Admin|
| GET    | /api/auth/keys               | قائمة مفاتيح API                       | Admin|
| GET    | /api/health                  | فحص صحة الخدمة                         | None |

### معاملات GET /api/infections

```
date_from  : YYYY-MM-DD   (تصفية من تاريخ)
date_to    : YYYY-MM-DD   (تصفية إلى تاريخ)
region     : string        (اسم المنطقة، بحث جزئي)
disease    : string        (نوع المرض، بحث جزئي)
status     : active|recovered|deceased
page       : int (افتراضي: 1)
size       : int (افتراضي: 500، حد أقصى: 2000)
```

### مثال JSON لـ Webhook (Browse AI)

```json
[
  {
    "patient_id": "ANON-1234",
    "disease": "Dengue",
    "lat": 15.5,
    "lng": 32.5,
    "date": "2025-01-15",
    "severity": "moderate",
    "region": "الخرطوم"
  }
]
```

---

## الخصوصية والأمان

- **إخفاء الهوية:** `patient_id` يُحوَّل فوراً إلى SHA-256 hash مع salt ثابت. الرقم الأصلي لا يُخزَّن أبداً.
- **تشويش الإحداثيات:** تُضاف إزاحة عشوائية ≤ 500 متر على الإحداثيات قبل التخزين.
- **سجل التدقيق:** جميع عمليات القراءة والكتابة مسجّلة في جدول `audit_logs`.
- **HTTPS:** في الإنتاج، كل الطلبات تمر عبر Nginx مع TLS.
- **API Keys:** مشفّرة بـ SHA-256 في قاعدة البيانات (لا يُخزَّن النص الأصلي).

---

## التطوير المحلي (بدون Docker)

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL="postgresql+asyncpg://res_user:res_pass@localhost:5432/res_db"
export MASTER_API_KEY="dev-key"
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
VITE_API_KEY=dev-key VITE_API_URL=http://localhost:8000/api npm run dev
```
