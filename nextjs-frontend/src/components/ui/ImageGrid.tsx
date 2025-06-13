"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Image as ImageType } from "@/types/images";
import { LoadingSpinner } from "./LoadingSpinner";
import styles from "./ImageGrid.module.css";

interface ImageGridProps {
  images: ImageType[];
  onImageClick: (image: ImageType) => void;
  selectedImages?: Set<string>;
  loading?: boolean;
  emptyMessage?: string;
  columns?: number;
  className?: string;
}

export const ImageGrid = ({
  images,
  onImageClick,
  selectedImages = new Set(),
  loading = false,
  emptyMessage = "No images found.",
  columns = 5,
  className = "",
}: ImageGridProps) => {
  if (loading) {
    return <LoadingSpinner message="Loading images..." />;
  }

  if (images.length === 0) {
    return (
      <div className={styles.emptyState}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className={styles.emptyMessage}>{emptyMessage}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      className={`${styles.grid} ${className}`}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {images.map((image, index) => (
        <motion.div
          key={image.uuid}
          className={`${styles.imageContainer} ${
            selectedImages.has(image.uuid) ? styles.selected : ""
          }`}
          onClick={() => onImageClick(image)}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            duration: 0.3, 
            delay: index * 0.05,
            ease: "easeOut"
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className={styles.imageWrapper}>
            <Image
              src={image.azure_blob_url}
              alt={`Image ${image.uuid}`}
              fill
              className={styles.image}
              sizes={`(max-width: 768px) 50vw, (max-width: 1200px) 33vw, ${100 / columns}vw`}
              unoptimized
            />
            
            {image.faces > 0 && (
              <div className={styles.faceCount}>
                {image.faces} faces
              </div>
            )}

            {selectedImages.has(image.uuid) && (
              <motion.div
                className={styles.selectedOverlay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className={styles.checkIcon}>✓</div>
              </motion.div>
            )}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default ImageGrid;
