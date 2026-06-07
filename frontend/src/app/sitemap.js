export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // Core static landing directories
  const routes = [
    '',
    '/products',
    '/dashboard',
    '/legal/privacy-policy',
    '/legal/terms-of-service',
    '/legal/cookie-policy',
    '/legal/affiliate-disclosure',
    '/legal/disclaimer',
    '/legal/about-us',
    '/legal/contact-us',
    '/legal/gdpr-information'
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: route.includes('legal') ? 'monthly' : 'daily',
    priority: route === '' ? 1.0 : route.includes('legal') ? 0.4 : 0.8
  }));

  return [...routes];
}
