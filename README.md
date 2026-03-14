# Paper Pilot

Paper Pilot is a full-stack, AI-powered document exploration chatbot. It uses Retrieval-Augmented Generation (RAG) to allow users to interact intelligently with their uploaded PDF, Markdown, and Text files. By providing strict context-grounding, the chatbot only answers questions based on the knowledge present in the uploaded documents.

---

## 🚀 Features
- **Document Knowledge Base:** Upload `.pdf`, `.md`, and `.txt` files directly into a specific chat context.
- **RAG Architecture:** Uses document parsing, chunking, and batched embeddings to store vectorized knowledge.
- **Strict Grounding:** The AI is strictly prompt-engineered to refuse answering questions outside the uploaded documents' context.
- **Multi-Model Support:** Toggle seamlessly between Gemini (`gemini-2.5-flash`, `gemini-1.5-pro`) and OpenAI (`gpt-4o-mini`, `gpt-4o`) models.
- **Modern UI:** Built on Next.js 14 and Tailwind CSS with a minimal, dark-mode aesthetic.

---

## 🛠️ Tech Stack

**Frontend:**
- [Next.js 14](https://nextjs.org/) (App Router, React)
- [Tailwind CSS](https://tailwindcss.com/) (Styling)
- [Lucide React](https://lucide.dev/) (Icons)

**Backend:**
- [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/) (TypeScript)
- [PostgreSQL](https://www.postgresql.org/) & `pg` (Relational Data & Auth)
- [ChromaDB](https://www.trychroma.com/) (Vector Database for RAG)
- [pdf-parse](https://www.npmjs.com/package/pdf-parse) (Document Extraction)
- Google `text-embedding-004` API (Embedding Generation)

---

## ⚙️ Quick Setup

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL Database (running locally or cloud)
- Docker (for ChromaDB)
- API Keys: 
  - `GEMINI_API_KEY` (required for embeddings and Gemini chat models)
  - `OPENAI_API_KEY` (optional, for GPT models)

### 2. Run ChromaDB
Start a local instance of ChromaDB using Docker. This is required to process and store document embeddings.
```bash
docker run -p 8000:8000 chromadb/chroma
```

### 3. Setup Backend
Open a terminal and navigate to the `backend` folder:
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:
```env
PORT=5000
DATABASE_URL=postgres://user:password@localhost:5432/paper_pilot
JWT_SECRET=your_super_secret_jwt_key
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
CHROMA_URL=http://localhost:8000
```

Initialize the database schema:
```bash
psql -d paper_pilot -f src/db/schema.sql
```

Start the backend development server:
```bash
npm run dev
```

### 4. Setup Frontend
Open a new terminal and navigate to the `frontend` folder:
```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Start the frontend development server:
```bash
npm run dev
```

### 5. Start Chatting
Open your browser and navigate to `http://localhost:3000`. Register an account, create a new chat, upload a PDF in the **Documents** section, and start asking questions!

---

## 📝 Logging
The backend includes a comprehensive, dual-logging system for debugging and monitoring during development:
- **HTTP Requests:** Logs all incoming API calls, routes, methods, and processing duration to `backend/logs/http_requests.log`.
- **AI Payloads:** Logs the precise, RAG-augmented prompt (including context chunks) sent to the LLM APIs into `backend/logs/ai_requests.log`.
