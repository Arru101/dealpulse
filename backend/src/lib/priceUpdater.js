const db = require('./db');
const { scrapeProductMetadata, getDomainName } = require('./scraperHelper');

let isUpdating = false;

/**
 * Utility to delay execution for a given time
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Main function to scan database and update prices
 * @param {boolean} isManual - Whether execution was triggered manually
 * @param {string} triggeredBy - Email of the admin who triggered it, or 'system'
 */
async function runPriceUpdate(isManual = false, triggeredBy = 'system') {
  if (isUpdating) {
    console.log('Price update is already running.');
    return;
  }

  isUpdating = true;
  const startTime = Date.now();
  console.log(`Starting background price updater triggered by: ${triggeredBy}`);

  const statusRef = db.ref('settings/priceUpdateStatus');
  await statusRef.set({
    status: 'running',
    startedAt: new Date().toISOString(),
    triggeredBy,
    isManual
  });

  try {
    const productsObj = await db.ref('products').get();
    if (!productsObj) {
      console.log('No products found in the database to update.');
      await statusRef.set({
        status: 'idle',
        lastRunCompleted: new Date().toISOString(),
        lastRunProductsChecked: 0,
        lastRunUpdatedCount: 0,
        triggeredBy
      });
      isUpdating = false;
      return;
    }

    // Convert products database object into an array
    const products = Object.entries(productsObj).map(([id, data]) => ({
      id,
      ...data
    }));

    let updatedCount = 0;
    let checkedCount = 0;
    const errors = [];

    for (const prod of products) {
      // Check if product has url
      if (!prod.affiliateUrl) continue;

      const domain = getDomainName(prod.affiliateUrl);
      const isAmazon = domain.includes('amazon.') || domain.includes('amzn.');

      // Strict Compliance: Skip Amazon scraping
      if (isAmazon) {
        console.log(`Skipping product "${prod.title}" (Amazon.in - Compliance Block).`);
        continue;
      }

      checkedCount++;
      console.log(`Checking price for product: "${prod.title}" (${prod.affiliateUrl})`);

      // Rate limit check: wait 2 seconds between scraping items
      await delay(2000);

      try {
        const scraped = await scrapeProductMetadata(prod.affiliateUrl);
        
        if (scraped && scraped.price) {
          const newPrice = parseFloat(scraped.price);
          const oldPrice = parseFloat(prod.price);

          // Compare prices
          if (newPrice !== oldPrice) {
            console.log(`Price changed for "${prod.title}": ₹${oldPrice} -> ₹${newPrice}`);

            // Prepare updates
            const updatedProduct = {
              ...prod,
              price: newPrice,
              originalPrice: scraped.originalPrice ? parseFloat(scraped.originalPrice) : newPrice,
              updatedAt: new Date().toISOString()
            };

            // Remove internal DB keys before saving back
            const prodId = prod.id;
            delete updatedProduct.id;

            // Save back to DB
            await db.ref(`products/${prodId}`).set(updatedProduct);

            // Push to audit logs
            await db.ref('adminLogs').push({
              userId: triggeredBy === 'system' ? 'system' : 'admin',
              email: triggeredBy,
              action: isManual ? 'PRICE_MANUAL_UPDATE' : 'PRICE_AUTO_UPDATE',
              details: `Price for "${prod.title}" updated from ₹${oldPrice} to ₹${newPrice}`,
              timestamp: new Date().toISOString()
            });

            updatedCount++;
          }
        }
      } catch (err) {
        console.error(`Error updating product ID ${prod.id} (${prod.title}):`, err.message);
        errors.push({
          productId: prod.id,
          title: prod.title,
          error: err.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    const durationSeconds = Math.round((Date.now() - startTime) / 1000);
    
    // Save final status log
    await statusRef.set({
      status: 'idle',
      lastRunCompleted: new Date().toISOString(),
      lastRunDurationSeconds: durationSeconds,
      lastRunProductsChecked: checkedCount,
      lastRunUpdatedCount: updatedCount,
      lastRunErrors: errors.slice(0, 10), // Store up to last 10 errors
      triggeredBy
    });

    console.log(`Finished background price updater. Products Checked: ${checkedCount}, Updated: ${updatedCount}, Duration: ${durationSeconds}s`);

  } catch (err) {
    console.error('Fatal error in background price updater:', err);
    await statusRef.set({
      status: 'idle',
      lastRunCompleted: new Date().toISOString(),
      error: err.message,
      triggeredBy
    });
  } finally {
    isUpdating = false;
  }
}

/**
 * Returns current updater runtime running state
 */
function getIsUpdatingState() {
  return isUpdating;
}

module.exports = {
  runPriceUpdate,
  getIsUpdatingState
};
