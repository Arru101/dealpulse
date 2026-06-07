'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Send } from 'lucide-react';
import styles from './Footer.module.css';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email) return;
    
    // Simulate API registration call
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 5000);
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className="container">
        {/* Main Footer Links Columns */}
        <div className={styles.grid}>
          {/* Brand Info */}
          <div className={styles.brandCol}>
            <Link href="/" className={styles.logo}>
              <ShoppingBag style={{ color: 'var(--primary)' }} size={24} />
              <span>DealsPulse</span>
            </Link>
            <p className={styles.description}>
              Discover best rated items, trending products, and exclusive online shopping deals in India. We scan multiple marketplaces to bring you the best prices and reviews.
            </p>
          </div>

          {/* Categories Links */}
          <div>
            <h4 className={styles.heading}>Discover</h4>
            <ul className={styles.linksList}>
              <li className={styles.linkItem}>
                <Link href="/products?category=electronics">Electronics</Link>
              </li>
              <li className={styles.linkItem}>
                <Link href="/products?category=fashion">Fashion & Apparel</Link>
              </li>
              <li className={styles.linkItem}>
                <Link href="/products?category=home-kitchen">Home & Kitchen</Link>
              </li>
              <li className={styles.linkItem}>
                <Link href="/products?category=beauty-grooming">Beauty & Personal Care</Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className={styles.heading}>Compliance</h4>
            <ul className={styles.linksList}>
              <li className={styles.linkItem}>
                <Link href="/legal/privacy-policy">Privacy Policy</Link>
              </li>
              <li className={styles.linkItem}>
                <Link href="/legal/terms-of-service">Terms of Service</Link>
              </li>
              <li className={styles.linkItem}>
                <Link href="/legal/affiliate-disclosure">Affiliate Disclosure</Link>
              </li>
              <li className={styles.linkItem}>
                <Link href="/legal/cookie-policy">Cookie Policy</Link>
              </li>
              <li className={styles.linkItem}>
                <Link href="/legal/gdpr-information">GDPR / Data Rights</Link>
              </li>
            </ul>
          </div>

          {/* Newsletter Column */}
          <div className={styles.newsletterCol}>
            <h4 className={styles.heading}>Deals Alert</h4>
            <p className={styles.description}>
              Subscribe to get the hottest handpicked deals directly in your inbox daily.
            </p>
            <form onSubmit={handleSubscribe} className={styles.newsletterForm}>
              <input
                type="email"
                placeholder="Enter email address"
                className={styles.newsletterInput}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className={`btn btn-primary ${styles.newsletterSubmit}`} aria-label="Subscribe">
                <Send size={16} />
              </button>
            </form>
            {subscribed && (
              <p style={{ color: 'var(--success)', fontSize: '0.8rem', fontWeight: 600 }}>
                Awesome! You have successfully subscribed to deal alerts.
              </p>
            )}
          </div>
        </div>

        {/* Affiliate Disclosure Box */}
        <div className={styles.disclaimerBox}>
          <strong>Amazon Associates Disclosure:</strong> DealsPulse India is a participant in the Amazon Services LLC Associates Program, an affiliate advertising program designed to provide a means for sites to earn advertising fees by advertising and linking to Amazon.in. Amazon, the Amazon logo, and any product logos are trademarks of Amazon.com, Inc. or its affiliates. Prices and availability are accurate at the date/time indicated and are subject to change.
        </div>

        {/* Bottom copyright bar */}
        <div className={styles.bottomBar}>
          <p>© {currentYear} DealsPulse India. Built in compliance with Indian Information Technology Act (IT Act 2000).</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <Link href="/legal/disclaimer">Disclaimer</Link>
            <Link href="/legal/cookie-policy">Manage Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
