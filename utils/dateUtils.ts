// utils/dateUtils.ts
export const formatDateToYYYYMMDD = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return '';

  if (typeof dateInput === 'string') {
    // If it's already a YYYY-MM-DD string (potentially with a T part from old data or direct input),
    // trust the date part. This assumes backend sends correct calendar date.
    const datePart = dateInput.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return datePart;
    }

    // Fallback for other string formats (e.g., full ISO with time)
    // Parse and get UTC date parts to ensure consistency if it's not a plain YYYY-MM-DD.
    // This path should ideally be hit less if backend sends clean YYYY-MM-DD.
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return ''; // Invalid date string

    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1; // getUTCMonth is 0-indexed
    const day = d.getUTCDate();

    const monthStr = month < 10 ? '0' + month : String(month);
    const dayStr = day < 10 ? '0' + day : String(day);
    return `${year}-${monthStr}-${dayStr}`;

  } else if (dateInput instanceof Date) {
    // If a Date object is passed (e.g., from new Date() on frontend for 'today'),
    // use its UTC components for consistency.
    const year = dateInput.getUTCFullYear();
    const month = dateInput.getUTCMonth() + 1; 
    const day = dateInput.getUTCDate();

    const monthStr = month < 10 ? '0' + month : String(month);
    const dayStr = day < 10 ? '0' + day : String(day);
    return `${year}-${monthStr}-${dayStr}`;
  }
  
  return ''; // Should not be reached if input is valid and handled above
};
