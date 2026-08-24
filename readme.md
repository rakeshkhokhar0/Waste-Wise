# WasteWise

WasteWise is a full-stack project with a React frontend and a FastAPI backend.

## Clone the repository

```bash
git clone <your-repo-url>
cd WasteWise-main
```

## Run the backend

Open a terminal in the `server` folder.

```bash
cd server
```

If you use `uv`, install dependencies and start the API with:

```bash
pip install uv
uv sync
uv run uvicorn app.main:app --reload
```

Make sure you have a `.env` file in `server/` before starting the backend. You can copy it from `.env.example`.

## Run the frontend

Open another terminal in the `client` folder.

```bash
cd client
npm install
npm run dev
```

The frontend will start in Vite development mode, usually at `http://localhost:5173`.

## Notes

- Run the backend and frontend in separate terminals.
- If the frontend needs the backend API, it expects it at `http://localhost:8000/api/v1` by default.
