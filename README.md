# Job Hunt AI Agent

A full-stack job application automation tool using a Python backend (FastAPI) and React frontend.

## Prerequisites

- [Python 3.12+](https://www.python.org/downloads/)
- [Node.js 20+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL)
- [Gemini API Key](https://aistudio.google.com/) (for AI parsing)

## Setup

### 1. Backend (Python FastAPI)

Create a virtual environment and install dependencies:

```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

python -m pip install -r requirements.txt
```

### 2. Frontend (React + Vite)

Install dependencies:

```bash
cd frontend
npm install
```

### 3. Docker (PostgreSQL)

Ensure Docker Desktop is running, then start the database:

```bash
docker-compose up -d db
```

### 4. Environment Variables

Create a `.env` file in the root directory (or `backend/`) with your Gemini API Key:

```env
GEMINI_API_KEY=your_key_here
```

## Running the Application

### Using VS Code (Recommended)

1. Open the project in VS Code.
2. Go to the **Run and Debug** view (`Ctrl+Shift+D`).
3. Select **"Full Stack: Backend + Frontend"**.
4. Press **F5**.

### Manual Start

#### Start the Database:
```bash
docker-compose up -d db
```

#### Start the Backend:
```bash
cd backend
python main.py
```

#### Start the Frontend:
```bash
cd frontend
npm run dev
```

## AI Parsing

When you upload a resume, the system uses Gemini to parse it into structured JSON. Ensure you have your `GEMINI_API_KEY` set up for this to work.
