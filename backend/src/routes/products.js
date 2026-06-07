const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

/**
 * Log admin activities
 */
async function logAdminAction(userId, email, action, details) {
  try {
    await db.ref('adminLogs').push({
      userId,
      email,
      action,
      details,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to log admin action:', err);
  }
}

/**
 * Recursive helper to sanitize input strings, arrays, and objects against XSS/HTML tags
 */
function sanitizeData(data) {
  if (typeof data === 'string') {
    return data.replace(/<[^>]*>/g, '').trim();
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }
  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    for (const [key, val] of Object.entries(data)) {
      sanitized[key] = sanitizeData(val);
    }
    return sanitized;
  }
  return data;
}

/**
 * GET /api/products - Get all products with filters, sorting, and search
 */
router.get('/', async (req, res) => {
  try {
    const productsObj = await db.ref('products').get();
    if (!productsObj) {
      return res.json({ products: [], total: 0, pages: 1 });
    }

    let products = Object.values(productsObj);

    // Apply Filters
    const { category, brand, priceMin, priceMax, ratingMin, search, sort, page = 1, limit = 12 } = req.query;

    if (category) {
      products = products.filter(p => p.category && p.category.toLowerCase() === category.toLowerCase());
    }

    if (brand) {
      products = products.filter(p => p.brand && p.brand.toLowerCase() === brand.toLowerCase());
    }

    if (priceMin) {
      products = products.filter(p => p.price >= parseFloat(priceMin));
    }

    if (priceMax) {
      products = products.filter(p => p.price <= parseFloat(priceMax));
    }

    if (ratingMin) {
      products = products.filter(p => p.rating >= parseFloat(ratingMin));
    }

    if (search) {
      const q = search.toLowerCase();
      products = products.filter(p => 
        (p.title && p.title.toLowerCase().includes(q)) || 
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
      );
    }

    // Apply Sorting
    if (sort) {
      switch (sort) {
        case 'price_asc':
          products.sort((a, b) => a.price - b.price);
          break;
        case 'price_desc':
          products.sort((a, b) => b.price - a.price);
          break;
        case 'rating':
          products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
          break;
        case 'popular':
          products.sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
          break;
        case 'latest':
        default:
          products.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          break;
      }
    } else {
      // Default to latest
      products.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    // Pagination
    const total = products.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedProducts = products.slice(startIndex, startIndex + limitNum);
    const pages = Math.ceil(total / limitNum);

    res.json({
      products: paginatedProducts,
      total,
      page: pageNum,
      pages: pages || 1
    });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/products/suggestions - Autocomplete search suggestions
 */
router.get('/suggestions', async (req, res) => {
  try {
    const q = (req.query.q || '').toLowerCase().trim();
    if (!q) {
      return res.json([]);
    }

    const productsObj = await db.ref('products').get();
    if (!productsObj) return res.json([]);

    const products = Object.values(productsObj);
    const matches = new Set();

    for (const p of products) {
      if (p.title && p.title.toLowerCase().includes(q)) {
        matches.add(p.title);
      }
      if (p.brand && p.brand.toLowerCase().includes(q)) {
        matches.add(p.brand);
      }
      if (p.category && p.category.toLowerCase().includes(q)) {
        matches.add(p.category);
      }
      if (matches.size >= 8) break;
    }

    res.json(Array.from(matches));
  } catch (err) {
    console.error('Error fetching suggestions:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/products/trending - Fetch trending items
 */
router.get('/trending', async (req, res) => {
  try {
    const productsObj = await db.ref('products').get();
    if (!productsObj) return res.json([]);

    const products = Object.values(productsObj);
    // Sort by popularity index (clicks * 0.7 + rating * 10 * 0.3)
    products.sort((a, b) => {
      const scoreA = ((a.clicks || 0) * 0.7) + ((a.rating || 0) * 3);
      const scoreB = ((b.clicks || 0) * 0.7) + ((b.rating || 0) * 3);
      return scoreB - scoreA;
    });

    res.json(products.slice(0, 8));
  } catch (err) {
    console.error('Error fetching trending products:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/products/:id - Single product details
 */
router.get('/:id', async (req, res) => {
  try {
    const product = await db.ref(`products/${req.params.id}`).get();
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/products/:id/reviews - Add a review for a product
 */
router.post('/:id/reviews', async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await db.ref(`products/${productId}`).get();
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let { name, rating, comment, image } = req.body;
    
    // Sanitize input
    name = sanitizeData(name);
    comment = sanitizeData(comment);
    
    const parsedRating = parseInt(rating);
    if (!name || isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5 || !comment) {
      return res.status(400).json({ error: 'Name, Rating (1-5), and Comment are required.' });
    }

    const newReview = {
      id: 'rev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now(),
      name,
      rating: parsedRating,
      comment,
      image: image || null,
      date: new Date().toISOString().split('T')[0]
    };

    // Save review to products/${productId}/reviews
    await db.ref(`products/${productId}/reviews/${newReview.id}`).set(newReview);

    // Recalculate average rating and reviewCount
    const updatedProduct = await db.ref(`products/${productId}`).get();
    const reviewsObj = updatedProduct.reviews || {};
    const reviewsList = Object.values(reviewsObj);
    
    const count = reviewsList.length;
    const sum = reviewsList.reduce((acc, r) => acc + r.rating, 0);
    const avgRating = parseFloat((sum / count).toFixed(1));

    // Update product rating and reviewCount
    await db.ref(`products/${productId}`).update({
      rating: avgRating,
      reviewCount: count
    });

    res.status(201).json({
      message: 'Review added successfully',
      review: newReview,
      rating: avgRating,
      reviewCount: count
    });
  } catch (err) {
    console.error('Error adding review:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/products - Create a new product (Admin)
 */
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    let {
      title,
      description,
      price,
      originalPrice,
      brand,
      category,
      affiliateUrl,
      imageUrls = [],
      rating = 5.0,
      reviewCount = 1,
      specifications = {},
      features = [],
      isTrending = false,
      isFeatured = false,
      isLatest = true
    } = req.body;

    // Recursive sanitization of input data
    title = sanitizeData(title);
    description = sanitizeData(description);
    brand = sanitizeData(brand);
    category = sanitizeData(category);
    affiliateUrl = sanitizeData(affiliateUrl);
    imageUrls = sanitizeData(imageUrls);
    specifications = sanitizeData(specifications);
    features = sanitizeData(features);

    if (!title || !price || !category || !affiliateUrl) {
      return res.status(400).json({ error: 'Title, Price, Category, and Affiliate URL are required.' });
    }

    const newProduct = {
      title,
      description: description || '',
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : parseFloat(price),
      brand: brand || 'Generic',
      category,
      affiliateUrl,
      imageUrls: Array.isArray(imageUrls) ? imageUrls : [imageUrls],
      rating: parseFloat(rating),
      reviewCount: parseInt(reviewCount),
      specifications,
      features,
      isTrending: !!isTrending,
      isFeatured: !!isFeatured,
      isLatest: !!isLatest,
      clicks: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await db.ref('products').push(newProduct);
    await logAdminAction(req.user.uid, req.user.email, 'ADD_PRODUCT', `Created product: ${title} (${result.key})`);
    
    // Auto-create category and brand if they don't exist
    if (category) {
      const catSlug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const existingCat = await db.ref(`categories/${catSlug}`).get();
      if (!existingCat) {
        await db.ref(`categories/${catSlug}`).set({ id: catSlug, name: category });
      }
    }
    if (brand) {
      const brandSlug = brand.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const existingBrand = await db.ref(`brands/${brandSlug}`).get();
      if (!existingBrand) {
        await db.ref(`brands/${brandSlug}`).set({ id: brandSlug, name: brand });
      }
    }

    res.status(201).json({ message: 'Product created successfully', id: result.key, product: result.value });
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * PUT /api/products/:id - Update product details (Admin)
 */
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    const existing = await db.ref(`products/${productId}`).get();
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Sanitize input payload
    const updates = sanitizeData(req.body);
    
    if (updates.price) updates.price = parseFloat(updates.price);
    if (updates.originalPrice) updates.originalPrice = parseFloat(updates.originalPrice);
    if (updates.rating) updates.rating = parseFloat(updates.rating);
    if (updates.reviewCount) updates.reviewCount = parseInt(updates.reviewCount);
    
    updates.updatedAt = new Date().toISOString();

    const merged = { ...existing, ...updates };
    await db.ref(`products/${productId}`).set(merged);
    
    await logAdminAction(req.user.uid, req.user.email, 'EDIT_PRODUCT', `Updated product: ${merged.title} (${productId})`);
    res.json({ message: 'Product updated successfully', product: merged });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * DELETE /api/products/:id - Delete product (Admin)
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    const existing = await db.ref(`products/${productId}`).get();
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await db.ref(`products/${productId}`).remove();
    await logAdminAction(req.user.uid, req.user.email, 'DELETE_PRODUCT', `Deleted product: ${existing.title} (${productId})`);
    
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/products/bulk - Bulk Upload Products (Admin)
 */
router.post('/bulk', authenticate, requireAdmin, async (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Invalid payload: Array of products is required.' });
    }

    let successCount = 0;
    for (let p of products) {
      // Sanitize item details
      p = sanitizeData(p);
      if (!p.title || !p.price || !p.category || !p.affiliateUrl) continue;
      
      const newProduct = {
        title: p.title,
        description: p.description || '',
        price: parseFloat(p.price),
        originalPrice: p.originalPrice ? parseFloat(p.originalPrice) : parseFloat(p.price),
        brand: p.brand || 'Generic',
        category: p.category,
        affiliateUrl: p.affiliateUrl,
        imageUrls: Array.isArray(p.imageUrls) ? p.imageUrls : [p.imageUrls || 'https://via.placeholder.com/300'],
        rating: parseFloat(p.rating || 5.0),
        reviewCount: parseInt(p.reviewCount || 1),
        specifications: p.specifications || {},
        features: p.features || [],
        isTrending: !!p.isTrending,
        isFeatured: !!p.isFeatured,
        isLatest: true,
        clicks: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.ref('products').push(newProduct);
      successCount++;
    }

    await logAdminAction(req.user.uid, req.user.email, 'BULK_UPLOAD_PRODUCTS', `Uploaded ${successCount} products via bulk loader`);
    res.json({ message: `Successfully uploaded ${successCount} of ${products.length} products.` });
  } catch (err) {
    console.error('Error in bulk uploading products:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
