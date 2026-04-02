# 🚀 AlgoGuide — Personalized Interview Preparation Platform

AlgoGuide is an adaptive interview preparation platform designed to replace static problem lists with a personalized, data-driven learning experience. The system analyzes user performance, tracks topic proficiency, and recommends relevant problems and learning resources to accelerate preparation.

> [!IMPORTANT]
> **Backend Requirement**: This repository contains the **Frontend** code only. The full system architecture includes a Node.js/Express backend and a Python AI service. Ensure these services are running for full functionality.

## 📌 Motivation

Traditional interview preparation relies on fixed question sheets that do not adapt to individual strengths, weaknesses, or target roles. AlgoGuide was built to create a smarter preparation workflow that evolves with the learner by using performance analytics and AI-assisted recommendations.

## 🏗️ System Architecture

```mermaid
graph TD
    User((User))
    Frontend[Frontend (React)]
    Backend[Backend API (Node.js / Express)]
    AIService[AI Service (Python + LLM)]
    DB[(Firebase Database)]

    User <--> Frontend
    Frontend <--> Backend
    Backend <--> AIService
    Backend <--> DB
    AIService -.-> DB
```

## 🚀 Key Features

- **🧠 Personalized Learning Paths**: Tailored paths based on topic proficiency and goals.
- **📈 Readiness & Progress Scoring**: Dynamic scoring to track your interview readiness.
- **🎯 Adaptive Problem Recommendations**: AI engine suggests the next best problem to solve.
- **🤖 AI-Powered Assistance**: 24/7 mentor for doubt resolution and technical guidance.
- **🗣️ Interactive Mock Interviews**: Real-time voice-based technical interviews.
- **📊 Performance Tracking Dashboard**: Visual analytics of your preparation journey.
- **👨‍💻 In-Browser Code Editor**: Integrated environment for practicing solutions.

## 📊 How It Works

1. **User defines preparation goals**: Set your target roles and companies.
2. **Platform tracks topic-wise performance**: Monitor strengths and weaknesses.
3. **Recommendation engine suggests next best problems**: Get targeted practice.
4. **AI assistant provides guided support**: Resolve doubts instantly.
5. **Readiness score updates dynamically**: See your progress in real-time.

## 🔥 Core Concepts

- **Adaptive Recommendation Systems**: Algorithms that adjust difficulty based on performance.
- **Backend API Design**: Scalable RESTful architecture using Node.js and Express.
- **Data-Driven Personalization**: Customizing the experience using user analytics.
- **AI-Assisted Workflows**: Integrating LLMs for intelligent feedback.
- **Scalable System Architecture**: Designed for growth and performance.

## ⚙️ Technology Stack

### Frontend
- **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Authentication**: [Clerk](https://clerk.com/)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Firebase (Firestore / Authentication)

### AI & Analytics
- **Integration**: LLM Integration (Python)
- **Voice AI**: Vapi, Deepgram, 11Labs
- **Logic**: Performance scoring algorithms

### Tools
- **Version Control**: Git
- **Development**: VS Code
- **Testing**: Postman

## 🧩 Personal Contribution

- **Designed Overall System Architecture**: Created the end-to-end flow from frontend to AI services.
- **Built Backend APIs**: Developed the Node.js/Express recommendation logic.
- **Integrated Firebase**: Managed authentication and real-time data storage.
- **Implemented AI Features**: Built the AI-powered assistance and interview modules.

## 🚧 Future Improvements

- **Microservices Migration**: Moving towards Spring Boot microservices for better scalability.
- **Advanced ML Engine**: Implementing more sophisticated machine learning models for recommendations.
- **Enhanced Analytics**: Deeper insights into user performance and coding patterns.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** or **yarn**

## ⚙️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/AlgoGuide-Frontend.git
   cd AlgoGuide-Frontend/AlgoGuide
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root of `AlgoGuide` directory.

   ```env
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
   VITE_FIREBASE_API_KEY=your_firebase_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   GEMINI_API_KEY=your_gemini_key
   ```

## 🏃‍♂️ Running the App

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## 🐳 Running with Docker

You can also run the application using Docker and Docker Compose. This is recommended for consistent environments.

### 1. Build and Run with Docker Compose

```bash
# Ensure your .env file is configured correctly
docker-compose up --build
```

The application will be available at `http://localhost:3000`.

### 2. Standard Docker Build

If you prefer to build the image manually:

```bash
docker build -t algoguide-frontend .
docker run -p 3000:80 algoguide-frontend
```

## 📂 Project Structure

```text
src/
├── components/       # Reusable UI components
│   ├── roadmap/      # Roadmap & Mentor specific components
│   ├── Hero.jsx      # Landing page hero section
│   └── ...
├── pages/            # Main application pages
│   ├── Dashboard.jsx # User progress & roadmap view
│   ├── Landing.jsx   # Public landing page
│   ├── Onboarding.jsx# User setup flow
│   ├── SignIn.jsx    # Auth pages
│   └── ...
├── SDEInterview.jsx  # Core Mock Interview logic (Vapi integration)
├── App.jsx           # Routing & Auth Guards
└── main.jsx          # Entry point & Providers
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.
