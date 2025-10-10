# MERN Project Scaffold

This workspace contains a minimal MERN scaffold with separate `backend` and `frontend` folders.

Structure:

- backend: Express + Mongoose API
- frontend: Vite + React frontend (proxy configured to backend)

Quick start (PowerShell):

1. Backend
   - cd backend
   - npm install
   - copy `.env.example` to `.env` and adjust `MONGO_URI` and `JWT_SECRET`
   - npm run dev

2. Frontend
   - cd frontend
   - npm install
   - npm run dev

The frontend proxy forwards `/api` calls to `http://localhost:5000`.

Notes:
- This is a scaffold — add routes, models, and UI as needed.
- Consider using a monorepo tool (pnpm workspaces) if you want shared dev deps.
