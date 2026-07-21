# 🌟 Fafanua

> **Fafanua** (Swahili for "to explain" or "clarify")

**Author / Team Lead:** Steve Austine Kamunge

### IBM AI Builders July Challenge
**Theme:** Reimagine Creative Industries with AI (Storytelling and Content Creation Tools)

[🔗 Live Demo Video](#) | [🎓 IBM SkillsBuild Certificates](#)

---

## 🛑 The Problem

Engineers and technical professionals often struggle with sterile, generic presentation workflows. There is a significant gap between brilliant technical execution and human-centered storytelling. Dense architecture diagrams, code snippets, and system logs are rarely translated into engaging narratives, leaving audiences disconnected from the true value of the work.

## 💡 The Solution

Fafanua bridges this gap by acting as a **narrative architect** rather than a simple text generator. It takes your dense technical text and transforms it into warm, structured, and engaging narrative slide decks, empowering technical teams to communicate their vision with clarity and impact.

## 🏗️ AI Approach & Architecture

Fafanua features a fully decoupled, modern architecture:

- **Frontend (React / Vite / Tailwind CSS):** A blazingly fast, responsive user interface built with React and Vite. It provides an intuitive ingestion component for pasting technical specs and a dynamic rendering canvas that maps AI-generated JSON into beautiful presentation slides.
- **Backend (Django / DRF):** A robust Python backend utilizing Django 5.1.4 and Django REST Framework to expose a secure API endpoint (`/api/generate/`).
- **AI Integration (IBM watsonx):** The backend leverages the `ibm-watsonx-ai` Python SDK to communicate with the **Granite** model (`ibm/granite-3-3-8b-instruct`). By using strict zero-shot system prompting, Granite is constrained to return a heavily structured JSON array containing slide titles, bullet points, and cohesive `theme_variant` parameters ("warm", "bold", "clean").

## 🤖 How IBM Bob Was Used

IBM Bob was the primary development tool used to orchestrate and build Fafanua from the ground up:
- **Ask Mode:** Used for initial architecture research and selecting the optimal technology stack for a decoupled Python/React application.
- **Plan Mode:** Leveraged to define the strict JSON contract between Django and React, ensuring seamless data flow and a robust API design before writing code.
- **Agent/Code Mode:** Employed to rapidly scaffold the Django backend API views, integrate the `ibm-watsonx-ai` SDK, and build the dynamic Tailwind CSS UI components in React.

## 🚀 Local Setup Instructions

Follow these steps to run Fafanua on your local machine.

### Prerequisites
- Python 3.10+
- Node.js (v18+)
- npm 

### 1. Clone the Repository
```bash
git clone https://github.com/Voste126/FAFANUA.git
cd FAFANUA
```

### 2. Backend Setup (Django)
Navigate to the backend directory and set up the Python environment:
```bash
cd BACKEND

# Activate the existing virtual environment
source fafanuaEnv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Environment Variables
Create a `.env` file in the `BACKEND` directory and add your IBM watsonx credentials:
```env
WATSONX_URL="https://us-south.ml.cloud.ibm.com"
WATSONX_APIKEY="your_ibm_cloud_api_key_here"
WATSONX_PROJECT_ID="your_watsonx_project_id_here"
```

#### Run the Server
Apply migrations and start the Django development server:
```bash
python manage.py migrate
python manage.py runserver
```
*The backend API will be running at `http://localhost:8000/`.*

### 3. Frontend Setup (React/Vite)
Open a new terminal window, navigate to the frontend application directory, and start the Vite development server:
```bash
cd FRONTEND/FAFANUA_AI

# Install dependencies
npm install

# Start the development server
npm run dev
```
*The React application will be available at `http://localhost:5173/`.*
