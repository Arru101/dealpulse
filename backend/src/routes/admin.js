const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

/**
 * Log admin activity helper
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

// ----------------------------------------------------
// BANNERS MANAGEMENT
// ----------------------------------------------------

/**
 * GET /api/admin/banners - Get all banners (Admin & Public)
 */
router.get('/banners', async (req, res) => {
  try {
    const bannersObj = await db.ref('banners').get();
    const banners = bannersObj ? Object.values(bannersObj) : [];
    res.json(banners);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/banners - Create banner (Admin)
 */
router.post('/banners', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, subtitle, imageUrl, link, isActive = true } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: 'Banner Image URL is required.' });
    }

    const banner = {
      title: title || '',
      subtitle: subtitle || '',
      imageUrl,
      link: link || '',
      isActive: !!isActive,
      createdAt: new Date().toISOString()
    };

    const result = await db.ref('banners').push(banner);
    await logAdminAction(req.user.uid, req.user.email, 'ADD_BANNER', `Created banner: ${title || 'No Title'}`);
    res.status(201).json({ id: result.key, banner: result.value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/admin/banners/:id - Update banner (Admin)
 */
router.put('/banners/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const bannerId = req.params.id;
    const existing = await db.ref(`banners/${bannerId}`).get();
    if (!existing) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    const updates = req.body;
    const merged = { ...existing, ...updates };
    await db.ref(`banners/${bannerId}`).set(merged);

    await logAdminAction(req.user.uid, req.user.email, 'EDIT_BANNER', `Updated banner ID: ${bannerId}`);
    res.json(merged);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/admin/banners/:id - Delete banner (Admin)
 */
router.delete('/banners/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const bannerId = req.params.id;
    const existing = await db.ref(`banners/${bannerId}`).get();
    if (!existing) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    await db.ref(`banners/${bannerId}`).remove();
    await logAdminAction(req.user.uid, req.user.email, 'DELETE_BANNER', `Deleted banner ID: ${bannerId}`);
    res.json({ message: 'Banner deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// CATEGORIES MANAGEMENT
// ----------------------------------------------------

/**
 * GET /api/admin/categories - Get categories (Public)
 */
router.get('/categories', async (req, res) => {
  try {
    const cats = await db.ref('categories').get();
    res.json(cats ? Object.values(cats) : []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/categories - Create category (Admin)
 */
router.post('/categories', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existing = await db.ref(`categories/${slug}`).get();
    if (existing) {
      return res.status(400).json({ error: 'Category already exists' });
    }

    const category = { id: slug, name, icon: icon || 'Tag' };
    await db.ref(`categories/${slug}`).set(category);
    await logAdminAction(req.user.uid, req.user.email, 'ADD_CATEGORY', `Created category: ${name}`);
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// BRANDS MANAGEMENT
// ----------------------------------------------------

/**
 * GET /api/admin/brands - Get brands (Public)
 */
router.get('/brands', async (req, res) => {
  try {
    const brandsObj = await db.ref('brands').get();
    res.json(brandsObj ? Object.values(brandsObj) : []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/brands - Create brand (Admin)
 */
router.post('/brands', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, logoUrl } = req.body;
    if (!name) return res.status(400).json({ error: 'Brand name is required' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existing = await db.ref(`brands/${slug}`).get();
    if (existing) {
      return res.status(400).json({ error: 'Brand already exists' });
    }

    const brand = { id: slug, name, logoUrl: logoUrl || '' };
    await db.ref(`brands/${slug}`).set(brand);
    await logAdminAction(req.user.uid, req.user.email, 'ADD_BRAND', `Created brand: ${name}`);
    res.status(201).json(brand);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// USERS & AUDIT LOGS
// ----------------------------------------------------

/**
 * GET /api/admin/users - Get all registered users (Admin)
 */
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const usersObj = await db.ref('users').get();
    res.json(usersObj ? Object.values(usersObj) : []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/admin/users/:uid/role - Change user role (Admin)
 */
router.put('/users/:uid/role', authenticate, requireAdmin, async (req, res) => {
  try {
    const targetUid = req.params.uid;
    const { role } = req.body;

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role assignment' });
    }

    const userProfile = await db.ref(`users/${targetUid}`).get();
    if (!userProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    userProfile.role = role;
    await db.ref(`users/${targetUid}`).set(userProfile);

    await logAdminAction(req.user.uid, req.user.email, 'CHANGE_USER_ROLE', `Changed role of user ${userProfile.email || targetUid} to ${role}`);
    res.json(userProfile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/logs - Get Admin activity audit logs (Admin)
 */
router.get('/logs', authenticate, requireAdmin, async (req, res) => {
  try {
    const logsObj = await db.ref('adminLogs').get();
    const logs = logsObj ? Object.values(logsObj) : [];
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// SYSTEM SETTINGS
// ----------------------------------------------------

/**
 * GET /api/admin/settings - Get settings (Public / Admin)
 */
router.get('/settings', async (req, res) => {
  try {
    const settings = await db.ref('settings').get();
    const defaults = {
      siteName: 'DealsPulse India',
      currency: 'INR',
      disclosureText: 'Disclaimer: As an Amazon Associate, we earn from qualifying purchases. Clicking links redirect you to official merchant stores.',
      seoTitle: 'Discover Top Products & Deals in India',
      seoDescription: 'Find best rated products and online shopping deals from leading marketplaces in India.',
      contactEmail: 'contact@dealspulse.in'
    };
    res.json(settings || defaults);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/settings - Update settings (Admin)
 */
router.post('/settings', authenticate, requireAdmin, async (req, res) => {
  try {
    const settings = req.body;
    await db.ref('settings').set(settings);
    await logAdminAction(req.user.uid, req.user.email, 'UPDATE_SETTINGS', 'Updated system site settings');
    res.json({ message: 'Settings saved successfully', settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/price-update/status - Get background price updater status
 */
router.get('/price-update/status', authenticate, requireAdmin, async (req, res) => {
  try {
    const status = await db.ref('settings/priceUpdateStatus').get();
    res.json(status || { status: 'idle', lastRunCompleted: null, lastRunUpdatedCount: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/price-update/trigger - Manually trigger background price updater
 */
router.post('/price-update/trigger', authenticate, requireAdmin, async (req, res) => {
  try {
    const { runPriceUpdate, getIsUpdatingState } = require('../lib/priceUpdater');
    
    if (getIsUpdatingState()) {
      return res.status(400).json({ error: 'A price update run is already in progress.' });
    }

    // Run in background asynchronously so it doesn't block the HTTP request
    runPriceUpdate(true, req.user.email).catch(err => {
      console.error('Error running manual price update:', err);
    });

    await logAdminAction(req.user.uid, req.user.email, 'TRIGGER_PRICE_SYNC', 'Manually triggered background product price synchronization.');

    res.json({ message: 'Price update job triggered successfully in the background.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
