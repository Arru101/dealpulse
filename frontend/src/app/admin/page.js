'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  BarChart3, 
  Plus, 
  Trash2, 
  Edit, 
  Link2, 
  UploadCloud, 
  History, 
  AlertTriangle,
  FolderTree,
  Activity,
  CheckCircle,
  FileText
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import styles from './admin.module.css';

export default function AdminDashboard() {
  const { user, loading, loginAsDeveloper, backendUrl, token } = useApp();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('analytics');

  // Admin credentials auth states
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAuthError, setAdminAuthError] = useState('');
  const [adminAuthSubmitting, setAdminAuthSubmitting] = useState(false);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminPassword) return;

    setAdminAuthError('');
    setAdminAuthSubmitting(true);
    try {
      const loggedUser = await loginAsDeveloper(adminEmail, adminPassword);
      if (loggedUser && loggedUser.role !== 'admin') {
        setAdminAuthError('Access Denied: Your profile does not hold administrative access roles.');
      }
    } catch (err) {
      setAdminAuthError('Invalid administrator credentials.');
    } finally {
      setAdminAuthSubmitting(false);
    }
  };

  // Stats states
  const [stats, setStats] = useState({
    totalClicks: 0,
    totalProducts: 0,
    totalUsers: 0,
    topProducts: [],
    clicksByCategory: {},
    clicksByBrand: {}
  });

  // Product listing & CRUD states
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    title: '', description: '', price: '', originalPrice: '',
    brand: '', category: '', affiliateUrl: '', imageUrls: ''
  });

  // Scraper states
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapedData, setScrapedData] = useState(null);
  const [scrapeError, setScrapeError] = useState('');

  // Bulk Upload state
  const [bulkJson, setBulkJson] = useState('');
  const [bulkMessage, setBulkMessage] = useState('');

  // Banners state
  const [banners, setBanners] = useState([]);
  const [bannerForm, setBannerForm] = useState({ title: '', subtitle: '', imageUrl: '', link: '' });

  // Audit Logs state
  const [logs, setLogs] = useState([]);

  // General messages
  const [message, setMessage] = useState('');

  // Price Update states
  const [syncStatus, setSyncStatus] = useState({
    status: 'idle',
    lastRunCompleted: null,
    lastRunProductsChecked: 0,
    lastRunUpdatedCount: 0,
    triggeredBy: ''
  });
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const fetchSyncStatus = async () => {
    const activeToken = token || localStorage.getItem('authToken');
    try {
      const res = await fetch(`${backendUrl}/api/admin/price-update/status`, {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch price update status:', err);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    fetchSyncStatus();

    let intervalId;
    if (syncStatus.status === 'running') {
      intervalId = setInterval(fetchSyncStatus, 5000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user, syncStatus.status]);

  const handleTriggerSync = async () => {
    setSyncLoading(true);
    setSyncMessage('');
    const activeToken = token || localStorage.getItem('authToken');
    try {
      const res = await fetch(`${backendUrl}/api/admin/price-update/trigger`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      if (res.ok) {
        setSyncMessage('Price synchronization triggered successfully in the background.');
        setSyncStatus(prev => ({ ...prev, status: 'running' }));
        setTimeout(() => setSyncMessage(''), 4000);
      } else {
        const data = await res.json();
        setSyncMessage(data.error || 'Failed to trigger price synchronization.');
      }
    } catch (err) {
      setSyncMessage('Network error during sync trigger.');
    } finally {
      setSyncLoading(false);
    }
  };

  // 1. Fetch Products, Banners, Logs with 30-second Polling
  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const activeToken = token || localStorage.getItem('authToken');

    async function loadStaticAdminData() {
      try {
        // Fetch Products
        const prodRes = await fetch(`${backendUrl}/api/products?limit=100`);
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          setProducts(prodData.products || []);
        }

        // Fetch Banners
        const bannerRes = await fetch(`${backendUrl}/api/admin/banners`);
        if (bannerRes.ok) {
          const bannerData = await bannerRes.json();
          setBanners(bannerData);
        }

        // Fetch Logs
        const logsRes = await fetch(`${backendUrl}/api/admin/logs`, {
          headers: { 'Authorization': `Bearer ${activeToken}` }
        });
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setLogs(logsData);
        }
      } catch (err) {
        console.error('Failed to load catalog details:', err);
      }
    }

    loadStaticAdminData();
    const intervalId = setInterval(loadStaticAdminData, 30000);
    return () => clearInterval(intervalId);
  }, [user, backendUrl, token, activeTab]);

  // 2. Fetch Clicks/Stats with Real-Time 2-Second Polling
  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const activeToken = token || localStorage.getItem('authToken');

    async function loadStatsData() {
      try {
        const statsRes = await fetch(`${backendUrl}/api/analytics/summary`, {
          headers: { 'Authorization': `Bearer ${activeToken}` }
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch (err) {
        console.error('Failed to load real-time stats:', err);
      }
    }

    loadStatsData();
    const intervalId = setInterval(loadStatsData, 2000); // 2-second real-time interval
    return () => clearInterval(intervalId);
  }, [user, backendUrl, token]);

  // Auth walls
  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
        <p>Loading administrator configurations...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container" style={{ padding: '80px 24px', maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '40px 32px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <ShieldCheck size={28} />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Admin Login Required</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Access to this directory is restricted to administrator profiles.
          </p>
          {adminAuthError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', textAlign: 'left', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              {adminAuthError}
            </div>
          )}
          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Admin Email</label>
              <input 
                type="email" 
                placeholder="admin@example.com"
                className="form-input" 
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Password</label>
              <input 
                type="password" 
                placeholder="••••••••"
                className="form-input" 
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ padding: '12px', marginTop: '8px' }}
              disabled={adminAuthSubmitting}
            >
              {adminAuthSubmitting ? 'Verifying...' : 'Sign In as Administrator'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="container" style={{ padding: '80px 24px', maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '40px 32px', borderColor: 'var(--error)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <AlertTriangle size={28} />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--error)' }}>Access Denied</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Your profile does not hold administrative access roles. Please contact site owners if you believe this is an error.
          </p>
          <button onClick={() => router.push('/')} className="btn btn-outline" style={{ padding: '12px' }}>
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  // CRUD Product Actions
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    const activeToken = token || localStorage.getItem('authToken');
    const method = editingProduct ? 'PUT' : 'POST';
    const endpoint = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';

    try {
      const res = await fetch(`${backendUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          ...productForm,
          price: parseFloat(productForm.price),
          originalPrice: productForm.originalPrice ? parseFloat(productForm.originalPrice) : parseFloat(productForm.price),
          imageUrls: [productForm.imageUrls]
        })
      });

      if (res.ok) {
        setMessage(editingProduct ? 'Product updated successfully!' : 'Product added successfully!');
        setEditingProduct(null);
        setProductForm({
          title: '', description: '', price: '', originalPrice: '',
          brand: '', category: '', affiliateUrl: '', imageUrls: ''
        });
        setActiveTab('products');
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditClick = (prod) => {
    setEditingProduct(prod);
    setProductForm({
      title: prod.title,
      description: prod.description || '',
      price: prod.price,
      originalPrice: prod.originalPrice || prod.price,
      brand: prod.brand || '',
      category: prod.category || '',
      affiliateUrl: prod.affiliateUrl || '',
      imageUrls: prod.imageUrls && prod.imageUrls.length > 0 ? prod.imageUrls[0] : ''
    });
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    const activeToken = token || localStorage.getItem('authToken');

    try {
      const res = await fetch(`${backendUrl}/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      if (res.ok) {
        setProducts(products.filter(p => p.id !== id));
        setMessage('Product deleted successfully!');
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // URL Scraping action
  const handleScrape = async (e) => {
    e.preventDefault();
    if (!scrapeUrl) return;

    setScrapeLoading(true);
    setScrapeError('');
    setScrapedData(null);

    const activeToken = token || localStorage.getItem('authToken');

    try {
      const res = await fetch(`${backendUrl}/api/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({ url: scrapeUrl })
      });

      if (res.ok) {
        const data = await res.json();
        setScrapedData(data);
        // Populate standard form directly to let admin review & edit immediately
        setProductForm({
          title: data.title || '',
          description: data.description || '',
          price: data.price || '',
          originalPrice: data.originalPrice || data.price || '',
          brand: data.brand || '',
          category: data.category || '',
          affiliateUrl: scrapeUrl,
          imageUrls: data.imageUrls && data.imageUrls.length > 0 ? data.imageUrls[0] : ''
        });
      } else {
        const data = await res.json();
        setScrapeError(data.error || 'Failed to scrape metadata.');
      }
    } catch (err) {
      setScrapeError('Network error during page fetching.');
    } finally {
      setScrapeLoading(false);
    }
  };

  // Bulk upload submit
  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!bulkJson) return;

    const activeToken = token || localStorage.getItem('authToken');

    try {
      const parsed = JSON.parse(bulkJson);
      const res = await fetch(`${backendUrl}/api/products/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({ products: parsed })
      });

      if (res.ok) {
        const data = await res.json();
        setBulkMessage(data.message || 'Bulk upload success!');
        setBulkJson('');
        setTimeout(() => setBulkMessage(''), 4000);
      } else {
        const data = await res.json();
        setBulkMessage(`Upload error: ${data.error}`);
      }
    } catch (err) {
      setBulkMessage('Failed to parse JSON. Please enter a valid JSON array format.');
    }
  };

  // Banners upload submit
  const handleBannerSubmit = async (e) => {
    e.preventDefault();
    const activeToken = token || localStorage.getItem('authToken');

    try {
      const res = await fetch(`${backendUrl}/api/admin/banners`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify(bannerForm)
      });
      if (res.ok) {
        const data = await res.json();
        setBanners([...banners, data.banner]);
        setBannerForm({ title: '', subtitle: '', imageUrl: '', link: '' });
        setMessage('Banner successfully registered!');
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '64px' }}>
      
      {/* 1. Header with details */}
      <div className={styles.titleRow}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '2.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={36} style={{ color: 'var(--primary)' }} />
            Enterprise Admin Control
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Platform metrics, metadata scrapers, product catalogs, and banners.
          </p>
        </div>
      </div>

      {message && (
        <div style={{ background: 'var(--success)', color: 'white', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontWeight: 600 }}>
          {message}
        </div>
      )}

      {/* 2. Menu Navigation */}
      <div className={styles.tabs}>
        <button onClick={() => setActiveTab('analytics')} className={`${styles.tabBtn} ${activeTab === 'analytics' ? styles.tabBtnActive : ''}`}>
          <BarChart3 size={18} /> Analytics Summary
        </button>
        <button onClick={() => setActiveTab('products')} className={`${styles.tabBtn} ${activeTab === 'products' ? styles.tabBtnActive : ''}`}>
          <FolderTree size={18} /> Products Catalogue
        </button>
        <button onClick={() => setActiveTab('import')} className={`${styles.tabBtn} ${activeTab === 'import' ? styles.tabBtnActive : ''}`}>
          <Link2 size={18} /> Smart URL Import
        </button>
        <button onClick={() => setActiveTab('banners')} className={`${styles.tabBtn} ${activeTab === 'banners' ? styles.tabBtnActive : ''}`}>
          <UploadCloud size={18} /> Slider Banners
        </button>
        <button onClick={() => setActiveTab('logs')} className={`${styles.tabBtn} ${activeTab === 'logs' ? styles.tabBtnActive : ''}`}>
          <History size={18} /> Security Logs
        </button>
      </div>

      {/* 3. Panel Content Switch */}
      
      {/* 3A. Analytics summary */}
      {activeTab === 'analytics' && (
        <div>
          {/* KPI block */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}><Activity size={24} /></div>
              <div>
                <p className={styles.statVal}>{stats.totalClicks}</p>
                <p className={styles.statLabel}>Total Redirection Clicks</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}><FolderTree size={24} /></div>
              <div>
                <p className={styles.statVal}>{stats.totalProducts}</p>
                <p className={styles.statLabel}>Registered Products</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}><ShieldCheck size={24} /></div>
              <div>
                <p className={styles.statVal}>{stats.totalUsers}</p>
                <p className={styles.statLabel}>Total Registered Users</p>
              </div>
            </div>
          </div>

          {/* Price Synchronization Management Panel */}
          <div className={styles.syncWidget}>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              @keyframes pulseSync {
                0% { opacity: 0.6; }
                50% { opacity: 1; }
                100% { opacity: 0.6; }
              }
            `}</style>
            <div className={styles.syncWidgetHeader}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <History size={20} style={{ color: 'var(--primary)' }} />
                  Automated Price Synchronization
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                  Synchronizes catalog product deal prices by scraping their respective e-commerce merchant sites (excluding Amazon.in for policy compliance).
                </p>
              </div>
              <button 
                onClick={handleTriggerSync} 
                className={`btn ${syncStatus.status === 'running' ? 'btn-outline' : 'btn-primary'}`} 
                disabled={syncStatus.status === 'running' || syncLoading}
                style={{ padding: '10px 20px', minWidth: '180px' }}
              >
                {syncStatus.status === 'running' ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <span style={{ 
                      width: '14px', 
                      height: '14px', 
                      border: '2px solid var(--primary)', 
                      borderTopColor: 'transparent', 
                      borderRadius: '50%', 
                      display: 'inline-block', 
                      animation: 'spin 1s linear infinite' 
                    }} />
                    Syncing Prices...
                  </span>
                ) : 'Sync Prices Now'}
              </button>
            </div>

            {syncMessage && (
              <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: 600 }}>
                {syncMessage}
              </div>
            )}

            <div className={styles.syncGrid}>
              <div className={styles.syncItem}>
                <span className={styles.syncItemLabel}>Sync Status</span>
                <div className={styles.syncItemValue}>
                  <span style={{ 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    background: syncStatus.status === 'running' ? 'var(--accent)' : 'var(--success)', 
                    display: 'inline-block',
                    animation: syncStatus.status === 'running' ? 'pulseSync 1.5s infinite ease-in-out' : 'none'
                  }} />
                  <span style={{ fontWeight: 700, textTransform: 'capitalize', fontSize: '0.95rem' }}>
                    {syncStatus.status === 'running' ? 'Active Run Running' : 'System Idle (Standby)'}
                  </span>
                </div>
              </div>

              <div className={styles.syncItem}>
                <span className={styles.syncItemLabel}>Last Run Completed</span>
                <span className={styles.syncItemValue}>
                  {syncStatus.lastRunCompleted ? new Date(syncStatus.lastRunCompleted).toLocaleString() : 'Never Executed'}
                </span>
              </div>

              <div className={styles.syncItem}>
                <span className={styles.syncItemLabel}>Checked / Updated</span>
                <span className={styles.syncItemValue}>
                  {syncStatus.lastRunProductsChecked || 0} checked / <span style={{ color: 'var(--success)' }}>{syncStatus.lastRunUpdatedCount || 0} updated</span>
                </span>
              </div>

              {syncStatus.lastRunDurationSeconds && (
                <div className={styles.syncItem}>
                  <span className={styles.syncItemLabel}>Run Duration</span>
                  <span className={styles.syncItemValue}>{syncStatus.lastRunDurationSeconds} seconds</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            {/* Top Products */}
            <div className="card">
              <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Top Outbound Click Deals</h3>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Product Title</th>
                      <th>Brand</th>
                      <th>Outbound Clicks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topProducts.map((p, idx) => (
                      <tr key={idx}>
                        <td><strong>{p.title.substring(0, 45)}...</strong></td>
                        <td>{p.brand}</td>
                        <td><span className="badge badge-success">{p.clicks} clicks</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Click breakdown by category */}
            <div className="card">
              <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Clicks Grouped by Categories</h3>
              {Object.keys(stats.clicksByCategory).length > 0 ? (
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.entries(stats.clicksByCategory).map(([cat, val]) => (
                    <li key={cat} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                      <span style={{ fontWeight: 600 }}>{cat}</span>
                      <span className="badge badge-primary">{val} hits</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>No category clicks tracked yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3B. Product Catalogue CRUD & Bulk Upload */}
      {activeTab === 'products' && (
        <div className={styles.splitLayout}>
          {/* Table list left */}
          <div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Product Manager</h3>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price (₹)</th>
                    <th>Brand</th>
                    <th>Clicks</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.title.substring(0, 35)}...</strong>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.category}</p>
                      </td>
                      <td>{p.price}</td>
                      <td>{p.brand}</td>
                      <td>{p.clicks || 0}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleEditClick(p)} style={{ color: 'var(--primary)' }} aria-label="Edit product"><Edit size={16} /></button>
                          <button onClick={() => handleDeleteProduct(p.id)} style={{ color: 'var(--error)' }} aria-label="Delete product"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bulk Upload panel bottom */}
            <div className="card" style={{ marginTop: '24px' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Bulk upload JSON Loader</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px' }}>
                Paste a JSON array containing product details (title, price, category, affiliateUrl) to publish in bulk.
              </p>
              <form onSubmit={handleBulkUpload}>
                <textarea
                  className="form-input"
                  style={{ minHeight: '120px', fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical', marginBottom: '12px' }}
                  placeholder='[\n  { "title": "boAt Keyboard", "price": 999, "category": "Electronics", "affiliateUrl": "https://www.amazon.in/dp/..." }\n]'
                  value={bulkJson}
                  onChange={(e) => setBulkJson(e.target.value)}
                />
                <button type="submit" className="btn btn-outline" style={{ display: 'inline-flex', padding: '8px 16px' }}>
                  Load Bulk Array
                </button>
              </form>
              {bulkMessage && <p style={{ marginTop: '12px', fontWeight: 600, fontSize: '0.85rem' }}>{bulkMessage}</p>}
            </div>
          </div>

          {/* Form add/edit right */}
          <div className="card">
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>
              {editingProduct ? `Edit Product: ${editingProduct.title.substring(0, 25)}...` : 'Add New Product'}
            </h3>
            <form onSubmit={handleProductSubmit} className={styles.formGrid}>
              <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                <label>Product Title</label>
                <input type="text" className="form-input" value={productForm.title} onChange={(e) => setProductForm({...productForm, title: e.target.value})} required />
              </div>
              <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                <label>Merchant Affiliate Link</label>
                <input type="url" className="form-input" value={productForm.affiliateUrl} onChange={(e) => setProductForm({...productForm, affiliateUrl: e.target.value})} required />
              </div>
              <div className={styles.formGroup}>
                <label>Offer Price (₹)</label>
                <input type="number" className="form-input" value={productForm.price} onChange={(e) => setProductForm({...productForm, price: e.target.value})} required />
              </div>
              <div className={styles.formGroup}>
                <label>Original List Price (₹)</label>
                <input type="number" className="form-input" value={productForm.originalPrice} onChange={(e) => setProductForm({...productForm, originalPrice: e.target.value})} />
              </div>
              <div className={styles.formGroup}>
                <label>Brand</label>
                <input type="text" className="form-input" value={productForm.brand} onChange={(e) => setProductForm({...productForm, brand: e.target.value})} />
              </div>
              <div className={styles.formGroup}>
                <label>Category</label>
                <input type="text" className="form-input" value={productForm.category} onChange={(e) => setProductForm({...productForm, category: e.target.value})} required />
              </div>
              <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                <label>Primary Image URL</label>
                <input type="url" className="form-input" value={productForm.imageUrls} onChange={(e) => setProductForm({...productForm, imageUrls: e.target.value})} />
              </div>
              <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                <label>Detailed Description</label>
                <textarea className="form-input" style={{ minHeight: '80px', resize: 'vertical' }} value={productForm.description} onChange={(e) => setProductForm({...productForm, description: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '12px', gridColumn: 'span 2' }}>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px' }}>
                  {editingProduct ? 'Save Product' : 'Add Product'}
                </button>
                {editingProduct && (
                  <button type="button" className="btn btn-outline" onClick={() => {
                    setEditingProduct(null);
                    setProductForm({ title: '', description: '', price: '', originalPrice: '', brand: '', category: '', affiliateUrl: '', imageUrls: '' });
                  }}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3C. Smart URL Scraper Import */}
      {activeTab === 'import' && (
        <div>
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Smart Metadata Scraper</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Paste a product link from standard e-commerce networks (Flipkart, Ajio, Myntra, Tata Cliq). Our system will automatically parse metadata titles, prices, descriptions, and thumbnails.
            </p>

            <form onSubmit={handleScrape} style={{ display: 'flex', gap: '12px' }}>
              <input
                type="url"
                placeholder="Paste product deal URL..."
                className="form-input"
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0 28px' }} disabled={scrapeLoading}>
                {scrapeLoading ? 'Fetching...' : 'Fetch Metadata'}
              </button>
            </form>

            {scrapeError && (
              <p style={{ color: 'var(--error)', marginTop: '12px', fontWeight: 600 }}>{scrapeError}</p>
            )}
          </div>

          {/* Scrape Preview Panel */}
          {scrapedData && (
            <div className={styles.splitLayout}>
              {/* Review Panel */}
              <div className="card">
                <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={20} style={{ color: 'var(--success)' }} />
                  Import Editor Panel
                </h3>

                {/* Strict Amazon Compliance Warning Banner */}
                {scrapedData.isAmazon && (
                  <div className="card" style={{ borderColor: 'var(--warning)', background: 'rgba(245, 158, 11, 0.06)', marginBottom: '20px', display: 'flex', gap: '12px' }}>
                    <AlertTriangle size={24} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Amazon.in Scrape Blocked (Compliance Agreement)</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        Amazon Associates India policies forbid scraping product tables or pages. Please fill out details manually in the editor panel to publish safely.
                      </p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleProductSubmit} className={styles.formGrid}>
                  <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                    <label>Reviewed Product Title</label>
                    <input type="text" className="form-input" value={productForm.title} onChange={(e) => setProductForm({...productForm, title: e.target.value})} required />
                  </div>
                  <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                    <label>Merchant Redirection URL</label>
                    <input type="url" className="form-input" value={productForm.affiliateUrl} readOnly style={{ background: 'var(--surface-hover)', cursor: 'not-allowed' }} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Offer Price (₹)</label>
                    <input type="number" className="form-input" value={productForm.price} onChange={(e) => setProductForm({...productForm, price: e.target.value})} required />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Original Price (₹)</label>
                    <input type="number" className="form-input" value={productForm.originalPrice} onChange={(e) => setProductForm({...productForm, originalPrice: e.target.value})} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Brand</label>
                    <input type="text" className="form-input" value={productForm.brand} onChange={(e) => setProductForm({...productForm, brand: e.target.value})} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Category</label>
                    <input type="text" className="form-input" value={productForm.category} onChange={(e) => setProductForm({...productForm, category: e.target.value})} required />
                  </div>
                  <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                    <label>Parsed Image URL</label>
                    <input type="url" className="form-input" value={productForm.imageUrls} onChange={(e) => setProductForm({...productForm, imageUrls: e.target.value})} />
                  </div>
                  <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                    <label>Parsed Description</label>
                    <textarea className="form-input" style={{ minHeight: '80px', resize: 'vertical' }} value={productForm.description} onChange={(e) => setProductForm({...productForm, description: e.target.value})} />
                  </div>
                  <button type="submit" className="btn btn-accent" style={{ gridColumn: 'span 2', padding: '12px' }}>
                    Confirm & Publish Product
                  </button>
                </form>
              </div>

              {/* Instant Mock Preview card */}
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Discovery Preview Card</h3>
                {productForm.title ? (
                  <div className={styles.mockCard}>
                    <div className={styles.mockImgWrapper}>
                      <img 
                        src={productForm.imageUrls || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600'} 
                        alt="Scrape thumbnail" 
                        className={styles.mockImg}
                      />
                    </div>
                    <div className={styles.mockContent}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <span>{productForm.brand || 'Brand'}</span>
                        <span>{productForm.category || 'Category'}</span>
                      </div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.4, color: 'var(--text-primary)', margin: '4px 0' }}>{productForm.title}</h4>
                      <p style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>₹{productForm.price || '0'}</p>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)' }}>Fetch metadata to preview the product card.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3D. Slider banners manager */}
      {activeTab === 'banners' && (
        <div className={styles.splitLayout}>
          {/* List existing banners */}
          <div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Active Homepage Banners</h3>
            {banners.length > 0 ? (
              <div className={styles.bannerGrid}>
                {banners.map((ban, idx) => (
                  <div key={idx} className={styles.bannerCard}>
                    <div className={styles.bannerImageWrapper}>
                      <img src={ban.imageUrl} alt={ban.title} className={styles.bannerImage} />
                    </div>
                    <div className={styles.bannerDetails}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{ban.title || 'Untitled Banner'}</h4>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{ban.subtitle}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Link: {ban.link}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>No promotional banners defined. Using fallbacks.</p>
            )}
          </div>

          {/* Add banner form */}
          <div className="card">
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Add Banner Card</h3>
            <form onSubmit={handleBannerSubmit} className={styles.formGrid}>
              <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                <label>Heading Title</label>
                <input type="text" className="form-input" value={bannerForm.title} onChange={(e) => setBannerForm({...bannerForm, title: e.target.value})} />
              </div>
              <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                <label>Subtitle Text</label>
                <input type="text" className="form-input" value={bannerForm.subtitle} onChange={(e) => setBannerForm({...bannerForm, subtitle: e.target.value})} />
              </div>
              <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                <label>Banner Image URL</label>
                <input type="url" className="form-input" value={bannerForm.imageUrl} onChange={(e) => setBannerForm({...bannerForm, imageUrl: e.target.value})} required />
              </div>
              <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                <label>Action link (Path/URL)</label>
                <input type="text" className="form-input" value={bannerForm.link} onChange={(e) => setBannerForm({...bannerForm, link: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ gridColumn: 'span 2', padding: '10px' }}>
                Save Promotional Banner
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3E. Security Activity Logs */}
      {activeTab === 'logs' && (
        <div>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} />
            Security Audit Trail
          </h3>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor / Email</th>
                  <th>Action Code</th>
                  <th>Operational Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? (
                  logs.map((log, idx) => (
                    <tr key={idx}>
                      <td className={styles.logTimestamp}>{new Date(log.timestamp).toLocaleString()}</td>
                      <td>{log.email}</td>
                      <td>
                        <span 
                          className="badge" 
                          style={{ 
                            fontSize: '0.7rem', 
                            background: log.action.includes('DELETE') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(79, 70, 229, 0.15)',
                            color: log.action.includes('DELETE') ? 'var(--error)' : 'var(--primary)' 
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{log.details}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No audit activities logged in current session.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
