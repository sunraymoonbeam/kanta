# Data Seeding Script

This directory contains a script to seed the Kanta database with test data using the Yale Face Database.

## Prerequisites

1. **Docker and Docker Compose** must be installed on your system
2. **uv** (Python package manager) must be installed
3. The application must be running before seeding

## Setup Instructions

### 1. Start the Application

Before running the seed script, ensure the entire application stack is running:

```bash
# From the root directory of the project
cd ..
docker compose up -d
```

Wait for all services to start up completely. You can verify the services are running:

```bash
docker compose ps
```

The backend API should be accessible at `http://localhost:8000`.

## Running the Seed Script

### Basic Usage

Run the seed script with default settings:

```bash
uv run main.py --batch-size 5 --delay 0.5
```

This will:
1. Extract images from `yale_png.zip` to a temporary directory
2. Create a test event with code `test-yale-faces`
3. Upload all 165 images to the backend in batches

### Advanced Usage

The script supports several command-line arguments for customization:

```bash
uv run main.py --help
```

Available options:
- `--batch-size`: Number of images to upload concurrently (default: 5)
- `--delay`: Delay in seconds between batches (default: 0.5)
- `--event-code`: Custom event code (default: test-yale-faces)
- `--api-url`: Backend API URL (default: http://localhost:8000)

### Examples

Upload with smaller batches for slower systems:
```bash
uv run main.py --batch-size 3 --delay 1
```

Use a custom event code:
```bash
uv run main.py --event-code my-test-event
```

Connect to a different backend:
```bash
uv run main.py --api-url http://localhost:8080
```

## Viewing Results

After successful seeding, you can view the uploaded images at:

```
http://localhost:3000/event/test-yale-faces
```

(Replace `test-yale-faces` with your custom event code if you used one)

## Troubleshooting

### Connection Error
If you see "Failed to connect to API", ensure:
1. Docker Compose is running (`docker compose ps`)
2. The backend is accessible at http://localhost:8000
3. No firewall is blocking the connection

### Upload Failures
If many uploads fail:
1. Reduce the batch size: `--batch-size 2`
2. Increase the delay: `--delay 2`
3. Check backend logs: `docker compose logs backend`

### Event Already Exists
If the event already exists, you can:
1. Delete it manually through the API
2. Use a different event code with `--event-code`

## Dataset Information

The script uses the Yale Face Database (`yale_png.zip`), which contains:
- 165 grayscale face images
- 15 subjects with 11 images each
- Various expressions and lighting conditions

This dataset is ideal for testing face detection and clustering features.