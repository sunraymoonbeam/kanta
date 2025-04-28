import face_recognition
from loguru import logger
import time
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import uvicorn
from io import BytesIO
from PIL import Image

app = FastAPI(title="Face Encoding API", description="API for encoding faces in images")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.post("/encode-face/")
async def encode_face(image: UploadFile = File(...)):
    """
    Endpoint to encode faces from an uploaded image.
    Returns face encodings as a list of float arrays.
    """
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File provided is not an image")
    
    try:
        # Read image file
        load_start = time.time()
        contents = await image.read()
        img = Image.open(BytesIO(contents))
        img_array = np.array(img)
        load_time = time.time() - load_start
        logger.debug(f"Image loading took {load_time:.2f} seconds")
        
        # Encode faces
        encode_start = time.time()
        encodings = face_recognition.face_encodings(img_array)
        encode_time = time.time() - encode_start
        logger.debug(f"Face encoding took {encode_time:.2f} seconds")
        
        total_time = load_time + encode_time
        logger.debug(f"Total processing time: {total_time:.2f} seconds")
        
        if not encodings:
            return {"faces": 0, "encodings": []}
        
        # Convert numpy arrays to lists for JSON serialization
        serializable_encodings = [encoding.tolist() for encoding in encodings]
        return {
            "faces": len(encodings),
            "encodings": serializable_encodings
        }
    
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)