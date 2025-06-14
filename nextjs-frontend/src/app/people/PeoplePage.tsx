'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getClusters } from '../../lib/api';
import { useEvents } from '../../hooks/useEvents';
import { Cluster, CyclingFaceState, CacheEntry } from '../../types/people';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { cropFaceImage } from '../../lib/imageCrop';
import { style, effects } from '../../config/kanta.config';
import { 
  CLUSTER_ID_UNASSIGNED, 
  CLUSTER_ID_PROCESSING, 
  FACE_CYCLE_INTERVAL, 
  CACHE_EXPIRY, 
  NUM_CLUSTER_SAMPLES 
} from '../../lib/constants';
import styles from './PeoplePage.module.css';

export default function PeoplePage() {
  const { selected: eventCode } = useEvents();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedClusters, setSelectedClusters] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [faceStates, setFaceStates] = useState<CyclingFaceState>({});
  const [faceFilter, setFaceFilter] = useState<number[] | null>(null);
  const [croppedFaces, setCroppedFaces] = useState<{ [key: string]: string }>({});
  const [clustersCache, setClustersCache] = useState<{ [key: string]: CacheEntry }>({});
  const [cropError, setCropError] = useState<Set<string>>(new Set());

  // Memoized function to apply face filter
  const applyFaceFilter = useCallback((ids: number[] | null) => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (ids && ids.length > 0) {
        params.set('faceFilter', ids.join(','));
      } else {
        params.delete('faceFilter');
      }
      const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
      window.history.replaceState({}, '', newUrl);
    }
    setFaceFilter(ids && ids.length > 0 ? ids : null);
  }, []);

  // Check for face filter from URL params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const faceFilterParam = params.get('faceFilter');
      if (faceFilterParam) {
        const clusterIds = faceFilterParam.split(',')
          .map(id => parseInt(id.trim()))
          .filter(id => !isNaN(id));
        if (clusterIds.length > 0) {
          setFaceFilter(clusterIds);
        }
      }
    }
  }, []);

  // Crop face with better error handling
  const cropFace = async (sample: any): Promise<string | null> => {
    const faceKey = sample.face_id.toString();
    
    if (cropError.has(faceKey)) {
      return null; // Don't retry failed crops
    }

    try {
      const croppedImage = await cropFaceImage(sample.sample_blob_url, sample.sample_bbox);
      return croppedImage;
    } catch (error) {
      console.error('Error cropping face:', error);
      setCropError(prev => new Set([...prev, faceKey]));
      return null;
    }
  };

  const loadClusters = useCallback(async (forceRefresh = false) => {
    if (!eventCode) return;
    
    // Check cache first
    const cacheKey = `${eventCode}_${NUM_CLUSTER_SAMPLES}`;
    const cached = clustersCache[cacheKey];
    
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
      setClusters(cached.data);
      return;
    }
    
    setLoading(true);
    try {
      const data = await getClusters(eventCode, NUM_CLUSTER_SAMPLES);
      
      // Filter out special clusters and sort by face count
      const validClusters = data
        .filter(cluster => 
          cluster.cluster_id !== CLUSTER_ID_UNASSIGNED && 
          cluster.cluster_id !== CLUSTER_ID_PROCESSING
        )
        .sort((a, b) => b.face_count - a.face_count);
      
      setClusters(validClusters);
      
      // Update cache
      setClustersCache(prev => ({
        ...prev,
        [cacheKey]: {
          data: validClusters,
          timestamp: Date.now()
        }
      }));
      
      // Initialize face cycling states
      const initialStates: CyclingFaceState = {};
      validClusters.forEach(cluster => {
        if (cluster.samples.length > 0) {
          initialStates[cluster.cluster_id] = 0;
        }
      });
      setFaceStates(initialStates);
      
      // Preload cropped faces for visible samples
      const cropPromises: Promise<void>[] = [];
      validClusters.forEach(cluster => {
        if (cluster.samples.length > 0) {
          const sample = cluster.samples[0];
          cropPromises.push(
            cropFace(sample).then(result => {
              if (result) {
                setCroppedFaces(prev => ({
                  ...prev,
                  [`${cluster.cluster_id}_${sample.face_id}`]: result
                }));
              }
            })
          );
        }
      });
      
      // Wait for initial crops to complete
      await Promise.allSettled(cropPromises);
      
    } catch (error) {
      console.error('Failed to load clusters:', error);
    } finally {
      setLoading(false);
    }
  }, [eventCode, clustersCache]);

  // Cycle through face samples
  useEffect(() => {
    if (clusters.length === 0) return;

    const interval = setInterval(() => {
      setFaceStates(prevStates => {
        const newStates = { ...prevStates };
        
        clusters.forEach(cluster => {
          if (cluster.samples.length > 1) {
            const currentIndex = newStates[cluster.cluster_id] || 0;
            const nextIndex = (currentIndex + 1) % Math.min(cluster.samples.length, NUM_CLUSTER_SAMPLES);
            newStates[cluster.cluster_id] = nextIndex;
            
            // Preload next face crop
            const nextSample = cluster.samples[nextIndex];
            cropFace(nextSample).then(result => {
              if (result) {
                setCroppedFaces(prev => ({
                  ...prev,
                  [`${cluster.cluster_id}_${nextSample.face_id}`]: result
                }));
              }
            });
          }
        });
        
        return newStates;
      });
    }, FACE_CYCLE_INTERVAL);

    return () => clearInterval(interval);
  }, [clusters]);

  useEffect(() => {
    loadClusters();
  }, [loadClusters]);

  const handleClusterClick = (clusterId: number) => {
    setSelectedClusters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clusterId)) {
        newSet.delete(clusterId);
      } else {
        newSet.add(clusterId);
      }
      return newSet;
    });
  };

  const handleViewPhotos = () => {
    if (selectedClusters.size === 0) return;
    
    const clusterIds = Array.from(selectedClusters);
    applyFaceFilter(clusterIds);
    
    // Navigate to gallery with face filter
    const params = new URLSearchParams();
    params.set('faceFilter', clusterIds.join(','));
    window.location.href = `/gallery?${params.toString()}`;
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
        {/* Background Effects */}
        <div className={styles.backgroundEffects}>
          {effects.dots.display && (
            <div 
              className={styles.dots}
              style={{
                opacity: Number(effects.dots.opacity) / 100,
                backgroundSize: `${Number(effects.dots.size) * 10}px ${Number(effects.dots.size) * 10}px`
              }}
            />
          )}
          {effects.gradient.display && (
            <div 
              className={styles.gradientOrb}
              style={{
                opacity: Number(effects.gradient.opacity) / 100,
                left: `${effects.gradient.x}%`,
                top: `${effects.gradient.y}%`,
                width: `${effects.gradient.width}%`,
                height: `${effects.gradient.height}%`,
                transform: `rotate(${effects.gradient.tilt}deg)`
              }}
            />
          )}
        </div>

        <motion.div 
          className={styles.emptyState}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card variant="elevated" padding="lg" className={styles.emptyCard}>
            <motion.div 
              className={styles.emptyIcon}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
            >
              🎭
            </motion.div>
            <motion.h2 
              className={styles.emptyTitle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              No Event Selected
            </motion.h2>
            <motion.p 
              className={styles.emptyDescription}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Please select an event from the header dropdown to view people recognition.
            </motion.p>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.backgroundEffects}>
          {effects.dots.display && (
            <div 
              className={styles.dots}
              style={{
                opacity: Number(effects.dots.opacity) / 100,
                backgroundSize: `${Number(effects.dots.size) * 10}px ${Number(effects.dots.size) * 10}px`
              }}
            />
          )}
        </div>
        <LoadingSpinner message="Analyzing faces with AI..." size="lg" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Background Effects */}
      <div className={styles.backgroundEffects}>
        {effects.dots.display && (
          <div 
            className={styles.dots}
            style={{
              opacity: Number(effects.dots.opacity) / 100,
              backgroundSize: `${Number(effects.dots.size) * 10}px ${Number(effects.dots.size) * 10}px`
            }}
          />
        )}
        {effects.gradient.display && (
          <div 
            className={styles.gradientOrb}
            style={{
              opacity: Number(effects.gradient.opacity) / 100,
              left: `${effects.gradient.x}%`,
              top: `${effects.gradient.y}%`,
              width: `${effects.gradient.width}%`,
              height: `${effects.gradient.height}%`,
              transform: `rotate(${effects.gradient.tilt}deg)`
            }}
          />
        )}
      </div>

      {/* Header Section */}
      <motion.div 
        className={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <motion.h1 
              className={styles.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              People Recognition
            </motion.h1>
            <motion.p 
              className={styles.subtitle}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              AI-detected people from <span className={styles.eventCode}>{eventCode}</span>
            </motion.p>
          </div>
        </div>
      </motion.div>

      {clusters.length === 0 ? (
        <motion.div 
          className={styles.emptyState}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card variant="elevated" padding="lg" className={styles.emptyCard}>
            <motion.div 
              className={styles.emptyIcon}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 20 }}
            >
              🤖
            </motion.div>
            <motion.h2 
              className={styles.emptyTitle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              No People Detected Yet
            </motion.h2>
            <motion.p 
              className={styles.emptyDescription}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Upload some photos with people to see AI face recognition in action
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Button 
                href="/gallery/upload" 
                size="lg"
                variant="primary"
                className={styles.uploadButton}
              >
                📸 Upload Photos
              </Button>
            </motion.div>
          </Card>
        </motion.div>
      ) : (
        <>
          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <Card className={styles.controlsCard} padding="lg">
              <div className={styles.controlsContent}>
                <div className={styles.statsSection}>
                  <motion.h3 
                    className={styles.statsTitle}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    Found {clusters.length} people ({selectedClusters.size} selected)
                  </motion.h3>
                  <motion.p 
                    className={styles.statsDescription}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    Click on people to select them, then view their photos
                  </motion.p>
                </div>
                
                <motion.div 
                  className={styles.controls}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7, duration: 0.6 }}
                >
                  <Button
                    onClick={handleSelectAll}
                    variant="secondary"
                    size="sm"
                    className={styles.controlButton}
                  >
                    {selectedClusters.size === clusters.length ? '❌ Deselect All' : '✅ Select All'}
                  </Button>
                  
                  <Button
                    onClick={() => loadClusters(true)}
                    variant="secondary"
                    size="sm"
                    className={styles.controlButton}
                  >
                    🔄 Refresh
                  </Button>
                  
                  <AnimatePresence>
                    {selectedClusters.size > 0 && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <Button
                          onClick={handleViewPhotos}
                          variant="primary"
                          size="md"
                          className={styles.viewPhotosButton}
                        >
                          🖼️ View Photos ({selectedClusters.size} people)
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </Card>
          </motion.div>

          {/* People Grid */}
          <motion.div 
            className={styles.grid}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <AnimatePresence>
              {clusters.map((cluster, index) => {
                const currentSampleIndex = faceStates[cluster.cluster_id] || 0;
                const currentSample = cluster.samples[currentSampleIndex];
                const isSelected = selectedClusters.has(cluster.cluster_id);
                const faceKey = `${cluster.cluster_id}_${currentSample?.face_id}`;
                const croppedFace = croppedFaces[faceKey];

                return (
                  <motion.div
                    key={cluster.cluster_id}
                    layout
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -20 }}
                    transition={{ 
                      delay: index * 0.05,
                      duration: 0.4,
                      type: "spring",
                      stiffness: 300,
                      damping: 25
                    }}
                    whileHover={{ 
                      y: -8,
                      transition: { duration: 0.2 }
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      hoverable
                      className={`${styles.personCard} ${isSelected ? styles.selectedCard : ''}`}
                      onClick={() => handleClusterClick(cluster.cluster_id)}
                      variant={isSelected ? "elevated" : "default"}
                    >
                      <div className={styles.cardContent}>
                        {/* Face Display */}
                        <div className={styles.faceContainer}>
                          <motion.div 
                            className={styles.faceWrapper}
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.3 }}
                          >
                            {croppedFace ? (
                              <motion.img
                                key={faceKey}
                                src={croppedFace}
                                alt={`Person ${cluster.cluster_id}`}
                                className={styles.faceImage}
                                initial={{ opacity: 0, scale: 1.1 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                              />
                            ) : (
                              <div className={styles.facePlaceholder}>
                                <motion.span
                                  animate={{ 
                                    rotate: [0, 10, -10, 0],
                                    scale: [1, 1.1, 1]
                                  }}
                                  transition={{ 
                                    duration: 2,
                                    repeat: Infinity,
                                    repeatType: "loop"
                                  }}
                                >
                                  👤
                                </motion.span>
                              </div>
                            )}
                          </motion.div>
                          
                          {/* Selection indicator */}
                          <AnimatePresence>
                            {isSelected && (
                              <motion.div 
                                className={styles.selectionBadge}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 15 }}
                              >
                                ✓
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Info */}
                        <div className={styles.personInfo}>
                          <motion.h3 
                            className={styles.personTitle}
                            layout
                          >
                            Person {cluster.cluster_id}
                          </motion.h3>
                          
                          <motion.p 
                            className={styles.photoCount}
                            layout
                          >
                            {cluster.face_count} photo{cluster.face_count !== 1 ? 's' : ''}
                          </motion.p>

                          {/* Sample indicator */}
                          {cluster.samples.length > 1 && (
                            <motion.div 
                              className={styles.sampleIndicator}
                              layout
                            >
                              {cluster.samples.slice(0, NUM_CLUSTER_SAMPLES).map((_, i) => (
                                <motion.div
                                  key={i}
                                  className={`${styles.dot} ${i === currentSampleIndex ? styles.activeDot : ''}`}
                                  animate={{
                                    scale: i === currentSampleIndex ? 1.2 : 1,
                                    opacity: i === currentSampleIndex ? 1 : 0.4
                                  }}
                                  transition={{ duration: 0.3 }}
                                />
                              ))}
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </div>
  );
}