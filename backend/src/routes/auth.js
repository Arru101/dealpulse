const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../lib/db');
const { authenticate, requireAuth } = require('../middleware/auth');

// Strict rate limiter for authentication/session generation
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP per 15 minutes
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforaffiliateplatform123!';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * POST /api/auth/session - Issue backend JWT session token from Firebase Token
 */
router.post('/session', loginLimiter, async (req, res) => {
  try {
    const { idToken, email, displayName, uid, password } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ error: 'UID and Email are required.' });
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@affiliateplatform.in';
    const isAdmin = email.toLowerCase() === adminEmail.toLowerCase();

    // Password validation for Administrator local/mock bypass logins
    if (isAdmin && idToken === 'mock-admin-token') {
      const correctPassword = process.env.ADMIN_PASSWORD || 'admin123';
      if (!password || password !== correctPassword) {
        // Slow down brute force with progressive delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        return res.status(401).json({ error: 'Unauthorized: Invalid Administrator Password.' });
      }
    }

    // Check if user already has a profile. If not, create one.
    // Enforce role assignment: role is "admin" ONLY if the email matches the ADMIN_EMAIL from env.
    let profile = await db.ref(`users/${uid}`).get();
    
    if (!profile) {
      profile = {
        uid,
        email,
        displayName: displayName || email.split('@')[0],
        role: isAdmin ? 'admin' : 'user',
        createdAt: new Date().toISOString()
      };
      
      await db.ref(`users/${uid}`).set(profile);
      
      // Log admin creation if matching email
      if (isAdmin) {
        await db.ref('adminLogs').push({
          userId: uid,
          email,
          action: 'SETUP_ADMIN_PROFILE',
          details: 'User profile matching ADMIN_EMAIL created with admin role.',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Issue backend JWT token
    const token = jwt.sign(
      { 
        uid: profile.uid, 
        email: profile.email, 
        displayName: profile.displayName, 
        role: profile.role 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Set HTTPOnly Cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      token,
      user: profile
    });
  } catch (err) {
    console.error('Session establishment error:', err);
    res.status(500).json({ error: 'Failed to establish session' });
  }
});

/**
 * GET /api/auth/profile - Fetch user profile (Requires authentication)
 */
router.get('/profile', authenticate, requireAuth, async (req, res) => {
  try {
    const profile = await db.ref(`users/${req.user.uid}`).get();
    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    res.json(profile);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/auth/wishlist/toggle - Toggle product in wishlist
 */
router.post('/wishlist/toggle', authenticate, requireAuth, async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const uid = req.user.uid;
    const profile = await db.ref(`users/${uid}`).get() || { uid, wishlist: [] };
    
    let wishlist = Array.isArray(profile.wishlist) ? profile.wishlist : [];
    const index = wishlist.indexOf(productId);
    
    if (index > -1) {
      wishlist.splice(index, 1); // Remove
    } else {
      wishlist.push(productId); // Add
    }

    profile.wishlist = wishlist;
    await db.ref(`users/${uid}`).set(profile);

    res.json({ wishlist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/recently-viewed - Track recently viewed product
 */
router.post('/recently-viewed', authenticate, requireAuth, async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const uid = req.user.uid;
    const profile = await db.ref(`users/${uid}`).get() || { uid, recentlyViewed: [] };
    
    let recentlyViewed = Array.isArray(profile.recentlyViewed) ? profile.recentlyViewed : [];
    // Remove if already exists to move to head
    recentlyViewed = recentlyViewed.filter(id => id !== productId);
    recentlyViewed.unshift(productId); // Add to beginning
    recentlyViewed = recentlyViewed.slice(0, 10); // Limit to last 10 items

    profile.recentlyViewed = recentlyViewed;
    await db.ref(`users/${uid}`).set(profile);

    res.json({ recentlyViewed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/logout - Clear session cookie
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Session cleared' });
});

/**
 * POST /api/auth/delete-account - GDPR Account deletion request
 */
router.post('/delete-account', authenticate, requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    
    // Log the request
    await db.ref('adminLogs').push({
      userId: uid,
      email: req.user.email,
      action: 'USER_DELETION_REQUEST',
      details: `User requested complete account deletion.`,
      timestamp: new Date().toISOString()
    });

    // Remove user profile
    await db.ref(`users/${uid}`).remove();

    res.clearCookie('token');
    res.json({ message: 'Your account profile has been successfully deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
