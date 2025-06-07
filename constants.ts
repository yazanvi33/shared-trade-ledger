
import { UserProfiles, User, AuthUser, UserRole } from './types';
// Removed hashPasswordSync import as it's not used here anymore for initialization

export const ROUTE_PATHS = {
  HOME: '/', 
  TRADES: '/trades', 
  REPORT: '/report', 
  SETTINGS: '/settings',
  REPORT_TRANSACTIONS: '/report/transactions', 
  REPORT_TRADES_DETAILS: '/report/trades-details',
  LOGIN: '/login', 
};

export const APP_NAME = "Shared Trade Ledger";
export const USER_PROFILES_SHEET_NAME = "UserProfiles"; 

// Default user profiles, passwordHash will be populated from Sheets or on first set.
export const DEFAULT_USER_PROFILES: UserProfiles = {
  [User.YAZAN]: {
    id: User.YAZAN, 
    name: User.YAZAN,
    phone: '111-111-1111',
    email: 'yazan@example.com',
    profilePic: 'https://d.top4top.io/p_34430ygmn1.png', 
    profitShare: 50,
    passwordHash: '', // Initialize as empty, will be fetched or set
  },
  [User.GHADEER]: {
    id: User.GHADEER, 
    name: User.GHADEER,
    phone: '222-222-2222',
    email: 'ghadeer@example.com',
    profilePic: 'https://e.top4top.io/p_3443imodh2.jpg', 
    profitShare: 50,
    passwordHash: '', // Initialize as empty, will be fetched or set
  },
};

// INITIAL_AUTH_USERS and RAW_PASSWORDS are removed.
// Password hashes are now managed via Google Sheets.
// The initial setup of passwords (if any) would happen by:
// 1. Manually adding a hash to Google Sheet for existing users OR
// 2. The user setting their password for the first time via the app, which then saves the hash.

// --- Quick Filter Ranges for P/L Chart ---
export const QUICK_FILTER_RANGES = {
  TODAY: 'Today',
  YESTERDAY: 'Yesterday',
  THIS_WEEK: 'This Week',
  THIS_MONTH: 'This Month',
  LAST_MONTH: 'Last Month',
  ALL_TIME: 'All Time',
};
