# Pipeline One — Database Configuration Guide

Pipeline One uses **PostgreSQL** as its primary relational store and optionally **MongoDB Atlas** as a secondary document store.

---

## 1. PostgreSQL Setup (Primary)

### Option A: Local PostgreSQL
1. Ensure PostgreSQL 14+ is running locally on port 5432.
2. Create the database:
   ```sql
   CREATE DATABASE pipeline_one;
   ```
3. Set your connection string in `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/pipeline_one
   ```
4. Run migrations:
   ```bash
   npm --prefix server run migrate
   ```

### Option B: Cloud PostgreSQL (Neon / Supabase / AWS RDS)
1. Create a free PostgreSQL instance on [Neon](https://neon.tech) or [Supabase](https://supabase.com).
2. Copy the connection string and set `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL=postgresql://user:pass@ep-cool-db.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### Operational Resiliency Mode
If PostgreSQL is offline or credentials are missing, Pipeline One automatically starts in **Resilient Mode** using an in-memory SQL compatibility layer, allowing full evaluation and UI testing without crashing.

---

## 2. MongoDB Atlas Setup (Secondary Document Store)

MongoDB Atlas is optional in Phase 1 and used to store flexible project scans and raw AST file trees.

1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. In **Network Access**, allow access from your IP or `0.0.0.0/0` for development.
3. In **Database Access**, create a user with read/write privileges.
4. Copy your connection string into `.env`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/pipeline_one?retryWrites=true&w=majority
   ```
5. Check health: Navigate to `/api/health` or **Platform Settings** in the dashboard to view Atlas connectivity status.
