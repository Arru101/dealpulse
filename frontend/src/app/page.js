'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Sparkles, 
  ArrowRight,
  Flame,
  Zap,
  Star
} from 'lucide-react';
import { useApp } from './context/AppContext';
import ProductCard from './components/ProductCard';
import styles from './page.module.css';

export default function Home() {
  const { backendUrl } = useApp();
  const router = useRouter();

  // State lists
  const [trending, setTrending] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [topPicks, setTopPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search autocomplete states
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeProductTab, setActiveProductTab] = useState('trending');

  // Load Homepage Data
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch trending
        const trendRes = await fetch(`${backendUrl}/api/products/trending`);
        if (trendRes.ok) {
          const trendData = await trendRes.json();
          setTrending(trendData.slice(0, 8));
        }

        // Fetch featured / all latest
        const allRes = await fetch(`${backendUrl}/api/products?limit=8&sort=latest`);
        if (allRes.ok) {
          const allData = await allRes.json();
          setFeatured(allData.products || []);
        }

        // Fetch top rated picks (rating >= 4.5)
        const topRes = await fetch(`${backendUrl}/api/products?ratingMin=4.5&limit=8&sort=popular`);
        if (topRes.ok) {
          const topData = await topRes.json();
          setTopPicks(topData.products || []);
        }
      } catch (err) {
        console.warn('Backend not online yet or fetch failed, using seed fallbacks:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [backendUrl]);

  // Autocomplete fetch on query edit
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch(`${backendUrl}/api/products/suggestions?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
        }
      } catch (err) {
        // fail silently
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, backendUrl]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/products?search=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div className="container" style={{ paddingBottom: '64px' }}>
      
      {/* 1. Hero Section */}
      <section className={styles.hero}>
        <span className="badge badge-primary" style={{ display: 'inline-flex', padding: '6px 14px', zIndex: 2, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem', fontWeight: 700, gap: '6px', alignItems: 'center' }}>
          <Sparkles size={12} /> Verified Smart Deals Hub
        </span>
        <h1 className={styles.heroTitle}>
          Discover Handpicked <span className="gradient-text">Premium Deals</span> & Products
        </h1>
        <p className={styles.heroSubtitle}>
          We search multiple stores so you don&rsquo;t have to. Real-time price updates, verified reviews, and curated high-quality products.
        </p>

        {/* Hero Search Box */}
        <div className={styles.searchWrapper}>
          <form onSubmit={handleSearchSubmit} className={styles.searchBox}>
            <Search className={styles.searchIcon} size={20} />
            <input
              type="text"
              placeholder="Search products, brands, or categories (e.g. boAt, Electronics)..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            <button type="submit" className={styles.searchBtn} aria-label="Search">
              <Search size={18} />
              <span className={styles.searchBtnText}>Search</span>
            </button>
          </form>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className={`${styles.suggestions} glass`}>
              {suggestions.map((item, idx) => (
                <div 
                  key={idx} 
                  className={styles.suggestionItem}
                  onClick={() => {
                    setSearchQuery(item);
                    router.push(`/products?search=${encodeURIComponent(item)}`);
                  }}
                >
                  <Search size={14} style={{ color: 'var(--text-muted)' }} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 2. Product Showcase Grid (Tabbed Showcase) */}
      <section style={{ marginBottom: '64px', marginTop: '48px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px', gap: '12px' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center', letterSpacing: '-0.02em' }}>
            Discover Handpicked Deals
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
            Compare specifications, consumer ratings, and active discount percentages across Indian stores.
          </p>
          
          {/* Modern Tab Bar */}
          <div className={styles.tabBar}>
            <button 
              onClick={() => setActiveProductTab('trending')}
              className={`${styles.tabBtn} ${activeProductTab === 'trending' ? styles.tabBtnActive : ''}`}
            >
              <Flame size={16} />
              <span>Trending</span>
            </button>
            <button 
              onClick={() => setActiveProductTab('latest')}
              className={`${styles.tabBtn} ${activeProductTab === 'latest' ? styles.tabBtnActive : ''}`}
            >
              <Zap size={16} />
              <span>Latest Deals</span>
            </button>
            <button 
              onClick={() => setActiveProductTab('topPicks')}
              className={`${styles.tabBtn} ${activeProductTab === 'topPicks' ? styles.tabBtnActive : ''}`}
            >
              <Star size={16} />
              <span>Top-Rated</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className={styles.prodGrid}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="skeleton" style={{ height: '380px' }} />
            ))}
          </div>
        ) : (
          <div key={activeProductTab} className={`${styles.prodGrid} ${styles.tabContent}`}>
            {activeProductTab === 'trending' && (
              trending.length > 0 ? (
                trending.map((prod) => <ProductCard key={prod.id} product={prod} />)
              ) : (
                <p style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 0' }}>
                  Curating popular trending collections...
                </p>
              )
            )}
            
            {activeProductTab === 'latest' && (
              featured.length > 0 ? (
                featured.map((prod) => <ProductCard key={prod.id} product={prod} />)
              ) : (
                <p style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 0' }}>
                  Fetching latest handpicked deals...
                </p>
              )
            )}
            
            {activeProductTab === 'topPicks' && (
              topPicks.length > 0 ? (
                topPicks.map((prod) => <ProductCard key={prod.id} product={prod} />)
              ) : (
                <p style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 0' }}>
                  Loading top-rated recommendations...
                </p>
              )
            )}
          </div>
        )}

        {/* View All CTA Button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px' }}>
          <Link href="/products" className="btn btn-primary" style={{ padding: '12px 32px' }}>
            Explore Full Catalog <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* 3. Top Categories Section */}
      <section style={{ marginBottom: '64px' }}>
        <h2 className={styles.sectionHeading}>Browse Top Categories</h2>
        <p className={styles.sectionSub}>Find handpicked recommendations across popular categories</p>
        
        <div className={styles.catBentoGrid}>
          {/* Electronics: Large 2-column card */}
          <Link href="/products?category=electronics" className={`${styles.catBentoCard} ${styles.catElectronics}`}>
            <div className={styles.catBentoInfo}>
              <span className={`badge ${styles.badgeElectronics}`} style={{ marginBottom: '12px', alignSelf: 'flex-start' }}>Gamer & Tech</span>
              <h3 className={styles.catBentoTitle}>Electronics & Gadgets</h3>
              <p className={styles.catBentoDesc}>Explore top-rated mechanical keyboards, gaming headsets, smartwatches, and fast chargers.</p>
              <span className={styles.bentoLink}>Explore Deals <ArrowRight size={14} /></span>
            </div>
            <div className={styles.catIllustration}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <rect x="9" y="9" width="6" height="6" rx="1" className={styles.cpuCore} />
                <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" className={styles.cpuPins} />
              </svg>
            </div>
          </Link>
          
          {/* Fashion: Tall card */}
          <Link href="/products?category=fashion" className={`${styles.catBentoCard} ${styles.catFashion}`}>
            <div className={styles.catBentoInfo}>
              <span className={`badge ${styles.badgeFashion}`} style={{ marginBottom: '12px', alignSelf: 'flex-start' }}>Apparel</span>
              <h3 className={styles.catBentoTitle}>Fashion & Apparel</h3>
              <p className={styles.catBentoDesc}>Handpicked collections of t-shirts, hoodies, activewear, and comfortable footwear.</p>
              <span className={styles.bentoLink}>Explore Deals <ArrowRight size={14} /></span>
            </div>
            <div className={styles.catIllustration}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 7V4a2 2 0 1 1 4 0" className={styles.hangerHook} />
                <path d="M2 17l10-10 10 10Z" className={styles.hangerShoulder} />
                <path d="M6 10v4h2v6h8v-6h2v-4l-3-2H9L6 10Z" className={styles.tShirt} />
              </svg>
            </div>
          </Link>
          
          {/* Home & Kitchen: Compact card */}
          <Link href="/products?category=home-kitchen" className={`${styles.catBentoCard} ${styles.catHome}`}>
            <div className={styles.catBentoInfo}>
              <span className={`badge ${styles.badgeHome}`} style={{ marginBottom: '12px', alignSelf: 'flex-start' }}>Home & Comfort</span>
              <h3 className={styles.catBentoTitle}>Home & Kitchen</h3>
              <p className={styles.catBentoDesc}>Smart coffee makers, organizers, and modern kitchen cookware.</p>
              <span className={styles.bentoLink}>Explore Deals <ArrowRight size={14} /></span>
            </div>
            <div className={styles.catIllustration}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17 8H3v8a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4V8Z" />
                <path d="M17 10h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2" />
                <path d="M6 5c.5-1 1-1 1.5 0s1 1 1.5 0" className={styles.steam} />
                <path d="M10 5c.5-1 1-1 1.5 0s1 1 1.5 0" className={styles.steam} style={{ animationDelay: '0.4s' }} />
                <path d="M14 5c.5-1 1-1 1.5 0s1 1 1.5 0" className={styles.steam} style={{ animationDelay: '0.8s' }} />
              </svg>
            </div>
          </Link>
          
          {/* Beauty & Grooming: Wide card */}
          <Link href="/products?category=beauty-grooming" className={`${styles.catBentoCard} ${styles.catBeauty}`}>
            <div className={styles.catBentoInfo}>
              <span className={`badge ${styles.badgeBeauty}`} style={{ marginBottom: '12px', alignSelf: 'flex-start' }}>Self Care</span>
              <h3 className={styles.catBentoTitle}>Beauty & Grooming</h3>
              <p className={styles.catBentoDesc}>Premium skin care, styling kits, and everyday grooming gear.</p>
              <span className={styles.bentoLink}>Explore Deals <ArrowRight size={14} /></span>
            </div>
            <div className={styles.catIllustration}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="7" y="10" width="10" height="11" rx="2" />
                <path d="M12 10V6M10 6h4M12 4V6" />
                <path d="M4 6l1-1 1 1-1 1-1-1Z" className={styles.sparkle} />
                <path d="M20 8l1-1 1 1-1 1-1-1Z" className={styles.sparkle} style={{ animationDelay: '0.5s' }} />
                <path d="M18 16l0.8-0.8 0.8 0.8-0.8 0.8-0.8-0.8Z" className={styles.sparkle} style={{ animationDelay: '0.2s' }} />
              </svg>
            </div>
          </Link>
          
          {/* Books & Media: Compact card */}
          <Link href="/products?category=books-media" className={`${styles.catBentoCard} ${styles.catBooks}`}>
            <div className={styles.catBentoInfo}>
              <span className={`badge ${styles.badgeBooks}`} style={{ marginBottom: '12px', alignSelf: 'flex-start' }}>Library</span>
              <h3 className={styles.catBentoTitle}>Books & Media</h3>
              <p className={styles.catBentoDesc}>Best-selling novels, journals, and educational books.</p>
              <span className={styles.bentoLink}>Explore Deals <ArrowRight size={14} /></span>
            </div>
            <div className={styles.catIllustration}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 3h10v16H2z" />
                <path d="M12 3h10v16H12z" />
                <path d="M12 19V3" />
                <path d="M12 3c-2 4-6 4-10 0" className={styles.pageFlip} />
                <path d="M12 3c2 4 6 4 10 0" className={styles.pageFlip} />
              </svg>
            </div>
          </Link>
        </div>
      </section>

    </div>
  );
}
