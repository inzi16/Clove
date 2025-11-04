# Clove frontend

Responsive React/Vite workspace for dashboard, jobs, semantic candidate search, explainable score profiles, pipeline management, interviews, and organization settings.

## Run locally

Start the API on port 8000, then from this directory:

```powershell
npm ci
npm run dev
```

Open <http://localhost:5173>. The app calls `http://localhost:8000/api` by default. Set `VITE_API_URL` before starting Vite to use another API, and optionally set `VITE_DEMO_USER_ID` to override the default `demo-user` development identity. If the API cannot be reached, the interface deliberately switches to labeled demo data so every screen remains explorable. Authoritative HTTP errors are shown as errors and never replaced with sample records.

## Verify

```powershell
npm run typecheck
npm run build
```

The production container builds the static app and serves it with nginx. `VITE_API_URL` is a build-time value in that image.
