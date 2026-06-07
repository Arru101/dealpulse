import './globals.css';
import { AppContextProvider } from './context/AppContext';
import Header from './components/Header';
import Footer from './components/Footer';
import CookieConsent from './components/CookieConsent';
import CompareDrawer from './components/CompareDrawer';

export const metadata = {
  title: "ShopperAffiliate India - Best Deals & Product Discovery",
  description: "Discover top-rated affiliate products from multiple marketplaces. Find best-rated electronics, apparel, kitchen items, and more in India.",
  metadataBase: new URL('http://localhost:3000'),
  alternates: {
    canonical: '/'
  },
  openGraph: {
    title: "ShopperAffiliate India - Discover Top Deals & Products",
    description: "Explore the best products across India's top online stores with detailed analytics and honest reviews.",
    url: '/',
    siteName: 'ShopperAffiliate India',
    locale: 'en_IN',
    type: 'website'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppContextProvider>
          <Header />
          <main style={{ flex: '1 0 auto', display: 'flex', flexDirection: 'column' }}>
            {children}
          </main>
          <Footer />
          <CookieConsent />
          <CompareDrawer />
        </AppContextProvider>
      </body>
    </html>
  );
}

