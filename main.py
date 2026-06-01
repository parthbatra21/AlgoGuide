import json
import logging
import os
import urllib.parse
import warnings
from contextlib import asynccontextmanager

import firebase_admin
import uvicorn
from fastapi import APIRouter, BackgroundTasks, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import credentials, firestore
from google.api_core import exceptions as gcloud_exceptions
from pydantic_settings import BaseSettings, SettingsConfigDict

from agent import call_gemini, generate_personalized_resources
from db import (
    convert_to_serializable,
    create_generation_job,
    get_job,
    get_latest_answers,
    get_latest_home_doc,
    get_or_create_user_by_email,
    get_user_by_email,
    get_user_by_id,
    update_job_status,
)
from models import AIMentorRequest, User, UserAnswers, UserCreate

warnings.filterwarnings("ignore", message="Detected filter using positional arguments")

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    host: str = "0.0.0.0"
    port: int = 8000
    # Comma-separated in .env (e.g. http://localhost:3000,http://localhost:5173)
    allowed_origins: str = "http://localhost:3000"


settings = Settings()


def _cors_origins() -> list[str]:
    return [origin.strip() for origin in settings.allowed_origins.split(",") if origin.strip()]

if settings.gemini_api_key:
    os.environ["GEMINI_API_KEY"] = settings.gemini_api_key
os.environ["GEMINI_MODEL"] = settings.gemini_model


def _init_firebase() -> firestore.Client:
    if not firebase_admin._apps:
        cred_path = "firebase-credentials.json"

        if os.path.exists(cred_path):
            try:
                with open(cred_path) as f:
                    cred_data = json.load(f)

                if (
                    "YOUR_PRIVATE_KEY_HERE" in str(cred_data.get("private_key", ""))
                    or "YOUR_PRIVATE_KEY_ID_HERE" in str(cred_data.get("private_key_id", ""))
                ):
                    logger.warning("firebase-credentials.json contains placeholder values. Using emulator.")
                    os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:8080"
                    firebase_admin.initialize_app()
                else:
                    cred = credentials.Certificate(cred_path)
                    firebase_admin.initialize_app(cred)
            except Exception:
                logger.exception("Error reading credentials file. Using emulator.")
                os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:8080"
                firebase_admin.initialize_app()
        else:
            logger.warning("No firebase-credentials.json found. Using emulator.")
            os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:8080"
            firebase_admin.initialize_app()

    return firestore.client()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.db = _init_firebase()
    if not settings.gemini_api_key:
        logger.warning("GEMINI_API_KEY not set. AI mentor and metadata enrichment will be limited.")
    logger.info("Backend started.")
    yield
    logger.info("Backend shutting down.")


app = FastAPI(
    title="AlgoGuide Backend API",
    description="A simple backend application with Firebase integration",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

health_router = APIRouter(tags=["health"])
users_router = APIRouter(prefix="/users", tags=["users"])
home_router = APIRouter(prefix="/home", tags=["home"])
jobs_router = APIRouter(prefix="/jobs", tags=["jobs"])
mentor_router = APIRouter(prefix="/ai-mentor", tags=["mentor"])


async def _run_generation(
    db: firestore.Client, user_id: str, answers: list[dict], job_id: str
) -> None:
    try:
        update_job_status(db, job_id, "running")
        await generate_personalized_resources(answers, db, user_id)
        update_job_status(db, job_id, "complete")
        logger.info("Resource generation complete for user %s (job %s)", user_id, job_id)
    except Exception:
        logger.exception("Resource generation failed for user %s (job %s)", user_id, job_id)
        try:
            update_job_status(db, job_id, "failed")
        except Exception:
            logger.exception("Could not mark job %s as failed", job_id)


@health_router.get("/")
async def root():
    return {"message": "Welcome to AlgoGuide Backend API with Firebase", "status": "running"}


@health_router.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0", "database": "Firebase Firestore"}


@users_router.get("/", response_model=list[User])
async def list_users(request: Request):
    db = request.app.state.db
    try:
        users = []
        for doc in db.collection("users").stream():
            user_data = doc.to_dict()
            user_data["id"] = doc.id
            users.append(user_data)
        return users
    except Exception:
        logger.exception("Failed to list users")
        raise HTTPException(status_code=500, detail="Could not fetch users.")


@users_router.post("/", status_code=201)
async def create_user(user: UserCreate, request: Request):
    db = request.app.state.db
    try:
        user_data = {"name": user.name, "email": str(user.email), "age": user.age}
        _, doc_ref = db.collection("users").add(user_data)
        user_data["id"] = doc_ref.id
        return user_data
    except Exception:
        logger.exception("Failed to create user")
        raise HTTPException(status_code=500, detail="Could not create user.")


@users_router.post("/{email}/answers")
async def store_user_answers(email: str, user_answers: UserAnswers, request: Request):
    db = request.app.state.db
    try:
        decoded_email = urllib.parse.unquote(email)
        if decoded_email.lower() != str(user_answers.email).lower():
            raise HTTPException(
                status_code=400,
                detail="Email in path does not match email in request body.",
            )
        user_id, user_created = get_or_create_user_by_email(db, decoded_email)

        answers_data = {
            "email": decoded_email,
            "answers": [
                {
                    "question_id": answer.question_id,
                    "question_text": answer.question_text,
                    "answer": answer.answer,
                }
                for answer in user_answers.answers
            ],
            "submitted_at": firestore.SERVER_TIMESTAMP,
        }
        _, answers_ref = (
            db.collection("users").document(user_id).collection("question_answers").add(answers_data)
        )

        return {
            "message": "User answers stored successfully",
            "email": decoded_email,
            "user_id": user_id,
            "user_created": user_created,
            "answers_id": answers_ref.id,
            "total_answers": len(user_answers.answers),
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to store answers for %s", email)
        raise HTTPException(status_code=500, detail="Could not store user answers.")


@users_router.get("/{email}/answers")
async def get_user_answers(email: str, request: Request):
    db = request.app.state.db
    try:
        decoded_email = urllib.parse.unquote(email)
        user_id, _ = get_user_by_email(db, decoded_email)

        answers_ref = db.collection("users").document(user_id).collection("question_answers")
        answer_submissions = []
        for doc in answers_ref.stream():
            submission_data = doc.to_dict()
            submission_data["submission_id"] = doc.id
            answer_submissions.append(convert_to_serializable(submission_data))

        return {
            "email": decoded_email,
            "user_id": user_id,
            "submissions": answer_submissions,
            "total_submissions": len(answer_submissions),
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to fetch answers for %s", email)
        raise HTTPException(status_code=500, detail="Could not fetch user answers.")


@users_router.get("/{user_id}")
async def get_user(user_id: str, request: Request):
    db = request.app.state.db
    try:
        return get_user_by_id(db, user_id)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to fetch user %s", user_id)
        raise HTTPException(status_code=500, detail="Could not fetch user.")


@users_router.put("/{user_id}")
async def update_user(user_id: str, user: UserCreate, request: Request):
    db = request.app.state.db
    try:
        user_ref = db.collection("users").document(user_id)
        if not user_ref.get().exists:
            raise HTTPException(status_code=404, detail="User not found")

        user_data = {"name": user.name, "email": str(user.email), "age": user.age}
        user_ref.update(user_data)
        user_data["id"] = user_id
        return user_data
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to update user %s", user_id)
        raise HTTPException(status_code=500, detail="Could not update user.")


@users_router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: str, request: Request):
    db = request.app.state.db
    try:
        user_ref = db.collection("users").document(user_id)
        if not user_ref.get().exists:
            raise HTTPException(status_code=404, detail="User not found")
        user_ref.delete()
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to delete user %s", user_id)
        raise HTTPException(status_code=500, detail="Could not delete user.")


@home_router.get("/{email}")
async def get_home_resources(email: str, request: Request):
    db = request.app.state.db
    try:
        decoded_email = urllib.parse.unquote(email)
        user_id, _ = get_user_by_email(db, decoded_email)

        home_data = get_latest_home_doc(db, user_id)
        if home_data is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"No resources found. "
                    f"Call POST /home/{decoded_email}/generate to create personalized resources."
                ),
            )

        home_data["email"] = decoded_email
        return convert_to_serializable(home_data)
    except HTTPException:
        raise
    except gcloud_exceptions.Forbidden:
        logger.exception("Firestore forbidden for %s", email)
        raise HTTPException(status_code=503, detail="Firestore is not available.")
    except gcloud_exceptions.PermissionDenied:
        logger.exception("Firestore permission denied for %s", email)
        raise HTTPException(status_code=503, detail="Firestore permission denied.")
    except gcloud_exceptions.FailedPrecondition:
        logger.exception("Firestore not ready for %s", email)
        raise HTTPException(status_code=503, detail="Firestore is not ready.")
    except Exception:
        logger.exception("Failed to fetch home resources for %s", email)
        raise HTTPException(status_code=500, detail="Could not fetch home resources.")


@home_router.post("/{email}/generate", status_code=202)
async def generate_home_resources(
    email: str, request: Request, background_tasks: BackgroundTasks
):
    db = request.app.state.db
    try:
        decoded_email = urllib.parse.unquote(email)
        user_id, _ = get_user_by_email(db, decoded_email)
        answers = get_latest_answers(db, user_id)

        job_id = create_generation_job(db, user_id)
        background_tasks.add_task(_run_generation, db, user_id, answers, job_id)
        return {
            "message": (
                f"Generation started. Poll GET /home/{decoded_email} "
                f"or GET /jobs/{job_id} for status."
            ),
            "status": "pending",
            "job_id": job_id,
            "email": decoded_email,
            "user_id": user_id,
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to start generation for %s", email)
        raise HTTPException(status_code=500, detail="Could not start resource generation.")


@jobs_router.get("/{job_id}")
async def get_job_status(job_id: str, request: Request):
    db = request.app.state.db
    try:
        return convert_to_serializable(get_job(db, job_id))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to fetch job %s", job_id)
        raise HTTPException(status_code=500, detail="Could not fetch job status.")


@mentor_router.post("/")
async def ai_mentor_post(body: AIMentorRequest):
    answer = call_gemini(body.question)
    if answer is None:
        raise HTTPException(
            status_code=503,
            detail="AI Mentor is unavailable – GEMINI_API_KEY not configured.",
        )
    if not answer.strip():
        raise HTTPException(status_code=502, detail="Could not get an answer from the AI mentor.")
    return {"answer": answer}


for router in (health_router, users_router, home_router, jobs_router, mentor_router):
    app.include_router(router)
    app.include_router(router, prefix="/api")


if __name__ == "__main__":
    try:
        uvicorn.run(app, host=settings.host, port=settings.port)
    except OSError as e:
        if getattr(e, "errno", None) in (48, 98):
            for candidate in range(settings.port + 1, settings.port + 6):
                try:
                    logger.warning("Port %s busy. Trying %s...", settings.port, candidate)
                    uvicorn.run(app, host=settings.host, port=candidate)
                    break
                except OSError as e2:
                    if getattr(e2, "errno", None) in (48, 98):
                        continue
                    raise
        else:
            raise
