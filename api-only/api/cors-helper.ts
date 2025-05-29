import type { VercelRequest, VercelResponse } from '@vercel/node';

// Allowed origins for CORS - using stable Vercel aliases
const allowedOrigins = [
  'https://arize-nvm.vercel.app', // Stable production frontend alias
  'https://arize-a6x924jdx-pskinnertechs-projects.vercel.app', // Latest deployment URL (fallback)
  'https://arize-ecndi2nw8-pskinnertechs-projects.vercel.app', // Previous deployment URL (fallback)
  'https://arize-29ywg2c9c-pskinnertechs-projects.vercel.app', // Original deployment URL (fallback)
  'http://localhost:3000', // Local development
  'http://localhost:3001', // Alternative local port
  'https://localhost:3000', // HTTPS local development
  'https://localhost:3001', // HTTPS alternative local port
];

/**
 * Set CORS headers for API responses
 */
export function setCorsHeaders(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin;
  
  // Check if the origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // For development, allow any localhost origin
    if (origin && origin.includes('localhost')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      // Fallback to the main frontend domain (stable alias)
      res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
    }
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true; // Indicates this was a preflight request
  }

  return false; // Continue with normal request processing
}

/**
 * Wrapper function to handle CORS for any API handler
 */
export function withCors(handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // Set CORS headers
    const isPreflight = setCorsHeaders(req, res);
    
    // If it's a preflight request, we've already handled it
    if (isPreflight) {
      return;
    }

    // Call the actual handler
    try {
      await handler(req, res);
    } catch (error) {
      console.error('API handler error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
} 