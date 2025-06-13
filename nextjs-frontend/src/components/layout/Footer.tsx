"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { social, schema } from "../../config/kanta.config";
import styles from "./Footer.module.css";

const footerLinks = [
  {
    title: "Features",
    links: [
      { name: "Events", href: "/events" },
      { name: "Gallery", href: "/gallery" },
      { name: "Upload Photos", href: "/gallery/upload" },
      { name: "People", href: "/people" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About", href: "/about" },
      { name: "Privacy", href: "/privacy" },
      { name: "Terms", href: "/terms" },
      { name: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { name: "Help Center", href: "/help" },
      { name: "API Docs", href: "/docs" },
      { name: "Status", href: "/status" },
      { name: "Feedback", href: "/feedback" },
    ],
  },
];

const socialLinks = [
  { name: "Twitter", href: social.twitter, icon: "🐦" },
  { name: "GitHub", href: social.github, icon: "🐙" },
  { name: "LinkedIn", href: social.linkedin, icon: "💼" },
];

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        {/* Main Footer Content */}
        <div className={styles.content}>
          {/* Brand Section */}
          <div className={styles.brand}>
            <Link href="/" className={styles.logo}>
              <span className={styles.logoIcon}>📷</span>
              <span className={styles.logoText}>Kanta</span>
            </Link>
            <p className={styles.description}>
              Transform your events into live, shared photo albums with AI-powered organization and smart face detection.
            </p>
            <div className={styles.social}>
              {socialLinks.map((item) => (
                <motion.a
                  key={item.name}
                  href={item.href}
                  className={styles.socialLink}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={item.name}
                >
                  <span>{item.icon}</span>
                </motion.a>
              ))}
            </div>
          </div>

          {/* Links Sections */}
          <div className={styles.links}>
            {footerLinks.map((section) => (
              <div key={section.title} className={styles.linkSection}>
                <h3 className={styles.linkTitle}>{section.title}</h3>
                <ul className={styles.linkList}>
                  {section.links.map((link) => (
                    <li key={link.name}>
                      <Link href={link.href} className={styles.link}>
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Section */}
        <div className={styles.bottom}>
          <div className={styles.bottomContent}>
            <p className={styles.copyright}>
              © {currentYear} {schema.name}. All rights reserved.
            </p>
            <p className={styles.attribution}>
              Built with ❤️ using Next.js and inspired by modern design systems.
            </p>
          </div>
        </div>
      </div>

      {/* Background Effects */}
      <div className={styles.bgEffects}>
        <div className={styles.gradientOrb} />
        <div className={styles.dots} />
      </div>
    </footer>
  );
};
