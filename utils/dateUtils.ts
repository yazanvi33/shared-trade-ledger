// utils/dateUtils.ts
export const formatDateToYYYYMMDD = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return '';

  try {
    // If it's already a string and looks like YYYY-MM-DD (possibly with T part)
    if (typeof dateInput === 'string') {
      if (dateInput.includes('T')) {
        const datePart = dateInput.split('T')[0];
        // Validate if the datePart is indeed YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
           const d = new Date(datePart + 'T00:00:00Z'); // Parse as UTC to avoid timezone shifts affecting date part
           if (!isNaN(d.getTime())) return datePart;
        }
      }
      // If it's just YYYY-MM-DD, validate it and return.
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        const d = new Date(dateInput + 'T00:00:00Z'); // Parse as UTC
        if (!isNaN(d.getTime())) return dateInput;
      }
    }
    
    // If it's a Date object or a string that needs full parsing
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) { // Check for invalid date
        // console.warn(`Invalid date value encountered: ${dateInput}`);
        // Fallback for completely unparseable strings, though risky
        if (typeof dateInput === 'string' && dateInput.length >= 10) return dateInput.substring(0,10);
        throw new Error('Invalid date value');
    }

    // toISOString() returns in 'YYYY-MM-DDTHH:mm:ss.sssZ' format (UTC).
    // We want the YYYY-MM-DD part.
    return date.toISOString().split('T')[0];

  } catch (error) {
    // console.warn(`Error formatting date: ${dateInput}`, error);
    // Fallback for unexpected string formats or errors during parsing
    if (typeof dateInput === 'string') {
        if (dateInput.includes('T')) return dateInput.split('T')[0];
        if (dateInput.length >= 10) return dateInput.substring(0,10); // Attempt to take first 10 chars
        return dateInput;
    }
    return '';
  }
};
