/**
 * dateUtils.js
 * Helpers for date manipulation and range resolution.
 */

/**
 * Resolves a range string (e.g., 'today', '7d') into an object with startDate and endDate.
 * @param {string} range 
 * @returns {Object|null} { startDate, endDate } or null for 'custom'
 */
export function resolveDateRange(range) {
  const now = new Date();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  switch (range) {
    case 'today':
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      };
    
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      };

    case '7d':
      start.setDate(start.getDate() - 7);
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      };

    case '30d':
      start.setDate(start.getDate() - 30);
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      };

    case 'month':
      start.setDate(1); // First day of current month
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      };

    case 'all':
      return {
        startDate: '',
        endDate: ''
      };

    case 'custom':
      return null;

    default:
      return {
        startDate: '',
        endDate: ''
      };
  }
}

/**
 * Formats a date string into a user-friendly format.
 * @param {string|Date} date 
 * @param {string} [locale='en-IN'] 
 * @returns {string}
 */
export function formatDate(date, locale = 'en-IN') {
  if (!date) return '-';
  return new Date(date).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Formats a date string into a localized time string.
 * @param {string|Date} date 
 * @param {string} [locale='en-IN'] 
 * @returns {string}
 */
export function formatTime(date, locale = 'en-IN') {
  if (!date) return '-';
  return new Date(date).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default {
  resolveDateRange,
  formatDate,
  formatTime
};
