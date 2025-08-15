/**
 * Safely format a date value, handling undefined, null, or invalid dates
 */
export function formatDate(dateValue: string | Date | undefined | null, fallback: string = 'Just now'): string {
  if (!dateValue) return fallback;
  
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return fallback;
  }
  
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Safely format a date value using toLocaleString, handling undefined, null, or invalid dates
 */
export function formatDateTime(dateValue: string | Date | undefined | null, fallback: string = 'Unknown'): string {
  if (!dateValue) return fallback;
  
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return fallback;
  }
  
  return date.toLocaleString();
}