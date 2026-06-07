'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { GitCompare, X, Trash2, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import styles from './CompareDrawer.module.css';

export default function CompareDrawer() {
  const { compareList, removeFromCompare, clearCompare, backendUrl } = useApp();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (compareList.length === 0) {
      setProducts([]);
      return;
    }

    async function fetchCompareDetails() {
      try {
        const promises = compareList.map(id =>
          fetch(`${backendUrl}/api/products/${id}`).then(res => res.ok ? res.json() : null)
        );
        const results = await Promise.all(promises);
        setProducts(results.filter(p => p !== null));
      } catch (err) {
        console.error('Error fetching compare details:', err);
      }
    }

    fetchCompareDetails();
  }, [compareList, backendUrl]);

  if (compareList.length === 0) return null;

  return (
    <div className={`${styles.drawer} glass-premium`}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.titleInfo}>
            <GitCompare size={20} className={styles.icon} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Compare Products ({compareList.length}/3)</h3>
          </div>
          <button onClick={clearCompare} className={styles.clearBtn} aria-label="Clear all compared items">
            <Trash2 size={14} />
            <span>Clear All</span>
          </button>
        </div>

        <div className={styles.itemsList}>
          {products.map(product => {
            const displayImg = product.imageUrls && product.imageUrls.length > 0 
              ? product.imageUrls[0] 
              : 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600';
              
            return (
              <div key={product.id} className={styles.itemCard}>
                <img 
                  src={displayImg} 
                  alt={product.title} 
                  className={styles.itemImg}
                />
                <div className={styles.itemMeta}>
                  <h4 className={styles.itemTitle} title={product.title}>{product.title}</h4>
                  <span className={styles.itemPrice}>₹{product.price.toLocaleString('en-IN')}</span>
                </div>
                <button onClick={() => removeFromCompare(product.id)} className={styles.removeBtn} aria-label="Remove item">
                  <X size={14} />
                </button>
              </div>
            );
          })}
          
          {Array.from({ length: 3 - products.length }).map((_, idx) => (
            <div key={`empty-${idx}`} className={styles.emptySlot}>
              <span className={styles.emptySlotText}>Add item to compare</span>
            </div>
          ))}
        </div>

        <div className={styles.actions}>
          <Link href="/compare" className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '0.85rem' }}>
            <span>Compare Now</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
