import pandas as pd
import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import normalize

df = pd.read_parquet("face_embeddings.parquet")
embeddings = np.vstack(df['embedding'].to_numpy())  # shape: (n_samples, embedding_dim)

# Optional: normalize embeddings for cosine similarity
normalized_embeddings = normalize(embeddings)

# Use cosine distance (1 - cosine similarity)
clustering = DBSCAN(eps=0.055, min_samples=5, metric='cosine')
labels = clustering.fit_predict(normalized_embeddings)

# Attach cluster labels to your dataframe
df['cluster'] = labels

# Example: group images by cluster
for cluster_id in sorted(df['cluster'].unique()):
    print(f"Cluster {cluster_id}: {len(df[df['cluster'] == cluster_id]['image_path'].tolist())}")
    print(df[df['cluster'] == cluster_id]['image_path'].tolist())
