# Clove API

FastAPI API for the recruitment MVP. It uses SQLite and seeded demo data by default, while the same SQLAlchemy models support PostgreSQL through `DATABASE_URL`.

## Run locally

From this directory:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
python -m uvicorn app.main:app --reload --port 8000
```

Open <http://localhost:8000/docs> or check <http://localhost:8000/api/health>. Requests use `X-User-Id: demo-user` in development; the seeded default is used when the header is omitted.

Run the tests with:

```powershell
python -m pytest
```

## Optional services

Copy `.env.example` to `.env` to override defaults. PostgreSQL requires an async URL such as `postgresql+asyncpg://user:password@localhost/database`. To use Milvus, install `.[milvus]`, set `MILVUS_ENABLED=true`, and configure `MILVUS_URI`; local feature-hash embeddings remain a deterministic fallback, not a production semantic model.

OAuth, calendars, Stripe, and webhook handling are represented by explicit service boundaries. Provider credentials alone do not turn the development adapters into production authentication or billing flows.
