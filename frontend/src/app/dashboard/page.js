'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Heart, 
  History, 
  User, 
  ShieldAlert, 
  Download, 
  Trash2, 
  Lock,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import ProductCard from '../components/ProductCard';
import styles from './dashboard.module.css';

export default function UserDashboard() {
  const { 
    user, 
    loading, 
    loginWithGoogle, 
    wishlist, 
    recentlyViewed, 
    deleteAccount, 
    backendUrl 
  } = useApp();

  const [activeTab, setActiveTab] = useState('wishlist');
  const [profileName, setProfileName] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Cached product details for wishlist and history items
  const [cachedProducts, setCachedProducts] = useState([]);

  useEffect(() => {
    if (user) {
      setProfileName(user.displayName || '');
    }
  }, [user]);

  // Pre-load all products to filter wishlist/history locally
  useEffect(() => {
    if (!user) return;

    async function loadAllProducts() {
      try {
        const res = await fetch(`${backendUrl}/api/products?limit=100`);
        if (res.ok) {
          const data = await res.json();
          setCachedProducts(data.products || []);
        }
      } catch (err) {
        console.error('Error pre-loading products:', err);
      }
    }
    loadAllProducts();
  }, [user, backendUrl]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
        <p>Loading your dashboard details...</p>
      </div>
    );
  }

  // Auth Wall
  if (!user) {
    return (
      <div className="container" style={{ padding: '80px 24px', maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '40px 32px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <Lock size={28} />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Dashboard Access Locked</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Unlock your dashboard to view your wishlist, track deals, and manage data preferences.
          </p>
          <button onClick={loginWithGoogle} className="btn btn-primary" style={{ padding: '12px' }}>
            Sign In with Google
          </button>
        </div>
      </div>
    );
  }

  // Filter items
  const wishlistProducts = cachedProducts.filter(p => wishlist.includes(p.id));
  const historyProducts = cachedProducts.filter(p => recentlyViewed.includes(p.id));

  // Profile update save mock
  const handleSaveProfile = (e) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Download User Profile Data (GDPR Portability requirement)
  const handleDownloadData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      profile: user,
      wishlist: wishlistProducts.map(p => ({ id: p.id, title: p.title, price: p.price })),
      recentlyViewed: historyProducts.map(p => ({ id: p.id, title: p.title, price: p.price })),
      cookieConsent: localStorage.getItem('cookieConsent')
    }, null, 2));
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `affiliate_platform_user_data_${user.uid}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const menuItems = [
    { id: 'wishlist', name: 'My Wishlist', icon: <Heart size={18} /> },
    { id: 'history', name: 'Recently Viewed', icon: <History size={18} /> },
    { id: 'profile', name: 'Profile Settings', icon: <User size={18} /> },
    { id: 'gdpr', name: 'Data & Privacy', icon: <ShieldAlert size={18} /> }
  ];

  return (
    <div className="container" style={{ paddingBottom: '64px' }}>
      <div className={styles.layout}>
        {/* Left column: profile card and menu */}
        <aside className={styles.sidebar}>
          <div className={`${styles.profileCard} glass-premium`}>
            <div className={styles.avatar}>
              {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
            </div>
            <div>
              <p className={styles.name}>{user.displayName}</p>
              <p className={styles.email}>{user.email}</p>
              <span className="badge badge-primary" style={{ marginTop: '8px', fontSize: '0.65rem' }}>
                Role: {user.role || 'User'}
              </span>
            </div>
          </div>

          <ul className={`${styles.sidebarMenu} glass-premium`}>
            {menuItems.map((item) => (
              <li key={item.id} className={styles.menuItem}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`${styles.menuBtn} ${activeTab === item.id ? styles.menuBtnActive : ''}`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Right column: active content panel */}
        <main className={styles.panel}>
          {/* Bento Stats Grid */}
          <div className={styles.statsGrid}>
            <div 
              onClick={() => setActiveTab('wishlist')} 
              className={`${styles.statTile} glass-premium ${activeTab === 'wishlist' ? styles.activeTile : ''}`}
            >
              <div className={styles.tileHeader}>
                <Heart size={18} className={styles.wishlistIcon} />
                <span className={styles.tileTitle}>Saved Deals</span>
              </div>
              <span className={styles.tileValue}>{wishlist.length}</span>
            </div>
            
            <div 
              onClick={() => setActiveTab('history')} 
              className={`${styles.statTile} glass-premium ${activeTab === 'history' ? styles.activeTile : ''}`}
            >
              <div className={styles.tileHeader}>
                <History size={18} className={styles.historyIcon} />
                <span className={styles.tileTitle}>Recently Viewed</span>
              </div>
              <span className={styles.tileValue}>{recentlyViewed.length}</span>
            </div>

            <div 
              onClick={() => setActiveTab('gdpr')} 
              className={`${styles.statTile} glass-premium ${activeTab === 'gdpr' ? styles.activeTile : ''}`}
            >
              <div className={styles.tileHeader}>
                <ShieldAlert size={18} className={styles.securityIcon} />
                <span className={styles.tileTitle}>Data & GDPR</span>
              </div>
              <span className={styles.tileStatus}>Active & Safe</span>
            </div>
          </div>

          {/* Active Tab Panel wrapper with transition key */}
          <div key={activeTab} className={styles.tabContent}>
            {/* Wishlist Panel */}
            {activeTab === 'wishlist' && (
              <div>
                <h2 className={styles.panelTitle}>Saved Products</h2>
                {wishlistProducts.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '24px' }}>
                    {wishlistProducts.map((prod) => (
                      <ProductCard key={prod.id} product={prod} />
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '48px 0' }}>
                    <Heart size={44} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Your wishlist is empty.</p>
                    <Link href="/products" className="btn btn-outline" style={{ display: 'inline-flex' }}>
                      Browse Products <ArrowRight size={16} />
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* History Panel */}
            {activeTab === 'history' && (
              <div>
                <h2 className={styles.panelTitle}>Recently Viewed Items</h2>
                {historyProducts.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '24px' }}>
                    {historyProducts.map((prod) => (
                      <ProductCard key={prod.id} product={prod} />
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '48px 0' }}>
                    <History size={44} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>You haven&rsquo;t browsed any products yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* Profile Settings Panel */}
            {activeTab === 'profile' && (
              <div>
                <h2 className={styles.panelTitle}>Profile Settings</h2>
                <form onSubmit={handleSaveProfile} className={styles.settingsForm}>
                  <div className={styles.formGroup}>
                    <label htmlFor="p-name">Display Name</label>
                    <input
                      type="text"
                      id="p-name"
                      className="form-input"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="p-email">Email Address (Read-only)</label>
                    <input
                      type="email"
                      id="p-email"
                      className="form-input"
                      value={user.email}
                      disabled
                      style={{ background: 'var(--surface-hover)', cursor: 'not-allowed' }}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                    Save Profile Settings
                  </button>
                  {saveSuccess && (
                    <p style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>
                      Profile settings successfully mock saved!
                    </p>
                  )}
                </form>
              </div>
            )}

            {/* GDPR Tab */}
            {activeTab === 'gdpr' && (
              <div>
                <h2 className={styles.panelTitle}>Data Portability & Deletion (GDPR)</h2>
                
                <div className={styles.gdprGrid}>
                  <div className={`${styles.gdprCard} glass-premium`}>
                    <h3 className={styles.gdprCardTitle}>
                      <Download size={20} className={styles.gdprIcon} />
                      Export Personal Data
                    </h3>
                    <p className={styles.gdprCardDesc}>
                      Obtain a machine-readable JSON copy of all user files, click metadata, and settings saved on our platform database.
                    </p>
                    <button onClick={handleDownloadData} className="btn btn-outline" style={{ display: 'inline-flex', padding: '10px 18px', width: '100%', justifyContent: 'center' }}>
                      Export Profile JSON
                    </button>
                  </div>

                  <div className={`${styles.gdprCard} glass-premium`} style={{ border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                    <h3 className={styles.gdprCardTitle} style={{ color: 'var(--error)' }}>
                      <Trash2 size={20} className={styles.gdprIcon} />
                      Delete Account Profile
                    </h3>
                    <p className={styles.gdprCardDesc}>
                      Permanently delete your profile, wishlist, search histories, and session records. Complying with Indian IT Act Section 43A and GDPR.
                    </p>
                    <button onClick={deleteAccount} className="btn btn-primary" style={{ backgroundColor: 'var(--error)', border: 'none', display: 'inline-flex', padding: '10px 18px', width: '100%', justifyContent: 'center' }}>
                      Request Account Deletion
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
