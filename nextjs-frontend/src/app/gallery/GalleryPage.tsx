"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { getImages, getImageDetail, deleteImage } from "@/lib/api";
import { useEvents } from "@/hooks/useEvents";
import { Image as ImageType, ImageDetail, ImagesParams } from "@/types/images";
import { Button, Modal, LoadingSpinner, ImageGrid } from "@/components";
import styles from "./GalleryPage.module.css";

export default function GalleryPage() {
  const { selected } = useEvents();
  const [images, setImages] = useState<ImageType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState<ImageType | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    minFaces: "",
    maxFaces: "",
    limit: 50,
    offset: 0,
  });

  const fetchImages = async () => {
    if (!selected) return;

    setLoading(true);
    setError("");

    try {
      const params: ImagesParams = {
        event_code: selected,
        limit: filters.limit,
        offset: filters.offset,
      };

      if (filters.startDate) params.date_from = filters.startDate;
      if (filters.endDate) params.date_to = filters.endDate;
      if (filters.minFaces) params.min_faces = parseInt(filters.minFaces);
      if (filters.maxFaces) params.max_faces = parseInt(filters.maxFaces);

      const response = await getImages(params);
      setImages(response.images);
    } catch (err) {
      setError("Failed to load images");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [selected, filters]);

  const handleImageClick = async (image: ImageType) => {
    if (selectMode) {
      const newSelected = new Set(selectedImages);
      if (newSelected.has(image.uuid)) {
        newSelected.delete(image.uuid);
      } else {
        newSelected.add(image.uuid);
      }
      setSelectedImages(newSelected);
    } else {
      setSelectedImage(image);
      setShowDetailModal(true);
    }
  };

  const handleSelectAll = () => {
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(images.map((img) => img.uuid)));
    }
  };

  if (!selected) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2>No Event Selected</h2>
            <p>Please select an event to view its gallery.</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>Gallery</h1>
            <p className={styles.subtitle}>
              {images.length} images found
            </p>
          </div>

          <div className={styles.actions}>
            <Button
              variant={selectMode ? "primary" : "secondary"}
              onClick={() => {
                setSelectMode(!selectMode);
                setSelectedImages(new Set());
              }}
            >
              {selectMode ? "Done" : "Select"}
            </Button>

            {selectMode && (
              <>
                <Button variant="ghost" onClick={handleSelectAll}>
                  {selectedImages.size === images.length ? "Deselect All" : "Select All"}
                </Button>
                <Button
                  variant="danger"
                  disabled={selectedImages.size === 0}
                >
                  Delete ({selectedImages.size})
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <motion.div
          className={styles.filters}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.3 }}
        >
          <div className={styles.filterRow}>
            <input
              type="date"
              className={styles.filterInput}
              placeholder="Start Date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
            />
            <input
              type="date"
              className={styles.filterInput}
              placeholder="End Date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
            />
            <input
              type="number"
              className={styles.filterInput}
              placeholder="Min Faces"
              value={filters.minFaces}
              onChange={(e) =>
                setFilters({ ...filters, minFaces: e.target.value })
              }
            />
            <input
              type="number"
              className={styles.filterInput}
              placeholder="Max Faces"
              value={filters.maxFaces}
              onChange={(e) =>
                setFilters({ ...filters, maxFaces: e.target.value })
              }
            />
          </div>
        </motion.div>
      </motion.div>

      {error && (
        <motion.div
          className={styles.error}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {error}
        </motion.div>
      )}

      <motion.div
        className={styles.gallery}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <ImageGrid
          images={images}
          onImageClick={handleImageClick}
          selectedImages={selectedImages}
          loading={loading}
          emptyMessage="No images found for this event."
        />
      </motion.div>

      {/* Image Detail Modal */}
      {showDetailModal && selectedImage && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedImage(null);
          }}
          title="Image Details"
          size="lg"
        >
          <div className={styles.imageDetail}>
            <img
              src={selectedImage.azure_blob_url}
              alt="Selected"
              className={styles.detailImage}
            />
            <div className={styles.imageInfo}>
              <p><strong>Faces:</strong> {selectedImage.faces}</p>
              <p><strong>Created:</strong> {new Date(selectedImage.created_at).toLocaleString()}</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
