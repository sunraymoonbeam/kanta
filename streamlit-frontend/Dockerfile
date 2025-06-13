# ----------------------------------------------------------------------------------------------------------------------------------------
# Debian Bookworm Image (Python Slim)
# ----------------------------------------------------------------------------------------------------------------------------------------
# FROM python:3.12-slim

# # Install build/runtime dependencies
# RUN apt-get update && \
#     apt-get install -y --no-install-recommends \
#       build-essential \
#       libffi-dev \
#       libssl-dev \
#       libjpeg-dev \
#       zlib1g-dev && \
#     rm -rf /var/lib/apt/lists/*

# WORKDIR /app

# # Copy requirements and install
# COPY requirements.txt .
# RUN pip install --upgrade pip && \
#     pip install --no-cache-dir -r requirements.txt

# # Copy application code
# COPY . .

# # Expose Streamlit’s port
# EXPOSE 8501

# # Launch Streamlit
# CMD ["streamlit", "run", "Home.py"]

# ----------------------------------------------------------------------------------------------------------------------------------------
# Alphine Image
# ----------------------------------------------------------------------------------------------------------------------------------------
FROM python:3.12-alpine

# Install build/runtime dependencies
RUN apk update && \
    apk add --no-cache \
      build-base \
      linux-headers \
      libffi-dev \
      openssl-dev

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose Streamlit’s port
EXPOSE 8501

# Launch Streamlit
CMD ["streamlit", "run", "Home.py", "--server.port", "8501", "--server.address", "0.0.0.0"]


# ----------------------------------------------------------------------------------------------------------------------------------------
# UV based Image
# ----------------------------------------------------------------------------------------------------------------------------------------
# FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

# WORKDIR /app

# ENV UV_COMPILE_BYTECODE=1
# ENV UV_LINK_MODE=copy
# ENV PATH="/app/.venv/bin:$PATH"

# RUN --mount=type=cache,target=/root/.cache/uv \
#     --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
#     uv sync --no-install-project

# ADD . /app

# RUN --mount=type=cache,target=/root/.cache/uv \
#     uv sync --frozen --no-dev

# CMD ["uv", "run", "streamlit", "run", "Home.py"]



# ----------------------------------------------------------------------------------------------------------------------------------------
# Alphine Image (Multi-Stage Build)
# ----------------------------------------------------------------------------------------------------------------------------------------

# =============================================================================
# Stage 1: Builder
# =============================================================================
# FROM python:3.12-alpine AS builder

# # Install build‐time dependencies
# RUN apk update && \
#     apk add --no-cache \
#       build-base \
#       linux-headers \
#       libffi-dev \
#       openssl-dev

# # Create a venv and make it default
# RUN python -m venv /opt/venv
# ENV PATH="/opt/venv/bin:$PATH"

# WORKDIR /app

# # Copy only requirements first (cache layer)
# COPY requirements.txt .

# # Install Python deps into the venv
# RUN pip install --upgrade pip && \
#     pip install --no-cache-dir -r requirements.txt

# # (No need to copy your app code here—only requirements matter for caching.)

# =============================================================================
# # Stage 2: Final
# =============================================================================
# FROM python:3.12-alpine

# # Install any runtime libraries missing from Alpine
# # (e.g. OpenSSL/ffi for cryptography, etc.)
# RUN apk update && \
#     apk add --no-cache \
#       libffi \
#       openssl

# # Copy Python venv from builder
# COPY --from=builder /opt/venv /opt/venv
# ENV PATH="/opt/venv/bin:$PATH"

# WORKDIR /app

# # Copy the application code
# COPY . .

# # Expose Streamlit’s default port (if you want to override, change accordingly)
# EXPOSE 8501

# # Launch Streamlit
# CMD ["streamlit", "run", "Home.py", "--server.port", "8501", "--server.address", "0.0.0.0"]


# ----------------------------------------------------------------------------------------------------------------------------------------
# Debian Bookworm Image (Multi-Stage Build)
# ----------------------------------------------------------------------------------------------------------------------------------------
# =============================================================================
# Stage 1: Builder
# =============================================================================
# FROM python:3.12-slim AS builder

# # Install build-time dependencies
# RUN apt-get update && \
#     apt-get install -y --no-install-recommends \
#       build-essential \
#       libffi-dev \
#       libssl-dev && \
#     rm -rf /var/lib/apt/lists/*

# # Create a virtual environment
# RUN python -m venv /opt/venv
# ENV PATH="/opt/venv/bin:$PATH"

# WORKDIR /app

# # Copy requirements.txt first for caching
# COPY requirements.txt .

# # Upgrade pip and install Python deps into the venv
# RUN pip install --upgrade pip && \
#     pip install --no-cache-dir -r requirements.txt

# =============================================================================
# Stage 2: Final
# =============================================================================
# FROM python:3.12-slim

# # Install runtime libraries that Python packages commonly need
# RUN apt-get update && \
#     apt-get install -y --no-install-recommends \
#       libffi7 \
#       libssl3 && \
#     rm -rf /var/lib/apt/lists/*

# # Copy the pre-built venv from the builder stage
# COPY --from=builder /opt/venv /opt/venv
# ENV PATH="/opt/venv/bin:$PATH"

# WORKDIR /app

# # Copy the application source
# COPY . .

# # Expose Streamlit’s default port
# EXPOSE 8501

# # Run Streamlit
# CMD ["streamlit", "run", "Home.py", "--server.port", "8501", "--server.address", "0.0.0.0"]
