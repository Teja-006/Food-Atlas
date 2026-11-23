# Food Atlas

Discover, map and add restaurants.

| Part | Tech | Runs on |
|---|---|---|
| Frontend | React (Vite), Leaflet + OpenStreetMap | Any static host |
| Backend | Python, FastAPI | Any Python host |
| Database | MongoDB Atlas | Atlas cloud (free M0 tier) |
| Sign-in | Firebase Authentication (Spark plan) | Google's servers |

```
food-atlas/
├── backend/      FastAPI app (app/), seed.py, requirements.txt, .env.example
├── frontend/     React + Vite
└── data/restaurants.csv   Seed data (cleaned on import)
```

Nothing here needs your own computer once deployed: the database and sign-in are hosted services, and the frontend and backend deploy to any host (see the end).

## 1. MongoDB Atlas (database)

1. Create a free **M0** cluster at https://cloud.mongodb.com.
2. **Database Access**: add a database user with a strong password.
3. **Network Access**: add your IP for local work. (Deployed hosts need more, see "Deploying".)
4. **Connect → Drivers**: copy the `mongodb+srv://...` string into `backend/.env` as `MONGO_URI`.

MongoDB Compass is optional. It is just a desktop viewer: connect it with the same string to browse and edit your Atlas data.

## 2. Firebase (sign-in)

1. Go to https://console.firebase.google.com and **Add project**. Stay on the free **Spark** plan (no card needed).
2. **Build → Authentication → Get started → Sign-in method**: enable **Email/Password** and **Google**. Do not enable Phone (SMS is not free).
3. **Project settings → General → Your apps → Web (`</>`)**: register an app and copy `apiKey`, `authDomain`, `projectId`, `appId` into `frontend/.env` (the `VITE_FIREBASE_*` lines).
4. Put the same project ID in `backend/.env` as `FIREBASE_PROJECT_ID`.

The backend needs no secret key file: it checks Firebase's signed tokens against your project ID. New email sign-ups must verify their email (Firebase sends the link) before they can add or edit restaurants. Google sign-ins are verified automatically.

Email/password and Google sign-in are free up to 50,000 monthly active users.

## 3. Backend (Python 3.10+)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env               # fill in MONGO_URI and FIREBASE_PROJECT_ID
python seed.py --reset             # load restaurants into Atlas
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

Put your email in `ADMIN_EMAILS` to edit or delete any restaurant (seeded ones have no owner). It only counts if that email is verified in Firebase.

## 4. Maps (OpenStreetMap, no key or billing)

The maps use Leaflet with OpenStreetMap tiles. There is nothing to sign up for or configure.

OpenStreetMap's public tile server is a donated service with a [tile usage policy](https://operations.osmfoundation.org/policies/tiles/): keep the attribution (already included), and it is meant for light use, not heavy production traffic. If the app grows, switch to a hosted tile provider that has a free tier by changing `TILE_URL` and `TILE_ATTRIBUTION` in `frontend/src/lib/mapkit.js`. Nothing else needs to change.

The "Near me" filter runs in MongoDB, and "Get directions" is a plain link to Google Maps, which needs no key.

## 5. Frontend (Node 18+)

```bash
cd frontend
cp .env.example .env     # add the Firebase values
npm install
npm run dev
```

Open http://localhost:5173. In development Vite proxies `/api` to port 8000.

## API

Send the Firebase ID token as `Authorization: Bearer <token>` (the frontend does this for you).

| Method | Path | Notes |
|---|---|---|
| GET | `/api/auth/me` | Profile for the signed-in user, or `{user: null}` |
| GET | `/api/restaurants` | `q, category, cuisine, min_rating, lat, lng, radius_km, limit, skip` |
| GET | `/api/restaurants/categories` | Names with counts |
| GET | `/api/restaurants/{id}` | |
| POST | `/api/restaurants` | Signed in, email verified |
| PUT / DELETE | `/api/restaurants/{id}` | Owner or admin only |
| GET | `/api/stats` | Totals, average rating, top 5 |

## Deploying (no local server needed)

Free-tier terms on hosting platforms change, so check each one's current limits.

1. **Backend** on a Python host (Render, Railway, Fly.io and similar). Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Root directory: `backend`. Set these environment variables: `MONGO_URI`, `MONGO_DB`, `FIREBASE_PROJECT_ID`, `CORS_ORIGINS` (your frontend URL, no trailing slash), `ADMIN_EMAILS`.
2. **Atlas network access:** most hosts use changing IP addresses, so add `0.0.0.0/0` under Network Access. This is only safe with a long random database password, which you should use.
3. **Frontend** on a static host (Vercel, Netlify, Firebase Hosting). Build command `npm run build`, output folder `dist`. Set the same `VITE_*` variables from `frontend/.env`, with `VITE_API_URL` pointing to your deployed backend. Add a rewrite of all paths to `/index.html` so refreshing `/map` works.
4. **Firebase:** Authentication → Settings → **Authorized domains**: add your frontend domain, or Google sign-in will fail.
5. Run `python seed.py` once against Atlas (from your own machine is fine) to load the data.

## Data cleanup done by `seed.py`

- Merges the misspelled `catergory` column into `category`, and title-cases lowercase values.
- Skips rows without a name or with `0,0` coordinates (the restaurant "rise" in the sample data; fix its coordinates in the CSV and re-run).
- Stores coordinates as GeoJSON with a 2dsphere index, which powers the "Near me" filter (done in MongoDB, so it costs no Google requests).
- Combines `image` and `Images` into one `images` list.

## Ideas for next steps

Per-user reviews that compute ratings, favorites, image upload, rate limiting, automated tests.
