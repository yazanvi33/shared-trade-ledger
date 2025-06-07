export enum TransactionType {
  DEPOSIT = 'Deposit',
  WITHDRAWAL = 'Withdrawal',
}

export enum User {
  YAZAN = 'Yazan',
  GHADEER = 'Ghadeer',
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  date: string; // YYYY-MM-DD
  description?: string;
  user: User; 
}

export enum TradeOpType {
  BUY = 'Buy',
  SELL = 'Sell',
}

export interface Trade {
  id: string;
  name: string; 
  date: string; // YYYY-MM-DD
  profitLoss: number;
  type: TradeOpType;
}

export interface DailyPnl {
  date: string;
  dailyProfit: number; // Sum of all positive P/L for the day
  dailyLoss: number;   // Sum of absolute values of all negative P/L for the day (stored as positive)
  pnl: number;           // Net P/L for the day: dailyProfit - dailyLoss
  pnlPercentage: number | null; 
}

export interface UserProfile {
  id: User;
  name: string;
  phone: string;
  email: string;
  profilePic: string; 
  profitShare: number; 
  passwordHash?: string; // Added for storing password hash from Google Sheets
}

export interface UserProfiles {
  [User.YAZAN]: UserProfile;
  [User.GHADEER]: UserProfile;
}

export enum ReportFilterUser {
  ALL = 'All',
  YAZAN = User.YAZAN,
  GHADEER = User.GHADEER,
}

export enum ReportFilterTransactionType {
  ALL = 'All',
  DEPOSIT = TransactionType.DEPOSIT,
  WITHDRAWAL = TransactionType.WITHDRAWAL,
}

// --- New types for Auth ---
export enum UserRole {
  ADMIN = 'Admin',    // Full access (Yazan)
  LIMITED = 'Limited', // Limited access (Ghadeer)
}

// AuthUser represents the basic authentication structure, passwordHash might be omitted if managed elsewhere
export interface AuthUser {
  id: User; 
  username: string;
  // passwordHash is now primarily in UserProfile fetched from sheets
  // This structure can still be used for minimal session data or form data if needed
  passwordHash?: string; 
  email: string;
  phone: string;
  role: UserRole;
}

// --- New types for Sorting ---
export type SortableKeys<T> = keyof T;

export enum SortDirection {
  ASC = 'ascending',
  DESC = 'descending',
  NONE = 'none',
}

export interface SortConfig<T> {
  key: SortableKeys<T>;
  direction: SortDirection;
}