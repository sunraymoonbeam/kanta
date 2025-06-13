'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEvents } from '@/hooks/useEvents';
import { Button, Card } from '@/components';
import styles from './EventsPage.module.css';

export default function EventsPage() {
  const { events, loading, error } = useEvents();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEvents = events.filter(event => 
    event.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 40, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6 },
    },
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <motion.div 
            className={styles.spinner}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p>Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Background Effects */}
      <div className={styles.backgroundEffects}>
        <div className={styles.gradientOrb} />
        <div className={styles.dots} />
      </div>

      <motion.div 
        className={styles.content}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div className={styles.header} variants={itemVariants}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>
              <span className={styles.titleIcon}>🎭</span>
              <span className={styles.titleGradient}>Events</span>
            </h1>
            <p className={styles.subtitle}>
              Manage your collaborative photo events and share QR codes with guests.
            </p>
          </div>
          
          <div className={styles.headerActions}>
            <Button 
              variant="primary" 
              size="lg" 
              icon="+"
            >
              Create Event
            </Button>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div className={styles.searchSection} variants={itemVariants}>
          <div className={styles.searchInput}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search events by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.input}
            />
          </div>
        </motion.div>

        {/* Events Grid */}
        <motion.div className={styles.eventsGrid} variants={containerVariants}>
          <AnimatePresence>
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event) => (
                <motion.div
                  key={event.code}
                  variants={itemVariants}
                  layout
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card variant="elevated" hoverable className={styles.eventCard}>
                    <div className={styles.eventHeader}>
                      <div className={styles.eventCode}>
                        <span className={styles.codeLabel}>Event Code</span>
                        <span className={styles.code}>{event.code}</span>
                      </div>
                      <div className={styles.eventStatus}>
                        <span className={`${styles.statusBadge} ${styles.active}`}>
                          Active
                        </span>
                      </div>
                    </div>

                    <div className={styles.eventContent}>
                      <h3 className={styles.eventTitle}>{event.name}</h3>
                      <p className={styles.eventDescription}>
                        {event.description || 'No description provided.'}
                      </p>
                      
                      <div className={styles.eventMeta}>
                        <div className={styles.metaItem}>
                          <span className={styles.metaIcon}>📅</span>
                          <span className={styles.metaText}>
                            {event.start_date_time ? new Date(event.start_date_time).toLocaleDateString() : 'No date'}
                          </span>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaIcon}>📸</span>
                          <span className={styles.metaText}>
                            Photos available
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.eventActions}>
                      <Button 
                        variant="ghost" 
                        size="sm"
                      >
                        <span>📱</span>
                        QR Code
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                      >
                        <span>🖼️</span>
                        Gallery
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="sm"
                      >
                        View Details →
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))
            ) : (
              <motion.div 
                className={styles.emptyState}
                variants={itemVariants}
              >
                <div className={styles.emptyIcon}>🎭</div>
                <h3 className={styles.emptyTitle}>No events found</h3>
                <p className={styles.emptyDescription}>
                  {searchTerm 
                    ? `No events match "${searchTerm}". Try adjusting your search.`
                    : "Get started by creating your first collaborative photo event."
                  }
                </p>
                {!searchTerm && (
                  <Button 
                    variant="primary" 
                    icon="+"
                  >
                    Create Your First Event
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Quick Stats */}
        {events.length > 0 && (
          <motion.div className={styles.statsSection} variants={itemVariants}>
            <div className={styles.statsGrid}>
              <Card className={styles.statCard}>
                <div className={styles.statContent}>
                  <span className={styles.statIcon}>🎭</span>
                  <div>
                    <div className={styles.statNumber}>{events.length}</div>
                    <div className={styles.statLabel}>Total Events</div>
                  </div>
                </div>
              </Card>
              
              <Card className={styles.statCard}>
                <div className={styles.statContent}>
                  <span className={styles.statIcon}>📸</span>
                  <div>
                    <div className={styles.statNumber}>
                      {events.length}
                    </div>
                    <div className={styles.statLabel}>Total Photos</div>
                  </div>
                </div>
              </Card>
              
              <Card className={styles.statCard}>
                <div className={styles.statContent}>
                  <span className={styles.statIcon}>✨</span>
                  <div>
                    <div className={styles.statNumber}>
                      {events.length}
                    </div>
                    <div className={styles.statLabel}>Active Events</div>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
