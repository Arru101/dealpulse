const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { scrapeProductMetadata } = require('../lib/scraperHelper');

/**
 * POST /api/scrape - Smart product import parser
 */
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required.' });
    }

    const data = await scrapeProductMetadata(url);
    res.json(data);

  } catch (err) {
    console.error('Error during scraping page:', err.message);
    res.status(500).json({ error: `Scraping failed: ${err.message}` });
  }
});

module.exports = router;
