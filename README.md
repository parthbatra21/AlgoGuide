# AlgoGuide Backend

FastAPI backend that generates personalized learning resources from onboarding answers using Gemini and GeeksforGeeks scraping. Stores data in Firestore.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env   # set GEMINI_API_KEY
python main.py
```

Server runs at `http://localhost:8000`. API docs at `/docs`.

Place `firebase-credentials.json` in the project root, or the app falls back to the Firestore emulator at `localhost:8080`.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET/POST | `/users/...` | User CRUD and onboarding answers |
| GET | `/home/{email}` | Fetch generated resources |
| POST | `/home/{email}/generate` | Start resource generation (202, poll GET) |
| POST | `/ai-mentor` | Ask the AI mentor a question |

All routes are also available under `/api/...`.

## Environment variables

See `.env.example`.

## Firestore collections

- `users` — user profiles
- `users/{uid}/question_answers` — onboarding responses
- `home` — generated resource sets
