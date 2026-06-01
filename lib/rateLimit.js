/**
 * Simple in-memory rate limiter for API endpoints
 * For production, use Redis-based rate limiting
 */

const rateLimitMap = new Map();

export function rateLimit(identifier, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const key = identifier;
  
  // Get or create user's request history
  let requests = rateLimitMap.get(key) || [];
  
  // Remove expired requests
  requests = requests.filter(timestamp => now - timestamp < windowMs);
  
  // Check if limit exceeded
  if (requests.length >= maxRequests) {
    const oldestRequest = requests[0];
    const resetTime = oldestRequest + windowMs;
    const waitTime = Math.ceil((resetTime - now) / 1000);
    
    return {
      allowed: false,
      remaining: 0,
      resetTime,
      waitTime,
      message: `Rate limit exceeded. Try again in ${waitTime} seconds.`
    };
  }
  
  // Add current request
  requests.push(now);
  rateLimitMap.set(key, requests);
  
  return {
    allowed: true,
    remaining: maxRequests - requests.length,
    resetTime: now + windowMs
  };
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, requests] of rateLimitMap.entries()) {
    const validRequests = requests.filter(timestamp => now - timestamp < 60000);
    if (validRequests.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, validRequests);
    }
  }
}, 60000); // Cleanup every minute
