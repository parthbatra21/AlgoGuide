# 🚀 AlgoGuide — AI-Powered Personalized Interview Preparation Platform

AlgoGuide is an AI-powered interview preparation platform that replaces static problem sheets with a personalized learning experience. The platform analyzes a learner's profile, identifies weak areas, generates tailored learning resources, and provides AI mentorship to accelerate interview preparation.

---

## 📌 Motivation

Most interview preparation platforms provide the same roadmap to every learner. In reality, every student has different strengths, weaknesses, goals, and timelines.

AlgoGuide creates personalized learning pathways by combining:

- User profiling
- AI-generated learning recommendations
- Automated resource discovery
- Progress tracking
- Interactive AI mentorship

The goal is to help students focus on the right topics at the right time.

---

## 🏗️ System Architecture

mermaid graph TD     User([User])      subgraph Frontend         ReactApp[React + Vite]     end      subgraph Backend         FastAPI[FastAPI Server]         ResourceEngine[Recommendation Engine]         Mentor[AI Mentor]     end      subgraph AI Layer         Gemini[Google Gemini]     end      subgraph Database         Firestore[(Firebase Firestore)]     end      User --> ReactApp     ReactApp --> FastAPI     FastAPI --> Firestore     FastAPI --> ResourceEngine     ResourceEngine --> Gemini     ResourceEngine --> Firestore     Mentor --> Gemini 

---

## 🚀 Key Features

### 🧠 Personalized Learning Paths

Generates customized learning resources based on:

- Current skill level
- Weak areas
- Target companies
- Preferred role
- Technology stack

### 🔍 AI-Powered Resource Discovery

Automatically:

- Generates learning queries
- Searches relevant resources
- Categorizes content
- Builds a structured roadmap

### 🤖 AI Mentor

Users can interact with an AI mentor powered by Google Gemini to:

- Ask interview questions
- Clarify concepts
- Get preparation guidance

### 📚 Smart Resource Categorization

Resources are automatically grouped into:

- Weak Area Improvement
- Interview Preparation
- Skill Development
- Practice Problems
- Technology Tutorials
- General Learning

### 🔥 Dynamic Recommendation Engine

The platform adapts recommendations using user questionnaire responses rather than fixed roadmaps.

---

## 📊 How It Works

1. User completes onboarding questionnaire
2. User profile is generated
3. Gemini creates personalized search queries
4. Learning resources are discovered automatically
5. Resources are enriched and categorized
6. Personalized roadmap is stored in Firestore
7. AI mentor assists throughout preparation

---

## 🔥 Core Concepts

- Recommendation Systems
- Retrieval-Augmented Learning
- AI-Powered Personalization
- FastAPI Backend Architecture
- Firestore Data Modeling
- Async Programming
- LLM Integration

---

## ⚙️ Technology Stack

### Frontend

- React
- Vite
- Tailwind CSS
- Clerk Authentication

### Backend

- Python
- FastAPI
- Firebase Firestore
- Firebase Admin SDK
- aiohttp
- BeautifulSoup

### AI Layer

- Google Gemini API
- Prompt Engineering
- Resource Classification

### Database

- Firebase Firestore

### Tools

- Git
- VS Code
- Postman

---

## 🧩 Backend Workflow

text User Answers       ↓ Profile Parser       ↓ Query Generator (Gemini)       ↓ Resource Search       ↓ Metadata Enrichment       ↓ Resource Categorization       ↓ Firestore       ↓ Personalized Learning Dashboard 

---

## 📂 Firestore Structure

text users │ ├── user_id │   ├── name │   ├── email │   └── ... │ │   ├── question_answers │   │     └── submission_docs │   │ │   └── home │         └── generated_resources │ jobs │ └── generation_job_docs 

---

## 📂 Project Structure

text AlgoGuide │ ├── frontend/ │   ├── src/ │   ├── components/ │   ├── pages/ │   └── App.jsx │ ├── backend/ │   ├── main.py │   ├── agent.py │   ├── db.py │   ├── models.py │   └── requirements.txt │ └── README.md 

---

## 📋 Prerequisites

- Python 3.11+
- Node.js 18+
- Firebase Project
- Gemini API Key

---

## ⚙️ Frontend Setup

bash cd frontend npm install npm run dev 

Frontend runs on:

text http://localhost:5173 

---

## ⚙️ Backend Setup

Install dependencies:

bash pip install -r requirements.txt 

Create a .env file:

env GEMINI_API_KEY=your_gemini_key GOOGLE_APPLICATION_CREDENTIALS=firebase-key.json FIREBASE_PROJECT_ID=your_project_id 

Start FastAPI server:

bash python main.py 

or

bash uvicorn main:app --reload 

Backend runs on:

text http://localhost:8000 

---

## 📡 API Endpoints

### Users

http POST /users GET /users GET /users/{user_id} PUT /users/{user_id} DELETE /users/{user_id} 

### Questionnaire

http POST /users/{email}/answers GET /users/{email}/answers 

### Personalized Resources

http POST /home/{email}/generate GET /home/{email} 

### Jobs

http GET /jobs/{job_id} 

### AI Mentor

http POST /mentor 

---

## 🧩 Personal Contribution

- Designed complete system architecture
- Built FastAPI backend
- Designed Firestore schema
- Developed AI-powered recommendation engine
- Implemented Gemini integration
- Built resource categorization pipeline
- Created AI mentor service
- Developed React frontend
- Integrated Clerk authentication

---

## 🚧 Future Improvements

- ML-based recommendation ranking
- LeetCode integration
- User progress tracking
- Personalized revision scheduling
- Spring Boot microservices architecture
- Vector database integration (RAG)

---

## 📄 License

MIT License

---

## ⭐ Final Note

AlgoGuide demonstrates:

- Full Stack Development
- FastAPI Backend Engineering
- Firebase Integration
- Generative AI Applications
- Recommendation Systems
- Asynchronous Python Programming

A complete AI-powered learning platform built for interview preparation and career grow