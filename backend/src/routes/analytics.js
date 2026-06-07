const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { authenticate } = require('../middleware/auth');

/**
 * Helper to validate if the destination URL belongs to whitelisted e-commerce merchant networks
 */
function isSafeRedirectUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    const host = url.hostname.toLowerCase();
    const whitelistedDomains = [
      'amazon.in', 'amazon.com', 'amzn.to', 'amzn.in',
      'flipkart.com', 'dl.flipkart.com', 'fkrt.it',
      'ajio.com',
      'myntra.com',
      'tatacliq.com'
    ];
    return whitelistedDomains.some(domain => host === domain || host.endsWith('.' + domain));
  } catch (err) {
    return false;
  }
}

/**
 * GET /api/redirect/:productId - Tracks affiliate product click and redirects to merchant URL
 */
router.get('/redirect/:productId', authenticate, async (req, res) => {
  try {
    const productId = req.params.productId;
    const product = await db.ref(`products/${productId}`).get();

    if (!product) {
      return res.status(404).send('<html><body style="font-family:sans-serif;text-align:center;padding:50px;"><h1>Product Not Found</h1><p>The product you are trying to reach does not exist or has been removed.</p><a href="/">Go to Home</a></body></html>');
    }

    // Capture Request Metadata
    const referrer = req.headers.referer || req.headers.referrer || 'Direct';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    
    // User info if logged in
    const userId = req.user ? req.user.uid : 'guest';
    const userEmail = req.user ? req.user.email : 'guest';

    // Log Click Analytics Entry
    const clickData = {
      productId,
      productTitle: product.title,
      category: product.category,
      brand: product.brand,
      price: product.price,
      timestamp: new Date().toISOString(),
      referrer,
      userAgent,
      ip,
      userId,
      userEmail
    };

    // Save click event
    await db.ref('clicks').push(clickData);

    // Update Product Click Count
    const currentClicks = parseInt(product.clicks || 0);
    await db.ref(`products/${productId}/clicks`).set(currentClicks + 1);

    // Verify destination domain to prevent open redirect phishing exploits
    if (!isSafeRedirectUrl(product.affiliateUrl)) {
      let hostname = 'unknown';
      try {
        hostname = new URL(product.affiliateUrl).hostname;
      } catch (e) {}

      return res.status(400).send(`
        <html>
          <head>
            <title>Untrusted Redirection Blocked</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #090d16; color: #f9fafb; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 24px; box-sizing: border-box; text-align: center; }
              .card { background: #151c2c; border: 1px solid #ef4444; border-radius: 12px; padding: 40px 32px; max-width: 480px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); margin: auto; }
              h1 { color: #ef4444; font-size: 1.8rem; margin-top: 0; font-weight: 800; }
              p { color: #9ca3af; font-size: 0.95rem; line-height: 1.6; margin-bottom: 24px; }
              .btn { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; font-weight: 600; text-decoration: none; transition: 0.2s ease; }
              .btn:hover { background: #4f46e5; }
            </style>
          </head>
          <body>
            <div class="card">
              <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
              <h1>Untrusted Destination Blocked</h1>
              <p>For your security, we have blocked this redirection. The product link points to an unverified domain (<strong>${hostname}</strong>) which is not in our approved merchants list.</p>
              <a href="/" class="btn">Return to Safety</a>
            </div>
          </body>
        </html>
      `);
    }

    // Redirect client to merchant site
    res.redirect(302, product.affiliateUrl);
  } catch (err) {
    console.error('Error redirecting and logging click:', err);
    res.status(500).send('<html><body style="font-family:sans-serif;text-align:center;padding:50px;"><h1>Internal Server Error</h1><p>We are having trouble redirecting you. Please try again later.</p></body></html>');
  }
});

/**
 * GET /api/analytics/summary - Get summary report for dashboard (Admin)
 */
router.get('/summary', authenticate, async (req, res) => {
  try {
    // Only admins can see overall reports
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const clicksObj = await db.ref('clicks').get();
    const productsObj = await db.ref('products').get();
    const usersObj = await db.ref('users').get();

    const clicks = clicksObj ? Object.values(clicksObj) : [];
    const products = productsObj ? Object.values(productsObj) : [];
    const users = usersObj ? Object.values(usersObj) : [];

    // Calculate metrics
    const totalClicks = clicks.length;
    const totalProducts = products.length;
    const totalUsers = users.length;

    // Clicks grouped by category
    const clicksByCategory = {};
    // Clicks grouped by brand
    const clicksByBrand = {};
    // Click timeline (last 7 days)
    const clicksTimeline = {};

    // Initialize last 7 days timeline
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      clicksTimeline[dateStr] = 0;
    }

    clicks.forEach(click => {
      // Category Grouping
      if (click.category) {
        clicksByCategory[click.category] = (clicksByCategory[click.category] || 0) + 1;
      }
      
      // Brand Grouping
      if (click.brand) {
        clicksByBrand[click.brand] = (clicksByBrand[click.brand] || 0) + 1;
      }

      // Date Grouping (only if in scope of timeline)
      if (click.timestamp) {
        const dStr = click.timestamp.split('T')[0];
        if (clicksTimeline[dStr] !== undefined) {
          clicksTimeline[dStr]++;
        }
      }
    });

    // Sort products by clicks
    const topProducts = [...products]
      .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        title: p.title,
        brand: p.brand,
        clicks: p.clicks || 0,
        price: p.price
      }));

    res.json({
      totalClicks,
      totalProducts,
      totalUsers,
      clicksByCategory,
      clicksByBrand,
      clicksTimeline: Object.entries(clicksTimeline).map(([date, count]) => ({ date, count })),
      topProducts
    });
  } catch (err) {
    console.error('Error fetching analytics summary:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
