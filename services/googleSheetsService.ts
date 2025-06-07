
import { Transaction, Trade, UserProfile, User } from '../types'; 

const GOOGLE_SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbykoxxzmiNc0Ywf6rdA72Z6C_fZWOG9k2nSyLFiebyVENjfJz3dNIW0RITwynpn1fj6/exec';
const USER_PROFILES_SHEET_NAME = "UserProfiles"; 

export interface SheetOperationResponse {
  status: 'success' | 'error' | string; 
  data?: Transaction | Trade | UserProfile | { id: string } | any; 
  message?: string;
  addedRow?: Transaction | Trade | UserProfile; 
  updatedRow?: Transaction | Trade | UserProfile; 
}

export const fetchDataFromSheet = async (): Promise<{ transactions: Transaction[]; trades: Trade[]; userProfiles: UserProfile[] }> => {
  if (!GOOGLE_SHEETS_WEB_APP_URL.startsWith('https://script.google.com')) {
    console.error('Google Sheets Web App URL is not correctly configured in googleSheetsService.ts');
    alert('Application is not configured to connect to the backend. Please contact support.');
    return { transactions: [], trades: [], userProfiles: [] };
  }
  try {
    const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL); 
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network response was not ok.' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    const transactions = (data.transactions || data.Transactions || []).map((tx: any) => ({
        ...tx,
        id: String(tx.id || ''), 
        amount: parseFloat(tx.amount) || 0,
    }));
    const trades = (data.trades || data.Trades || []).map((trade: any) => ({
        ...trade,
        id: String(trade.id || ''), 
        profitLoss: parseFloat(trade.profitLoss) || 0,
    }));
    const userProfiles = (data.userProfiles || data.UserProfiles || []).map((profile: any) => ({
        ...profile,
        id: profile.id as User, 
        profitShare: parseFloat(profile.profitShare) || 0,
        // Ensure passwordHash is always a string, defaulting to empty if not present or null
        passwordHash: profile.passwordHash ? String(profile.passwordHash) : "", 
    }));
    
    return {
        transactions,
        trades,
        userProfiles
    };
  } catch (error: any) {
    console.error('Error processing data from Google Sheets:', error);
    return { transactions: [], trades: [], userProfiles: [] }; 
  }
};

export const postDataToSheet = async (
  sheetNameInApp: 'Transactions' | 'Trades', 
  rowData: Transaction | Trade
): Promise<SheetOperationResponse> => {
   if (!GOOGLE_SHEETS_WEB_APP_URL.startsWith('https://script.google.com')) {
    return { status: 'error', message: 'Configuration error.' };
  }
  try {
    const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
      method: 'POST',
      mode: 'cors', 
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ action: 'create', sheetName: sheetNameInApp, rowData: rowData }), 
    });

    if (!response.ok) {
      const errorText = await response.text(); 
      const errorData = JSON.parse(errorText || '{ "message": "Network response was not ok during POST (create)." }');
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    const responseData: SheetOperationResponse = await response.json();
    if (responseData.status === 'success' && responseData.data) {
        const entity = responseData.data as any; 
        if (sheetNameInApp === 'Transactions' && 'amount' in entity) entity.amount = parseFloat(entity.amount as any) || 0;
        else if (sheetNameInApp === 'Trades' && 'profitLoss' in entity) entity.profitLoss = parseFloat(entity.profitLoss as any) || 0;
        return { ...responseData, addedRow: entity }; // Compatibility
    }
    return responseData;

  } catch (error: any) {
    console.error('Error posting data (create) to Google Sheets:', error);
    return { status: 'error', message: (error as Error).message || 'Unknown error occurred' };
  }
};

export const updateDataInSheet = async (
  sheetNameInApp: 'Transactions' | 'Trades' | 'UserProfiles',
  rowData: Transaction | Trade | UserProfile 
): Promise<SheetOperationResponse> => {
  if (!GOOGLE_SHEETS_WEB_APP_URL.startsWith('https://script.google.com')) {
    return { status: 'error', message: 'Configuration error.' };
  }
  try {
    const payload = { action: 'update', sheetName: sheetNameInApp, rowData: rowData };
    
    const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorData = JSON.parse(errorText || '{ "message": "Network response was not ok during POST (update)." }');
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    const responseData: SheetOperationResponse = await response.json();
    if (responseData.status === 'success' && responseData.data) {
        const entity = responseData.data as any;
        if (sheetNameInApp === 'Transactions' && 'amount' in entity) entity.amount = parseFloat(entity.amount as any) || 0;
        else if (sheetNameInApp === 'Trades' && 'profitLoss' in entity) entity.profitLoss = parseFloat(entity.profitLoss as any) || 0;
        else if (sheetNameInApp === USER_PROFILES_SHEET_NAME && 'profitShare' in entity) entity.profitShare = parseFloat(entity.profitShare as any) || 0;
        return { ...responseData, updatedRow: entity }; 
    }
    return responseData;
  } catch (error: any) {
    console.error('Error updating data in Google Sheets:', error);
    return { status: 'error', message: (error as Error).message || 'Unknown error during update' };
  }
};

export const deleteDataFromSheet = async (
  sheetNameInApp: 'Transactions' | 'Trades',
  rowId: string
): Promise<SheetOperationResponse> => {
  if (!GOOGLE_SHEETS_WEB_APP_URL.startsWith('https://script.google.com')) {
    return { status: 'error', message: 'Configuration error.' };
  }
  try {
    const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ action: 'delete', sheetName: sheetNameInApp, rowId: rowId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorData = JSON.parse(errorText || '{ "message": "Network response was not ok during POST (delete)." }');
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return await response.json() as SheetOperationResponse;
  } catch (error: any) {
    console.error('Error deleting data from Google Sheets:', error);
    return { status: 'error', message: (error as Error).message || 'Unknown error during delete' };
  }
};
