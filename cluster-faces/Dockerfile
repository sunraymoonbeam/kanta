# Define custom function directory
ARG FUNCTION_DIR="/function"

# Use UV as the base image for building
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS build-image

# Include global arg in this stage of the build
ARG FUNCTION_DIR

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    cmake \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create function directory
RUN mkdir -p ${FUNCTION_DIR}
WORKDIR ${FUNCTION_DIR}

# Enable UV settings
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

# Copy application code
COPY . ${FUNCTION_DIR}

# Install dependencies using UV
RUN uv sync --no-cache
RUN uv pip install --no-cache awslambdaric

# Use slim Python for the final image
FROM python:3.13-slim

# Include global arg in this stage of the build
ARG FUNCTION_DIR
WORKDIR ${FUNCTION_DIR}

# Copy function code and dependencies from build image
COPY --from=build-image ${FUNCTION_DIR} ${FUNCTION_DIR}

# Ensure the virtual environment is on the PATH
ENV PATH="${FUNCTION_DIR}/.venv/bin:$PATH"

# Set runtime interface client as default command
ENTRYPOINT [ "python", "-m", "awslambdaric" ]
CMD [ "main.handler" ]