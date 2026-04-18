# AILAND — Tamil Nadu Agriculture & Land Survey System

Internal web application for Tamil Nadu government agriculture and land survey officers.

---

## Folder Structure

```
First project/
├── backend/
│   ├── src/
│   │   ├── config/database.js          # PostgreSQL pool (Supabase)
│   │   ├── controllers/
│   │   │   ├── authController.js       # Login / profile
│   │   │   ├── locationController.js   # Districts, taluks, villages
│   │   │   ├── landController.js       # Land search
│   │   │   └── uploadController.js     # Image upload + AI analysis
│   │   ├── middleware/authMiddleware.js # JWT guard
│   │   ├── routes/                     # Express route files
│   │   ├── utils/aiAnalysis.js         # Placeholder AI logic
│   │   ├── server.js                   # Main Express app
│   │   └── seed.js                     # DB seed script (test users)
│   ├── uploads/                        # Uploaded images (git-ignored)
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── LandSearch.jsx          # District→Taluk→Village→Survey
│   │   │   ├── MapView.jsx             # Leaflet map + GPS
│   │   │   └── ImageUpload.jsx         # Image upload + AI result
│   │   ├── components/
│   │   │   ├── Header.jsx              # Nav + mobile menu
│   │   │   └── LandMap.jsx             # Reusable map component
│   │   ├── context/AuthContext.jsx     # Auth state
│   │   ├── services/api.js             # Axios API wrapper
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
│
└── database/
    └── schema.sql                      # Full PostgreSQL schema + seed data
```

---

## Setup Instructions

### Step 1 — Supabase Database

1. Go to [supabase.com](https://supabase.com) and open your project
2. Click **SQL Editor** in the left sidebar
3. Copy the contents of `database/schema.sql` and paste it into the editor
4. Click **Run** — this creates all tables and inserts Tamil Nadu seed data
5. Get your **Database URL** from:
   - Project Settings → Database → Connection string → URI

### Step 2 — Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Edit `.env` and fill in:
```
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
JWT_SECRET=any-strong-random-string
```

```bash
# Seed test users (creates hashed passwords)
npm run seed

# Start the backend
npm run dev
# → Running on http://localhost:5000
```

### Step 3 — Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# VITE_API_URL is already set to /api (proxied to backend)
```

```bash
# Start the frontend
npm run dev
# → Running on http://localhost:3000
```

### Step 4 — Open the App

Go to **http://localhost:3000** in your browser.

---

## Test Login Credentials

| Role    | Username  | Password     |
|---------|-----------|--------------|
| Admin   | admin     | Admin@123    |
| Officer | officer1  | Officer@123  |
| Officer | officer2  | Officer@123  |

---

## API Endpoints

| Method | Endpoint                      | Auth | Description               |
|--------|-------------------------------|------|---------------------------|
| POST   | /api/login                    | No   | Officer login             |
| GET    | /api/me                       | Yes  | Get current user profile  |
| GET    | /api/districts                | Yes  | List all districts        |
| GET    | /api/taluks?district_id=      | Yes  | Taluks for a district     |
| GET    | /api/villages?taluk_id=       | Yes  | Villages for a taluk      |
| GET    | /api/land/search?...          | Yes  | Search land by criteria   |
| GET    | /api/land/:id                 | Yes  | Get land parcel by ID     |
| POST   | /api/upload                   | Yes  | Upload image + AI analyze |
| GET    | /api/upload/analyses          | Yes  | Recent image analyses     |
| GET    | /api/health                   | No   | Server health check       |

### Land Search Parameters
```
GET /api/land/search?district_id=1&taluk_id=3&village_id=10&survey_number=123&sub_division=1A
```

---

## Features

- **Land Search** — Cascading dropdowns (District → Taluk → Village → Survey No)
  modeled after the TamilNilam / Patta portal
- **Map View** — OpenStreetMap with polygon boundaries, multi-parcel display
- **GPS Detection** — Browser geolocation API shows officer's current field position
- **AI Analysis** — Upload field photo, get: crop type detection (10 Tamil Nadu crops),
  land condition, soil quality, irrigation status, estimated yield, and recommendations
- **Mobile Responsive** — Works on phones used during field inspection
- **JWT Auth** — 8-hour sessions (one work day), auto-logout on expiry

---

## Production AI Integration

Replace the placeholder in `backend/src/utils/aiAnalysis.js` with one of:

- **Google Cloud Vision API** — Crop/label detection
- **AWS Rekognition** — Object and scene detection
- **Roboflow** — Custom Tamil Nadu crop ML model
- **TensorFlow.js** — On-device inference (no API cost)

---

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 18 + Vite + Tailwind CSS      |
| Map      | React-Leaflet + OpenStreetMap       |
| Backend  | Node.js + Express                   |
| Database | PostgreSQL (Supabase)               |
| Auth     | JWT (jsonwebtoken)                  |
| Upload   | Multer                              |
