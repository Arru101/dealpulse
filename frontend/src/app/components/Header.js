'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ShoppingBag, 
  Sun, 
  Moon, 
  Heart, 
  User, 
  LogOut, 
  LayoutDashboard,
  ShieldCheck,
  X,
  Menu
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import styles from './Header.module.css';

export default function Header() {
  const { 
    theme, 
    toggleTheme, 
    user, 
    loginWithGoogle, 
    loginAsDeveloper,
    logout, 
    wishlist 
  } = useApp();
  
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Modal states
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [devEmail, setDevEmail] = useState('');
  const [devPassword, setDevPassword] = useState('');
  const [showDevOptions, setShowDevOptions] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const dropdownRef = useRef(null);

  // Monitor Scroll for Glass blur change
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const handleGoogleLogin = async () => {
    setAuthError('');
    setAuthSubmitting(true);
    try {
      await loginWithGoogle();
      setShowAuthModal(false);
    } catch (err) {
      console.error(err);
      if (err.message && err.message.includes('auth/operation-not-allowed')) {
        setAuthError('Google Sign-In is currently disabled in your Firebase console. To fix: Open Firebase -> Authentication -> Sign-in Method tab -> Enable Google.');
        setShowDevOptions(true); // Auto-show dev options if Firebase is unconfigured
      } else {
        setAuthError(err.message || 'Google login failed.');
      }
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleDevSubmit = async (e) => {
    e.preventDefault();
    if (!devEmail.trim()) return;

    setAuthError('');
    setAuthSubmitting(true);
    try {
      await loginAsDeveloper(devEmail, devPassword);
      setShowAuthModal(false);
      setDevEmail('');
      setDevPassword('');
    } catch (err) {
      setAuthError('Backend verification failed. Ensure server on port 5000 is active and password is correct.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/products' },
    { name: 'Deals', path: '/products?sort=popular' },
    { name: 'About Us', path: '/legal/about-us' },
    { name: 'Contact Us', path: '/legal/contact-us' }
  ];

  return (
    <>
      <header className={`${styles.header} glass ${scrolled ? styles.scrolled : ''}`}>
        <div className="container">
          <div className={styles.nav}>
            {/* Logo */}
            <Link href="/" className={styles.logo}>
              <ShoppingBag className="gradient-text" style={{ color: 'var(--primary)' }} size={28} />
              <span className="gradient-text">DealsPulse</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 6px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '4px', alignSelf: 'flex-start', marginTop: '4px' }}>IN</span>
            </Link>

            {/* Center Navigation Links */}
            <div className={styles.menu}>
              {navLinks.map((link) => {
                const isActive = pathname === link.path;
                return (
                  <Link 
                    key={link.path} 
                    href={link.path} 
                    className={`${styles.menuLink} ${isActive ? styles.menuLinkActive : ''}`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>

            {/* Right Action Icons */}
            <div className={styles.actions}>
              {/* Theme Toggle Button (Desktop Only) */}
              <button onClick={toggleTheme} className={`${styles.themeToggle} ${styles.desktopOnly}`} aria-label="Toggle Theme">
                <div className={`${styles.themeToggleInner} ${theme === 'dark' ? styles.isDark : ''}`}>
                  <Sun className={styles.sunIcon} size={20} />
                  <Moon className={styles.moonIcon} size={20} />
                </div>
              </button>

              {/* Wishlist Link (Desktop Only) */}
              <Link href="/dashboard?tab=wishlist" className={`${styles.iconBtn} ${styles.desktopOnly}`} aria-label="Wishlist">
                <Heart size={20} />
                {wishlist.length > 0 && (
                  <span className={styles.badge}>{wishlist.length}</span>
                )}
              </Link>

              {/* Authentication and Profile Dropdown */}
              {user ? (
                <div className={styles.profileMenu} ref={dropdownRef}>
                  <div 
                    className={styles.avatar} 
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    aria-haspopup="true"
                    aria-expanded={dropdownOpen}
                  >
                    {getInitials(user.displayName)}
                  </div>

                  {dropdownOpen && (
                    <div className={`${styles.dropdown} glass`}>
                      <div className={styles.dropdownHeader}>
                        <p className={styles.dropdownName}>{user.displayName}</p>
                        <p className={styles.dropdownEmail}>{user.email}</p>
                      </div>

                      <Link href="/dashboard" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>
                        <LayoutDashboard size={16} />
                        User Dashboard
                      </Link>

                      {user.role === 'admin' && (
                        <Link href="/admin" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>
                          <ShieldCheck size={16} style={{ color: 'var(--primary)' }} />
                          <strong>Admin Panel</strong>
                        </Link>
                      )}

                      <button onClick={() => { logout(); setDropdownOpen(false); }} className={styles.dropdownItem} style={{ color: 'var(--error)', width: '100%', textAlign: 'left' }}>
                        <LogOut size={16} />
                        Log Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Desktop Sign In Button */}
                  <button onClick={() => setShowAuthModal(true)} className={`${styles.desktopOnly} btn btn-primary`} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                    <User size={16} />
                    Sign In
                  </button>

                  {/* Mobile Sign In Icon Button */}
                  <button onClick={() => setShowAuthModal(true)} className={`${styles.mobileOnly} ${styles.iconBtn}`} aria-label="Sign In">
                    <User size={20} />
                  </button>
                </>
              )}

              {/* Mobile Drawer Toggle Button */}
              <button 
                className={styles.mobileToggle} 
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open Menu"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 5. Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className={styles.drawerOverlay} onClick={() => setMobileMenuOpen(false)}>
          <div className={`${styles.drawerCard} glass`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <Link href="/" className={styles.logo} onClick={() => setMobileMenuOpen(false)}>
                <ShoppingBag className="gradient-text" style={{ color: 'var(--primary)' }} size={24} />
                <span className="gradient-text" style={{ fontSize: '1.25rem' }}>DealsPulse</span>
              </Link>
              <button onClick={() => setMobileMenuOpen(false)} className={styles.drawerClose} aria-label="Close menu">
                <X size={20} />
              </button>
            </div>

            <div className={styles.drawerMenu}>
              {navLinks.map((link) => {
                const isActive = pathname === link.path;
                return (
                  <Link 
                    key={link.path} 
                    href={link.path} 
                    className={`${styles.drawerLink} ${isActive ? styles.drawerLinkActive : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>

            <div className={styles.drawerFooter}>
              <div className={styles.drawerActions}>
                {/* Theme Toggle in Drawer */}
                <button onClick={toggleTheme} className={styles.drawerActionBtn} aria-label="Toggle Theme">
                  <div className={`${styles.themeToggleInner} ${theme === 'dark' ? styles.isDark : ''}`}>
                    <Sun className={styles.sunIcon} size={20} />
                    <Moon className={styles.moonIcon} size={20} />
                  </div>
                  <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>

                {/* Wishlist in Drawer */}
                <Link 
                  href="/dashboard?tab=wishlist" 
                  className={styles.drawerActionBtn} 
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Heart size={20} />
                    {wishlist.length > 0 && (
                      <span className={styles.drawerBadge}>{wishlist.length}</span>
                    )}
                  </div>
                  <span>Wishlist</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Auth Modal Overlay */}
      {showAuthModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAuthModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Account Sign In</h3>
              <button onClick={() => setShowAuthModal(false)} className={styles.modalClose} aria-label="Close modal">
                <X size={20} />
              </button>
            </div>

            {authError && (
              <div className={styles.errorBanner}>
                {authError}
              </div>
            )}

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Enter your account credentials to access your user dashboard or admin panel.
            </p>

            <button 
              onClick={handleGoogleLogin} 
              className="btn btn-outline" 
              style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
              disabled={authSubmitting}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.24h2.9c1.69-1.55 2.69-3.83 2.69-6.57z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.24c-.8.54-1.84.87-3.06.87-2.35 0-4.34-1.58-5.05-3.71H.95v2.3C2.43 15.89 5.5 18 9 18z"/>
                <path fill="#FBBC05" d="M3.95 10.74c-.18-.54-.28-1.12-.28-1.74s.1-1.2.28-1.74V4.96H.95C.35 6.17 0 7.55 0 9s.35 2.83.95 4.04l3-2.3z"/>
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.8 11.43 0 9 0 5.5 0 2.43 2.11.95 5.11l3 2.3c.71-2.13 2.7-3.71 5.05-3.71z"/>
              </svg>
              Sign In with Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
              <span>OR</span>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
            </div>

            <form onSubmit={handleDevSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Email Address</label>
                <input 
                  type="email" 
                  placeholder="e.g. name@example.com"
                  className="form-input" 
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Password</label>
                <input 
                  type="password" 
                  placeholder="Enter your password"
                  className="form-input" 
                  value={devPassword}
                  onChange={(e) => setDevPassword(e.target.value)}
                  required
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '12px' }}
                disabled={authSubmitting}
              >
                {authSubmitting ? 'Verifying...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
