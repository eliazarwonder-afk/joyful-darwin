# 🚢 CollabFlow Production Deployment Guide

This guide details the step-by-step production deployment strategy for **CollabFlow**, covering everything from pushing to GitHub to live production deployment across cloud providers.

---

## 📋 Table of Contents
1. [GitHub Repository Setup](#1-github-repository-setup)
2. [Deployment Option A: Serverless & Managed Cloud (Recommended)](#2-deployment-option-a-serverless--managed-cloud)
3. [Deployment Option B: Self-Hosted Docker Compose (VPS / AWS EC2)](#3-deployment-option-b-self-hosted-docker-compose)
4. [Nginx Reverse Proxy & SSL Configuration](#4-nginx-reverse-proxy--ssl-configuration)
5. [Environment Variables Reference](#5-environment-variables-reference)
6. [Health Check & Monitoring Probes](#6-health-check--monitoring-probes)

---

## 1. GitHub Repository Setup

### Push to GitHub
If you haven't yet linked your local repository to GitHub:

```bash
# 1. Create a new repository on GitHub (e.g., https://github.com/your-username/collabflow)

# 2. Add remote and push master branch
git remote add origin https://github.com/your-username/collabflow.git
git branch -M main
git push -u origin main
```

### GitHub Actions CI Workflow
The repository includes `.github/workflows/ci.yml`. On every Pull Request or commit to `main`, GitHub Actions will automatically:
- Install dependencies with `pnpm`
- Run the full Vitest unit and integration test suite
- Typecheck and compile all packages (`@collabflow/shared`, `@collabflow/server`, `@collabflow/web`)

---

## 2. Deployment Option A: Serverless & Managed Cloud

This is the fastest, zero-maintenance architecture:

```
[Users] ---> [Vercel (Next.js Web)]
                    │
                    ▼  WSS / REST
             [Railway / Render (Fastify WS Server)]
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
 [Neon / Supabase (Postgres)]  [Upstash (Redis)]
```

### Step 1: Deploy Backend (Fastify + WebSockets) on Railway or Render
1. Go to [Railway.app](https://railway.app/) or [Render.com](https://render.com/).
2. Create a **New Service from GitHub Repo**.
3. Set the **Root Directory** to `apps/server` (or point to `apps/server/Dockerfile`).
4. Add Environment Variables:
   ```env
   NODE_ENV=production
   PORT=4000
   HOST=0.0.0.0
   JWT_SECRET=generate-a-secure-random-64-character-string
   CORS_ORIGIN=https://your-collabflow-frontend.vercel.app
   DATABASE_URL=postgres://user:password@your-neon-host/dbname?sslmode=require
   REDIS_URL=rediss://default:token@your-upstash-host:6379
   ```
5. Deploy. You will receive a public URL like `https://collabflow-api-production.up.railway.app`.

### Step 2: Deploy Frontend on Vercel
1. Go to [Vercel](https://vercel.com/) and click **Add New Project**.
2. Select your `collabflow` GitHub repository.
3. Configure the project:
   - **Framework Preset:** Next.js
   - **Root Directory:** `apps/web`
4. Add Environment Variables:
   ```env
   NEXT_PUBLIC_API_URL=https://collabflow-api-production.up.railway.app
   NEXT_PUBLIC_WS_URL=wss://collabflow-api-production.up.railway.app/ws
   ```
5. Click **Deploy**. Vercel will build and serve your Next.js application at global edge locations.

---

## 3. Deployment Option B: Self-Hosted Docker Compose

To deploy the entire stack (PostgreSQL + Redis + Fastify API + Next.js Web) on a single VPS (DigitalOcean Droplet, AWS EC2, Hetzner):

### 1. SSH into your server
```bash
ssh ubuntu@your-server-ip
```

### 2. Install Docker & Docker Compose
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 3. Clone Repository & Launch
```bash
git clone https://github.com/your-username/collabflow.git
cd collabflow

# Copy environment template
cp .env.example .env

# Edit .env with your domain names and secrets
nano .env

# Start all containers in detached mode
docker compose up -d --build
```

### 4. Verify Containers
```bash
docker compose ps
```
You should see 4 healthy containers:
- `collabflow-postgres` (Port 5432)
- `collabflow-redis` (Port 6379)
- `collabflow-server` (Port 4000)
- `collabflow-web` (Port 3000)

---

## 4. Nginx Reverse Proxy & SSL Configuration

When running WebSockets behind Nginx, you must pass the `Upgrade` headers:

```nginx
# /etc/nginx/sites-available/collabflow.conf

# 1. Frontend (Next.js)
server {
    server_name collabflow.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 80;
}

# 2. Backend & WebSocket Gateway
server {
    server_name api.collabflow.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    listen 80;
}
```

### Enable SSL with Let's Encrypt:
```bash
sudo certbot --nginx -d collabflow.yourdomain.com -d api.collabflow.yourdomain.com
```

---

## 5. Environment Variables Reference

| Variable | Scope | Description | Default / Example |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Server & Web | Runtime environment mode | `production` / `development` |
| `PORT` | Server | HTTP/WS listen port | `4000` |
| `HOST` | Server | Network bind address | `0.0.0.0` |
| `JWT_SECRET` | Server | Secret for signing auth tokens | *High entropy 64-char string* |
| `CORS_ORIGIN` | Server | Allowed client origin | `https://collabflow.yourdomain.com` |
| `DATABASE_URL` | Server | PostgreSQL connection string | `postgres://user:pass@host:5432/db` |
| `REDIS_URL` | Server | Redis connection string | `redis://user:pass@host:6379` |
| `NEXT_PUBLIC_API_URL` | Web | Backend REST API endpoint | `https://api.collabflow.yourdomain.com` |
| `NEXT_PUBLIC_WS_URL` | Web | Backend WebSocket gateway | `wss://api.collabflow.yourdomain.com/ws` |

---

## 6. Health Check & Monitoring Probes

| Endpoint | Protocol | Purpose | Expected Response |
| :--- | :--- | :--- | :--- |
| `GET /healthz` | HTTP | Kubernetes Liveness Probe | `{"status": "healthy", "uptimeSeconds": 120}` |
| `GET /readyz` | HTTP | Kubernetes Readiness Probe | `{"status": "ready", "storage": "connected"}` |
| `GET /api/metrics` | HTTP | Production Observability | Realtime memory, active rooms, queue stats |
