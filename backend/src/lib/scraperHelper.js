const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Helper to extract domain from a URL string
 */
function getDomainName(urlStr) {
  try {
    const url = new URL(urlStr);
    return url.hostname.toLowerCase();
  } catch (err) {
    return '';
  }
}

/**
 * Scrapes product title, price, original price, brand, category, description, and images from non-Amazon URLs.
 * @param {string} url - Target product URL
 * @returns {Promise<object>} Scraped metadata object
 */
async function scrapeProductMetadata(url) {
  if (!url) {
    throw new Error('URL is required.');
  }

  const domain = getDomainName(url);
  if (!domain) {
    throw new Error('Invalid URL structure provided.');
  }

  // Strict Amazon Associates India Compliance Check
  const isAmazon = domain.includes('amazon.') || domain.includes('amzn.');
  if (isAmazon) {
    return {
      isAmazon: true,
      title: '',
      description: '',
      price: '',
      originalPrice: '',
      brand: 'Amazon',
      category: '',
      imageUrls: [],
      features: [],
      specifications: {},
      complianceNotice: 'Amazon Associates India operating guidelines prohibit scraping Amazon.in product pages. Please enter product details manually or configure the Amazon PA-API.',
      message: 'Scraping blocked due to Amazon Associates compliance rules.'
    };
  }

  // Fetch the target webpage with custom headers to avoid bot detection
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    },
    timeout: 10000 // 10s timeout
  });

  const html = response.data;
  const $ = cheerio.load(html);

  // Meta parsing helpers
  const getMeta = (name) => {
    return $(`meta[property="${name}"]`).attr('content') || 
           $(`meta[name="${name}"]`).attr('content') || 
           '';
  };

  // 1. Extract Title
  let title = getMeta('og:title') || getMeta('twitter:title') || $('title').text() || '';
  title = title.replace(/\s+/g, ' ').trim();

  // 2. Extract Description
  let description = getMeta('og:description') || getMeta('twitter:description') || getMeta('description') || '';
  description = description.replace(/\s+/g, ' ').trim();

  // 3. Extract Images
  const imageUrls = [];
  const ogImg = getMeta('og:image');
  if (ogImg) imageUrls.push(ogImg);
  const twImg = getMeta('twitter:image');
  if (twImg && !imageUrls.includes(twImg)) imageUrls.push(twImg);

  // Fallback images (first 3 large looking product images)
  $('img').each((i, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
    if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon') && imageUrls.length < 5) {
      if (!imageUrls.includes(src)) {
        imageUrls.push(src);
      }
    }
  });

  // 4. Extract Brand
  let brand = getMeta('og:site_name') || '';
  // Custom brand parsers
  if (domain.includes('flipkart')) brand = 'Flipkart';
  else if (domain.includes('ajio')) brand = 'Ajio';
  else if (domain.includes('myntra')) brand = 'Myntra';
  else if (domain.includes('tatacliq')) brand = 'Tata CLIQ';
  else if (!brand) {
    // Clean domain name
    brand = domain.replace('www.', '').split('.')[0];
    brand = brand.charAt(0).toUpperCase() + brand.slice(1);
  }

  // 5. Extract Price
  let price = '';
  let originalPrice = '';

  // Check JSON-LD schema
  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const rawJson = $(el).text();
      const json = JSON.parse(rawJson);
      const offers = json.offers || (json['@graph'] && json['@graph'].find(x => x.offers)?.offers);
      
      if (offers) {
        const priceVal = offers.price || (Array.isArray(offers) ? offers[0].price : null);
        if (priceVal) {
          price = parseFloat(priceVal);
        }
      }
    } catch (err) {
      // Ignore json-ld parsing errors
    }
  });

  // Fallback price parsing from page content
  if (!price) {
    const priceText = $('.price, .amount, [class*="price"], [id*="price"]').text();
    const match = priceText.replace(/,/g, '').match(/(?:₹|Rs\.?|INR)\s*(\d+(?:\.\d+)?)/i);
    if (match) {
      price = parseFloat(match[1]);
    }
  }

  // 6. Category mapping
  let category = '';
  const breadcrumbs = [];
  $('.breadcrumb, .breadcrumbs, [class*="breadcrumb"]').find('a, span').each((i, el) => {
    const txt = $(el).text().trim();
    if (txt && !breadcrumbs.includes(txt)) breadcrumbs.push(txt);
  });
  if (breadcrumbs.length > 1) {
    category = breadcrumbs[breadcrumbs.length - 1];
  } else {
    category = 'Uncategorized';
  }

  return {
    isAmazon: false,
    title: title || 'Scraped Product Title',
    description: description || 'Scraped Product Description',
    price: price || '',
    originalPrice: originalPrice || price || '',
    brand,
    category,
    imageUrls: imageUrls.length > 0 ? imageUrls : ['https://via.placeholder.com/300'],
    features: [],
    specifications: {},
    complianceNotice: ''
  };
}

module.exports = {
  getDomainName,
  scrapeProductMetadata
};
