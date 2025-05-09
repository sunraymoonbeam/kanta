import pandas as pd
import networkx as nx
import numpy as np
from scipy.spatial.distance import euclidean
import chinese_whispers
from collections import defaultdict
import matplotlib.pyplot as plt
from PIL import Image
import os
import math

df = pd.read_parquet("face_embeddings.parquet")

# Convert embeddings to numpy array
embeddings = np.vstack(df['embedding'].to_numpy())
image_paths = df['image_path'].tolist()

# Build graph
G = nx.Graph()

# Add nodes
for i, path in enumerate(image_paths):
    G.add_node(i, image_path=path)

# Add edges based on similarity threshold
threshold = 0.6  # tune this value
for i in range(len(embeddings)):
    for j in range(i + 1, len(embeddings)):
        dist = euclidean(embeddings[i], embeddings[j])
        if dist < threshold:
            weight = 1.0 / (1.0 + dist)  # higher weight for closer embeddings
            G.add_edge(i, j, weight=weight)

chinese_whispers.chinese_whispers(G, weighting="top")

clusters = defaultdict(list)
for node, data in G.nodes(data=True):
    label = G.nodes[node]['label']
    clusters[label].append(G.nodes[node]['image_path'])

# Print or save clusters
for label, images in clusters.items():
    print(f"Cluster {label}: {len(images)} images")

## Code below for visualization ##

# Create a directory to save the visualizations
output_dir = "cluster_visualizations"
os.makedirs(output_dir, exist_ok=True)

# Generate 4x4 grid of sample images for each cluster
for label, image_paths in clusters.items():
    # Skip small clusters or clusters with no images
    if len(image_paths) < 1:
        continue
        
    # Take up to 16 images for the 4x4 grid
    sample_paths = image_paths[:16]
    n_images = len(sample_paths)
    
    # Handle single image case differently
    if n_images == 1:
        # Create a single subplot
        fig, ax = plt.subplots(figsize=(8, 8))
        fig.suptitle(f'Cluster {label} - 1 image', fontsize=16)
        ax.axis('off')
        
        try:
            img_path = sample_paths[0]
            img = Image.open(img_path)
            ax.imshow(img)
            ax.set_title(os.path.basename(img_path), fontsize=10)
        except Exception as e:
            print(f"Error loading image {img_path}: {e}")
            ax.text(0.5, 0.5, "Error loading image", ha='center', va='center')
    else:
        # Create a figure with multiple subplots
        rows = math.ceil(n_images / 4)
        cols = min(4, n_images)
        
        fig, axes = plt.subplots(rows, cols, figsize=(12, 12))
        fig.suptitle(f'Cluster {label} - {len(image_paths)} images', fontsize=16)
        
        # Make axes indexable for all cases
        if rows == 1:
            axes = axes.reshape(1, -1)
            
        # Add images to the plot
        img_idx = 0
        for i in range(rows):
            for j in range(cols):
                if img_idx < n_images:
                    try:
                        axes[i, j].axis('off')
                        img_path = sample_paths[img_idx]
                        img = Image.open(img_path)
                        axes[i, j].imshow(img)
                        axes[i, j].set_title(os.path.basename(img_path), fontsize=8)
                    except Exception as e:
                        print(f"Error loading image {img_path}: {e}")
                        axes[i, j].text(0.5, 0.5, "Error loading image", 
                                      ha='center', va='center')
                    img_idx += 1
                else:
                    # Hide unused subplots
                    axes[i, j].axis('off')
                    
    plt.tight_layout(rect=[0, 0, 1, 0.95])  # Adjust to make room for the title
    
    # Save the figure
    output_path = os.path.join(output_dir, f"cluster_{label}.png")
    plt.savefig(output_path, dpi=150)
    plt.close(fig)
    
    print(f"Saved visualization for cluster {label} to {output_path}")

print(f"Visualizations saved to {os.path.abspath(output_dir)}")