# AILAND — TamilNillamGeo

Internal field-survey application for Tamil Nadu land and agriculture officers. It turns a geotagged field image into an AI analysis and associates it with a nearby parcel and survey number.

## Local setup

1. In Supabase SQL Editor, run `database/schema.sql` for a new database. For an existing database, run `database/migration_analysis_schema.sql`.
2. In `backend`, copy `.env.example` to `.env` and set:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=service-role-key-used-only-by-the-backend
JWT_SECRET=a-long-random-secret
GEMINI_API_KEY=your-google-ai-studio-key
GEMINI_VISION_MODEL=gemini-3.1-flash-lite
```

3. Run `npm install` then `npm run seed` in `backend`, and start it with `npm run dev`.
4. Run `npm install` then `npm run dev` in `frontend`.
5. Open the Vite URL shown in the terminal (normally `http://localhost:3000`).

The seed command creates local test accounts: `admin` / `Admin@123` and `officer1` / `Officer@123`. Change or remove these accounts before deploying.

## Image-to-survey workflow

1. Sign in and open **Drone Analysis**.
2. Upload a JPG, PNG, or WebP image. DJI Neo 2 photos may include GPS/altitude in EXIF; those coordinates are used before manually entered coordinates.
3. The API immediately creates an `image_analyses` record with `processing` status and returns HTTP 202.
4. The web app polls `/api/upload/analyses/:id` until Gemini vision analysis is `completed` or `failed`. A user can manually review a failed or uncertain image and save English/Tamil crop names.
5. GPS is matched to the nearest stored parcel (within 2 km by default), then the survey number and map pin are shown.

Without `GEMINI_API_KEY`, uploaded images are retained but their analysis will fail. Official TNGIS survey resolution remains unavailable until valid credentials and cadastral-layer details are configured.

## Google Maps and live TNGIS survey lookup

Set `VITE_GOOGLE_MAPS_API_KEY` in `frontend/.env`, enable **Maps JavaScript API**, enable billing, and restrict the browser key to `http://localhost:3000/*` and `http://127.0.0.1:3000/*`. Restart Vite after changing this file.

Official map-click and GPS-to-survey lookup requires TNGIS access. Set `TNGIS_WFS_URL`, `TNGIS_API_KEY`, `TNGIS_LAYER`, and `TNGIS_GEOMETRY_FIELD` in `backend/.env`. Until these values are issued and verified, the map reports that official TNGIS survey lookup is unavailable rather than returning a made-up survey number.

## APIs

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/login` | Officer login |
| GET | `/api/me` | Current profile |
| GET | `/api/districts`, `/api/taluks`, `/api/villages` | Location hierarchy |
| GET | `/api/tamilnilam/survey-numbers` | Survey numbers |
| GET | `/api/tamilnilam/details` | Parcel/survey details |
| POST | `/api/upload` | Queue one image analysis |
| POST | `/api/upload/bulk` | Queue up to 10 images |
| GET | `/api/upload/analyses` | Current user's history; admins see all |
| GET | `/api/upload/analyses/:id` | Analysis polling/detail |
| PUT | `/api/upload/analyses/:id/review` | Save an officer's manual image review |

## Deployment

Vercel deploys the `frontend` directory only. Configure `VITE_API_URL` in Vercel as the public URL of a separately deployed Express backend; do not use `/api` in production unless a reverse proxy forwards it to that backend.

Deploy the backend to a Node.js host and configure `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`, `GEMINI_API_KEY`, and `FRONTEND_URL` there. Set `FRONTEND_URL` to the deployed Vercel URL so CORS permits the application.

## DJI Neo 2

DJI Neo 2 is supported for post-capture image upload and EXIF GPS extraction only. DJI does not expose Mobile SDK support for the Neo series, so this application cannot control the aircraft, receive its live video stream, or access live flight telemetry.

## Stack

- React, Vite, Tailwind, React-Leaflet
- Express, Multer, Gemini vision
- Supabase PostgreSQL and backend-issued JWTs
