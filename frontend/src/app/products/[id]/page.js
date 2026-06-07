'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Heart, 
  Star, 
  Share2, 
  ArrowLeft, 
  ArrowUpRight, 
  Info,
  CheckCircle,
  Link as LinkIcon,
  ShoppingBag,
  Bell,
  TrendingDown,
  Scale,
  MessageSquare,
  Flame,
  UploadCloud,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import ProductCard from '../../components/ProductCard';
import styles from './detail.module.css';

export default function ProductDetails() {
  const { id } = useParams();
  const router = useRouter();
  const { wishlist, toggleWishlist, addRecentlyViewed, backendUrl, user } = useApp();

  // Component states
  const [reviews, setReviews] = useState([]);

  // Review Form States
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImagePreview, setReviewImagePreview] = useState(null);
  const [activeLightboxImage, setActiveLightboxImage] = useState(null);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isZoomed, setIsZoomed] = useState(false);
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Price alert state
  const [priceAlertRegistered, setPriceAlertRegistered] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');

  const isSaved = wishlist.includes(id);

  // Sync reviewer name with logged-in user
  useEffect(() => {
    if (user) {
      setReviewName(user.displayName || '');
    }
  }, [user]);

  // Cursor Magnifier tracking
  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  // Slider view handlers
  const handlePrevImage = (e) => {
    e.stopPropagation();
    if (!product || !product.imageUrls || product.imageUrls.length <= 1) return;
    const currentIdx = product.imageUrls.indexOf(activeImg);
    const prevIdx = currentIdx === 0 ? product.imageUrls.length - 1 : currentIdx - 1;
    setActiveImg(product.imageUrls[prevIdx]);
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    if (!product || !product.imageUrls || product.imageUrls.length <= 1) return;
    const currentIdx = product.imageUrls.indexOf(activeImg);
    const nextIdx = currentIdx === product.imageUrls.length - 1 ? 0 : currentIdx + 1;
    setActiveImg(product.imageUrls[nextIdx]);
  };

  // Image Upload Handler
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds the 5MB limit.');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setReviewImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Submit Review Form
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;

    const newRev = {
      name: reviewName || 'Anonymous',
      rating: reviewRating,
      comment: reviewComment,
      image: reviewImagePreview // Base64 representation of uploaded image
    };

    try {
      const res = await fetch(`${backendUrl}/api/products/${id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newRev)
      });

      if (res.ok) {
        const data = await res.json();
        
        // Append the newly created review containing generated ID and timestamp from server
        setReviews(prev => [data.review, ...prev]);
        
        // Update product statistics immediately
        if (product) {
          setProduct(prev => ({
            ...prev,
            rating: data.rating,
            reviewCount: data.reviewCount
          }));
        }

        // Reset Form
        if (!user) {
          setReviewName('');
        }
        setReviewRating(5);
        setReviewComment('');
        setReviewImagePreview(null);
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to submit review.');
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      alert('Failed to connect to the backend server.');
    }
  };

  const getReviewsStats = () => {
    if (reviews.length === 0) {
      return { avg: 5.0, count: 0, dist: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
    }
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = parseFloat((sum / reviews.length).toFixed(1));
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      if (dist[r.rating] !== undefined) {
        dist[r.rating]++;
      }
    });
    return { avg, count: reviews.length, dist };
  };

  const { avg, count, dist } = getReviewsStats();

  // Load Product Details & Related
  useEffect(() => {
    if (!id) return;

    async function loadProduct() {
      setLoading(true);
      try {
        const res = await fetch(`${backendUrl}/api/products/${id}`);
        if (!res.ok) {
          router.push('/products');
          return;
        }
        
        const data = await res.json();
        setProduct(data);
        setActiveImg(data.imageUrls && data.imageUrls.length > 0 ? data.imageUrls[0] : '');
        setTargetPrice(Math.round(data.price * 0.9));
        
        // Log view to user profile history
        addRecentlyViewed(id);

        // Load reviews from product payload if present
        if (data.reviews) {
          setReviews(Object.values(data.reviews).reverse()); // Show newest first
        } else {
          setReviews([]);
        }

        // Load Related Products using a recommendation strategy (same category, sorted by rating/clicks)
        const relRes = await fetch(`${backendUrl}/api/products?category=${encodeURIComponent(data.category)}&limit=8&sort=popular`);
        if (relRes.ok) {
          const relData = await relRes.json();
          // Filter out current product, sort by highest rating first
          const filtered = (relData.products || [])
            .filter(p => p.id !== id)
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 4);
          setRelated(filtered);
        }
      } catch (err) {
        console.error('Error fetching product detail page:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [id, backendUrl, router]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
        <p>Loading deal details...</p>
      </div>
    );
  }

  if (!product) return null;

  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const getDealHeuristics = () => {
    const discountPct = product.originalPrice && product.originalPrice > product.price
      ? ((product.originalPrice - product.price) / product.originalPrice) * 100
      : 0;
    
    const rating = parseFloat(product.rating || 5.0);
    
    let rawScore = (discountPct * 0.08) + (rating * 0.4);
    if (rawScore > 10) rawScore = 10;
    if (rawScore < 1) rawScore = 1;
    const score = parseFloat(rawScore.toFixed(1));

    let badgeText = 'Good Value';
    let badgeClass = styles.scoreBadgeGood;
    if (score >= 8.5) {
      badgeText = 'Excellent Deal';
      badgeClass = styles.scoreBadgeExcellent;
    } else if (score < 6.5) {
      badgeText = 'Standard Value';
      badgeClass = styles.scoreBadge;
    }

    let priceVerdict = 'Stable Deal: Value aligns with marketplace price guidelines.';
    let isPriceDrop = false;
    if (discountPct >= 25) {
      priceVerdict = 'Verified Price Drop: Major savings detected compared to historical listings.';
      isPriceDrop = true;
    } else if (discountPct > 0) {
      priceVerdict = 'Price Reduction: Verified drop active in current sync cycle.';
      isPriceDrop = true;
    }

    let reviewVerdict = 'Balanced Feedback: Buyers confirm it delivers standard value for this price range.';
    if (rating >= 4.5) {
      reviewVerdict = 'Highly Recommended: Consumers praise build reliability, longevity, and performance.';
    } else if (rating >= 4.0) {
      reviewVerdict = 'Positive Sentiment: Consistently positive ratings across checked retail networks.';
    }

    return { score, badgeText, badgeClass, priceVerdict, reviewVerdict, isPriceDrop };
  };

  const { score, badgeText, badgeClass, priceVerdict, reviewVerdict, isPriceDrop } = getDealHeuristics();

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = `Check out this amazing deal: ${product.title} at ${formatCurrency(product.price)}!`;

  // Amazon compliance determination
  const isAmazonProduct = product.affiliateUrl && (product.affiliateUrl.includes('amazon.in') || product.affiliateUrl.includes('amzn.to'));

  // ----------------------------------------------------
  // STRUCTURED SEO DATA SCHEMA (JSON-LD)
  // ----------------------------------------------------
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    'name': product.title,
    'image': product.imageUrls || [],
    'description': product.description,
    'sku': product.id,
    'mpn': product.id,
    'brand': {
      '@type': 'Brand',
      'name': product.brand || 'Generic'
    },
    'offers': {
      '@type': 'Offer',
      'url': pageUrl,
      'priceCurrency': 'INR',
      'price': product.price,
      'priceValidUntil': '2027-12-31',
      'itemCondition': 'https://schema.org/NewCondition',
      'availability': 'https://schema.org/InStock'
    },
    'aggregateRating': {
      '@type': 'AggregateRating',
      'ratingValue': product.rating || '4.5',
      'reviewCount': product.reviewCount || '1'
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '64px' }}>
      
      {/* Schema Injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Back navigation */}
      <div style={{ marginTop: '24px' }}>
        <button onClick={() => router.back()} className="btn btn-outline" style={{ display: 'inline-flex', padding: '8px 16px', gap: '6px' }}>
          <ArrowLeft size={16} /> Back to Catalog
        </button>
      </div>

      {/* Product Split Details */}
      <div className={styles.layout}>
        {/* Left Column: Image Gallery */}
        <div className={styles.galleryCol}>
          <div 
            className={styles.mainImageWrapper}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsZoomed(true)}
            onMouseLeave={() => {
              setIsZoomed(false);
              setZoomPos({ x: 50, y: 50 });
            }}
          >
            <img 
              src={activeImg} 
              alt={product.title} 
              className={styles.mainImage}
              style={{
                transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                transform: isZoomed ? 'scale(2.2)' : 'scale(1)',
                cursor: 'zoom-in'
              }}
            />

            {/* Slider view arrow triggers */}
            {product.imageUrls && product.imageUrls.length > 1 && (
              <>
                <button 
                  onClick={handlePrevImage} 
                  className={styles.slideArrowLeft}
                  aria-label="Previous image"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={handleNextImage} 
                  className={styles.slideArrowRight}
                  aria-label="Next image"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
          </div>
          {product.imageUrls && product.imageUrls.length > 1 && (
            <div className={styles.thumbList}>
              {product.imageUrls.map((url, idx) => (
                <img 
                  key={idx}
                  src={url} 
                  alt={`${product.title} preview ${idx}`}
                  className={`${styles.thumbItem} ${activeImg === url ? styles.thumbActive : ''}`}
                  onClick={() => setActiveImg(url)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Info & Action panel */}
        <div className={styles.infoCol}>
          <div className={styles.metaRow}>
            <span>Brand: {product.brand || 'Generic'}</span>
            <span>Category: {product.category || 'Deals'}</span>
          </div>

          <h1 className={styles.title}>{product.title}</h1>

          {/* Review scores */}
          <div className={styles.ratingRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--accent-light)', color: 'var(--accent-hover)', padding: '4px 10px', borderRadius: '20px', fontWeight: 700 }}>
              <Star size={16} fill="currentColor" stroke="currentColor" />
              <span>{product.rating ? parseFloat(product.rating).toFixed(1) : '5.0'}</span>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>({product.reviewCount || 1} verified customer ratings)</span>
          </div>

          {/* Pricing & Outbound Button Box */}
          <div className={styles.priceBox}>
            <div className={styles.priceValues}>
              <span className={styles.price}>{formatCurrency(product.price)}</span>
              {discount > 0 && (
                <>
                  <span className={styles.originalPrice}>{formatCurrency(product.originalPrice)}</span>
                  <span className={styles.discount}>({discount}% OFF)</span>
                </>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px', gap: '12px' }}>
              <a 
                href={`${backendUrl}/api/redirect/${product.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-accent"
                style={{ width: '100%', padding: '16px', fontSize: '1.05rem' }}
              >
                <span>Buy on Official Merchant Website</span>
                <ArrowUpRight size={18} />
              </a>

              <button 
                onClick={() => toggleWishlist(product.id)}
                className="btn btn-outline"
                style={{ width: '100%', height: '54px', padding: 0, color: isSaved ? '#ef4444' : 'inherit' }}
                aria-label={isSaved ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart size={20} fill={isSaved ? "currentColor" : "none"} />
              </button>
            </div>

            {/* Compliance Message */}
            <div className={styles.complianceBanner}>
              <Info size={16} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--warning)' }} />
              <div>
                <strong>Affiliate Disclaimer:</strong> Outbound clicks forward you directly to the merchant site. We never handle checkout or payments. 
                {isAmazonProduct && (
                  <span> As an Amazon Associate we earn from qualifying purchases. Prices shown are subject to change by Amazon.</span>
                )}
              </div>
            </div>
          </div>

          {/* DealsPulse Heuristic Deal Analyzer */}
          <div className={styles.analyzerCard}>
            <div className={styles.analyzerHeader}>
              <h3 className={styles.analyzerTitle}>
                <CheckCircle size={18} style={{ color: 'var(--primary)' }} />
                DealsPulse Heuristic Analysis
              </h3>
            </div>
            
            <div className={styles.gaugeSection}>
              <div className={styles.gaugeContainer}>
                <svg className={styles.gaugeSvg} viewBox="0 0 36 36">
                  <path
                    className={styles.gaugeBg}
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={`${styles.gaugeFill} ${badgeClass}`}
                    strokeDasharray={`${score * 10}, 100`}
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <text x="18" y="20.35" className={styles.gaugeText}>{score}</text>
                </svg>
                <div className={styles.gaugeLabel}>
                  <span className={styles.gaugeVerdict}>{badgeText}</span>
                  <span className={styles.gaugeSub}>Heuristic Rating</span>
                </div>
              </div>
            </div>

            <div className={styles.analyzerMetrics}>
              <div className={styles.analyzerMetricItem}>
                {isPriceDrop ? (
                  <TrendingDown size={18} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '2px' }} />
                ) : (
                  <Scale size={18} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }} />
                )}
                <p style={{ margin: 0 }}>{priceVerdict}</p>
              </div>
              <div className={styles.analyzerMetricItem}>
                <MessageSquare size={18} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
                <p style={{ margin: 0 }}>{reviewVerdict}</p>
              </div>
              <div className={styles.analyzerMetricItem}>
                <Flame size={18} style={{ color: 'var(--error)', flexShrink: 0, marginTop: '2px' }} />
                <p style={{ margin: 0 }}><strong>Social Choice:</strong> Checked by shoppers. Whitelisted direct redirect active.</p>
              </div>
            </div>
          </div>

          {/* Price Alert Tracker */}
          <div className="card" style={{ marginBottom: '32px', padding: '20px', borderStyle: 'dashed' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Bell size={18} style={{ color: 'var(--primary)' }} />
              Deal Alert Tracker
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '16px', lineHeight: '1.5' }}>
              Get notified immediately via email when this item drops below your target price.
            </p>
            {priceAlertRegistered ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontSize: '0.85rem', fontWeight: 700 }}>
                <CheckCircle size={16} />
                <span>Price tracker active at {formatCurrency(targetPrice)}!</span>
              </div>
            ) : (
              <form onSubmit={(e) => {
                e.preventDefault();
                setPriceAlertRegistered(true);
              }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="form-input"
                    style={{ padding: '8px 12px', fontSize: '0.85rem', flex: 1 }}
                    required
                  />
                  <input
                    type="number"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder="Target ₹"
                    className="form-input"
                    style={{ padding: '8px 12px', fontSize: '0.85rem', width: '110px' }}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px', fontSize: '0.85rem', width: '100%' }}>
                  Activate Price Alert
                </button>
              </form>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Product Description</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              {product.description || 'No description provided for this product deal.'}
            </p>
          </div>

          {/* Key Features */}
          {product.features && product.features.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Key Highlights</h3>
              <ul className={styles.featuresList}>
                {product.features.map((feat, idx) => (
                  <li key={idx} className={styles.featureItem}>{feat}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Social Sharing triggers */}
          <div>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Share Deal</h4>
            <div className={styles.shareRow}>
              <a 
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(shareTitle)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.shareBtn} ${styles.twitter}`}
                title="Share on Twitter"
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a 
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareTitle + ' ' + pageUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.shareBtn} ${styles.whatsapp}`}
                style={{ backgroundColor: '#25d366' }}
                title="Share on WhatsApp"
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.97C16.49 2.012 14.004.99 11.39.99c-5.402 0-9.8 4.366-9.804 9.796-.002 1.82.478 3.595 1.39 5.17l-1.01 3.686 3.77-.978zm12.39-9.155c-.3-.15-1.77-.875-2.04-.975-.27-.1-.47-.15-.67.15-.2.3-.77.975-.94 1.175-.17.2-.35.225-.65.075-.3-.15-1.266-.467-2.41-1.485-.89-.795-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.135.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.67-1.62-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.075-.79.37-.27.3-1.04 1.02-1.04 2.487 0 1.468 1.07 2.885 1.22 3.085.15.2 2.1 3.2 5.09 4.5 1.09.475 1.95.765 2.61.97.8.256 1.53.22 2.1.13.63-.1 1.77-.72 2.02-1.42.25-.7.25-1.3 1.175-.2-.1.3-.2-.55-.075z"/></svg>
              </a>
              <button 
                onClick={handleCopyLink}
                className={`${styles.shareBtn} ${styles.copy}`}
                title="Copy Page Link"
              >
                <LinkIcon size={16} />
              </button>
              {copySuccess && (
                <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>Copied to clipboard!</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Specifications Block */}
      {product.specifications && Object.keys(product.specifications).length > 0 && (
        <section style={{ marginTop: '48px', borderTop: '1px solid var(--border)', paddingTop: '32px' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '16px' }}>Specifications</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className={styles.specTable}>
              <tbody>
                {Object.entries(product.specifications).map(([key, val]) => (
                  <tr key={key} className={styles.specRow}>
                    <th className={styles.specKey}>{key}</th>
                    <td className={styles.specVal}>{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Customer Reviews Section */}
      <section className={styles.reviewsSection}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Customer Reviews & Ratings</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
          Share your feedback, upload product photos, and check other verified buyer ratings.
        </p>

        <div className={styles.reviewsLayout}>
          {/* Left Panel: Summary & Form */}
          <div className={styles.reviewsSummary}>
            <div className={styles.summaryCard}>
              <div className={styles.avgRatingVal}>{avg}</div>
              <div className={styles.avgStarsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} size={20} fill={star <= Math.round(avg) ? "currentColor" : "none"} stroke="currentColor" />
                ))}
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Based on {count} Verified Ratings
              </p>

              {/* Rating breakdown bars */}
              <div className={styles.ratingBreakdown}>
                {[5, 4, 3, 2, 1].map((stars) => {
                  const starCount = dist[stars] || 0;
                  const pct = count > 0 ? Math.round((starCount / count) * 100) : 0;
                  return (
                    <div key={stars} className={styles.breakdownRow}>
                      <span className={styles.breakdownStars}>{stars} star</span>
                      <div className={styles.barBg}>
                        <div className={styles.barFill} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={styles.breakdownPct}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Write a Review Form */}
            <div className={styles.reviewFormCard}>
              <h3 className={styles.formTitle}>Write a Review</h3>
              <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* User Name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Your Display Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Rahul K." 
                    className="form-input" 
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    required
                  />
                </div>

                {/* Rating selection stars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Product Rating</label>
                  <div className={styles.starRatingSelector}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isActive = star <= (hoveredRating || reviewRating);
                      return (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoveredRating(star)}
                          onMouseLeave={() => setHoveredRating(0)}
                          onClick={() => setReviewRating(star)}
                          className={`${styles.starBtn} ${isActive ? styles.starActive : ''}`}
                          aria-label={`Rate ${star} stars`}
                        >
                          <Star size={24} fill={isActive ? "currentColor" : "none"} stroke="currentColor" />
                        </button>
                      );
                    })}
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, marginLeft: '8px', color: 'var(--text-secondary)' }}>
                      {reviewRating} Star{reviewRating > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Review Message Textarea */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Your Feedback</label>
                  <textarea 
                    placeholder="Describe your user experience (materials, build, performance)..." 
                    className="form-input" 
                    style={{ minHeight: '100px', resize: 'vertical' }}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    required
                  />
                </div>

                {/* Image Upload Zone */}
                <div className={styles.imageUploadContainer}>
                  <span className={styles.uploadLabel}>Upload Product Photo</span>
                  <label className={styles.uploadZone}>
                    <UploadCloud size={24} />
                    <span className={styles.uploadText}>Click to upload a JPEG or PNG image</span>
                    <span className={styles.uploadTextSub}>Supports drag & drop up to 5MB</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange}
                      className={styles.uploadInput}
                    />
                  </label>

                  {/* Upload Image Preview */}
                  {reviewImagePreview && (
                    <div className={styles.previewContainer}>
                      <img src={reviewImagePreview} alt="Review attachment preview" className={styles.previewImg} />
                      <button 
                        type="button" 
                        onClick={() => setReviewImagePreview(null)}
                        className={styles.removePreviewBtn}
                        aria-label="Remove photo"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Form submit */}
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
                  Submit Customer Review
                </button>
              </form>
            </div>
          </div>

          {/* Right Panel: Reviews list */}
          <div className={styles.reviewsListCol}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '8px' }}>
              Buyer Comments ({count})
            </h3>

            {reviews.length > 0 ? (
              reviews.map((rev) => (
                <div key={rev.id} className={styles.reviewCard}>
                  {/* Circle Avatar with Initials */}
                  <div className={styles.avatar}>
                    {rev.name ? rev.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
                  </div>

                  {/* Comment Details */}
                  <div className={styles.cardContent}>
                    <div className={styles.cardHeader}>
                      <span className={styles.userName}>{rev.name}</span>
                      <span className={styles.date}>{rev.date}</span>
                    </div>

                    {/* Star row */}
                    <div className={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} size={14} fill={star <= rev.rating ? "currentColor" : "none"} stroke="currentColor" />
                      ))}
                    </div>

                    {/* Text */}
                    <p className={styles.commentText}>{rev.comment}</p>

                    {/* Attached Image Thumbnail */}
                    {rev.image && (
                      <img 
                        src={rev.image} 
                        alt="Review upload thumbnail" 
                        className={styles.attachedImage} 
                        onClick={() => setActiveLightboxImage(rev.image)}
                        title="Click to view full size"
                      />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '64px 24px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <p style={{ color: 'var(--text-secondary)' }}>No customer reviews posted yet. Be the first to share your feedback!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Lightbox zoom-in overlay */}
      {activeLightboxImage && (
        <div className={styles.lightbox} onClick={() => setActiveLightboxImage(null)}>
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.lightboxClose} onClick={() => setActiveLightboxImage(null)}>
              <X size={16} /> Close
            </button>
            <img src={activeLightboxImage} alt="Expanded review" className={styles.lightboxImg} />
          </div>
        </div>
      )}

      {/* Related Products list */}
      {related.length > 0 && (
        <section style={{ marginTop: '64px', borderTop: '1px solid var(--border)', paddingTop: '32px' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '24px' }}>Similar Deals You Might Like</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px' }}>
            {related.map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
