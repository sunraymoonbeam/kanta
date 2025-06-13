'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import styles from './HomePage.module.css';

const steps = [
  {
    number: 1,
    title: 'Create Event & QR Code',
    description: 'Set up your event and generate a custom QR code guests can scan to join instantly.',
    image: 'https://cdn.prod.website-files.com/673d196dcbdffd5878aa34c3/67450441a62191954ce549e9_4-creative-qr-code-ideas-to-enhance-your-wedding-experience-wf.webp',
    caption: 'Generate and share your QR code',
    href: '/events',
    icon: '🎭',
    linkText: 'Manage Events',
    color: '#8b5cf6'
  },
  {
    number: 2,
    title: 'Snap or Upload Photos',
    description: 'Scan the event QR code to open Kanta, then capture or upload photos directly from any device.',
    image: 'https://images.airtasker.com/v7/https://airtasker-seo-assets-prod.s3.amazonaws.com/en_AU/1715328328533-event-photographers-hero.jpg',
    caption: 'Capture moments live',
    href: '/gallery/upload',
    icon: '📸',
    linkText: 'Snap & Upload Photos',
    color: '#3b82f6'
  },
  {
    number: 3,
    title: 'Explore Your Gallery',
    description: 'Browse all event photos in one place, filter by date or person, and mark your favorites.',
    image: 'https://photos.smugmug.com/BLOG/Blog-images/i-4DzMFWZ/0/NCg78ZfVGwLThZt3BVVJkBNq7VgL2LmzdVTHmXfnd/XL/%40RobHammPhoto%20%236%28c%292017RobertHamm-XL.jpg',
    caption: 'All your photos in one album',
    href: '/gallery',
    icon: '🖼️',
    linkText: 'View Gallery',
    color: '#ef4444'
  },
  {
    number: 4,
    title: 'Find People Instantly',
    description: 'Discover auto-detected faces, see every photo of a guest, and relive shared moments.',
    image: 'https://production-rhino-website-crm.s3.ap-southeast-1.amazonaws.com/Face_Recognition_17a30dc38b.png',
    caption: 'Smart face grouping',
    href: '/people',
    icon: '👥',
    linkText: 'Discover People',
    color: '#f59e0b'
  }
];

export default function HomePage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 60, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
      },
    },
  };

  return (
    <div className={styles.hero}>
      {/* Background Effects */}
      <div className={styles.heroEffects}>
        <div className={styles.gradientOrb} />
        <div className={styles.dots} />
      </div>

      <motion.div 
        className={styles.heroContent}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero Section */}
        <motion.div className={styles.heroHeader} variants={itemVariants}>
          <h1 className={styles.title}>
            <span className={styles.titleGradient}>Kanta</span> | Collaborative Event Photos
          </h1>
          <p className={styles.subtitle}>
            Transform your event into a live, shared photo album.
          </p>
          <p className={styles.description}>
            Kanta lets event participants capture, share, and organize photos in a shared 
            digital camera roll, automatically grouping moments by person.
          </p>
        </motion.div>
        
        <motion.div className={styles.divider} variants={itemVariants} />

        {/* How It Works Section */}
        <motion.div className={styles.section} variants={itemVariants}>
          <h2 className={styles.sectionTitle}>How It Works</h2>

          {/* Steps */}
          {steps.map((step, index) => (
            <motion.div 
              key={step.number} 
              className={styles.step}
              variants={itemVariants}
            >
              <div className={styles.stepCard}>
                {/* Image */}
                <div className={`${styles.stepImage} ${index % 2 === 1 ? styles.stepImageAlt : ''}`}>
                  <motion.img 
                    src={step.image}
                    alt={step.caption}
                    className={styles.image}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.3 }}
                  />
                  <p className={styles.imageCaption}>
                    {step.caption}
                  </p>
                </div>

                {/* Content */}
                <div className={`${styles.stepContent} ${index % 2 === 1 ? styles.stepContentAlt : ''}`}>
                  <div className={styles.stepHeader}>
                    <motion.div 
                      className={styles.stepNumber}
                      style={{ background: step.color }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {step.number}
                    </motion.div>
                    <h3 className={styles.stepTitle}>
                      {step.title}
                    </h3>
                  </div>
                  
                  <div 
                    className={styles.stepAccent}
                    style={{ background: step.color }}
                  />
                  
                  <p className={styles.stepDescription}>
                    {step.description}
                  </p>
                  
                  <motion.div whileHover={{ y: -2 }} whileTap={{ y: 0 }}>
                    <Link 
                      href={step.href}
                      className={styles.stepButton}
                      style={{ 
                        background: step.color,
                        boxShadow: `0 4px 20px ${step.color}40`
                      }}
                    >
                      <span className={styles.stepIcon}>{step.icon}</span>
                      {step.linkText} →
                    </Link>
                  </motion.div>
                </div>
              </div>

              {/* Divider */}
              {index < steps.length - 1 && (
                <div className={styles.divider} />
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.div className={styles.footer} variants={itemVariants}>
          <p className={styles.footerText}>
            Kanta: Creating memories together, one picture at a time.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
