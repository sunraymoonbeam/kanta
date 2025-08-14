/**
 * Replace azurite URLs with localhost for local development
 * This is a temporary fix for local development with Docker Compose
 * where backend returns URLs with "azurite" hostname that aren't accessible from browser
 */
export function fixAzuriteUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  
  // Only apply in development mode
  if (process.env.NODE_ENV === 'production') {
    return url;
  }
  
  // Replace azurite hostname with localhost for local development
  if (url.includes('://azurite:')) {
    return url.replace('://azurite:', '://localhost:');
  }
  
  return url;
}

/**
 * Fix all azurite URLs in an object recursively
 */
export function fixAzuriteUrlsInObject<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => fixAzuriteUrlsInObject(item)) as T;
  }

  const result: any = {};
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === 'string' && value.includes('://azurite:')) {
      result[key] = fixAzuriteUrl(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = fixAzuriteUrlsInObject(value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}