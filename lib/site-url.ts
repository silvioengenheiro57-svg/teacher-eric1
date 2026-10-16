const productionSiteUrl = 'https://teacher-eric1.vercel.app';

export function getSiteUrl(fallbackOrigin: string) {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredUrl) return new URL(configuredUrl).origin;
  if (process.env.NODE_ENV === 'production') return productionSiteUrl;
  return fallbackOrigin;
}
