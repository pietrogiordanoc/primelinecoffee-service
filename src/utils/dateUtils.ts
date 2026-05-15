import { format, formatDistance, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Format date to localized string
 */
export function formatDate(date: string | Date, formatStr = 'PPP'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr, { locale: es });
}

/**
 * Format date to relative time (e.g., "hace 2 horas")
 */
export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistance(dateObj, new Date(), { addSuffix: true, locale: es });
}

/**
 * Format date for input fields
 */
export function formatDateForInput(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'yyyy-MM-dd');
}

/**
 * Format datetime for input fields
 */
export function formatDateTimeForInput(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, "yyyy-MM-dd'T'HH:mm");
}
