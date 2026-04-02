from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import firebase_admin
from firebase_admin import credentials, firestore
import os
import json
import urllib.parse
import warnings
from dotenv import load_dotenv
from agent import generate_personalized_resources
from google.api_core import exceptions as gcloud_exceptions
from google import genai

# Suppress positional-argument Firestore warning
warnings.filterwarnings("ignore", message="Detected filter using positional arguments")

# Load environment variables from .env file
load_dotenv()

# Initialize Firebase
def initialize_firebase():
    if not firebase_admin._apps:
        cred_path = "firebase-credentials.json"
        
        if os.path.exists(cred_path):
            try:
                with open(cred_path, 'r') as f:
                    cred_data = json.load(f)
                    
                if ("YOUR_PRIVATE_KEY_HERE" in str(cred_data.get('private_key', '')) or 
                    "YOUR_PRIVATE_KEY_ID_HERE" in str(cred_data.get('private_key_id', ''))):
                    print("Warning: firebase-credentials.json contains placeholder values.")
                    print("Using Firebase emulator mode for development.")
                    os.environ['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080'
                    firebase_admin.initialize_app()
                else:
                    cred = credentials.Certificate(cred_path)
                    firebase_admin.initialize_app(cred)
            except Exception as e:
                print(f"Error reading credentials file: {e}")
                print("Using Firebase emulator mode for development.")
                os.environ['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080'
                firebase_admin.initialize_app()
        else:
            print("No firebase-credentials.json found. Using Firebase emulator mode.")
            os.environ['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080'
            firebase_admin.initialize_app()
    
    return firestore.client()

# Initialize Firestore
db = initialize_firebase()

# Helper function to convert Firestore Timestamp and other non-serializable types to JSON-serializable format
def convert_to_serializable(obj):
    from datetime import datetime
    
    if hasattr(obj, 'timestamp'):  # Firestore Timestamp object
        return obj.timestamp()
    elif isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {key: convert_to_serializable(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_serializable(item) for item in obj]
    elif hasattr(obj, '__dict__'):
        return str(obj)
    else:
        return obj

# Helper function to get timestamp value for sorting
def get_timestamp_for_sorting(timestamp_value):
    if timestamp_value is None:
        return 0.0
    if hasattr(timestamp_value, 'timestamp'):  # Firestore Timestamp
        return timestamp_value.timestamp()
    if isinstance(timestamp_value, (int, float)):
        return float(timestamp_value)
    return 0.0

# Gemini helper using google-genai SDK
def call_gemini(question: str) -> str:
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not set in environment.")
    
    client = genai.Client(api_key=gemini_api_key)
    response = client.models.generate_content(
       model="gemini-2.5-flash",
        contents=question
    )
    return response.text

# Create FastAPI instance
app = FastAPI(
    title="AlgoGuide Backend API",
    description="A simple backend application with Firebase integration",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restrict to your frontend origin(s)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# /api prefix router — all routes registered below are also available under /api/
api_router = APIRouter(prefix="/api")

# Pydantic models
class User(BaseModel):
    id: Optional[str] = None
    name: str
    email: str
    age: Optional[int] = None

class UserCreate(BaseModel):
    name: str
    email: str
    age: Optional[int] = None

class QuestionAnswer(BaseModel):
    question_id: str
    question_text: str
    answer: str

class UserAnswers(BaseModel):
    email: str
    answers: List[QuestionAnswer]

class ResourceGenerationRequest(BaseModel):
    user_id: str
    email: str

class AIMentorRequest(BaseModel):
    question: str

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Welcome to AlgoGuide Backend API with Firebase", "status": "running"}

# Health check endpoint
@app.get("/health")
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0", "database": "Firebase Firestore"}

# User endpoints
@app.get("/users", response_model=List[User])
@api_router.get("/users", response_model=List[User])
async def get_users():
    try:
        users_ref = db.collection('users')
        users = []
        for doc in users_ref.stream():
            user_data = doc.to_dict()
            user_data['id'] = doc.id
            users.append(user_data)
        return users
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users: {str(e)}")

@app.get("/users/{user_id}")
@api_router.get("/users/{user_id}")
async def get_user(user_id: str):
    try:
        user_ref = db.collection('users').document(user_id)
        user = user_ref.get()
        if not user.exists:
            raise HTTPException(status_code=404, detail="User not found")
        user_data = user.to_dict()
        user_data['id'] = user.id
        return user_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user: {str(e)}")

@app.post("/users")
@api_router.post("/users")
async def create_user(user: UserCreate):
    try:
        user_data = {
            "name": user.name,
            "email": user.email,
            "age": user.age
        }
        doc_ref = db.collection('users').add(user_data)
        user_data['id'] = doc_ref[1].id
        return user_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating user: {str(e)}")

@app.put("/users/{user_id}")
@api_router.put("/users/{user_id}")
async def update_user(user_id: str, user: UserCreate):
    try:
        user_ref = db.collection('users').document(user_id)
        if not user_ref.get().exists:
            raise HTTPException(status_code=404, detail="User not found")

        user_data = {
            "name": user.name,
            "email": user.email,
            "age": user.age
        }
        user_ref.update(user_data)
        user_data['id'] = user_id
        return user_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating user: {str(e)}")

@app.delete("/users/{user_id}")
@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str):
    try:
        user_ref = db.collection('users').document(user_id)
        if not user_ref.get().exists:
            raise HTTPException(status_code=404, detail="User not found")

        user_ref.delete()
        return {"message": "User deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting user: {str(e)}")

@app.post("/users/{email}/answers")
@api_router.post("/users/{email}/answers")
async def store_user_answers(email: str, user_answers: UserAnswers):
    try:
        decoded_email = urllib.parse.unquote(email)
        
        users_ref = db.collection('users')
        query = users_ref.where('email', '==', decoded_email).limit(1)
        users = list(query.stream())
        
        if not users:
            new_user_data = {
                "name": decoded_email.split('@')[0].title(),
                "email": decoded_email,
                "age": None
            }
            doc_ref = db.collection('users').add(new_user_data)
            user_id = doc_ref[1].id
            user_created = True
        else:
            user_doc = users[0]
            user_id = user_doc.id
            user_created = False
        
        answers_data = {
            "email": user_answers.email,
            "answers": [
                {
                    "question_id": answer.question_id,
                    "question_text": answer.question_text,
                    "answer": answer.answer
                }
                for answer in user_answers.answers
            ],
            "submitted_at": firestore.SERVER_TIMESTAMP
        }
        
        answers_ref = db.collection('users').document(user_id).collection('question_answers').add(answers_data)
        
        return {
            "message": "User answers stored successfully",
            "email": decoded_email,
            "user_id": user_id,
            "user_created": user_created,
            "answers_id": answers_ref[1].id,
            "total_answers": len(user_answers.answers)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error storing user answers: {str(e)}")

@app.get("/users/{email}/answers")
@api_router.get("/users/{email}/answers")
async def get_user_answers(email: str):
    try:
        decoded_email = urllib.parse.unquote(email)
        
        users_ref = db.collection('users')
        query = users_ref.where('email', '==', decoded_email).limit(1)
        users = list(query.stream())
        
        if not users:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_doc = users[0]
        user_id = user_doc.id
        
        answers_ref = db.collection('users').document(user_id).collection('question_answers')
        answer_submissions = []
        
        for doc in answers_ref.stream():
            submission_data = doc.to_dict()
            submission_data['submission_id'] = doc.id
            submission_data = convert_to_serializable(submission_data)
            answer_submissions.append(submission_data)
        
        return {
            "email": decoded_email,
            "user_id": user_id,
            "submissions": answer_submissions,
            "total_submissions": len(answer_submissions)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user answers: {str(e)}")

@app.post("/generate-resources/{user_id}")
@api_router.post("/generate-resources/{user_id}")
async def generate_resources_endpoint(user_id: str):
    try:
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User not found")
        
        answers_ref = db.collection('users').document(user_id).collection('question_answers')
        answers_docs = list(answers_ref.stream())
        
        if not answers_docs:
            raise HTTPException(status_code=404, detail="No onboarding answers found for this user")
        
        try:
            answers_docs.sort(key=lambda x: x.to_dict().get('submitted_at', 0), reverse=True)
        except:
            pass
        
        latest_answers = answers_docs[0].to_dict()
        user_answers = latest_answers.get('answers', [])
        
        if not user_answers:
            raise HTTPException(status_code=400, detail="No answers found in the latest submission")
        
        resources_data = await generate_personalized_resources(user_answers, db, user_id)
        
        return {
            "message": "Personalized resources generated successfully",
            "user_id": user_id,
            "home_doc_id": resources_data["home_doc_id"],
            "total_resources": resources_data["total_resources"],
            "categories": list(resources_data["resources"].keys()),
            "generated_at": resources_data["generated_at"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating resources: {str(e)}")

@app.post("/generate-resources-by-email/{email}")
@api_router.post("/generate-resources-by-email/{email}")
async def generate_resources_by_email_endpoint(email: str):
    try:
        decoded_email = urllib.parse.unquote(email)
        
        users_ref = db.collection('users')
        query = users_ref.where('email', '==', decoded_email).limit(1)
        users = list(query.stream())
        
        if not users:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_doc = users[0]
        user_id = user_doc.id
        
        answers_ref = db.collection('users').document(user_id).collection('question_answers')
        answers_docs = list(answers_ref.stream())
        
        if not answers_docs:
            raise HTTPException(status_code=404, detail="No onboarding answers found for this user")
        
        try:
            answers_docs.sort(key=lambda x: x.to_dict().get('submitted_at', 0), reverse=True)
        except:
            pass
        
        latest_answers = answers_docs[0].to_dict()
        user_answers = latest_answers.get('answers', [])
        
        if not user_answers:
            raise HTTPException(status_code=400, detail="No answers found in the latest submission")
        
        resources_data = await generate_personalized_resources(user_answers, db, user_id)
        
        return {
            "message": "Personalized resources generated successfully",
            "email": decoded_email,
            "user_id": user_id,
            "home_doc_id": resources_data["home_doc_id"],
            "total_resources": resources_data["total_resources"],
            "categories": list(resources_data["resources"].keys()),
            "generated_at": resources_data["generated_at"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating resources: {str(e)}")

@app.get("/home/{user_id}")
@api_router.get("/home/{user_id}")
async def get_user_home_resources(user_id: str):
    try:
        home_ref = db.collection('home')
        query = home_ref.where('user_id', '==', user_id)
        home_docs = list(query.stream())
        
        if not home_docs:
            raise HTTPException(status_code=404, detail="No resources found for this user")
        
        home_docs_with_data = []
        for doc in home_docs:
            doc_data = doc.to_dict()
            doc_data['home_doc_id'] = doc.id
            home_docs_with_data.append(doc_data)
        
        try:
            home_docs_with_data.sort(key=lambda x: get_timestamp_for_sorting(x.get('created_at')), reverse=True)
        except Exception as sort_error:
            print(f"Warning: Sorting failed: {sort_error}")
            pass
        
        latest_doc = convert_to_serializable(home_docs_with_data[0])
        return latest_doc
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching home resources: {str(e)}")

@app.get("/home-by-email/{email}")
@api_router.get("/home-by-email/{email}")
async def get_user_home_resources_by_email(email: str):
    try:
        decoded_email = urllib.parse.unquote(email)

        # --- Step 1: Find user by email ---
        users_ref = db.collection('users')
        query = users_ref.where('email', '==', decoded_email).limit(1)
        users = list(query.stream())

        if not users:
            raise HTTPException(status_code=404, detail=f"User not found with email: {decoded_email}")

        user_doc = users[0]
        user_id = user_doc.id

        # --- Step 2: Check for existing home resources ---
        home_ref = db.collection('home')
        home_query = home_ref.where('user_id', '==', user_id)
        home_docs = list(home_query.stream())

        # --- Step 3: Auto-generate if none exist ---
        if not home_docs:
            # Try to find onboarding answers to generate resources
            answers_ref = db.collection('users').document(user_id).collection('question_answers')
            answers_docs = list(answers_ref.stream())

            if not answers_docs:
                raise HTTPException(
                    status_code=404,
                    detail="No home resources found and no onboarding answers available to generate them. "
                           "Please complete onboarding first."
                )

            # Sort by submission time and take latest
            try:
                answers_docs.sort(
                    key=lambda x: x.to_dict().get('submitted_at', 0) or 0,
                    reverse=True
                )
            except Exception:
                pass

            latest_answers = answers_docs[0].to_dict()
            user_answers = latest_answers.get('answers', [])

            if not user_answers:
                raise HTTPException(
                    status_code=400,
                    detail="Onboarding answers exist but are empty. Cannot generate resources."
                )

            # Generate resources and save to Firestore
            resources_data = await generate_personalized_resources(user_answers, db, user_id)

            # Re-fetch the newly created home docs
            home_docs = list(home_query.stream())

            # If still empty (edge case), build response from resources_data directly
            if not home_docs:
                resources_data['email'] = decoded_email
                return convert_to_serializable(resources_data)

        # --- Step 4: Return the most recent home document ---
        home_docs_with_data = []
        for doc in home_docs:
            doc_data = doc.to_dict()
            doc_data['home_doc_id'] = doc.id
            home_docs_with_data.append(doc_data)

        try:
            home_docs_with_data.sort(
                key=lambda x: get_timestamp_for_sorting(x.get('created_at')),
                reverse=True
            )
        except Exception as sort_error:
            print(f"Warning: Sorting failed: {sort_error}")

        home_data = convert_to_serializable(home_docs_with_data[0])
        home_data['email'] = decoded_email

        return home_data

    except HTTPException:
        raise
    except gcloud_exceptions.Forbidden as e:
        raise HTTPException(
            status_code=503,
            detail=(
                "Firestore is not available (Forbidden). "
                "Make sure Cloud Firestore API is enabled for this project and that the service account "
                "has permission. Original error: " + str(e)
            ),
        )
    except gcloud_exceptions.PermissionDenied as e:
        raise HTTPException(
            status_code=503,
            detail=(
                "Firestore permission denied. "
                "Enable Cloud Firestore API and verify service account access. Original error: " + str(e)
            ),
        )
    except gcloud_exceptions.FailedPrecondition as e:
        raise HTTPException(
            status_code=503,
            detail=(
                "Firestore is not ready (FailedPrecondition). "
                "Enable Cloud Firestore API (and create a Firestore database) then retry. Original error: " + str(e)
            ),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching home resources: {str(e)}")

# AI Mentor endpoints
@app.post("/ai-mentor")
@app.post("/ai-mentor/")
@api_router.post("/ai-mentor")
@api_router.post("/ai-mentor/")
async def ai_mentor_endpoint(request: AIMentorRequest):
    """
    AI Mentor endpoint: Accepts a question and returns a Gemini-generated answer.
    """
    try:
        answer = call_gemini(request.question)
        return {"answer": answer}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calling Gemini API: {e}")

@app.get("/ai-mentor")
@api_router.get("/ai-mentor")
async def ai_mentor_get(question: Optional[str] = None):
    """
    Convenience GET endpoint to quickly test the AI Mentor.
    """
    if not question:
        return {"detail": "Provide a `question` query parameter or POST JSON {'question': '...'} to /ai-mentor"}
    try:
        answer = call_gemini(question)
        return {"answer": answer}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calling Gemini API: {e}")

# Mount the /api router — must be done AFTER all route definitions above
app.include_router(api_router)

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port_env = os.getenv("PORT")
    try:
        port = int(port_env) if port_env else 8000
    except ValueError:
        port = 8000

    try:
        uvicorn.run(app, host=host, port=port)
    except OSError as e:
        if getattr(e, "errno", None) in (48, 98):
            for candidate in range(port + 1, port + 6):
                try:
                    print(f"Port {port} busy. Trying {candidate}...")
                    uvicorn.run(app, host=host, port=candidate)
                    break
                except OSError as e2:
                    if getattr(e2, "errno", None) in (48, 98):
                        continue
                    raise
        else:
            raise