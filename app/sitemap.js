import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import Category from '@/models/Category';

const getBaseUrl = () => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.quickfynd.com';
  return appUrl.replace(/\/$/, '');
};

const STATIC_ROUTES = [
  { path: '/', changeFrequency: 'daily', priority: 1.0 },
  { path: '/shop', changeFrequency: 'daily', priority: 0.95 },
  { path: '/products', changeFrequency: 'daily', priority: 0.9 },
  { path: '/categories', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/offers', changeFrequency: 'daily', priority: 0.85 },
  { path: '/new-arrivals', changeFrequency: 'daily', priority: 0.8 },
  { path: '/best-sellers', changeFrequency: 'daily', priority: 0.8 },
  { path: '/trending-now', changeFrequency: 'daily', priority: 0.8 },
  { path: '/fast-delivery', changeFrequency: 'daily', priority: 0.8 },
  { path: '/clearance-sale', changeFrequency: 'daily', priority: 0.75 },
  { path: '/under-149', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/under-499', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/wishlist', changeFrequency: 'weekly', priority: 0.45 },
  { path: '/recently-viewed', changeFrequency: 'weekly', priority: 0.45 },
  { path: '/recommended', changeFrequency: 'weekly', priority: 0.45 },
  { path: '/help', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/faq', changeFrequency: 'monthly', priority: 0.55 },
  { path: '/contact-us', changeFrequency: 'monthly', priority: 0.55 },
  { path: '/shipping-policy', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/return-policy', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/refund-policy', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/privacy-policy', changeFrequency: 'yearly', priority: 0.35 },
  { path: '/terms-and-conditions', changeFrequency: 'yearly', priority: 0.35 },
  { path: '/cancellation-policy', changeFrequency: 'yearly', priority: 0.35 },
  { path: '/sitemap', changeFrequency: 'monthly', priority: 0.35 },
];

export default async function sitemap() {
  const baseUrl = getBaseUrl();
  const now = new Date();

  const staticEntries = STATIC_ROUTES.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  try {
    await connectDB();

    const [products, categories] = await Promise.all([
      Product.find({ slug: { $exists: true, $ne: '' } })
        .select('slug updatedAt inStock')
        .lean(),
      Category.find({ slug: { $exists: true, $ne: '' } })
        .select('slug updatedAt')
        .lean(),
    ]);

    const productEntries = products.map((product) => ({
      url: `${baseUrl}/product/${product.slug}`,
      lastModified: product.updatedAt || now,
      changeFrequency: product.inStock ? 'daily' : 'weekly',
      priority: product.inStock ? 0.9 : 0.75,
    }));

    const categoryEntries = categories.flatMap((category) => ([
      {
        url: `${baseUrl}/shop?category=${encodeURIComponent(category.slug)}`,
        lastModified: category.updatedAt || now,
        changeFrequency: 'weekly',
        priority: 0.7,
      },
      {
        url: `${baseUrl}/categories?category=${encodeURIComponent(category.slug)}`,
        lastModified: category.updatedAt || now,
        changeFrequency: 'weekly',
        priority: 0.65,
      },
    ]));

    const seen = new Set();
    const merged = [...staticEntries, ...productEntries, ...categoryEntries].filter((entry) => {
      if (seen.has(entry.url)) return false;
      seen.add(entry.url);
      return true;
    });

    return merged;
  } catch (error) {
    console.error('[sitemap] generation failed, returning static entries only:', error?.message || error);
    return staticEntries;
  }
}
