"use client";

import { motion } from "framer-motion";
import styles from "./LoadingSpinner.module.css";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "accent";
  message?: string;
  className?: string;
}

export const LoadingSpinner = ({
  size = "md",
  variant = "primary",
  message,
  className = "",
}: LoadingSpinnerProps) => {
  return (
    <div className={`${styles.container} ${className}`}>
      <motion.div
        className={`${styles.spinner} ${styles[size]} ${styles[variant]}`}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      {message && (
        <motion.p
          className={styles.message}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {message}
        </motion.p>
      )}
    </div>
  );
};

export default LoadingSpinner;
