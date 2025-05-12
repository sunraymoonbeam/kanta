# Face Encoding Service

A FastAPI micro-service for uploading images, detecting faces, generating embeddings, storing in Azure Blob Storage & PostgreSQL, and querying by clusters or similarity.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Setup](#setup)

   1. [Clone & Install](#1-clone--install)
   2. [Database Setup](#2-database-setup)
   3. [Storage Setup](#3-storage-setup)
   4. [Run Server](#4-run-server)
3. [API Endpoints](#api-endpoints)
4. [Testing](#testing)
5. [Common psql Commands](#common-psql-commands)

---

## Prerequisites

* **Python 3.10+**
* **PostgreSQL 12+** with the `vector` extension
* **Azure Storage Account** (Blob Storage)
* **face\_recognition** dependencies (`cmake`, `dlib`, etc.)
* **Azure CLI** (optional, for Azure AD auth)

---

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/shafiqninaba/kanta.git
cd kanta/encode-faces
python -m venv .venv
source .venv/bin/activate      # on Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 2. Database Setup

1. **Enable `vector` extension** in your PostgreSQL (Azure Flexible Server → Server parameters → Allowed extensions):

   ```sql
   ALTER EXTENSION IF EXISTS vector;
   ```

2. **Run schema** via psql:

   ```bash
   psql "host=$DBHOST port=$DBPORT user=$DBUSER dbname=$DBNAME sslmode=$SSLMODE" \
     -f src/db/migrations/0001_init_schema.sql
   ```

3. **Verify**:

   ```sql
   \dt   -- lists tables images, faces, events
   ```

4. *(Optional)* **Alembic** migrations:

   ```bash
   alembic init alembic
   # configure alembic.ini → sqlalchemy.url
   alembic revision --autogenerate -m "Initial schema"
   alembic upgrade head
   ```

### 3. Storage Setup

1. **Create** an Azure Storage Account + Blob Container (name default: `images`).
2. **Obtain** Connection String (or use Azure AD via `az login` + `AZURE_STORAGE_ACCOUNT_NAME`).
3. **Configure** your `.env` or shell variables:

   ```ini
   AZURE_STORAGE_CONNECTION_STRING=...
   AZURE_CONTAINER_NAME=images
   ```

### 4. Run Server

```bash
uvicorn main:app --reload
```

Open [http://localhost:8000/docs](http://localhost:8000/docs) for interactive Swagger UI.

---

## API Endpoints

| Method | Path            | Description                                                        |
| ------ | --------------- | ------------------------------------------------------------------ |
| POST   | /upload-image   | Upload an image → detect faces → store in Blob & DB                |
| POST   | /events?code=&… | Create a new event (unique code, optional name & start\_time)      |
| GET    | /events/{code}  | Retrieve event details by code                                     |
| DELETE | /events/{code}  | Delete an event (and its scoped data)                              |
| GET    | /pics           | List images (filters: event\_code, date\_from/to, faces, clusters) |
| GET    | /pics/{uuid}    | Get one image’s metadata + its faces                               |
| DELETE | /pics/{uuid}    | Delete an image (rows + blob)                                      |
| GET    | /clusters       | Summary per cluster (counts + samples); redirect if `?cluster_ids` |
| POST   | /find-similar   | Upload single-face image → return top-K most similar faces         |
| GET    | /health         | Liveness/readiness probe                                           |

---

## Testing

```bash
pytest -vv
```

---

## Common psql Commands

```sql
\l                     -- list databases
\c your_database       -- connect to a database
\dt                    -- list tables
\i schema.sql          -- execute SQL script
\q                     -- quit psql
```

---

*Enjoy building with Face Encoding Service!*
