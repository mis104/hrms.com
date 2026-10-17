/**
 * Returns the public web portal base URL.
 * In Capacitor Android (or local dev), window.location.origin is 'https://localhost',
 * which recipients on WhatsApp cannot open. In such cases, fallback to the live production URL.
 */
export const getAppBaseUrl = () => {
  const defaultLiveUrl = 'https://hrms-com.vercel.app';
  const envUrl = import.meta.env?.VITE_APP_URL || defaultLiveUrl;
  
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    // In mobile APK (Capacitor/Cordova) or local dev, origin is localhost
    if (
      origin.includes('localhost') ||
      origin.includes('capacitor://') ||
      origin.includes('ionic://') ||
      origin.startsWith('file://')
    ) {
      return envUrl.replace(/\/$/, '');
    }
    return origin.replace(/\/$/, '');
  }

  return envUrl.replace(/\/$/, '');
};

/**
 * Ensures any link sent to external parties (e.g. WhatsApp, Email, SMS)
 * always uses the public web portal domain instead of 'localhost'.
 */
export const sanitizePortalUrl = (url, defaultPath = '') => {
  const base = getAppBaseUrl();
  if (!url) {
    const path = defaultPath.startsWith('/') ? defaultPath : `/${defaultPath}`;
    return `${base}${path}`;
  }

  if (
    url.includes('localhost') ||
    url.includes('capacitor://') ||
    url.includes('ionic://') ||
    url.startsWith('file://')
  ) {
    try {
      const parsed = new URL(url);
      return `${base}${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      const path = defaultPath.startsWith('/') ? defaultPath : `/${defaultPath}`;
      return `${base}${path}`;
    }
  }

  return url;
};
