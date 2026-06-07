require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./src/routes/auth');
const productRoutes = require('./src/routes/products');
const analyticsRoutes = require('./src/routes/analytics');
const scraperRoutes = require('./src/routes/scraper');
const adminRoutes = require('./src/routes/admin');
const db = require('./src/lib/db');
const { runPriceUpdate } = require('./src/lib/priceUpdater');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy (Render, Cloudflare, AWS, etc.) for correct client IP rate-limiting
app.set('trust proxy', 1);

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: false // Allow loading images from Cloudinary/external sites
}));

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://affilate-amz.firebaseapp.com',
  'https://affilate-amz.web.app'
];

if (process.env.FRONTEND_URL) {
  const urls = process.env.FRONTEND_URL.split(',').map(url => url.trim());
  allowedOrigins.push(...urls);
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.includes(origin) || 
                      (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) ||
                      origin.endsWith('.vercel.app') ||
                      origin.endsWith('.netlify.app') ||
                      origin.endsWith('.onrender.com');
                      
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`Blocked CORS request from origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};
app.use(cors(corsOptions));

// Rate Limiting (100 requests per 15 minutes for public APIs)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

// Short URL Redirect Route (e.g. shopperaffiliate.in/r/123)
app.get('/r/:productId', async (req, res) => {
  res.redirect(302, `/api/redirect/${req.params.productId}`);
});

// Silence Chrome DevTools Workspace Folder probes
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.status(200).json({});
});

// Mount Routes
app.use('/api/auth', apiLimiter, authRoutes);
app.use('/api/products', apiLimiter, productRoutes);
app.use('/api/redirect', analyticsRoutes); // Redirect logs own hits, bypass strict rate limit
app.use('/api/analytics', apiLimiter, analyticsRoutes);
app.use('/api/scrape', apiLimiter, scraperRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Seed Initial Categories & Brands if DB is empty
async function seedInitialData() {
  try {
    const products = await db.ref('products').get();
    if (!products || Object.keys(products).length === 0) {
      console.log('Seeding initial categories, brands, and sample products...');
      
      const sampleCategories = {
        'electronics': { id: 'electronics', name: 'Electronics', icon: 'Cpu' },
        'fashion': { id: 'fashion', name: 'Fashion & Apparels', icon: 'Shirt' },
        'home-kitchen': { id: 'home-kitchen', name: 'Home & Kitchen', icon: 'Home' },
        'beauty-grooming': { id: 'beauty-grooming', name: 'Beauty & Grooming', icon: 'Smile' },
        'books-media': { id: 'books-media', name: 'Books & Education', icon: 'BookOpen' }
      };

      for (const [key, val] of Object.entries(sampleCategories)) {
        await db.ref(`categories/${key}`).set(val);
      }

      const sampleBrands = {
        'samsung': { id: 'samsung', name: 'Samsung', logoUrl: '' },
        'boat': { id: 'boat', name: 'boAt', logoUrl: '' },
        'roadster': { id: 'roadster', name: 'Roadster', logoUrl: '' },
        'philips': { id: 'philips', name: 'Philips', logoUrl: '' }
      };

      for (const [key, val] of Object.entries(sampleBrands)) {
        await db.ref(`brands/${key}`).set(val);
      }

      const sampleProducts = [
        {
          title: 'boAt Rockerz 450 Bluetooth On Ear Headphones with Mic',
          description: 'Step into the world of immersive audio with boAt Rockerz 450 wireless headphones. Equipped with 40mm dynamic drivers, it provides crystal clear signature sound with punchy bass. Features up to 15 hours of playback time for uninterrupted music enjoyment.',
          price: 1499,
          originalPrice: 3990,
          brand: 'boAt',
          category: 'Electronics',
          affiliateUrl: 'https://www.amazon.in/dp/B07PR1CL3S',
          imageUrls: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600'],
          rating: 4.5,
          reviewCount: 2,
          reviews: {
            'rev_initial_1': {
              id: 'rev_initial_1',
              name: 'Rohan Sharma',
              rating: 5,
              date: '2026-05-18',
              comment: 'Absolutely phenomenal product. The build quality exceeds my expectations, and the shipping was extremely fast. Highly recommended!',
              image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=400'
            },
            'rev_initial_2': {
              id: 'rev_initial_2',
              name: 'Anjali Gupta',
              rating: 4,
              date: '2026-05-02',
              comment: 'Very premium finish. Looks gorgeous on my setup. Only drawback is the charging cable is a bit short, but otherwise it is excellent value.',
              image: null
            }
          },
          specifications: {
            'Battery Life': '15 Hours',
            'Bluetooth Version': 'v5.0',
            'Driver Size': '40 mm',
            'Warranty': '1 Year'
          },
          features: [
            'Up to 15 hours of playback',
            '40mm dynamic drivers for punchy bass',
            'Soft padded earcups for long comfort',
            'Easy integrated control buttons'
          ],
          isTrending: true,
          isFeatured: true,
          isLatest: true,
          clicks: 124,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          title: 'Samsung Galaxy M34 5G (Prism Blue, 6GB RAM, 128GB Storage)',
          description: 'Experience lightning-fast speed and gorgeous visuals with the Samsung Galaxy M34 5G. Sporting a 120Hz Super AMOLED display, 50MP No Shake Cam, and a massive 6000mAh battery that easily lasts up to 2 days on a single charge.',
          price: 15999,
          originalPrice: 24499,
          brand: 'Samsung',
          category: 'Electronics',
          affiliateUrl: 'https://www.amazon.in/dp/B0C7BGD993',
          imageUrls: ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=600'],
          rating: 5.0,
          reviewCount: 1,
          reviews: {
            'rev_initial_3': {
              id: 'rev_initial_3',
              name: 'Vikram Singh',
              rating: 5,
              date: '2026-05-20',
              comment: 'Super fast delivery. Screen refresh rate is super smooth, OIS camera takes excellent pictures, battery backup is around 1.5 days on heavy use.',
              image: null
            }
          },
          specifications: {
            'Processor': 'Exynos 1280 Octa-Core',
            'RAM': '6 GB',
            'Storage': '128 GB',
            'Battery': '6000 mAh',
            'Display': '6.5 inch 120Hz AMOLED'
          },
          features: [
            '120Hz Super AMOLED visual quality',
            '50MP OIS Triple Camera Setup',
            'Massive 6000mAh Battery',
            'Secure Folder and Knox Security'
          ],
          isTrending: true,
          isFeatured: true,
          isLatest: true,
          clicks: 340,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      for (const prod of sampleProducts) {
        await db.ref('products').push(prod);
      }
      console.log('Seeding completed successfully!');
    }
  } catch (err) {
    console.error('Failed to seed initial data:', err);
  }
}

app.listen(PORT, async () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
  await seedInitialData();

  // Schedule background product price updates (default every 12 hours)
  const PRICE_UPDATE_INTERVAL = (parseInt(process.env.PRICE_UPDATE_INTERVAL_HOURS) || 12) * 60 * 60 * 1000;
  setInterval(() => {
    runPriceUpdate(false, 'system').catch((err) => {
      console.error('Error running automatic price update interval:', err);
    });
  }, PRICE_UPDATE_INTERVAL);

  // Run initial price update check after 30 seconds on server boot to avoid startup congestion
  setTimeout(() => {
    runPriceUpdate(false, 'system').catch((err) => {
      console.error('Error running initial price update:', err);
    });
  }, 30000);
});
