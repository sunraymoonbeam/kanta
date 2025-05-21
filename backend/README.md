# Kanta: Face-Encoding Microservice

A FastAPI microservice for uploading images, detecting faces, generating embeddings, storing them in Azure Blob Storage & PostgreSQL (with pgvector), and querying by clusters or similarity.

## Table of Contents

1.  [Understanding FastAPI Project Structures](#understanding-fastapi-project-structures)
    1.  [Structuring by File-Type](#1-structuring-by-file-type)
    2.  [Structuring by Module/Functionality (Package Layout)](#2-structuring-by-modulefunctionality-package-layout)
    3.  [Core Differences and Considerations](#3-core-differences-and-considerations)
2.  [Why Kanta’s Structure?](#why-kantas-structure)
3.  [Kanta's Project Structure](#kantas-project-structure)
4.  [Prerequisites](#prerequisites)
5.  [Getting Started](#getting-started)
    1.  [Clone & Install](#1-clone--install)
    2.  [Environment Variables](#2-environment-variables)
    3.  [Database Setup](#3-database-setup)
        1.  [Enable Vector Extension (Azure & PostgreSQL)](#enable-vector-extension-azure--postgresql)
        2.  [Initialize Database Schema](#initialize-database-schema)
            *   [Option A: Running an Initial SQL Script](#option-a-running-an-initial-sql-script)
            *   [Option B: Using Alembic for Schema Management (Recommended)](#option-b-using-alembic-for-schema-management-recommended)
    4.  [Azure Blob Storage Setup](#4-azure-blob-storage-setup)
    5.  [Run the Server](#5-run-the-server)
6.  [API Reference](#api-reference)
7.  [Testing](#testing)
8.  [Common `psql` Commands](#common-psql-commands)

---

## 1. Understanding FastAPI Project Structures

FastAPI applications can be structured in various ways, primarily influenced by the project's size, complexity, and team preferences. Here are some common approaches:

### 1.1. Structuring by File-Type

In this approach, files are organized by their *type* or *layer* in the application (e.g., all routers together, all schemas together).

**Example Structure:**
```
.
├── app/
│   ├── __init__.py
│   ├── main.py           # FastAPI app initialization
│   ├── dependencies.py   # Common dependencies
│   ├── routers/          # All API routers
│   │   ├── __init__.py
│   │   ├── items.py
│   │   └── users.py
│   ├── crud/             # All database interaction logic
│   │   ├── __init__.py
│   │   ├── item.py
│   │   └── user.py
│   ├── schemas/          # All Pydantic schemas
│   │   ├── __init__.py
│   │   ├── item.py
│   │   └── user.py
│   ├── models/           # All SQLAlchemy/DB models
│   │   ├── __init__.py
│   │   ├── item.py
│   │   └── user.py
│   └── core/             # Configuration, settings
│       └── config.py
├── tests/
├── requirements.txt
└── README.md
```

-   **Pros:**
    -   Clear separation based on technical layers.
    -   Relatively easy to navigate for developers familiar with this pattern.
    -   Suitable for microservices or projects with a limited number of distinct domains.
-   **Cons:**
    -   When working on a specific feature (e.g., "items"), you might need to jump between many directories (`routers`, `crud`, `schemas`, `models`).
    -   Can still become complex if the number of features within each layer grows significantly.

### 1.2. Structuring by Module/Functionality (Package Layout)

This approach organizes the project by *features*, *domains*, or *business capabilities*. Each module is a self-contained package with its own routers, services, models, schemas, etc. This is often referred to as a "package" layout.

**Example Structure (Generic):**
```
.
├── src/
│   ├── auth/                 # Authentication module
│   │   ├── __init__.py
│   │   ├── router.py
│   │   ├── schemas.py
│   │   ├── service.py
│   │   └── models.py
│   ├── posts/                # Posts module
│   │   ├── __init__.py
│   │   ├── router.py
│   │   ├── schemas.py
│   │   ├── service.py
│   │   └── models.py
│   ├── users/                # Users module
│   │   ├── __init__.py
│   │   ├── router.py
│   │   ├── schemas.py
│   │   ├── service.py
│   │   └── models.py
│   ├── core/                 # Global config, DB setup, shared utilities
│   │   ├── config.py
│   │   └── database.py
│   ├── main.py               # FastAPI app initialization & global router inclusion
│   └── __init__.py
├── tests/
│   ├── auth/
│   ├── posts/
│   └── users/
├── requirements.txt
└── README.md
```

-   **Pros:**
    -   Excellent separation of concerns by domain.
    -   Highly scalable for large applications and teams.
    -   Easier to manage dependencies and reduce coupling between features.
    -   Modules can potentially be extracted into separate microservices more easily.
    -   Encourages consistent testing and CI practices per module.
-   **Cons:**
    -   Can feel like overkill for very small projects.
    -   Requires careful planning of module boundaries.

### 1.3. Core Differences and Considerations

| Feature              | Single-Module            | File-Type Structure         | Module/Functionality Structure |
| -------------------- | ------------------------ | --------------------------- | ------------------------------ |
| **Organization**     | None (all in one file)   | By technical layer          | By business domain/feature     |
| **Scalability**      | Low                      | Medium                      | High                           |
| **Maintainability**  | Low (for >small apps)    | Medium                      | High                           |
| **Team Collaboration**| Difficult                | Manageable                  | Good                           |
| **Coupling**         | High                     | Medium (between layers)     | Low (between modules)          |
| **Best For**         | Demos, tiny scripts      | Small to medium microservices | Medium to large applications, monoliths needing clear boundaries |

---

## 2. Why Kanta’s Structure?

Kanta adopts the **Module/Functionality (Package Layout)**. This choice was made for several key reasons:

1.  **Clear Separation of Concerns:** Domain logic related to `events`, `images`, and `clusters` are neatly isolated into their respective packages. This makes the codebase easier to understand, maintain, and extend.
2.  **Scalability:** As Kanta grows, new features or domains can be added as new packages without significantly impacting existing ones. This structure supports larger teams working concurrently on different parts of the application.
3.  **Future-Proofing for Microservices:** The modular design inherently lends itself to a microservices architecture. For instance, the `clusters` module, which handles potentially intensive re-clustering tasks, could be extracted into its own independent microservice in the future. Each module, with its own router, services, and models, forms a strong candidate for such separation.
4.  **Testability:** Isolating logic into modules simplifies unit and integration testing for each specific functionality.

This structure provides a robust foundation for Kanta's current needs and prepares it for future evolution.

---

## 3. Kanta's Project Structure

Kanta follows the "Module/Functionality" (Package) layout:

```
.
├── alembic.ini                 # Alembic configuration file
├── Dockerfile
├── pyproject.toml
├── README.md
├── requirements.txt
├── src/
│   └── app/
│       ├── __init__.py
│       ├── main.py             # FastAPI app initialization & startup/shutdown events
│       ├── core/
│       │   ├── config.py       # Pydantic settings for environment variables
│       │   └── azure_blob.py   # Azure Blob Storage client DI & helpers
│       ├── db/
│       │   ├── base.py         # SQLAlchemy declarative_base()
│       │   ├── db.py           # Database engine & session management
│       │   └── migrations/     # Alembic environment (env.py) & version scripts
│       ├── events/             # Domain: Event management
│       │   ├── __init__.py
│       │   ├── models.py       # SQLAlchemy models for events
│       │   ├── schemas.py      # Pydantic schemas for events
│       │   ├── service.py      # Business logic for events
│       │   ├── exceptions.py   # Custom exceptions for events
│       │   └── router.py       # API routes for events
│       ├── images/             # Domain: Image and face management
│       │   ├── __init__.py
│       │   ├── models.py
│       │   ├── schemas.py
│       │   ├── service.py
│       │   └── router.py
│       ├── clusters/           # Domain: Face clustering and similarity
│       │   ├── __init__.py
│       │   ├── schemas.py
│       │   ├── service.py
│       │   ├── utils.py        # Clustering algorithm helpers
│       │   └── router.py
│       └── auth/               # (Optional) Authentication & security
└── tests/                      # Pytest tests, mirroring app structure
```

| Layer        | FastAPI Component                                     | Role                                        |
| ------------ | ----------------------------------------------------- | ------------------------------------------- |
| Presentation | `router.py` in each domain (events, images, clusters) | HTTP I/O, request validation, DI            |
| Service      | `service.py` in each domain                           | Business rules, orchestration               |
| Data/Infra   | `models.py`, `db/`, `core/azure_blob.py`              | Persistence (DB, migrations), external SDKs |


---

## 4. Prerequisites

-   **Python 3.10+**
-   **uv** for packaging & dependency management (recommended)
    -   Install with `pip install uv`
    -   Use `uv sync` to install dependencies from `pyproject.toml` or `uv pip install -r requirements.txt`
-   **PostgreSQL 15+** with the [`vector`](https://github.com/pgvector/pgvector) extension enabled
-   **Azure Storage Account** for Blob Storage
-   **Docker** & **Docker Compose** (optional, for containerized deployment)
-   **Azure CLI** (optional, for managing Azure resources)
-   **Alembic** (for database migrations, installed via `requirements.txt` or `pyproject.toml`)

---

## 5. Getting Started

### 1. Installation
Clone the repository and navigate to the backend directory:
```bash
git clone https://github.com/shafiqninaba/kanta.git
cd kanta/backend/ # Or wherever your project root is
```

Install dependencies using `uv` or `pip`:
Using 'uv' dependency manager (recommended):
```bash
uv sync # Installs from pyproject.toml if present and locked, or use requirements.txt
```

Or with a standard virtualenv:
```bash
python -m venv .venv
source .venv/bin/activate # Or .venv\Scripts\activate on Windows
pip install --upgrade pip
pip install -r requirements.txt
```

### 2. Environment Variables
Create a `.env` file in the project root (e.g., `kanta/backend/.env`):

```ini
# PostgreSQL
POSTGRES_SERVER=your-db-host.postgres.database.azure.com # Example for Azure Database for PostgreSQL
POSTGRES_PORT=5432
POSTGRES_USER=your-db-user
POSTGRES_PASSWORD=your-db-pass
POSTGRES_DB=your-db-name

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=yourstorageaccount;AccountKey=youraccountkey;EndpointSuffix=core.windows.net"
```

These variables are loaded by `src/app/core/config.py` using Pydantic.

### 3. Database Setup

#### Enable Vector Extension (Azure & PostgreSQL)

The `pgvector` extension is crucial for storing and querying high-dimensional vector embeddings, or in this case, our face embeddings.

1.  **For Azure Database for PostgreSQL - Flexible Server:**
    *   Navigate to your server in the Azure portal.
    *   Under "Settings", go to "Server parameters".
    *   Search for `azure.extensions`.
    *   Add `VECTOR` to the list of allowed extensions (if not already present) and save.
    *   Connect to your database using `psql` or a DB tool and run:
        ```sql
        CREATE EXTENSION IF NOT EXISTS vector;
        ```

2.  **For self-hosted PostgreSQL:**
    *   Ensure `pgvector` is installed (follow [pgvector installation instructions](https://github.com/pgvector/pgvector#installation)).
    *   Connect to your database and run:
        ```sql
        CREATE EXTENSION IF NOT EXISTS vector;
        ```

#### Initialize Database Schema

You have two main options for creating the necessary database tables:

**Option A: Running an Initial SQL Script**

This method is straightforward for initial setup if you have a complete schema defined in an SQL file. The Kanta project might provide an initial schema script.

```bash
# Assuming your .env file is configured with DB credentials
# and you have a script like src/app/db/init_schema.sql

# Example (adjust path and credentials as needed):
psql "postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_SERVER:$POSTGRES_PORT/$POSTGRES_DB" \
  -f src/app/db/init_schema.sql # Replace with your actual script path if different
```

Verify tables:
```sql
-- In psql:
\dt
-- Should list tables like: events, images, faces, alembic_version (if Alembic was used)
```

**Option B: Using Alembic for Schema Management (Recommended)**

Alembic is a database migration tool for SQLAlchemy. It allows you to manage your database schema through versioned migration scripts, making it easier to evolve your schema over time and apply changes consistently across different environments.

**What is Alembic?**
Alembic works by comparing your SQLAlchemy models (defined in `src/app/db/base.py` and imported by various `models.py` files) with the current state of your database. It can then automatically generate (or help you write) migration scripts that apply the necessary changes (creating tables, adding columns, etc.).

**1. Install Alembic (if not already via requirements):**
```bash
uv install alembic asyncpg # asyncpg is the driver for PostgreSQL
```

**2. Initialize Alembic (if not already done in the project):**
This command should be run from the project root (e.g., `kanta/backend/`). It sets up the migration environment.
```bash
alembic init .
```
This will:
-   Create an `alembic.ini` file in your project root.
-   Create the `alembic` folder in your current directory containing:
    -   `env.py`: The environment script Alembic runs for migrations.
    -   `script.py.mako`: A template for new migration scripts.
    -   `versions/`: A directory where your migration scripts will be stored.

**3. Configure `alembic.ini` (in project root):**
Open `alembic.ini` and find the `sqlalchemy.url` line. Update it with your PostgreSQL connection string (ensure you use the `postgresql+asyncpg` dialect for asynchronous operations if your app is async):
```ini
# alembic.ini
# ... other settings ...
sqlalchemy.url = postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_SERVER}:${POSTGRES_PORT}/${POSTGRES_DB}
# Replace placeholders with actual values or use environment variable loading as shown in env.py later
```
*Tip: For security, it's better to load the database URL from environment variables within `env.py` rather than hardcoding credentials in `alembic.ini`.*

**4. Configure `src/alembic/env.py`:**
This file tells Alembic how to connect to your database and where to find your SQLAlchemy models.
-   **Import your Base and models:**
    Ensure your SQLAlchemy models are accessible to Alembic for autogeneration. You need to import your `Base` object (from `src.app.db.base`) and ensure all your model modules (e.g., `src.app.events.models`, `src.app.images.models`) also inherits from base and are imported somewhere so they register with `Base.metadata`. Often, importing them in `src/app/db/base.py` or directly in `env.py` works.

    ```python
    # alembic/env.py

    # ... other imports ...
    from src.app.db.base import Base  # Import your Base
    # Import all your models so they are registered with Base.metadata

    # This is crucial for autogenerate to detect them.
    from src.app.events import models as event_models
    from src.app.images import models as image_models
    ```

-   **Set `target_metadata`**: This tells Alembic what your desired schema (defined by your SQLAlchemy models) looks like.
    Find the line `target_metadata = None` and change it to:
    ```python
    # alembic/env.py
    # ...
    # add your model's MetaData object here
    # for 'autogenerate' support
    # from myapp import mymodel
    # target_metadata = mymodel.Base.metadata
    from src.app.db.base import Base # Ensure Base is imported
    # Make sure all your model modules are imported before this line,
    # so Base.metadata is populated.
    # Example:
    # from src.app.events.models import Event
    # from src.app.images.models import Image, Face

    target_metadata = Base.metadata
    ```

**5. Generate an Initial Migration (or first migration if tables exist):**
Run this from the project root. Alembic will compare `target_metadata` (your SQLAlchemy models) with the database (if it can connect) and generate a script.
```bash
alembic revision -m "create initial tables" --autogenerate
```
-   This creates a new file in `src/app/db/migrations/versions/`. Review this file to ensure it correctly reflects the changes you expect (e.g., `op.create_table(...)`).

**6. Apply the Migration to the Database:**
```bash
alembic upgrade head
```
This command applies all pending migrations up to the latest one (`head`). Your tables should now be created in the database.

**Managing Schema Changes with Alembic:**
Whenever you change your SQLAlchemy models (e.g., add a new model, add a column to an existing model, rename a column):
1.  **Make the model change:**
    For example, renaming a column in `src/app/images/models.py`:
    ```python
    # Before
    class Image(Base):
        original_filename = Column(String, index=True)

    # After
    class Image(Base):
        # __tablename__ = "images" # Assuming this is already there
        # ... other columns ...
        changed_filename = Column(String, index=True) # Renamed from original_filename
    ```

2.  **Generate a new migration:**
    ```bash
    alembic revision -m "rename original_filename to changed_filename in images table" --autogenerate
    ```
    Alembic will detect the change. For a rename, it might generate something like:
    ```python
    # In the generated migration script:
    # op.drop_column('images', 'original_filename') # If it can't infer a rename directly
    # op.add_column('images', sa.Column('source_filename', sa.String(), nullable=True))
    # Or, more ideally if it detects a rename (might need manual adjustment sometimes):
    # op.alter_column('images', 'original_filename', new_column_name='changed_filename', existing_type=sa.String())
    ```
    *Note: Autogenerate isn't perfect. It can detect new tables, added/removed columns, and some type changes. More complex changes like renaming columns/tables, or complex constraint changes, often require manual editing of the generated migration script. Always review the script!*

3.  **Review the generated migration script** in `alembic/versions/` and adjust if necessary.

4.  **Apply the migration:**
    ```bash
    alembic upgrade head
    ```

5. **Verify the update**

   ```bash
   alembic current           # confirm the DB now reports the new head
   ```

6. **If you need to roll back**

   ```bash
   alembic downgrade -1      # step back one revision
   # — or —
   alembic downgrade <rev>   # go back to a specific revision
   ```

7. **Re-check after revert**

   ```bash
   alembic current           # ensure the DB reports the older revision
   ```

Using Alembic is highly recommended for any project that will evolve, as it provides a controlled and versioned way to manage your database schema.

With these commands and checkpoints in place, you can treat your schema changes almost like version control—inspect, advance, and roll back in a controlled, repeatable way.


#### Alembic Commands Summary:
| Command                                  | Description                                                    | Example                                      |
| ---------------------------------------- | -------------------------------------------------------------- | -------------------------------------------- |
| `alembic history`                        | Show the full revision history (oldest → newest)               | `alembic history`                            |
| `alembic history --verbose`              | History with paths and up/down details                         | `alembic history --verbose`                  |
| `alembic current`                        | Show the revision(s) your DB is currently at                   | `alembic current`                            |
| `alembic heads`                          | List the “head” revision(s) in your migrations folder          | `alembic heads`                              |
| `alembic show <rev>`                     | Display the contents of a single migration script              | `alembic show ae1027a6acf`                   |
| `alembic upgrade head`                   | Apply all unapplied migrations up to the latest revision       | `alembic upgrade head`                       |
| `alembic upgrade <rev>`                  | Upgrade your DB to exactly `<rev>`                             | `alembic upgrade 4a1b53bc786c`               |
| `alembic downgrade -1`                   | Revert (downgrade) by one revision                             | `alembic downgrade -1`                       |
| `alembic downgrade <rev>`                | Downgrade your DB to exactly `<rev>`                           | `alembic downgrade ae1027a6acf`              |
| `alembic stamp <rev>`                    | Mark DB as at `<rev>` without running SQL (no schema changes)  | `alembic stamp head`                         |
| `alembic merge -m "msg" <h1> <h2> [...]` | Create a merge migration when you have multiple heads/branches | `alembic merge -m "merge heads" head1 head2` |


### 4. Azure Blob Storage Setup

Kanta uses Azure Blob Storage to store uploaded images.

1.  **Create an Azure Storage Account:** If you don't have one, create a Storage Account in the Azure portal. General-purpose v2 is recommended.
2.  **Create a Blob Container:**
    *   Inside your Storage Account, navigate to "Containers".
    *   Create a new container. The default name used in Kanta might be `images` (check `AZURE_BLOB_CONTAINER_NAME` in `.env` or `core/config.py`). You can name it as you wish, but ensure the environment variable matches.
    *   Set the public access level (e.g., "Private (no anonymous access)" is usually appropriate, as the application will access it using keys or managed identity).
3.  **Obtain Connection String:**
    *   In your Storage Account, navigate to "Security + networking" -> "Access keys".
    *   You'll see two keys (key1, key2). Copy one of the "Connection string" values.
    *   **Important for `.env`:** Paste this connection string into your `.env` file for the `AZURE_STORAGE_CONNECTION_STRING` variable.
        ```ini
        # .env
        AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=yourstorageaccountname;AccountKey=youraccountkey;EndpointSuffix=core.windows.net"
        AZURE_BLOB_CONTAINER_NAME=images
        ```
4.  **Security Note:**
    Using connection strings (Account Keys) grants full access to your storage account. While simple for development, for production environments, it's highly recommended to use more secure Azure authentication methods:
    *   **Managed Identities:** If your application is hosted on Azure services (e.g., App Service, VMs, AKS), use a managed identity for your application and grant it appropriate RBAC roles (like "Storage Blob Data Contributor") on the container or storage account.
    *   **Azure AD service principals with RBAC:** Grant permissions to a service principal.
    *   **SAS Tokens:** For fine-grained, temporary access (less suitable for a backend service's primary connection).

    The current Kanta setup likely uses the connection string for simplicity, as indicated by `AZURE_STORAGE_CONNECTION_STRING`.

### 5. Run the Server

With your environment variables, database, and Azure Blob Storage configured, you can run the FastAPI application:

Using `uvicorn` directly:
```bash
uvicorn src.app.main:app --reload --host 0.0.0.0 --port 8000
```

Or, if you have `fastapi-cli` installed (often comes with FastAPI or `uvicorn[standard]`):
```bash
# Make sure you are in the project root (e.g., kanta/backend/)
# and your virtual environment is activated.
fastapi dev src/app/main.py --host 0.0.0.0 --port 8021
# or the older 'fastapi run' if 'fastapi dev' is not available
# fastapi run src/app/main.py --reload --host 0.0.0.0 --port 8000
```
*(Note: `fastapi dev` is the newer command for development servers and usually includes live reloading by default. The `uv run fastapi run ...` syntax in your original README is less common; `uvicorn` or `fastapi dev` are standard.)*

Once the server is running, you can access:
-   **Interactive API Docs (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)
-   **Alternative API Docs (ReDoc):** [http://localhost:8000/redoc](http://localhost:8000/redoc)
-   **OpenAPI Schema JSON:** [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

---

## 6. API Reference

The most up-to-date API reference is available via the auto-generated Swagger UI when the server is running: [http://localhost:8000/docs](http://localhost:8000/docs).

Key endpoints include:

| Path                   | Method | Description                                       |
| ---------------------- | ------ | ------------------------------------------------- |
| `/events`       | GET    | List (or filter) events by code & running status  |
| `/events`       | POST   | Create a new event                                |
| `/events/{event_id}` | GET    | Get a specific event by ID                      |
| `/events/{event_id}` | PUT    | Update an existing event                          |
| `/events/{event_id}` | DELETE | Delete an event                                   |
| ---------------------- | ------ | ------------------------------------------------- |
| `/pics`         | POST   | Upload image, detect faces, store in Azure & DB   |
| `/pics`         | GET    | List images with filters & pagination             |
| `/pics/{image_uuid}`| GET    | Fetch image metadata + faces for a specific image |
| `/pics/{image_uuid}`| DELETE | Delete an image & its associated faces            |
| ---------------------- | ------ | ------------------------------------------------- |
| `/clusters`     | GET    | Get cluster summary or redirect to filtered `/pics` |
| `/find-similar` | POST   | Upload a face image & find top-K similar faces from DB |

*Please refer to the autogenerated Swagger documentation for full request/response schemas, parameters, and authentication details.*

---

## 7. Testing

To run the test suite (assuming tests are written using `pytest` and located in the `tests/` directory):

```bash
pytest --cov=src/app tests/
```
This command will:
-   Discover and run tests in the `tests/` directory.
-   Generate a code coverage report for the `src/app` module (`--cov=src/app`).

Ensure any test-specific environment variables or configurations (e.g., a test database) are set up.

---

## 8. Common `psql` Commands

Useful `psql` commands for interacting with your PostgreSQL database:

```sql
\l                    -- List all databases
\c your_database_name -- Connect to a specific database
\dt                   -- List all tables in the current database (public schema)
\dt schema_name.*     -- List all tables in a specific schema
\d table_name         -- Describe a table (columns, indexes, etc.)
\dn                   -- List all schemas
\i path/to/your/script.sql -- Execute commands from an SQL script file
\timing on            -- Show query execution time
\x                    -- Toggle expanded display mode for query results
\q                    -- Quit psql
```