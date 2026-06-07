'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Grid, 
  List, 
  ChevronLeft, 
  ChevronRight, 
  SlidersHorizontal,
  Star,
  ArrowUpRight,
  Heart,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import ProductCard from '../components/ProductCard';
import styles from './products.module.css';

// Separate inner component to resolve Next.js SSR Suspense rule for useSearchParams
function ProductListingContent() {
  const { backendUrl, wishlist, toggleWishlist } = useApp();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Parameter states
  const categoryParam = searchParams.get('category') || '';
  const searchParam = searchParams.get('search') || '';
  const sortParam = searchParams.get('sort') || 'latest';

  // Component UI States
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [layoutMode, setLayoutMode] = useState('grid');
  const [loading, setLoading] = useState(true);

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [ratingMin, setRatingMin] = useState('');
  const [sort, setSort] = useState(sortParam);

  // Category and Brand lists from DB
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  // Accordion filters open/closed state
  const [openFilters, setOpenFilters] = useState({
    category: true,
    brand: true,
    price: true,
    rating: true
  });

  const toggleFilterBlock = (section) => {
    setOpenFilters(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Sync state with url parameter adjustments
  useEffect(() => {
    setSelectedCategory(categoryParam);
  }, [categoryParam]);

  useEffect(() => {
    setSort(sortParam);
  }, [sortParam]);

  // Load Filters Catalog (Categories and Brands)
  useEffect(() => {
    async function loadFilters() {
      try {
        const catRes = await fetch(`${backendUrl}/api/admin/categories`);
        if (catRes.ok) {
          const cats = await catRes.ok ? await catRes.json() : [];
          setCategories(cats);
        }
        
        const brandRes = await fetch(`${backendUrl}/api/admin/brands`);
        if (brandRes.ok) {
          const brs = await brandRes.json();
          setBrands(brs);
        }
      } catch (err) {
        console.warn('Backend filters fetch failed:', err);
      }
    }
    loadFilters();
  }, [backendUrl]);

  // Fetch products
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        let query = `?page=${page}&limit=9&sort=${sort}`;
        if (selectedCategory) query += `&category=${encodeURIComponent(selectedCategory)}`;
        if (selectedBrand) query += `&brand=${encodeURIComponent(selectedBrand)}`;
        if (priceMin) query += `&priceMin=${priceMin}`;
        if (priceMax) query += `&priceMax=${priceMax}`;
        if (ratingMin) query += `&ratingMin=${ratingMin}`;
        if (searchParam) query += `&search=${encodeURIComponent(searchParam)}`;

        const res = await fetch(`${backendUrl}/api/products${query}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
          setTotal(data.total || 0);
          setPages(data.pages || 1);
        }
      } catch (err) {
        console.error('Error loading products list:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [page, selectedCategory, selectedBrand, priceMin, priceMax, ratingMin, searchParam, sort, backendUrl]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [selectedCategory, selectedBrand, priceMin, priceMax, ratingMin, searchParam, sort]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pages) {
      setPage(newPage);
      window.scrollTo(0, 0);
    }
  };

  const handleResetFilters = () => {
    setSelectedCategory('');
    setSelectedBrand('');
    setPriceMin('');
    setPriceMax('');
    setRatingMin('');
    setSort('latest');
    router.push('/products');
  };

  // Fallback defaults if DB catalog is empty
  const fallbackCategories = [
    { id: 'electronics', name: 'Electronics' },
    { id: 'fashion', name: 'Fashion & Apparel' },
    { id: 'home-kitchen', name: 'Home & Kitchen' },
    { id: 'beauty-grooming', name: 'Beauty & Grooming' },
    { id: 'books-media', name: 'Books & Education' }
  ];

  const fallbackBrands = [
    { id: 'samsung', name: 'Samsung' },
    { id: 'boat', name: 'boAt' },
    { id: 'philips', name: 'Philips' },
    { id: 'roadster', name: 'Roadster' }
  ];

  const activeCategories = categories.length > 0 ? categories : fallbackCategories;
  const activeBrands = brands.length > 0 ? brands : fallbackBrands;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="container">
      
      {/* Search status header */}
      {searchParam && (
        <div style={{ marginTop: '24px', padding: '12px 16px', background: 'var(--surface-hover)', borderRadius: '8px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            Showing results for: <strong>&ldquo;{searchParam}&rdquo;</strong> ({total} items found)
          </p>
        </div>
      )}

      <div className={styles.pageLayout}>
        
        {/* 1. Sidebar filters */}
        <aside className={styles.sidebar}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
              <SlidersHorizontal size={18} />
              Filters
            </h3>
            <button onClick={handleResetFilters} style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600 }}>
              Reset All
            </button>
          </div>

          {/* Categories Block */}
          <div className={styles.filterBlock}>
            <h4 className={styles.filterTitle} onClick={() => toggleFilterBlock('category')}>
              <span>Category</span>
              {openFilters.category ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </h4>
            {openFilters.category && (
              <div className={styles.filterContent}>
                <ul className={styles.listFilter}>
                  <li className={styles.filterLabel}>
                    <input 
                      type="checkbox" 
                      checked={selectedCategory === ''} 
                      onChange={() => setSelectedCategory('')}
                      id="cat-all"
                    />
                    <label htmlFor="cat-all">All Categories</label>
                  </li>
                  {activeCategories.map((cat) => (
                    <li key={cat.id} className={styles.filterLabel}>
                      <input 
                        type="checkbox" 
                        checked={selectedCategory.toLowerCase() === cat.name.toLowerCase()} 
                        onChange={() => setSelectedCategory(cat.name)}
                        id={`cat-${cat.id}`}
                      />
                      <label htmlFor={`cat-${cat.id}`}>{cat.name}</label>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Brand Block */}
          <div className={styles.filterBlock}>
            <h4 className={styles.filterTitle} onClick={() => toggleFilterBlock('brand')}>
              <span>Brand</span>
              {openFilters.brand ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </h4>
            {openFilters.brand && (
              <div className={styles.filterContent}>
                <ul className={styles.listFilter}>
                  <li className={styles.filterLabel}>
                    <input 
                      type="checkbox" 
                      checked={selectedBrand === ''} 
                      onChange={() => setSelectedBrand('')}
                      id="brand-all"
                    />
                    <label htmlFor="brand-all">All Brands</label>
                  </li>
                  {activeBrands.map((brand) => (
                    <li key={brand.id} className={styles.filterLabel}>
                      <input 
                        type="checkbox" 
                        checked={selectedBrand.toLowerCase() === brand.name.toLowerCase()} 
                        onChange={() => setSelectedBrand(brand.name)}
                        id={`brand-${brand.id}`}
                      />
                      <label htmlFor={`brand-${brand.id}`}>{brand.name}</label>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Price Range */}
          <div className={styles.filterBlock}>
            <h4 className={styles.filterTitle} onClick={() => toggleFilterBlock('price')}>
              <span>Price Range (₹)</span>
              {openFilters.price ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </h4>
            {openFilters.price && (
              <div className={styles.filterContent}>
                <div className={styles.priceRangeInputs}>
                  <div className={styles.priceInputWrapper}>
                    <label>Min</label>
                    <input 
                      type="number" 
                      placeholder="Min" 
                      className="form-input" 
                      style={{ padding: '8px' }}
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                    />
                  </div>
                  <div className={styles.priceInputWrapper}>
                    <label>Max</label>
                    <input 
                      type="number" 
                      placeholder="Max" 
                      className="form-input" 
                      style={{ padding: '8px' }}
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Ratings Filter */}
          <div className={styles.filterBlock}>
            <h4 className={styles.filterTitle} onClick={() => toggleFilterBlock('rating')}>
              <span>Minimum Rating</span>
              {openFilters.rating ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </h4>
            {openFilters.rating && (
              <div className={styles.filterContent}>
                <ul className={styles.listFilter}>
                  {[4, 3, 2].map((stars) => (
                    <li key={stars} className={styles.filterLabel}>
                      <input 
                        type="checkbox" 
                        checked={ratingMin === String(stars)} 
                        onChange={() => setRatingMin(ratingMin === String(stars) ? '' : String(stars))}
                        id={`rating-${stars}`}
                      />
                      <label htmlFor={`rating-${stars}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {stars}+ Stars 
                        <Star size={12} fill="var(--accent)" stroke="var(--accent)" />
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>

        {/* 2. Main content area */}
        <main>
          {/* Top toolbar (Sort, Layout view toggler) */}
          <div className={styles.toolbar}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Showing {products.length} of {total} products
            </p>

            <div className={styles.toolbarActions}>
              {/* Sort selector */}
              <select 
                value={sort} 
                onChange={(e) => setSort(e.target.value)}
                className={styles.sortSelect}
              >
                <option value="latest">Latest Deals</option>
                <option value="popular">Popularity</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>

              {/* Layout Toggle */}
              <div className={styles.layoutToggle}>
                <button 
                  onClick={() => setLayoutMode('grid')} 
                  className={`${styles.layoutBtn} ${layoutMode === 'grid' ? styles.layoutBtnActive : ''}`}
                  aria-label="Grid View"
                >
                  <Grid size={18} />
                </button>
                <button 
                  onClick={() => setLayoutMode('list')} 
                  className={`${styles.layoutBtn} ${layoutMode === 'list' ? styles.layoutBtnActive : ''}`}
                  aria-label="List View"
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Catalog grid or list view */}
          {loading ? (
            <div className={layoutMode === 'grid' ? styles.grid : styles.list}>
              {[1, 2, 3, 6].map((n) => (
                <div key={n} className="skeleton" style={{ height: layoutMode === 'grid' ? '380px' : '180px' }} />
              ))}
            </div>
          ) : products.length > 0 ? (
            layoutMode === 'grid' ? (
              <div className={styles.grid}>
                {products.map((prod) => (
                  <ProductCard key={prod.id} product={prod} />
                ))}
              </div>
            ) : (
              <div className={styles.list}>
                {products.map((prod) => {
                  const isSaved = wishlist.includes(prod.id);
                  const displayImg = prod.imageUrls && prod.imageUrls.length > 0 ? prod.imageUrls[0] : 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600';
                  
                  return (
                    <div key={prod.id} className={styles.listItem}>
                      <div className={styles.listImgWrapper}>
                        <img src={displayImg} alt={prod.title} className={styles.listImg} />
                        <button 
                          onClick={() => toggleWishlist(prod.id)}
                          className={`${ProductCard.wishlistBtn} ${isSaved ? ProductCard.wishlistActive : ''}`}
                          style={{ position: 'absolute', top: 12, right: 12, border: '1px solid var(--border)', background: 'var(--surface)', padding: 6, borderRadius: '50%' }}
                        >
                          <Heart size={14} fill={isSaved ? '#ef4444' : 'none'} style={{ color: isSaved ? '#ef4444' : 'var(--text-secondary)' }} />
                        </button>
                      </div>
                      <div className={styles.listContent}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                            <span>{prod.brand}</span>
                            <span>{prod.category}</span>
                          </div>
                          <Link href={`/products/${prod.id}`}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>{prod.title}</h3>
                          </Link>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '12px' }}>
                            {prod.description}
                          </p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '1.3rem', fontWeight: 800 }}>{formatCurrency(prod.price)}</span>
                            {prod.originalPrice > prod.price && (
                              <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{formatCurrency(prod.originalPrice)}</span>
                            )}
                          </div>
                          <a 
                            href={`${backendUrl}/api/redirect/${prod.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-accent"
                            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                          >
                            <span>Buy on Merchant</span>
                            <ArrowUpRight size={14} />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 24px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '16px' }}>
                No products found matching the chosen filters.
              </p>
              <button onClick={handleResetFilters} className="btn btn-primary">
                Clear Filters
              </button>
            </div>
          )}

          {/* 3. Pagination controls */}
          {pages > 1 && (
            <div className={styles.pagination}>
              <button 
                onClick={() => handlePageChange(page - 1)} 
                disabled={page === 1}
                className={styles.pageBtn}
                aria-label="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>
              
              {Array.from({ length: pages }).map((_, idx) => {
                const pNum = idx + 1;
                return (
                  <button 
                    key={pNum} 
                    onClick={() => handlePageChange(pNum)}
                    className={`${styles.pageBtn} ${page === pNum ? styles.pageBtnActive : ''}`}
                  >
                    {pNum}
                  </button>
                );
              })}

              <button 
                onClick={() => handlePageChange(page + 1)} 
                disabled={page === pages}
                className={styles.pageBtn}
                aria-label="Next Page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// Main page exports wrapped inside Suspense for loading search parameters safely
export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
        <p>Loading deal catalogue...</p>
      </div>
    }>
      <ProductListingContent />
    </Suspense>
  );
}
