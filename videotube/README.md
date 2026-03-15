# VideoTube - Fullstack YouTube Clone

VideoTube is a full-featured video sharing platform built with a modern tech stack. It handles complex workflows like video chunking, HLS streaming, asynchronous queue processing, and automated video transcription using WhisperAI.

## Tech Stack

**Frontend:**
- React (Vite)
- Tailwind CSS
- React Router & TanStack Query
- HLS.js (for adaptive bitrate streaming)
- Framer Motion

**Backend & Queues:**
- Node.js & Express
- TypeScript
- MongoDB & Mongoose
- Redis & BullMQ (for background processing, video uploading, and transcription)
- Fluent-FFmpeg (for video processing/HLS transcoding)

**Storage & 3rd Party:**
- Azure Blob Storage (for storing video HLS chunks & subtitles)
- Cloudinary (for images, avatars, and thumbnails)
- JWT Authentication

---

## Prerequisites

Before running this project, ensure you have the following installed on your machine:

1. **Node.js** (v18 or v20+ recommended)
2. **FFmpeg**: You **must** have FFmpeg installed on your PC and added to your system `PATH` to process videos.
   - *Windows Setup:* Download from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) or use `winget install ffmpeg`.
3. **Docker Desktop** (Highly recommended to easily run Redis and MongoDB)
4. **Python** (If running the local `transcribe.py` Whisper script)

---

## Environment Setup

1. Open the project root folder.
2. Locate the `.env.example` file.
3. Create a new file named `.env` in the root folder (or wherever your environment variables are configured, e.g., inside `apps/server/.env` if using Docker), and copy the contents of `.env.example` into it.
4. Fill in all the missing credentials:
   - **Cloudinary:** Sign up for [Cloudinary](https://cloudinary.com/) and provide your Cloud Name, API Key, and API Secret.
   - **Azure Blob Storage:** Set up an Azure Storage account, create a container named `videos`, and provide the connection string and SAS token.
   - **JWT Secrets:** Create secure random strings for your access and refresh tokens.

---

## Running the Application Locally

The project uses npm workspaces to manage both the server and the web apps in a single repository.

### 1. Install Dependencies
In the root directory of the project, run:
```bash
npm install
```

### 2. Start Services (MongoDB & Redis)
You need both MongoDB and Redis running for the server and task queues to function. If you have Docker installed, simply run:
```bash
docker-compose up mongodb redis -d
```
*(This will start MongoDB on port 27017 and Redis on port 6379 in the background).*

### 3. Start the Development Servers
From the root directory, you can start both the frontend and the backend concurrently using:
```bash
npm run dev
```

If you prefer to run them in separate terminals for cleaner logs:
- **Terminal 1 (Backend):** `npm run dev:server`
- **Terminal 2 (Frontend):** `npm run dev:web`

### 4. Access the App
- **Frontend / Client:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:8000](http://localhost:8000)

---

## Project Structure (Monorepo)

- `apps/server`: The Express.js backend API, BullMQ workers, and video processing pipelines.
- `apps/web`: The Vite + React frontend application.
- `packages/shared`: Shared codebase (types, constants, schema validation) used by both web and server.

## Troubleshooting

- **Redis Error (`ECONNREFUSED`):** If the backend crashes on startup with a connection error, make sure your Redis server is actively running on port 6379.
- **Video Processing Fails:** Ensure `ffmpeg` is properly installed and recognized by your terminal (run `ffmpeg -version` to verify).
- **Upload Failures:** Make sure your Azure Blob connection strings and Cloudinary keys are correct in your `.env` file.
