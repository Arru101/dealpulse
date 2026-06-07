'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, ShoppingCart, Star, HelpCircle, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import styles from './compare.module.css';

export default function ComparePage() {
  const { compareList, removeFromCompare, clearCompare, backendUrl } = useApp();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (compareList.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    async function fetchDetails() {
      setLoading(true);
      try {
        const promises = compareList.map(id =>
          fetch(`${backendUrl}/api/products/${id}`).then(res => res.ok ? res.json() : null)
        );
        const results = await Promise.all(promises);
        setProducts(results.filter(p => p !== null));
      } catch (err) {
        console.error('Error fetching compared product details:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [compareList, backendUrl]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }} />
        <p>Gathering specifications and price metrics...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="container" style={{ padding: '80px 24px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <div className="card" style={{ padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={28} />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>No Products Selected</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Choose up to 3 products from our deals list to compare specifications, ratings, and price discounts side-by-side.
          </p>
          <button onClick={() => router.push('/products')} className="btn btn-primary">
            Browse Deal Catalog
          </button>
        </div>
      </div>
    );
  }

  // Calculate discount percentage
  const getDiscount = (original, current) => {
    if (!original || original <= current) return 0;
    return Math.round(((original - current) / original) * 100);
  };

  // Calculate Heuristic Score
  const getDealScore = (original, current, rating) => {
    const discountPct = original && original > current ? ((original - current) / original) * 100 : 0;
    const rate = parseFloat(rating || 5.0);
    let rawScore = (discountPct * 0.08) + (rate * 0.4);
    if (rawScore > 10) rawScore = 10;
    if (rawScore < 1) rawScore = 1;
    return parseFloat(rawScore.toFixed(1));
  };

  // Find lowest price to highlight
  const lowestPrice = Math.min(...products.map(p => p.price));

  // Gather all unique specification keys
  const specKeys = new Set();
  products.forEach(p => {
    if (p.specifications) {
      Object.keys(p.specifications).forEach(key => specKeys.add(key));
    }
  });
  const specKeysArray = Array.from(specKeys);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="container" style={{ paddingBottom: '80px' }}>
      
      {/* Back button */}
      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <button onClick={() => router.back()} className="btn btn-outline" style={{ display: 'inline-flex', padding: '8px 16px', gap: '6px' }}>
          <ArrowLeft size={16} /> Back
        </button>
        <button onClick={clearCompare} className="btn btn-outline" style={{ display: 'inline-flex', padding: '8px 16px', gap: '6px', color: 'var(--error)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
          <Trash2 size={16} /> Clear Comparison List
        </button>
      </div>

      <div style={{ marginTop: '32px', marginBottom: '24px' }}>
        <h1 className="gradient-text" style={{ fontSize: '2.4rem', fontWeight: 800 }}>Deal Comparison</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
          Side-by-side analysis of specifications, price drops, and buyer reviews.
        </p>
      </div>

      {/* Comparison Grid Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.stickyCol} style={{ width: '220px', minWidth: '220px' }}>Feature</th>
              {products.map(product => (
                <th key={product.id} className={styles.productHeader}>
                  <div className={styles.headerCard}>
                    <button onClick={() => removeFromCompare(product.id)} className={styles.removeBtn} aria-label="Remove item">
                      <X size={14} />
                    </button>
                    <img 
                      src={product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600'} 
                      alt={product.title} 
                      className={styles.prodImg}
                    />
                    <Link href={`/products/${product.id}`} className={styles.titleLink}>
                      <h3 className={styles.prodTitle}>{product.title}</h3>
                    </Link>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            
            {/* 1. Price comparison */}
            <tr>
              <td className={styles.stickyCol}><strong>Deal Price</strong></td>
              {products.map(product => {
                const isLowest = product.price === lowestPrice && products.length > 1;
                return (
                  <td key={product.id}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span className={`${styles.price} ${isLowest ? styles.lowestPrice : ''}`}>
                        {formatCurrency(product.price)}
                      </span>
                      {isLowest && <span className={styles.lowestBadge}>Lowest Price</span>}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* 2. Original price and discount */}
            <tr>
              <td className={styles.stickyCol}>Original Price & Discount</td>
              {products.map(product => {
                const discount = getDiscount(product.originalPrice, product.price);
                return (
                  <td key={product.id}>
                    {discount > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {formatCurrency(product.originalPrice)}
                        </span>
                        <span style={{ color: 'var(--error)', fontWeight: 700, fontSize: '0.85rem' }}>
                          Save {discount}%
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Standard Pricing</span>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* 3. Ratings */}
            <tr>
              <td className={styles.stickyCol}>User Reviews</td>
              {products.map(product => (
                <td key={product.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--accent-light)', color: 'var(--accent-hover)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
                      <Star size={12} fill="currentColor" stroke="currentColor" />
                      <span>{product.rating ? parseFloat(product.rating).toFixed(1) : '5.0'}</span>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({product.reviewCount || 1} hits)</span>
                  </div>
                </td>
              ))}
            </tr>

            {/* 4. DealsPulse score */}
            <tr>
              <td className={styles.stickyCol}>DealsPulse Score</td>
              {products.map(product => {
                const score = getDealScore(product.originalPrice, product.price, product.rating);
                let scoreClass = styles.scoreGood;
                if (score >= 8.5) scoreClass = styles.scoreExcellent;
                else if (score < 6.5) scoreClass = styles.scoreStandard;
                
                return (
                  <td key={product.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={`${styles.scoreVal} ${scoreClass}`}>
                        {score}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>/ 10</span>
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* 5. Direct redirects */}
            <tr>
              <td className={styles.stickyCol}>Action</td>
              {products.map(product => (
                <td key={product.id}>
                  <a 
                    href={`${backendUrl}/api/redirect/${product.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-accent"
                    style={{ width: '100%', padding: '10px', fontSize: '0.8rem', justifySelf: 'center' }}
                  >
                    <span>Go to Deal</span>
                    <ShoppingCart size={14} />
                  </a>
                </td>
              ))}
            </tr>

            {/* 6. Product Brands & Categories */}
            <tr>
              <td className={styles.stickyCol}>Brand</td>
              {products.map(product => (
                <td key={product.id}><strong>{product.brand || 'Generic'}</strong></td>
              ))}
            </tr>
            <tr>
              <td className={styles.stickyCol}>Category</td>
              {products.map(product => (
                <td key={product.id}>{product.category}</td>
              ))}
            </tr>

            {/* 7. Detailed Specs Comparison */}
            {specKeysArray.length > 0 && (
              <tr>
                <td colSpan={products.length + 1} className={styles.specDivider}>
                  Technical Specifications Comparison
                </td>
              </tr>
            )}

            {specKeysArray.map(key => (
              <tr key={key}>
                <td className={styles.stickyCol}>{key}</td>
                {products.map(product => {
                  const val = product.specifications && product.specifications[key];
                  return (
                    <td key={product.id} className={styles.specCell}>
                      {val || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
            
          </tbody>
        </table>
      </div>

    </div>
  );
}

// Inline Close helper to avoid importing X from react-icons/bs since we use lucide
function X({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
