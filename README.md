# ⚡ CollabFlow — Real-Time Collaborative Workspace Engine

[![CI Pipeline](https://github.com/your-username/collabflow/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/collabflow/actions/workflows/ci.yml)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-5.8%20Strict-blue.svg)](https://www.typescriptlang.org/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14%20App%20Router-black.svg)](https://nextjs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.2-brightgreen.svg)](https://www.fastify.io/)
[![Yjs CRDT](https://img.shields.io/badge/Yjs-CRDT%20Consensus-orange.svg)](https://github.com/yjs/yjs)
[![BullMQ](https://img.shields.io/badge/BullMQ-Redis%20Queue-red.svg)](https://bullmq.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **CollabFlow** is a production-grade, distributed infinite canvas workspace (mini-Figma + Miro) engineered with **Yjs (CRDTs)**, **WebSockets**, and an asynchronous **BullMQ background rendering pipeline**. Designed to demonstrate production-level system design depth, conflict-free state convergence, and sub-50ms collaborative latency.

---

## 🎥 90-Second Technical Walkthrough

[![Watch the 90-Second Walkthrough Video](https://img.shields.io/badge/Loom-Watch%202--Minute%20Architecture%20Demo-625DF5?style=for-the-badge&logo=loom&logoColor=white)](https://www.loom.com/)
*(Two browser contexts side-by-side: real-time cursor movement, sub-20ms CRDT convergence, and asynchronous vector export)*

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Clients["Frontend Clients (Next.js 14 App Router)"]
        UI1["Client A Canvas (Zustand + SVG)"]
        UI2["Client B Canvas (Zustand + SVG)"]
        YjsA["Yjs CRDT Doc A"]
        YjsB["Yjs CRDT Doc B"]
        UI1 <--> YjsA
        UI2 <--> YjsB
    end

    subgraph Gateway["Real-Time Gateway (Fastify + WebSockets)"]
        WS["WebSocket Server (y-protocols / sync)"]
        RM["RoomManager (State Vectors & Awareness)"]
        REST["REST API (Auth, Projects, Exports)"]
        WS <--> RM
    end

    subgraph Data["Persistence & Broker Layer"]
        Redis[("Redis: Pub/Sub & BullMQ Task Queue")]
        Storage[("Storage Adapter: PostgreSQL / Atomic File Engine")]
    end

    subgraph Worker["Background Engine"]
        QueueWorker["Export Worker (PDF-Lib / Vector Engine)"]
    end

    YjsA <-->|WSS Sync Updates| WS
    YjsB <-->|WSS Sync Updates| WS
    RM -->|Debounced Snapshots (2s)| Storage
    REST --> Storage
    REST -->|Enqueue Export| Redis
    Redis -->|Consume Job| QueueWorker
    QueueWorker -->|Upload Artifact| Storage
```

---

## 🛠️ The 4 Core Engineering Challenges Solved

### 1. State Synchronization & Conflict-Free Resolution (CRDTs)
- **The Problem:** Naive HTTP PUT/PATCH requests overwrite simultaneous mutations when two users drag or edit canvas elements simultaneously.
- **The Solution:** Implemented Conflict-Free Replicated Data Types using **Yjs** binary sync protocols (`y-protocols/sync` and `y-protocols/awareness`). Updates are applied as commutative and associative operations, guaranteeing eventual consistency across all distributed clients without central distributed locking.

### 2. High-Frequency Write Optimization (Debounced Persistence Buffer)
- **The Problem:** 20 users performing 60 interactions/sec on an active canvas generate 1,200 database writes/sec, quickly exhausting database connection pools.
- **The Solution:** Implemented an in-memory document cache within the Fastify gateway. High-frequency changes are broadcasted via memory/Redis Pub-Sub immediately, and state snapshots are flushed atomically to persistent storage with a 2-second sliding debounce window.

### 3. Asynchronous Export Pipeline with Backoff & DLQ
- **The Problem:** Generating high-resolution vector SVGs, multi-page PDFs, and rasterized images from massive canvases blocks the Node.js event loop if run on the main HTTP thread.
- **The Solution:** Offloaded all document generation to a **BullMQ** worker queue with exponential backoff retries and Dead Letter Queue (DLQ) guarantees. The client receives an instant HTTP 202 Accepted, polls the job status, and downloads the finished artifact once rendered.

### 4. Hexagonal Architecture (Zero-Setup Local Dev + Production Cloud)
- **The Solution:** Designed clean abstract interfaces (`IStorageService` and `IQueueService`).
  - **Local Development:** Runs instantly with zero external dependencies using `FileStorageService` and `EmbeddedQueueService`.
  - **Production / Cloud:** Automatically connects to PostgreSQL and Redis when `DATABASE_URL` and `REDIS_URL` are provided.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v20 or v22+
- **pnpm**: v9 or v11 (`corepack enable pnpm`)
- *(Optional)* **Docker Desktop** for containerized deployment

### 1. Run Locally (Zero External Dependencies)
```bash
# Clone the repository
git clone https://github.com/your-username/collabflow.git
cd collabflow

# Install all monorepo dependencies
pnpm install

# Start both backend server and Next.js frontend concurrently
pnpm dev
```
- Open **Web Dashboard:** [http://localhost:3000](http://localhost:3000)
- **Fastify Backend API:** [http://localhost:4000](http://localhost:4000)
- **Health Check Probe:** [http://localhost:4000/healthz](http://localhost:4000/healthz)
- **System Metrics:** [http://localhost:4000/api/metrics](http://localhost:4000/api/metrics)

### 2. Run with Docker Compose
```bash
docker compose up --build
```
This boots **PostgreSQL 16**, **Redis 7**, the **Fastify API Server**, and the **Next.js Web Client**.

---

## 🧪 Running Automated Tests

```bash
# Run unit & integration test suites across all packages
pnpm test
```

---

## 📋 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/healthz` | Kubernetes liveness probe |
| `GET` | `/api/metrics` | Server memory, active rooms, WebSocket connections, queue stats |
| `POST` | `/api/auth/register` | Register new user with bcrypt password hashing |
| `POST` | `/api/auth/login` | Login and receive JWT bearer token |
| `GET` | `/api/boards` | List all active collaborative boards |
| `POST` | `/api/boards` | Create a new board with initial welcome state |
| `GET` | `/api/boards/:id` | Fetch board metadata and node count |
| `PATCH` | `/api/boards/:id` | Update board title and description |
| `DELETE` | `/api/boards/:id` | Delete board and associated snapshots |
| `POST` | `/api/boards/:id/export` | Enqueue background export job (`svg`, `pdf`, `png`, `json`) |
| `GET` | `/api/exports/:jobId` | Poll status of background export job |
| `GET` | `/api/exports/download/:file`| Download rendered export artifact |

---

## 👤 Author & License
Crafted with ❤️ by the CollabFlow Team. Distributed under the **MIT License**.
