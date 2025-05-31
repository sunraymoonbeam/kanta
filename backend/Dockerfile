FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

# Install the tool-chain for building dlib and other binary dependencies
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
    apt-get install -y --no-install-recommends clang-15 lld-15 lldb-15

# Create a virtual environment and set it up
WORKDIR /app
RUN uv venv .venv                       
ENV PATH="/app/.venv/bin:${PATH}" \
    UV_PROJECT_ENVIRONMENT=/app/.venv    

# clang + single-thread + no-LTO for every wheel build
ENV CC=clang-15 CXX=clang++-15 LD=lld-15 \
    CMAKE_ARGS="-DDLIB_ENABLE_LTO=OFF" \
    MAX_JOBS=1 CMAKE_BUILD_PARALLEL_LEVEL=1

# Install the project's dependencies using the lockfile and settings
COPY uv.lock pyproject.toml ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev    # keeps .venv, builds dlib

# Uninstall the build dependencies to reduce image size
# ➊ add the **runtime** BLAS/LAPACK libraries back, so that dlib works
RUN set -eux; \
    apt-get purge -y --auto-remove \
        build-essential cmake python3-dev python3-setuptools python3-wheel \
        clang-15 lld-15 lldb-15 && \
    # ➊ add the **runtime** BLAS/LAPACK libraries back (tiny, ~10 MB)
    apt-get install -y --no-install-recommends \
        libopenblas0-pthread liblapack3 libgfortran5 && \
    rm -rf /var/lib/apt/lists/*

# Then, add the rest of the project source code and install it
# Installing separately from its dependencies allows optimal layer caching
COPY . /app
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# Ensure the installed binary is on the `PATH`
ENV PATH="/app/.venv/bin:$PATH"

CMD ["fastapi", "run", "--host", "0.0.0.0", "src/app/main.py"]
# CMD ["uvicorn", "src.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
