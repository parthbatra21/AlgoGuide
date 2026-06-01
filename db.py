from __future__ import annotations

import logging
from datetime import datetime
from typing import TYPE_CHECKING

from fastapi import HTTPException
from firebase_admin import firestore

if TYPE_CHECKING:
    from firebase_admin.firestore import Client as FirestoreClient

logger = logging.getLogger(__name__)


def convert_to_serializable(obj):
    if hasattr(obj, "timestamp"):
        return obj.timestamp()
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {key: convert_to_serializable(val) for key, val in obj.items()}
    if isinstance(obj, list):
        return [convert_to_serializable(item) for item in obj]
    if hasattr(obj, "__dict__"):
        return str(obj)
    return obj


def _ts_to_float(timestamp_value) -> float:
    if timestamp_value is None:
        return 0.0
    if hasattr(timestamp_value, "timestamp"):
        return timestamp_value.timestamp()
    if isinstance(timestamp_value, (int, float)):
        return float(timestamp_value)
    return 0.0


def get_user_by_email(db: FirestoreClient, email: str) -> tuple[str, dict]:
    query = db.collection("users").where("email", "==", email).limit(1)
    users = list(query.stream())
    if not users:
        raise HTTPException(status_code=404, detail="User not found")
    user_doc = users[0]
    return user_doc.id, user_doc.to_dict()


def get_or_create_user_by_email(db: FirestoreClient, email: str) -> tuple[str, bool]:
    query = db.collection("users").where("email", "==", email).limit(1)
    users = list(query.stream())
    if users:
        return users[0].id, False

    new_user_data = {
        "name": email.split("@")[0].title(),
        "email": email,
        "age": None,
    }
    _, doc_ref = db.collection("users").add(new_user_data)
    return doc_ref.id, True


def get_user_by_id(db: FirestoreClient, user_id: str) -> dict:
    user_ref = db.collection("users").document(user_id)
    user = user_ref.get()
    if not user.exists:
        raise HTTPException(status_code=404, detail="User not found")
    user_data = user.to_dict()
    user_data["id"] = user.id
    return user_data


def get_latest_answers(db: FirestoreClient, user_id: str) -> list[dict]:
    answers_ref = db.collection("users").document(user_id).collection("question_answers")
    answers_docs = list(answers_ref.stream())
    if not answers_docs:
        raise HTTPException(status_code=404, detail="No onboarding answers found for this user")

    try:
        answers_docs.sort(
            key=lambda doc: _ts_to_float(doc.to_dict().get("submitted_at")),
            reverse=True,
        )
    except Exception:
        logger.warning("Could not sort answer docs for user %s", user_id)

    latest = answers_docs[0].to_dict()
    user_answers = latest.get("answers", [])
    if not user_answers:
        raise HTTPException(status_code=400, detail="No answers found in the latest submission")
    return user_answers


def get_latest_home_doc(db: FirestoreClient, user_id: str) -> dict | None:
    home_ref = db.collection("home")
    home_docs = list(home_ref.where("user_id", "==", user_id).stream())
    if not home_docs:
        return None

    home_docs_with_data = []
    for doc in home_docs:
        doc_data = doc.to_dict()
        doc_data["home_doc_id"] = doc.id
        home_docs_with_data.append(doc_data)

    try:
        home_docs_with_data.sort(
            key=lambda doc: _ts_to_float(doc.get("created_at")),
            reverse=True,
        )
    except Exception:
        logger.warning("Could not sort home docs for user %s", user_id)

    return home_docs_with_data[0]


def save_home_resources(db: FirestoreClient, user_id: str, resources_data: dict) -> str:
    home_doc_data = {
        "user_id": user_id,
        "user_profile": resources_data["user_profile"],
        "search_queries": resources_data["search_queries"],
        "total_resources": resources_data["total_resources"],
        "resources": resources_data["resources"],
        "generated_at": resources_data["generated_at"],
        "created_at": firestore.SERVER_TIMESTAMP,
    }
    _, doc_ref = db.collection("home").add(home_doc_data)
    return doc_ref.id


def create_generation_job(db: FirestoreClient, user_id: str) -> str:
    _, doc_ref = db.collection("jobs").add(
        {
            "user_id": user_id,
            "status": "pending",
            "created_at": firestore.SERVER_TIMESTAMP,
        }
    )
    return doc_ref.id


def update_job_status(db: FirestoreClient, job_id: str, status: str) -> None:
    db.collection("jobs").document(job_id).update({"status": status})


def get_job(db: FirestoreClient, job_id: str) -> dict:
    doc = db.collection("jobs").document(job_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")
    job_data = doc.to_dict()
    job_data["job_id"] = doc.id
    return job_data
