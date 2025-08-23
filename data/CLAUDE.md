# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Python data seeding script for the Kanta application. It populates the database with test data using the Yale Face Database for development and testing purposes.

## Development Commands

### Running the Seed Script
```bash
# Basic usage with recommended settings
uv run main.py --batch-size 5 --delay 0.5

# Custom event code
uv run main.py --event-code my-test-event

# Smaller batches for slower systems
uv run main.py --batch-size 3 --delay 1

# Different backend URL
uv run main.py --api-url http://localhost:8080

# View help and all options
uv run main.py --help
```

### Dependency Management
```bash
# Install dependencies using uv
uv sync

# Update dependencies
uv add <package>
```

## Architecture

The script follows an async pattern for efficient batch processing:

### Core Components

**main.py**: Orchestrates the entire seeding process
- Extracts images from `yale_png.zip` to temporary directory
- Creates test event via backend API
- Uploads images in configurable batches with concurrency control
- Provides progress feedback and error handling

### Key Features
- **Batch Processing**: Uploads images in configurable batch sizes to avoid overwhelming the server
- **Async/Concurrent**: Uses `asyncio.gather()` for parallel uploads within each batch
- **Progress Tracking**: Real-time feedback showing upload progress and UUID assignments
- **Error Resilience**: Continues processing even if individual uploads fail
- **Configurable Delays**: Adjustable delay between batches for rate limiting

### API Integration
- Uses `httpx.AsyncClient` for async HTTP requests
- Integrates with backend at `http://localhost:8000` (configurable)
- Creates events via `POST /events`
- Uploads images via `POST /pics/{event_code}`

### Command-Line Arguments
- `--batch-size`: Number of concurrent uploads per batch (default: 5)
- `--delay`: Seconds to wait between batches (default: 0.5)
- `--event-code`: Custom event identifier (default: test-yale-faces)
- `--api-url`: Backend API URL (default: http://localhost:8000)

## Prerequisites

Before running the script, ensure:
1. Docker Compose stack is running (`docker compose up -d` from parent directory)
2. Backend API is accessible at configured URL
3. `yale_png.zip` file exists in the data directory

## Dataset Information

Uses Yale Face Database containing:
- 165 grayscale images
- 15 subjects with 11 images each
- Various expressions and lighting conditions
- Ideal for testing face detection and clustering features