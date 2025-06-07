
// import { AuthUser, User } from '../types'; // User might not be needed here anymore
// import { INITIAL_AUTH_USERS, RAW_PASSWORDS } from '../constants'; // No longer used

// const AUTH_USERS_STORAGE_KEY = 'authUsers'; // No longer used for storing full AuthUser objects with hashes

// Simple "hashing" and verification (NOT FOR PRODUCTION - for demo purposes only)
export const hashPasswordSync = (password: string): string => {
  if (!password) return ''; // Handle empty password case
  try {
    // A more unique salt per user would be better, but for demo:
    const salt = "shared_ledger_demo_salt"; 
    return btoa(password + salt); // Basic base64 encoding
  } catch (e) { 
    // btoa might not be available in all environments (e.g. Node.js without polyfills)
    return password + "shared_ledger_demo_salt_fallback";
  }
};

export const verifyPasswordSync = (password: string, hash: string): boolean => {
  if (!password || !hash) return false; // Cannot verify empty password or hash
  return hashPasswordSync(password) === hash;
};


// getAuthUsers, storeAuthUsers, and initializeAuthUsersIfNeeded are removed.
// Password hash management is now centralized via Google Sheets and handled in useAuth.
// Minimal session information (like loggedInUserId) might be stored in localStorage by useAuth.
