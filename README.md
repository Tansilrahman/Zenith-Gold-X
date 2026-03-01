# Zenith Gold X - Unified Project 🚀

This is the fully integrated, monolithic version of **Zenith Gold X**, designed perfectly for hackathon judging and simple deployments. The React frontend and Express backend operate from a single unified module.

## 🚀 How to Run Locally (Simplest Way)

You do not need to run frontend and backend separately anymore! To start the whole stack:

```bash
# 1. Install all dependencies (Frontend & Backend)
npm run install:all

# 2. Start Both Servers (Development Mode)
npm run dev
```
*(The frontend will run on `:5173` and backend on `:5005` automatically)*

## 🌍 How to Deploy (Production)

This project has been restructured so it can be deployed on a single Node.js runtime (e.g., Render, Railway, DigitalOcean). 

When you run `npm start`, the Node.js backend starts and **automatically serves the built React frontend**, making it a true single module.

```bash
# 1. Install dependencies
npm run install:all

# 2. Build the React frontend for Production
npm run build

# 3. Start the Unified Server 
npm start
```

### ⚠️ A Note on Vercel
Vercel is strictly a **Serverless Function** platform. Because this app uses **SQLite** and **Local File Uploads** (`multer`), the database and image saves will fail on Vercel's ephemeral file system. 
For production hackathon judging, we strongly recommend deploying this unified app on **Render.com** (Web Service connecting to a free persistent disk, using `npm start` as the start command).
