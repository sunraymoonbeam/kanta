"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ReactNode, forwardRef } from "react";
import styles from "./Button.module.css";

interface ButtonProps {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success" | "warning";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
  style?: React.CSSProperties;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  href,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  className = "",
  style,
  icon,
  iconPosition = "left",
  isLoading = false,
  type = "button",
}, ref) => {
  const baseClasses = `${styles.button} ${styles[variant]} ${styles[size]} ${className}`;

  const content = (
    <>
      {isLoading && <span className={styles.spinner} />}
      {!isLoading && icon && iconPosition === "left" && <span className={styles.icon}>{icon}</span>}
      <span>{children}</span>
      {!isLoading && icon && iconPosition === "right" && <span className={styles.icon}>{icon}</span>}
    </>
  );

  if (href) {
    return (
      <Link href={href} passHref legacyBehavior>
        <motion.a
          className={baseClasses}
          style={style}
          whileHover={!disabled ? { y: -2, scale: 1.02 } : {}}
          whileTap={!disabled ? { y: 0, scale: 0.98 } : {}}
          transition={{ duration: 0.2 }}
        >
          {content}
        </motion.a>
      </Link>
    );
  }

  return (
    <motion.button
      ref={ref}
      className={baseClasses}
      onClick={onClick}
      disabled={disabled || isLoading}
      style={style}
      type={type}
      whileHover={!disabled && !isLoading ? { y: -2, scale: 1.02 } : {}}
      whileTap={!disabled && !isLoading ? { y: 0, scale: 0.98 } : {}}
      transition={{ duration: 0.2 }}
    >
      {content}
    </motion.button>
  );
});

Button.displayName = "Button";

export default Button;
