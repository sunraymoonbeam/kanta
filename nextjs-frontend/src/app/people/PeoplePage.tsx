"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { getClusters } from "@/lib/api";
import { useEvents } from "@/hooks/useEvents";
import { Cluster, CyclingFaceState, CacheEntry } from "@/types/people";
import { Button, Card, LoadingSpinner } from "@/components";
import styles from "./PeoplePage.module.css";

export default function PeoplePage() {
  const { selected: eventCode } = useEvents();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedClusters, setSelectedClusters] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [faceStates, setFaceStates] = useState<CyclingFaceState>({});

  const fetchClusters = async () => {
    if (!eventCode) return;

    setLoading(true);
    try {
      const data = await getClusters(eventCode);
      setClusters(data);
    } catch (error) {
      console.error("Failed to fetch clusters:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClusters();
  }, [eventCode]);

  const handleClusterClick = useCallback((clusterId: number) => {
    const newSelected = new Set(selectedClusters);
    if (newSelected.has(clusterId)) {
      newSelected.delete(clusterId);
    } else {
      newSelected.add(clusterId);
    }
    setSelectedClusters(newSelected);
  }, [selectedClusters]);

  const handleFilterBySelected = () => {
    if (selectedClusters.size > 0) {
      const ids = Array.from(selectedClusters);
      // Navigate to gallery with face filter
      const queryParams = new URLSearchParams();
      queryParams.set('faceFilter', ids.join(','));
      window.location.href = `/gallery?${queryParams.toString()}`;
    }
  };

  const handleSelectAll = () => {
    if (selectedClusters.size === clusters.length) {
      setSelectedClusters(new Set());
    } else {
      setSelectedClusters(new Set(clusters.map(c => c.cluster_id)));
    }
  };

  if (!eventCode) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2>No Event Selected</h2>
            <p>Please select an event to view people clusters.</p>
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
            <h1 className={styles.title}>People</h1>
            <p className={styles.subtitle}>
              {clusters.length} people found
            </p>
          </div>

          <div className={styles.actions}>
            <Button
              variant="secondary"
              onClick={handleSelectAll}
            >
              {selectedClusters.size === clusters.length ? "Deselect All" : "Select All"}
            </Button>
            
            <Button
              variant="primary"
              onClick={handleFilterBySelected}
              disabled={selectedClusters.size === 0}
            >
              Filter Gallery ({selectedClusters.size})
            </Button>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <LoadingSpinner message="Loading people..." />
      ) : (
        <motion.div
          className={styles.grid}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {clusters.map((cluster, index) => (
            <motion.div
              key={cluster.cluster_id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                duration: 0.3, 
                delay: index * 0.05,
                ease: "easeOut"
              }}
            >
              <Card
                className={`${styles.clusterCard} ${
                  selectedClusters.has(cluster.cluster_id) ? styles.selected : ""
                }`}
                onClick={() => handleClusterClick(cluster.cluster_id)}
                hoverable
              >
                <div className={styles.faceGrid}>
                  {cluster.samples.slice(0, 4).map((face, faceIndex) => (
                    <div key={faceIndex} className={styles.faceContainer}>
                      <Image
                        src={face.sample_blob_url}
                        alt={`Face ${faceIndex + 1}`}
                        fill
                        className={styles.faceImage}
                        sizes="(max-width: 768px) 50px, 75px"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
                
                <div className={styles.clusterInfo}>
                  <h3 className={styles.clusterTitle}>
                    Person {cluster.cluster_id}
                  </h3>
                  <p className={styles.faceCount}>
                    {cluster.face_count} {cluster.face_count === 1 ? "photo" : "photos"}
                  </p>
                </div>

                {selectedClusters.has(cluster.cluster_id) && (
                  <motion.div
                    className={styles.selectedIndicator}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    ✓
                  </motion.div>
                )}
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {!loading && clusters.length === 0 && (
        <div className={styles.emptyState}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2>No People Found</h2>
            <p>No face clusters were found for this event.</p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
