Notebook & Dashboard

This workspace contains a dashboard implemented in the frontend (`frontend/src/components/Dashboard.jsx`) that fetches the CSV from the backend at `/api/data/tableau` and renders:

- Average score per quiz (bar)
- Average attempts per quiz (line)
- Score distribution histogram for selected quiz
- Top performers table for selected quiz

To run the app locally:

1. Start backend
   - cd backend
   - npm install (if you haven't already)
   - ensure `Tableau.csv` is at the workspace root (it is already)
   - npm run dev

2. Start frontend
   - cd frontend
   - npm install
   - npm run dev

Open the frontend dev URL (Vite will show it; default http://localhost:3000) and the dashboard will load.

Requirements for notebook/workspace (optional): pandas, plotly, jupyterlab.
