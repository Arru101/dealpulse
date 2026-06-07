'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie, Settings, Check, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import styles from './CookieConsent.module.css';

export default function CookieConsent() {
  const { cookieConsent, saveCookiePreferences } = useApp();
  const [showBanner, setShowBanner] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);

  // Preference switches states
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [functional, setFunctional] = useState(true);

  useEffect(() => {
    // Only display if user hasn't made a choice yet
    if (cookieConsent === null) {
      const timer = setTimeout(() => setShowBanner(true), 1500); // Small delay for better UX
      return () => clearTimeout(timer);
    }
  }, [cookieConsent]);

  if (!showBanner || cookieConsent !== null) return null;

  const handleAcceptAll = () => {
    saveCookiePreferences({
      essential: true,
      analytics: true,
      marketing: true,
      functional: true,
      timestamp: new Date().toISOString()
    });
    setShowBanner(false);
  };

  const handleRejectAll = () => {
    saveCookiePreferences({
      essential: true,
      analytics: false,
      marketing: false,
      functional: false,
      timestamp: new Date().toISOString()
    });
    setShowBanner(false);
  };

  const handleSavePreferences = () => {
    saveCookiePreferences({
      essential: true,
      analytics,
      marketing,
      functional,
      timestamp: new Date().toISOString()
    });
    setShowBanner(false);
  };

  return (
    <div className={`${styles.overlay} glass`}>
      <div className={styles.title}>
        <Cookie style={{ color: 'var(--primary)' }} size={24} />
        <h4>We Value Your Privacy</h4>
      </div>

      <p className={styles.text}>
        We use cookies to enhance your browsing experience, serve personalized affiliate product recommendations, and analyze our traffic. By clicking &ldquo;Accept All&rdquo;, you consent to our use of cookies in accordance with our <Link href="/legal/cookie-policy" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Cookie Policy</Link>.
      </p>

      {showCustomize && (
        <div className={styles.prefPanel}>
          {/* Essential - Always On */}
          <div className={styles.prefRow}>
            <div className={styles.prefInfo}>
              <span className={styles.prefName}>Essential Cookies</span>
              <span className={styles.prefDesc}>Required for authentication and system security. Cannot be turned off.</span>
            </div>
            <label className={styles.switch}>
              <input type="checkbox" checked disabled />
              <span className={styles.slider}></span>
            </label>
          </div>

          {/* Functional */}
          <div className={styles.prefRow}>
            <div className={styles.prefInfo}>
              <span className={styles.prefName}>Functional Cookies</span>
              <span className={styles.prefDesc}>Remember preferences, themes, and dashboard filters.</span>
            </div>
            <label className={styles.switch}>
              <input 
                type="checkbox" 
                checked={functional} 
                onChange={(e) => setFunctional(e.target.checked)} 
              />
              <span className={styles.slider}></span>
            </label>
          </div>

          {/* Analytics */}
          <div className={styles.prefRow}>
            <div className={styles.prefInfo}>
              <span className={styles.prefName}>Analytics Cookies</span>
              <span className={styles.prefDesc}>Gather anonymous click metadata and traffic summaries.</span>
            </div>
            <label className={styles.switch}>
              <input 
                type="checkbox" 
                checked={analytics} 
                onChange={(e) => setAnalytics(e.target.checked)} 
              />
              <span className={styles.slider}></span>
            </label>
          </div>

          {/* Marketing */}
          <div className={styles.prefRow}>
            <div className={styles.prefInfo}>
              <span className={styles.prefName}>Marketing Cookies</span>
              <span className={styles.prefDesc}>Track outbound affiliate links to attribute commission.</span>
            </div>
            <label className={styles.switch}>
              <input 
                type="checkbox" 
                checked={marketing} 
                onChange={(e) => setMarketing(e.target.checked)} 
              />
              <span className={styles.slider}></span>
            </label>
          </div>
        </div>
      )}

      <div className={styles.actions}>
        {showCustomize ? (
          <>
            <button onClick={() => setShowCustomize(false)} className="btn btn-outline" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
              Back
            </button>
            <button onClick={handleSavePreferences} className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
              <Check size={14} /> Save Preferences
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setShowCustomize(true)} className="btn btn-outline" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
              <Settings size={14} /> Customise
            </button>
            <button onClick={handleRejectAll} className="btn btn-outline" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
              Reject
            </button>
            <button onClick={handleAcceptAll} className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
              Accept All
            </button>
          </>
        )}
      </div>
    </div>
  );
}
