
import React, { useState, useMemo, useEffect } from 'react';
import { Trade, TradeOpType, UserRole, SortConfig, SortDirection, SortableKeys } from '../types';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal'; 
import { useAuth } from '../hooks/useAuth';
import SortableTableHeader from '../components/SortableTableHeader';
import { fetchDataFromSheet, postDataToSheet, updateDataInSheet, deleteDataFromSheet, SheetOperationResponse } from '../services/googleSheetsService';
import { formatDateToYYYYMMDD } from '../utils/dateUtils'; // Import the new utility

type TradeSortKeys = SortableKeys<Trade>;

const TradesPage: React.FC = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { currentUser } = useAuth();
  
  // Add New Trade Form State
  const [newTradeName, setNewTradeName] = useState<string>('');
  const [newTradeDate, setNewTradeDate] = useState<string>(formatDateToYYYYMMDD(new Date())); // Use formatter
  const [newProfitLoss, setNewProfitLoss] = useState<string>('');
  const [newTradeType, setNewTradeType] = useState<TradeOpType>(TradeOpType.BUY);
  const [addFormError, setAddFormError] = useState<string>('');
  const [isSubmittingAdd, setIsSubmittingAdd] = useState<boolean>(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [editTradeName, setEditTradeName] = useState<string>('');
  const [editTradeDate, setEditTradeDate] = useState<string>('');
  const [editProfitLoss, setEditProfitLoss] = useState<string>('');
  const [editTradeType, setEditTradeType] = useState<TradeOpType>(TradeOpType.BUY);
  const [editModalError, setEditModalError] = useState<string>('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  
  // Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deletingTradeId, setDeletingTradeId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string>('');
  const [isSubmittingDelete, setIsSubmittingDelete] = useState<boolean>(false);
  
  const [sortConfig, setSortConfig] = useState<SortConfig<Trade> | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string>(''); // For general feedback

  const isAdmin = useMemo(() => currentUser?.role === UserRole.ADMIN, [currentUser]);

  const fetchTrades = async () => {
    setIsLoading(true);
    setFeedbackMessage('');
    const { trades: fetchedTrades } = await fetchDataFromSheet();
    setTrades(fetchedTrades); 
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTrades();
  }, []);

  const resetAddForm = () => {
    setNewTradeName('');
    setNewTradeDate(formatDateToYYYYMMDD(new Date())); // Use formatter
    setNewProfitLoss('');
    setNewTradeType(TradeOpType.BUY);
    setAddFormError('');
  };

  const validateForm = (name: string, pnl: string, currentErrorSetter: (error: string) => void): boolean => {
    currentErrorSetter('');
    const parsedProfitLoss = parseFloat(pnl);
    if (isNaN(parsedProfitLoss)) {
      currentErrorSetter('Please enter a valid profit or loss amount.');
      return false;
    }
    if (!name.trim()) {
      currentErrorSetter('Please enter a trade name.');
      return false;
    }
    return true;
  };

  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
        setAddFormError("You don't have permission to add trades.");
        return;
    }
    if (!validateForm(newTradeName, newProfitLoss, setAddFormError)) return;

    setIsSubmittingAdd(true);
    setFeedbackMessage('');
    const tradeToAdd: Omit<Trade, 'id'> = { 
      name: newTradeName.trim(),
      date: newTradeDate, // Already YYYY-MM-DD
      profitLoss: parseFloat(newProfitLoss),
      type: newTradeType,
    };
    
    const response: SheetOperationResponse = await postDataToSheet('Trades', tradeToAdd as Trade); 
    
    if (response.status === 'success' && response.data && (response.data as Trade).id) {
      setTrades(prev => [...prev, response.data as Trade]); 
      resetAddForm();
      setFeedbackMessage('Trade added successfully!');
    } else {
      setAddFormError(response.message || 'Failed to add trade. Please try again.');
    }
    setIsSubmittingAdd(false);
    setTimeout(() => setFeedbackMessage(''), 3000);
  };

  // --- Edit Functionality ---
  const openEditModal = (trade: Trade) => {
    if (!isAdmin) return;
    setEditingTrade(trade);
    setEditTradeName(trade.name);
    setEditTradeDate(formatDateToYYYYMMDD(trade.date)); // Use formatter
    setEditProfitLoss(String(trade.profitLoss));
    setEditTradeType(trade.type);
    setEditModalError('');
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingTrade(null);
  };

  const handleUpdateTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrade || !isAdmin) {
        setEditModalError("Cannot update trade. Required data missing or insufficient permissions.");
        return;
    }
    if (!validateForm(editTradeName, editProfitLoss, setEditModalError)) return;

    setIsSubmittingEdit(true);
    setFeedbackMessage('');
    const updatedTrade: Trade = {
      ...editingTrade,
      name: editTradeName.trim(),
      date: editTradeDate, // Already YYYY-MM-DD
      profitLoss: parseFloat(editProfitLoss),
      type: editTradeType,
    };

    const response = await updateDataInSheet('Trades', updatedTrade);
    if (response.status === 'success') {
      const finalUpdatedTrade = response.data && typeof response.data === 'object' && 'id' in response.data ? response.data as Trade : updatedTrade;
      setTrades(prev => prev.map(t => (t.id === finalUpdatedTrade.id ? finalUpdatedTrade : t)));
      closeEditModal();
      setFeedbackMessage('Trade updated successfully!');
    } else {
      setEditModalError(response.message || 'Failed to update trade. Please try again.');
    }
    setIsSubmittingEdit(false);
    setTimeout(() => setFeedbackMessage(''), 3000);
  };

  // --- Delete Functionality ---
  const openDeleteModal = (tradeId: string) => {
    if (!isAdmin) return;
    setDeletingTradeId(tradeId);
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingTradeId(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTradeId || !isAdmin) {
        setDeleteError("Cannot delete trade. ID missing or insufficient permissions.");
        return;
    }
    setIsSubmittingDelete(true);
    setFeedbackMessage('');
    const response = await deleteDataFromSheet('Trades', deletingTradeId);
    if (response.status === 'success') {
      setTrades(prev => prev.filter(t => t.id !== deletingTradeId));
      closeDeleteModal();
      setFeedbackMessage('Trade deleted successfully!');
    } else {
      setDeleteError(response.message || 'Failed to delete trade. Please try again.');
    }
    setIsSubmittingDelete(false);
    setTimeout(() => setFeedbackMessage(''), 3000);
  };

  const sortedTrades = useMemo(() => {
    let sortableItems = [...trades];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === SortDirection.ASC ? aVal - bVal : bVal - aVal;
        }
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortConfig.direction === SortDirection.ASC ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
         if (sortConfig.key === 'date') {
             // Dates are already YYYY-MM-DD
             return sortConfig.direction === SortDirection.ASC ? new Date(aVal).getTime() - new Date(bVal).getTime() : new Date(bVal).getTime() - new Date(aVal).getTime();
        }
        return 0;
      });
    } else {
        sortableItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Default sort
    }
    return sortableItems;
  }, [trades, sortConfig]);

  const requestSort = (key: TradeSortKeys) => {
    let direction = SortDirection.ASC;
    if (sortConfig && sortConfig.key === key && sortConfig.direction === SortDirection.ASC) {
      direction = SortDirection.DESC;
    }
    setSortConfig({ key, direction });
  };
  
  const renderAddTradeFormFields = () => (
     <>
        <Input
            label="Trade Name (e.g., Bitcoin, Ethereum)"
            type="text"
            id="newTradeName"
            value={newTradeName}
            onChange={(e) => setNewTradeName(e.target.value)}
            placeholder="Enter trade name"
            required
            disabled={isSubmittingAdd}
          />
          <Input
            label="Trade Date"
            type="date"
            id="newTradeDate"
            value={newTradeDate} // Already YYYY-MM-DD
            onChange={(e) => setNewTradeDate(e.target.value)}
            required
            disabled={isSubmittingAdd}
          />
          <Input
            label="Profit or Loss"
            type="number"
            id="newProfitLoss"
            value={newProfitLoss}
            onChange={(e) => setNewProfitLoss(e.target.value)}
            placeholder="Enter profit (positive) or loss (negative)"
            step="0.01"
            required
            disabled={isSubmittingAdd}
          />
          <Select id="newTradeType" label="Trade Type" value={newTradeType} onChange={(e) => setNewTradeType(e.target.value as TradeOpType)} required disabled={isSubmittingAdd}>
            <option value={TradeOpType.BUY}>Buy</option>
            <option value={TradeOpType.SELL}>Sell</option>
          </Select>
          {addFormError && <p className="text-sm text-red-400" role="alert">{addFormError}</p>}
     </>
  );

  const renderEditTradeFormFields = () => (
    <>
       <Input
           label="Trade Name (e.g., Bitcoin, Ethereum)"
           type="text"
           id="editTradeName"
           value={editTradeName}
           onChange={(e) => setEditTradeName(e.target.value)}
           placeholder="Enter trade name"
           required
           disabled={isSubmittingEdit}
         />
         <Input
           label="Trade Date"
           type="date"
           id="editTradeDate"
           value={editTradeDate} // Already YYYY-MM-DD
           onChange={(e) => setEditTradeDate(e.target.value)}
           required
           disabled={isSubmittingEdit}
         />
         <Input
           label="Profit or Loss"
           type="number"
           id="editProfitLoss"
           value={editProfitLoss}
           onChange={(e) => setEditProfitLoss(e.target.value)}
           placeholder="Enter profit (positive) or loss (negative)"
           step="0.01"
           required
           disabled={isSubmittingEdit}
         />
         <Select id="editTradeType" label="Trade Type" value={editTradeType} onChange={(e) => setEditTradeType(e.target.value as TradeOpType)} required disabled={isSubmittingEdit}>
           <option value={TradeOpType.BUY}>Buy</option>
           <option value={TradeOpType.SELL}>Sell</option>
         </Select>
         {editModalError && <p className="text-sm text-red-400" role="alert">{editModalError}</p>}
    </>
 );
  
  if (isLoading) {
    return <div className="text-center py-10">Loading trades...</div>;
  }

  return (
    <div className="space-y-8">
      {feedbackMessage && (
        <div className={`p-4 mb-4 text-sm rounded-md ${feedbackMessage.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`} role="alert">
          {feedbackMessage}
        </div>
      )}
      {isAdmin && (
        <Card title="Add New Trade">
          <form onSubmit={handleAddTrade} className="space-y-4">
            {renderAddTradeFormFields()}
            <Button type="submit" variant="primary" isLoading={isSubmittingAdd} disabled={isSubmittingAdd}>Add Trade</Button>
          </form>
        </Card>
      )}

      <Card title="Trade History">
        {sortedTrades.length === 0 ? (
          <p className="text-gray-400">No trades recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-750">
                <tr>
                  <SortableTableHeader<Trade> name="Date" sortKey="date" currentSortConfig={sortConfig} onRequestSort={requestSort} />
                  <SortableTableHeader<Trade> name="Name" sortKey="name" currentSortConfig={sortConfig} onRequestSort={requestSort} />
                  <SortableTableHeader<Trade> name="Type" sortKey="type" currentSortConfig={sortConfig} onRequestSort={requestSort} />
                  <SortableTableHeader<Trade> name="Profit/Loss" sortKey="profitLoss" currentSortConfig={sortConfig} onRequestSort={requestSort} />
                  {isAdmin && <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {sortedTrades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-gray-700/30">
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">{formatDateToYYYYMMDD(trade.date)}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">{trade.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">{trade.type}</td>
                    <td className={`px-4 py-2 whitespace-nowrap text-sm font-semibold ${typeof trade.profitLoss === 'number' && trade.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${typeof trade.profitLoss === 'number' ? trade.profitLoss.toFixed(2) : 'N/A'}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm space-x-2">
                        <Button variant="secondary" size="sm" onClick={() => openEditModal(trade)} disabled={isSubmittingEdit || isSubmittingDelete}>Edit</Button>
                        <Button variant="danger" size="sm" onClick={() => openDeleteModal(trade.id)} disabled={isSubmittingEdit || isSubmittingDelete}>Delete</Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit Trade Modal */}
      {isAdmin && isEditModalOpen && editingTrade && (
        <Modal isOpen={isEditModalOpen} onClose={closeEditModal} title="Edit Trade">
          <form onSubmit={handleUpdateTrade} className="space-y-4">
            {renderEditTradeFormFields()}
            <div className="flex justify-end space-x-3 mt-6">
                <Button type="button" variant="secondary" onClick={closeEditModal} disabled={isSubmittingEdit}>Cancel</Button>
                <Button type="submit" variant="primary" isLoading={isSubmittingEdit} disabled={isSubmittingEdit}>Save Changes</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {isAdmin && isDeleteModalOpen && (
        <Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal} title="Confirm Delete Trade">
          <p>Are you sure you want to delete this trade? This action may not be reversible if the backend does not support soft deletes.</p>
          {deleteError && <p className="text-sm text-red-400 mt-2" role="alert">{deleteError}</p>}
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="secondary" onClick={closeDeleteModal} disabled={isSubmittingDelete}>Cancel</Button>
            <Button variant="danger" onClick={handleConfirmDelete} isLoading={isSubmittingDelete} disabled={isSubmittingDelete}>Delete Trade</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TradesPage;
