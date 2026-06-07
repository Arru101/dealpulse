'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, Star, ArrowUpRight, GitCompare } from 'lucide-react';
import { useApp } from '../context/AppContext';
import styles from './ProductCard.module.css';

export default function ProductCard({ product }) {
  const { wishlist, toggleWishlist, compareList, addToCompare, removeFromCompare, backendUrl } = useApp();

  const isSaved = wishlist.includes(product.id);
  const isCompared = compareList.includes(product.id);
  
  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Safe image fallback
  const displayImage = product.imageUrls && product.imageUrls.length > 0 
    ? product.imageUrls[0] 
    : 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600';

  return (
    <div className={styles.card}>
      {/* Discount badge */}
      {discount > 0 && (
        <span className={styles.discountBadge}>{discount}% OFF</span>
      )}

      {/* Wishlist toggle */}
      <button 
        onClick={(e) => { e.preventDefault(); toggleWishlist(product.id); }} 
        className={`${styles.wishlistBtn} ${isSaved ? styles.wishlistActive : ''}`}
        aria-label={isSaved ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart size={16} fill={isSaved ? "currentColor" : "none"} />
      </button>

      {/* Compare toggle */}
      <button 
        onClick={(e) => { 
          e.preventDefault(); 
          if (isCompared) {
            removeFromCompare(product.id);
          } else {
            addToCompare(product.id);
          }
        }} 
        className={`${styles.compareBtn} ${isCompared ? styles.compareActive : ''}`}
        aria-label={isCompared ? "Remove from comparison" : "Add to comparison"}
        title={isCompared ? "Remove from comparison" : "Add to comparison"}
      >
        <GitCompare size={16} />
      </button>

      {/* Product Image */}
      <Link href={`/products/${product.id}`} className={styles.imageWrapper}>
        <img 
          src={displayImage} 
          alt={product.title} 
          className={styles.image}
          loading="lazy"
        />
      </Link>

      <div className={styles.content}>
        {/* Meta Row: Brand and Category */}
        <div className={styles.meta}>
          <span>{product.brand || 'Generic'}</span>
          <span>{product.category || 'Deals'}</span>
        </div>

        {/* Product Title */}
        <Link href={`/products/${product.id}`}>
          <h3 className={styles.title} title={product.title}>
            {product.title}
          </h3>
        </Link>

        {/* Ratings details */}
        <div className={styles.ratingRow}>
          <div className={styles.rating}>
            <Star size={14} fill="var(--accent)" stroke="var(--accent)" />
            <span>{product.rating ? parseFloat(product.rating).toFixed(1) : '5.0'}</span>
          </div>
          <span className={styles.reviews}>({product.reviewCount || 1} reviews)</span>
        </div>

        {/* Price list */}
        <div className={styles.priceRow}>
          <span className={styles.price}>{formatCurrency(product.price)}</span>
          {discount > 0 && (
            <span className={styles.originalPrice}>{formatCurrency(product.originalPrice)}</span>
          )}
        </div>

        {/* Redirect action button */}
        <div className={styles.btnGroup}>
          <a 
            href={`${backendUrl}/api/redirect/${product.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-accent"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <span>View Deal</span>
            <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
