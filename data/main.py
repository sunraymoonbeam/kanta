import argparse
import asyncio
import tempfile
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional

import httpx
from pydantic import BaseModel, Field


class CreateEventInput(BaseModel):
    event_code: str = Field(..., min_length=3, max_length=63)
    name: Optional[str] = None
    description: Optional[str] = None
    start_date_time: Optional[datetime] = None
    end_date_time: Optional[datetime] = None


async def main():
    parser = argparse.ArgumentParser(description='Seed the database with test event and images')
    parser.add_argument('--batch-size', type=int, default=5, 
                        help='Number of images to upload concurrently (default: 5)')
    parser.add_argument('--delay', type=float, default=0.5,
                        help='Delay in seconds between batches (default: 0.5)')
    parser.add_argument('--event-code', type=str, default='test-yale-faces',
                        help='Event code to use (default: test-yale-faces)')
    parser.add_argument('--api-url', type=str, default='http://localhost:8000',
                        help='Backend API URL (default: http://localhost:8000)')
    args = parser.parse_args()
    
    base_url = args.api_url
    event_code = args.event_code
    BATCH_SIZE = args.batch_size
    DELAY_BETWEEN_BATCHES = args.delay
    
    print("Starting database seeding...")
    print("=" * 50)
    print(f"Configuration:")
    print(f"  API URL: {base_url}")
    print(f"  Event Code: {event_code}")
    print(f"  Batch Size: {BATCH_SIZE}")
    print(f"  Delay Between Batches: {DELAY_BETWEEN_BATCHES}s")
    print("=" * 50)
    
    data_dir = Path(__file__).parent
    zip_path = data_dir / "yale_png.zip"
    
    if not zip_path.exists():
        print(f"Error: {zip_path} not found!")
        return
    
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        print(f"\n1. Unzipping {zip_path.name} to temporary directory...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(temp_path)
        
        image_files = list(temp_path.rglob("*.png")) + list(temp_path.rglob("*.jpg"))
        print(f"   Found {len(image_files)} image files")
        
        print("\n2. Creating test event...")
        event_data = CreateEventInput(
            event_code=event_code,
            name="Yale Face Database Test Event",
            description="Test event with Yale face database images for development",
            start_date_time=datetime.now(timezone.utc),
            end_date_time=datetime.now(timezone.utc) + timedelta(days=7)
        )
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{base_url}/events",
                    json=event_data.model_dump(mode='json', exclude_none=True),
                    timeout=30.0
                )
                
                if response.status_code == 201:
                    print(f"   ✓ Event created successfully: {event_code}")
                    event_info = response.json()
                    print(f"     Event ID: {event_info.get('id')}")
                elif response.status_code == 400:
                    print(f"   ! Event {event_code} already exists (continuing anyway)")
                else:
                    print(f"   ✗ Failed to create event: {response.status_code}")
                    print(f"     Response: {response.text}")
                    return
                    
            except httpx.RequestError as e:
                print(f"   ✗ Failed to connect to API: {e}")
                print("   Make sure the backend is running on http://localhost:8000")
                return
            
            print(f"\n3. Uploading {len(image_files)} images to /pics/{event_code}...")
            print(f"   Processing in batches of {BATCH_SIZE} with {DELAY_BETWEEN_BATCHES}s delay between batches")
            
            successful_uploads = 0
            failed_uploads = 0
            
            async def upload_image(client: httpx.AsyncClient, image_path: Path, index: int, total: int) -> bool:
                """Upload a single image and return success status."""
                try:
                    with open(image_path, 'rb') as f:
                        files = {
                            'image_file': (image_path.name, f, 'image/png' if image_path.suffix == '.png' else 'image/jpeg')
                        }
                        
                        response = await client.post(
                            f"{base_url}/pics/{event_code}",
                            files=files,
                            timeout=30.0
                        )
                        
                        if response.status_code == 202:
                            result = response.json()
                            print(f"   [{index:3}/{total}] ✓ {image_path.name} -> UUID: {result.get('uuid')}")
                            return True
                        else:
                            print(f"   [{index:3}/{total}] ✗ {image_path.name}: {response.status_code}")
                            return False
                            
                except Exception as e:
                    print(f"   [{index:3}/{total}] ✗ {image_path.name}: {str(e)}")
                    return False
            
            # Process images in batches
            for batch_start in range(0, len(image_files), BATCH_SIZE):
                batch_end = min(batch_start + BATCH_SIZE, len(image_files))
                batch = image_files[batch_start:batch_end]
                
                # Create tasks for this batch
                tasks = [
                    upload_image(client, image_path, batch_start + i + 1, len(image_files))
                    for i, image_path in enumerate(batch)
                ]
                
                # Execute batch concurrently
                results = await asyncio.gather(*tasks)
                
                # Count successes and failures
                successful_uploads += sum(results)
                failed_uploads += len(results) - sum(results)
                
                # Add delay between batches to avoid overwhelming the server
                if batch_end < len(image_files):
                    await asyncio.sleep(DELAY_BETWEEN_BATCHES)
            
            print("\n" + "=" * 50)
            print("Seeding completed!")
            print(f"  Event Code: {event_code}")
            print(f"  Images uploaded: {successful_uploads}/{len(image_files)}")
            if failed_uploads > 0:
                print(f"  Failed uploads: {failed_uploads}")
            print("\nYou can view the event at:")
            print(f"  http://localhost:3000/event/{event_code}")


if __name__ == "__main__":
    asyncio.run(main())