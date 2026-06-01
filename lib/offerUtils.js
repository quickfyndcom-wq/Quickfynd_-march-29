/**
 * Utility functions for handling personalized offers
 */

/**
 * Validate if an offer is currently valid
 * @param {Object} offer - The offer object
 * @returns {boolean} - Whether the offer is valid
 */
export function isOfferValid(offer) {
  if (!offer) return false;
  
  const now = new Date();
  const expiresAt = new Date(offer.expiresAt);
  
  return (
    offer.isActive &&
    !offer.isUsed &&
    now < expiresAt
  );
}

/**
 * Calculate discounted price based on offer
 * @param {number} originalPrice - Original product price
 * @param {number} discountPercent - Discount percentage
 * @returns {number} - Discounted price (rounded to 2 decimals)
 */
export function calculateDiscountedPrice(originalPrice, discountPercent) {
  if (!originalPrice || !discountPercent) return originalPrice;
  
  const discount = (originalPrice * discountPercent) / 100;
  return Math.round((originalPrice - discount) * 100) / 100;
}

/**
 * Calculate savings amount
 * @param {number} originalPrice - Original product price
 * @param {number} discountedPrice - Discounted price
 * @returns {number} - Savings amount
 */
export function calculateSavings(originalPrice, discountedPrice) {
  return Math.round((originalPrice - discountedPrice) * 100) / 100;
}

/**
 * Get time remaining until offer expires
 * @param {Date|string} expiresAt - Expiry date/time
 * @returns {Object} - Object with days, hours, minutes, seconds, and expired flag
 */
export function getTimeRemaining(expiresAt) {
  const now = new Date().getTime();
  const expiry = new Date(expiresAt).getTime();
  const difference = expiry - now;

  if (difference <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      total: 0,
      expired: true
    };
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return {
    days,
    hours,
    minutes,
    seconds,
    total: difference,
    expired: false
  };
}

/**
 * Format time remaining as human-readable string
 * @param {Date|string} expiresAt - Expiry date/time
 * @returns {string} - Formatted time string (e.g., "2d 5h" or "3h 45m")
 */
export function formatTimeRemaining(expiresAt) {
  const { days, hours, minutes, expired } = getTimeRemaining(expiresAt);
  
  if (expired) return "Expired";
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Generate offer URL
 * @param {string} token - Offer token
 * @param {string} baseUrl - Base URL (optional, defaults to window.location.origin)
 * @returns {string} - Complete offer URL
 */
export function generateOfferUrl(token, baseUrl) {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/offer/${token}`;
}

/**
 * Mark offer as used (call after successful purchase)
 * @param {string} token - Offer token
 * @param {string} orderId - Order ID
 * @returns {Promise} - API response
 */
export async function markOfferAsUsed(token, orderId) {
  try {
    const response = await fetch(`/api/personalized-offers/validate/${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderId }),
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error marking offer as used:', error);
    throw error;
  }
}

/**
 * Validate offer token and get details
 * @param {string} token - Offer token
 * @returns {Promise<Object>} - Offer and product details
 */
export async function validateOffer(token) {
  try {
    const response = await fetch(`/api/personalized-offers/validate/${token}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Invalid offer');
    }
    
    return data;
  } catch (error) {
    console.error('Error validating offer:', error);
    throw error;
  }
}

/**
 * Extract offer token from current URL (if present)
 * @returns {string|null} - Offer token or null
 */
export function getOfferTokenFromUrl() {
  if (typeof window === 'undefined') return null;
  
  const path = window.location.pathname;
  const match = path.match(/\/offer\/([a-f0-9]+)/);
  
  return match ? match[1] : null;
}

/**
 * Store offer token in session storage for checkout
 * @param {string} token - Offer token
 */
export function storeOfferToken(token) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('activeOfferToken', token);
}

/**
 * Retrieve stored offer token
 * @returns {string|null} - Offer token or null
 */
export function getStoredOfferToken() {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('activeOfferToken');
}

/**
 * Clear stored offer token
 */
export function clearStoredOfferToken() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('activeOfferToken');
}

export default {
  isOfferValid,
  calculateDiscountedPrice,
  calculateSavings,
  getTimeRemaining,
  formatTimeRemaining,
  generateOfferUrl,
  markOfferAsUsed,
  validateOffer,
  getOfferTokenFromUrl,
  storeOfferToken,
  getStoredOfferToken,
  clearStoredOfferToken
};
