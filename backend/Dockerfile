# ----------------------------------------------------------------------------------------------------------------------------------------
# Debian Bookworm Image (Python Slim)
# ----------------------------------------------------------------------------------------------------------------------------------------

# =============================================================================
# Stage 1: Builder – Heavy build environment
# =============================================================================
FROM python:3.12-slim AS builder

# Install ALL the build tools we need (this stage will be discarded)
RUN set -eux; \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        curl build-essential cmake python3-dev python3-setuptools python3-wheel \
        libopenblas-dev liblapack-dev libx11-dev wget git gnupg2 && \
    printf '%s\n%s\n' \
      'deb http://apt.llvm.org/bookworm/ llvm-toolchain-bookworm main' \
      'deb http://apt.llvm.org/bookworm/ llvm-toolchain-bookworm-15 main' \
      > /etc/apt/sources.list.d/llvm.list && \
    wget -qO- https://apt.llvm.org/llvm-snapshot.gpg.key | apt-key add - && \
    apt-get update && \
    apt-get install -y --no-install-recommends clang-15 lld-15 lldb-15 && \
    rm -rf /var/lib/apt/lists/*

# Configure build settings for dlib and other binary packages
ENV CC=clang-15 CXX=clang++-15 LD=lld-15 \
    CMAKE_ARGS="-DDLIB_ENABLE_LTO=OFF" \
    MAX_JOBS=1 CMAKE_BUILD_PARALLEL_LEVEL=1 \ 
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Create and activate a virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" \
    VIRTUAL_ENV="/opt/venv"

WORKDIR /app

# Copy pyproject.toml (and lockfile) and install dependencies into the venv
COPY pyproject.toml uv.lock ./
RUN pip install --upgrade pip && \
    pip install --no-cache-dir .

# Copy the rest of the source and install the project itself (into /opt/venv)
COPY . .
RUN pip install --no-cache-dir .

# =============================================================================
# Stage 2 – Runtime
# =============================================================================
FROM python:3.12-slim AS runtime

# Install ONLY the runtime libraries needed for compiled packages, plus X11 for dlib
RUN set -eux; \
    apt-get update; \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        libopenblas0-pthread libx11-6 curl && \
    rm -rf /var/lib/apt/lists/*

# Copy the virtual env and entire /app from builder
COPY --from=builder /opt/venv     /opt/venv
COPY --from=builder /app         /app

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONPATH="/app" \
    VIRTUAL_ENV="/opt/venv"

# Create application user for security
RUN groupadd --system appuser && useradd --system --gid appuser appuser && \
    chown -R appuser:appuser /app /opt/venv
USER appuser

WORKDIR /app

# Health-check & entrypoint 
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -fs http://localhost:8000/system/health || exit 1

CMD ["uvicorn", "src.app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# # ----------------------------------------------------------------------------------------------------------------------------------------
# # Alphine Image
# # ----------------------------------------------------------------------------------------------------------------------------------------

# # =============================================================================
# # Stage 1: Builder – Heavy build environment
# # =============================================================================
# FROM python:3.12-alpine AS builder

# # Install ALL the build tools we need (this stage will be discarded)
# RUN set -eux; \
#     apk update && \
#     apk add --no-cache \
#         build-base \
#         cmake \
#         python3-dev \
#         python3-setuptools \
#         python3-wheel \
#         openblas-dev \
#         lapack-dev \
#         libx11-dev \
#         clang \
#         lld \
#         wget \
#         git \
#         gnupg

# # Configure build settings for dlib and other binary packages
# ENV CC=clang CXX=clang++ LD=lld \
#     CMAKE_ARGS="-DDLIB_ENABLE_LTO=OFF" \
#     MAX_JOBS=1 CMAKE_BUILD_PARALLEL_LEVEL=1 \ 
#     PYTHONUNBUFFERED=1 \
#     PYTHONDONTWRITEBYTECODE=1

# # Create and activate a virtual environment
# RUN python3 -m venv /opt/venv
# ENV PATH="/opt/venv/bin:$PATH" \
#     VIRTUAL_ENV="/opt/venv"

# WORKDIR /app

# # Copy pyproject.toml (and lockfile) and install dependencies into the venv
# COPY pyproject.toml uv.lock ./
# RUN pip install --upgrade pip && \
#     pip install --no-cache-dir .

# # Copy the rest of the source and install the project itself (into /opt/venv)
# COPY . .
# RUN pip install --no-cache-dir .

# # =============================================================================
# # Stage 2 – Runtime
# # =============================================================================
# FROM python:3.12-alpine AS runtime

# # Install ONLY the runtime libraries needed for compiled packages, plus X11 for dlib
# RUN set -eux; \
#     apk update && \
#     apk add --no-cache \
#         openblas \
#         lapack \
#         libx11 \
#         curl && \
#     rm -rf /var/cache/apk/*

# # Copy the virtual env and entire /app from builder
# COPY --from=builder /opt/venv     /opt/venv
# COPY --from=builder /app         /app

# ENV PATH="/opt/venv/bin:$PATH" \
#     PYTHONPATH="/app" \
#     VIRTUAL_ENV="/opt/venv"

# # Create application user for security
# RUN addgroup -S appuser && adduser -S appuser -G appuser && \
#     chown -R appuser:appuser /app /opt/venv
# USER appuser

# WORKDIR /app

# # Health-check & entrypoint 
# EXPOSE 8000
# HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
#     CMD curl -fs http://localhost:8000/system/health || exit 1

# CMD ["uvicorn", "src.app.main:app", "--host", "0.0.0.0", "--port", "8000"]


# ----------------------------------------------------------------------------------------------------------------------------------------
# # UV Image (Multi-Stage Build)
# ----------------------------------------------------------------------------------------------------------------------------------------

# =============================================================================
# Stage 1: Build Stage - Heavy build environment
# =============================================================================
# FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS builder

# # Install ALL the build tools we need (this stage will be discarded)
# RUN set -eux; \
#     apt-get update && \
#     apt-get install -y --no-install-recommends \
#         curl build-essential cmake python3-dev python3-setuptools python3-wheel \
#         libopenblas-dev liblapack-dev libx11-dev wget git gnupg2 && \
#     printf '%s\n%s\n' \
#       'deb http://apt.llvm.org/bookworm/ llvm-toolchain-bookworm main' \
#       'deb http://apt.llvm.org/bookworm/ llvm-toolchain-bookworm-15 main' \
#       > /etc/apt/sources.list.d/llvm.list && \
#     wget -qO- https://apt.llvm.org/llvm-snapshot.gpg.key | apt-key add - && \
#     apt-get update && \
#     apt-get install -y --no-install-recommends clang-15 lld-15 lldb-15

# # Configure build settings for dlib and other binary packages
# ENV CC=clang-15 CXX=clang++-15 LD=lld-15 \
#     CMAKE_ARGS="-DDLIB_ENABLE_LTO=OFF" \
#     MAX_JOBS=1 CMAKE_BUILD_PARALLEL_LEVEL=1 \ 
#     PYTHONUNBUFFERED=1 \
#     PYTHONDONTWRITEBYTECODE=1

# WORKDIR /app

# # Install dependencies (this is where the heavy compilation happens)
# COPY pyproject.toml uv.lock ./
# RUN --mount=type=cache,target=/root/.cache/uv \
#     uv sync --frozen --no-install-project --no-dev   

# # Install the project itself
# COPY . /app
# RUN --mount=type=cache,target=/root/.cache/uv \
#     uv sync --frozen --no-dev                       

# =============================================================================
# Stage 2 – Runtime
# =============================================================================
# FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS runtime

# # Install ONLY the runtime libraries needed for compiled packages, plus X11 for dlib
# # liblapack3 libgfortran5 libxrender1 libxext6
# RUN --mount=type=cache,target=/var/cache/apt \
#     set -eux; \
#     apt-get update; \
#     DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
#         libopenblas0-pthread libx11-6 curl; \
#     rm -rf /var/lib/apt/lists/*

# # Copy the virtual env, application source code and config files from builder stage
# WORKDIR /app
# COPY --from=builder /app/.venv /app/.venv         
# COPY --from=builder /app/src  /app/src            

# # Make sure the venv is activated and Python can find packages
# ENV PATH="/app/.venv/bin:$PATH" \
#     PYTHONPATH="/app" \
#     VIRTUAL_ENV="/app/.venv"

# # Create application user for security
# # Change ownership to app user
# RUN groupadd --system appuser && useradd --system --gid appuser appuser
# RUN chown -R appuser:appuser /app
# USER appuser

# # health-check & entrypoint 
# EXPOSE 8000
# HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
#     CMD curl -fs http://localhost:8000/system/health || exit 1

# CMD ["uvicorn", "src.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
# CMD ["uv", "run", "src.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
# CMD ["fastapi", "run", "--host", "0.0.0.0", "src/app/main.py", "--port", "8000"]


# ----------------------------------------------------------------------------------------------------------------------------------------
# UV Image
# ----------------------------------------------------------------------------------------------------------------------------------------
# FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

# RUN apt-get update && apt-get install -y --no-install-recommends \
#     curl \
#     cmake \
#     build-essential \
#     && rm -rf /var/lib/apt/lists/*

# WORKDIR /app

# # Enable bytecode compilation
# ENV UV_COMPILE_BYTECODE=1

# # Copy from the cache instead of linking since it's a mounted volume
# ENV UV_LINK_MODE=copy

# # Install the project's dependencies using the lockfile and settings
# RUN --mount=type=cache,target=/root/.cache/uv \
#     --mount=type=bind,source=uv.lock,target=uv.lock \
#     --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
#     uv sync --frozen --no-install-project --no-dev

# # Then, add the rest of the project source code and install it
# # Installing separately from its dependencies allows optimal layer caching
# ADD . /app
# RUN --mount=type=cache,target=/root/.cache/uv \
#     uv sync --frozen --no-dev

# # Ensure the installed binary is on the `PATH`
# ENV PATH="/app/.venv/bin:$PATH"

# CMD ["fastapi", "dev", "--host", "0.0.0.0", "src/app/main.py"]