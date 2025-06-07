
import { Transaction, Trade } from '../types';

// IMPORTANT: Updated URL to the user's provided Google Apps Script Web App URL
const GOOGLE_SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbykoxxzmiNc0Ywf6rdA72Z6C_fZWOG9k2nSyLFiebyVENjfJz3dNIW0RITwynpn1fj6/exec';

// Updated to be more generic, 'data' can hold addedRow, updatedRow, etc.
export interface SheetOperationResponse {
  status: 'success' | 'error' | string; // Allow string for flexibility if backend sends other statuses
  data?: Transaction | Trade | { id: string } | any; // Can hold the entity or just an ID
  message?: string;
}


/**
 * Fetches all transactions and trades data from Google Sheets.
 */
export const fetchDataFromSheet = async (): Promise<{ transactions: Transaction[]; trades: Trade[] }> => {
  if (!GOOGLE_SHEETS_WEB_APP_URL.startsWith('https://script.google.com')) {
    console.error('Google Sheets Web App URL is not correctly configured in googleSheetsService.ts');
    alert('Application is not configured to connect to the backend. Please contact support.');
    return { transactions: [], trades: [] };
  }
  try {
    const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL); // GET request
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network response was not ok.' }));
      console.error('Error fetching data from Google Sheets:', errorData.message || `HTTP error! status: ${response.status}`);
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    const transactions = (data.transactions || data.Transactions || []).map((tx: any) => ({
        ...tx,
        amount: parseFloat(tx.amount) || 0,
    }));
    const trades = (data.trades || data.Trades || []).map((trade: any) => ({
        ...trade,
        profitLoss: parseFloat(trade.profitLoss) || 0,
    }));
    
    return {
        transactions,
        trades
    };
  } catch (error: any) {
    console.error('Error processing data from Google Sheets:', error);
    return { transactions: [], trades: [] }; 
  }
};

/**
 * Posts a new data entry (transaction or trade) to the specified Google Sheet.
 * @param sheetNameInApp The name of the sheet as used in the app (e.g., "Transactions" or "Trades")
 * @param rowData The transaction or trade object to add.
 */
export const postDataToSheet = async (
  sheetNameInApp: 'Transactions' | 'Trades',
  rowData: Transaction | Trade
): Promise<SheetOperationResponse> => {
  if (!GOOGLE_SHEETS_WEB_APP_URL.startsWith('https://script.google.com')) {
     console.error('Google Sheets Web App URL is not correctly configured in googleSheetsService.ts');
     alert('Application is not configured to connect to the backend. Please contact support.');
    return { status: 'error', message: 'Configuration error.' };
  }
  try {
    const sheetNameForPayload = sheetNameInApp; 

    const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
      method: 'POST',
      mode: 'cors', 
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8', // As per GAS `doPost` best practices for JSON payloads
      },
      body: JSON.stringify({ action: 'create', sheetName: sheetNameForPayload, rowData: rowData }), 
    });

    if (!response.ok) {
      const errorText = await response.text(); 
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText || 'Network response was not ok during POST (create).' };
      }
      console.error('Error posting data (create) to Google Sheets:', errorData.message || `HTTP error! status: ${response.status}`);
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    const responseData = await response.json();

    // The backend uses 'addedRow' key for create operations
    if (responseData.addedRow) {
        const entity = responseData.addedRow;
        if (sheetNameInApp === 'Transactions' && 'amount' in entity) {
            entity.amount = parseFloat(entity.amount as any) || 0;
        } else if (sheetNameInApp === 'Trades' && 'profitLoss' in entity) {
            entity.profitLoss = parseFloat(entity.profitLoss as any) || 0;
        }
        return { status: responseData.status || 'success', data: entity, message: responseData.message };
    }
    return responseData as SheetOperationResponse; // Ensure type consistency

  } catch (error: any) {
    console.error('Error posting data (create) to Google Sheets (catch block):', error);
    return { status: 'error', message: (error as Error).message || 'Unknown error occurred' };
  }
};

/**
 * Updates an existing data entry in the specified Google Sheet.
 * @param sheetNameInApp The name of the sheet (e.g., "Trades").
 * @param rowData The full updated trade or transaction object, including its ID.
 */
export const updateDataInSheet = async (
  sheetNameInApp: 'Transactions' | 'Trades',
  rowData: Transaction | Trade // Must contain an 'id'
): Promise<SheetOperationResponse> => {
  if (!GOOGLE_SHEETS_WEB_APP_URL.startsWith('https://script.google.com')) {
    return { status: 'error', message: 'Configuration error.' };
  }
  try {
    const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ action: 'update', sheetName: sheetNameInApp, rowData: rowData }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorData = JSON.parse(errorText || '{ "message": "Network response was not ok during POST (update)." }');
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    const responseData = await response.json();
     // Assuming backend returns 'updatedRow' for successful update
    if (responseData.updatedRow) {
        const entity = responseData.updatedRow;
        if (sheetNameInApp === 'Transactions' && 'amount' in entity) {
            entity.amount = parseFloat(entity.amount as any) || 0;
        } else if (sheetNameInApp === 'Trades' && 'profitLoss' in entity) {
            entity.profitLoss = parseFloat(entity.profitLoss as any) || 0;
        }
         return { status: responseData.status || 'success', data: entity, message: responseData.message };
    }
    return responseData as SheetOperationResponse;
  } catch (error: any) {
    console.error('Error updating data in Google Sheets:', error);
    return { status: 'error', message: (error as Error).message || 'Unknown error during update' };
  }
};

/**
 * Deletes a data entry from the specified Google Sheet using its ID.
 * @param sheetNameInApp The name of the sheet (e.g., "Trades").
 * @param rowId The ID of the row to delete.
 */
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
    // For delete, backend might just return { status: 'success', message: '...' }
    // Or it could return { status: 'success', data: { id: rowId }, message: '...' }
    return await response.json() as SheetOperationResponse;
  } catch (error: any) {
    console.error('Error deleting data from Google Sheets:', error);
    return { status: 'error', message: (error as Error).message || 'Unknown error during delete' };
  }
};

