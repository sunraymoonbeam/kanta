import os
import pandas as pd
import requests
import numpy as np
from pathlib import Path
from tqdm import tqdm
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import normalize

def get_facial_embeddings(image_path):
    """Send image to API and get facial embeddings"""
    try:
        with open(image_path, 'rb') as img_file:
            files = {'image': (os.path.basename(image_path), img_file, 'image/jpeg')}
            response = requests.post('http://localhost:8000/encode-face/', 
                                     files=files)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error processing {image_path}: API returned status {response.status_code}")
            return None
    except Exception as e:
        print(f"Error processing {image_path}: {str(e)}")
        return None

def main():
    print("Starting facial embedding extraction...")
    
    # Set paths
    image_dir = Path(r"D:\Repositories\encode-faces\data")
    output_file = "face_embeddings.parquet"
    
    # Lists to store data
    image_paths = []
    embeddings = []
    
    # Get all image files
    image_files = [f for f in image_dir.rglob('*') if f.is_file() and 
                  f.suffix.lower() in ('.jpg', '.jpeg', '.png', '.bmp')]
    
    # Process each image
    for img_path in tqdm(image_files, desc="Processing images"):
        result = get_facial_embeddings(img_path)
        
        if result and 'encodings' in result:
            num_faces = result.get('faces', 0)
            face_encodings = result.get('encodings', [])
            
            # Add each face to results
            for encoding in face_encodings:
                image_paths.append(str(img_path))
                embeddings.append(np.array(encoding))
            
            print(f"Processed {img_path.name}: Found {num_faces} faces")
    
    # Create DataFrame
    df = pd.DataFrame({
        'image_path': image_paths,
        'embedding': embeddings
    })
    
    # Convert list of embeddings to a 2D array for clustering
    embedding_array = np.array(list(df['embedding']))

    # Apply DBSCAN clustering with better parameters
    print("Performing DBSCAN clustering...")
    dbscan = DBSCAN(metric='euclidean', n_jobs=-1)
    cluster_labels = dbscan.fit_predict(embedding_array)    
    
    # Add cluster assignment to DataFrame
    df['cluster'] = cluster_labels
    
    # Create and save a dataframe with just image_path and cluster columns
    result_df = df[['image_path', 'cluster']]
    result_df.to_parquet("face_clusters.parquet")
    print(f"Saved face clusters to face_clusters.parquet")

if __name__ == "__main__":
    main()