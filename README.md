## AussieEat – Frontend + FastAPI backend

This project contains a Next.js 15 application (Turbopack) and a lightweight FastAPI backend that powers AussieEat’s maker/eater flows.

### Requirements

- Node.js 20+
- Python 3.12

### Backend (FastAPI)

```bash
cd backend
python -m venv .venv
. .venv/Scripts/activate  # Windows
# source .venv/bin/activate  # macOS/Linux
python -m pip install -U pip setuptools wheel
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

The API listens on `http://localhost:8000`. Check health with `http://localhost:8000/api/health`.

### Frontend (Next.js)

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to interact with the app. The auth flows and dashboards call the FastAPI endpoints directly.

### Environment configuration

The frontend defaults to `http://localhost:8000` for API calls. To point at another host, create `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL="https://your-api-host"
```

### Available API routes

- `POST /api/auth/register` – create an account (expects `email`, `password`, `role`)
- `POST /api/auth/login` – authenticate an existing account
- `GET /api/meals?maker_id=ID` – list meals for a maker
- `POST /api/meals` – add a meal for the maker
- `GET /api/makers` – list all makers with a featured meal preview and meal counts
- `GET /api/maker/profile?maker_id=ID` – fetch restaurant profile (auto-creates default if missing)
- `PUT /api/maker/profile` – update restaurant profile details
- `GET /api/orders?maker_id=ID` – fetch orders assigned to the maker
- `POST /api/orders` – create an order entry (accepts `order_code`, `meal_name`, `image_data`, etc.)
- `PATCH /api/orders/{order_id}` – update order status (`pending`, `preparing`, `ready`, `completed`)
- `GET /api/eater/orders?eater_id=ID` – list the eater’s orders including status and submitted reviews
- `GET /api/eater/profile?eater_id=ID` – fetch eater profile (auto-creates default if missing)
- `PUT /api/eater/profile` – update eater display name/preferences (email stays read-only)
- `GET /api/reviews?maker_id=ID` – list meal reviews for a maker
- `POST /api/reviews` – record a review (derive maker/order data from the submitted `order_id`)
- `PATCH /api/reviews/{review_id}` – update maker reply text
- `GET /api/health` – simple health probe

User data is stored in `aussieeat.db` (SQLite) within the project root. Passwords are hashed with Passlib (pbkdf2_sha256).