# Contributing to Clove

Thanks for helping improve Clove. The project is easiest to review when changes stay small, explain the user problem, and keep demo behavior separate from production claims.

## Setup

Follow the local development steps in the root README. SQLite and local vector search are enough for most API and UI work; use the Compose stack when a change specifically involves PostgreSQL or Milvus.

## Before opening a pull request

Run the relevant checks:

```bash
cd backend
python -m pytest
python -m compileall -q app

cd ../frontend
npm ci
npm run typecheck
npm run build

cd ..
docker compose config --quiet
```

Please also:

- add or update tests for behavior changes;
- preserve tenant scoping on every organization-owned query and write;
- keep candidate stages and job-specific scores on the application boundary;
- include screenshots for visible UI changes;
- avoid logging resumes, tokens, provider payloads, or candidate details;
- label simulated provider behavior honestly.

## Pull requests

Use a clear title and explain the problem before the implementation. Call out schema changes, new environment variables, ranking changes, or provider assumptions. Large changes are easier to review when split into a data/API pull request and a UI pull request.

Do not include real candidate data, production credentials, or copied customer configuration in fixtures or screenshots.
