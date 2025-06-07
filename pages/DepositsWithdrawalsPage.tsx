
import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, TransactionType, User, UserRole, SortConfig, SortDirection, SortableKeys } from '../types';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { useAuth } from '../hooks/useAuth';
import SortableTableHeader from '../components/SortableTableHeader';
import { fetchDataFromSheet, postDataToSheet, updateDataInSheet, deleteDataFromSheet, SheetOperationResponse } from '../services/googleSheetsService';
import { formatDateToYYYYMMDD } from '../utils/dateUtils'; // Import the new utility

type TransactionSortKeys = SortableKeys<Transaction>;

const DepositsWithdrawalsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const { currentUser } = useAuth();
  
  // Add New Transaction Form State
  const [newAmount, setNewAmount] = useState<string>('');
  const [newType, setNewType] = useState<TransactionType>(TransactionType.DEPOSIT);
  const [newDate, setNewDate] = useState<string>(formatDateToYYYYMMDD(new Date())); // Use formatter
  const [newDescription, setNewDescription] = useState<string>('');
  const [newSelectedUser, setNewSelectedUser] = useState<User>(User.YAZAN); 
  const [addFormError, setAddFormError] = useState<string>('');
  const [isSubmittingAdd, setIsSubmittingAdd] = useState<boolean>(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editType, setEditType] = useState<TransactionType>(TransactionType.DEPOSIT);
  const [editDate, setEditDate] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editSelectedUser, setEditSelectedUser] = useState<User>(User.YAZAN);
  const [editModalError, setEditModalError] = useState<string>('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  
  // Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string>('');
  const [isSubmittingDelete, setIsSubmittingDelete] = useState<boolean>(false);
  
  const [sortConfig, setSortConfig] = useState<SortConfig<Transaction> | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');

  const isAdmin = useMemo(() => currentUser?.role === UserRole.ADMIN, [currentUser]);

  const fetchTransactions = async () => {
    setIsLoadingData(true);
    setFeedbackMessage('');
    const { transactions: fetchedTransactions } = await fetchDataFromSheet();
    setTransactions(fetchedTransactions);
    setIsLoadingData(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const resetAddForm = () => {
    setNewAmount('');
    setNewType(TransactionType.DEPOSIT);
    setNewDate(formatDateToYYYYMMDD(new Date())); // Use formatter
    setNewDescription('');
    setNewSelectedUser(User.YAZAN);
    setAddFormError('');
  };

  const validateTransactionForm = (amountStr: string, currentErrorSetter: (error: string) => void): boolean => {
    currentErrorSetter('');
    const parsedAmount = parseFloat(amountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      currentErrorSetter('Please enter a valid positive amount.');
      return false;
    }
    return true;
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
        setAddFormError("You don't have permission to add transactions.");
        return;
    }
    if (!validateTransactionForm(newAmount, setAddFormError)) return;

    setIsSubmittingAdd(true);
    setFeedbackMessage('');

    const transactionToAdd: Omit<Transaction, 'id'> = {
      amount: parseFloat(newAmount),
      type: newType,
      date: newDate, // Already YYYY-MM-DD
      description: newDescription,
      user: newSelectedUser, 
    };

    const response: SheetOperationResponse = await postDataToSheet('Transactions', transactionToAdd as Transaction);
    
    if (response.status === 'success' && response.data && (response.data as Transaction).id) {
      setTransactions(prev => [...prev, response.data as Transaction]);
      resetAddForm();
      setFeedbackMessage('Transaction added successfully!');
    } else {
      setAddFormError(response.message || 'Failed to add transaction. Please try again.');
    }
    setIsSubmittingAdd(false);
    setTimeout(() => setFeedbackMessage(''), 3000);
  };

  // --- Edit Functionality ---
  const openEditModal = (transaction: Transaction) => {
    if (!isAdmin) return;
    setEditingTransaction(transaction);
    setEditAmount(String(transaction.amount));
    setEditType(transaction.type);
    setEditDate(formatDateToYYYYMMDD(transaction.date)); // Use formatter
    setEditDescription(transaction.description || '');
    setEditSelectedUser(transaction.user);
    setEditModalError('');
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingTransaction(null);
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction || !isAdmin) {
        setEditModalError("Cannot update transaction. Required data missing or insufficient permissions.");
        return;
    }
    if (!validateTransactionForm(editAmount, setEditModalError)) return;

    setIsSubmittingEdit(true);
    setFeedbackMessage('');
    const updatedTransactionData: Transaction = {
      ...editingTransaction,
      amount: parseFloat(editAmount),
      type: editType,
      date: editDate, // Already YYYY-MM-DD
      description: editDescription,
      user: editSelectedUser,
    };

    const response = await updateDataInSheet('Transactions', updatedTransactionData);
    if (response.status === 'success') {
      const finalUpdatedTx = response.data && typeof response.data === 'object' && 'id' in response.data ? response.data as Transaction : updatedTransactionData;
      setTransactions(prev => prev.map(tx => (tx.id === finalUpdatedTx.id ? finalUpdatedTx : tx)));
      closeEditModal();
      setFeedbackMessage('Transaction updated successfully!');
    } else {
      setEditModalError(response.message || 'Failed to update transaction. Please try again.');
    }
    setIsSubmittingEdit(false);
    setTimeout(() => setFeedbackMessage(''), 3000);
  };

  // --- Delete Functionality ---
  const openDeleteModal = (transactionId: string) => {
    if (!isAdmin) return;
    setDeletingTransactionId(transactionId);
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingTransactionId(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTransactionId || !isAdmin) {
        setDeleteError("Cannot delete transaction. ID missing or insufficient permissions.");
        return;
    }
    setIsSubmittingDelete(true);
    setFeedbackMessage('');
    const response = await deleteDataFromSheet('Transactions', deletingTransactionId);
    if (response.status === 'success') {
      setTransactions(prev => prev.filter(tx => tx.id !== deletingTransactionId));
      closeDeleteModal();
      setFeedbackMessage('Transaction deleted successfully!');
    } else {
      setDeleteError(response.message || 'Failed to delete transaction. Please try again.');
    }
    setIsSubmittingDelete(false);
    setTimeout(() => setFeedbackMessage(''), 3000);
  };
  
  const sortedTransactions = useMemo(() => {
    let sortableItems = [...transactions];
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
             // Dates are already YYYY-MM-DD, direct comparison works or use new Date()
             return sortConfig.direction === SortDirection.ASC ? new Date(aVal).getTime() - new Date(bVal).getTime() : new Date(bVal).getTime() - new Date(aVal).getTime();
        }
        return 0;
      });
    } else {
        sortableItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return sortableItems;
  }, [transactions, sortConfig]);

  const requestSort = (key: TransactionSortKeys) => {
    let direction = SortDirection.ASC;
    if (sortConfig && sortConfig.key === key && sortConfig.direction === SortDirection.ASC) {
      direction = SortDirection.DESC;
    } else if (sortConfig && sortConfig.key === key && sortConfig.direction === SortDirection.DESC) {
        direction = SortDirection.ASC; 
    }
    setSortConfig({ key, direction });
  };

  const renderAddTransactionFormFields = () => (
    <>
      <Input
        label="Amount"
        type="number"
        id="newAmount"
        value={newAmount}
        onChange={(e) => setNewAmount(e.target.value)}
        placeholder="Enter amount"
        min="0.01"
        step="0.01"
        required
        aria-required="true"
        disabled={isSubmittingAdd}
      />
      <Select 
        label="Transaction Type" 
        id="newType"
        value={newType} 
        onChange={(e) => setNewType(e.target.value as TransactionType)} 
        required 
        aria-required="true"
        disabled={isSubmittingAdd}
      >
        <option value={TransactionType.DEPOSIT}>Deposit</option>
        <option value={TransactionType.WITHDRAWAL}>Withdrawal</option>
      </Select>
      <Select 
        label="User" 
        id="newSelectedUser"
        value={newSelectedUser} 
        onChange={(e) => setNewSelectedUser(e.target.value as User)} 
        required 
        aria-required="true"
        disabled={isSubmittingAdd}
      >
        <option value={User.YAZAN}>{User.YAZAN}</option>
        <option value={User.GHADEER}>{User.GHADEER}</option>
      </Select>
      <Input
        label="Date"
        type="date"
        id="newDate"
        value={newDate} // Already YYYY-MM-DD
        onChange={(e) => setNewDate(e.target.value)}
        required
        aria-required="true"
        disabled={isSubmittingAdd}
      />
      <Input
        label="Description (Optional)"
        type="text"
        id="newDescription"
        value={newDescription}
        onChange={(e) => setNewDescription(e.target.value)}
        placeholder="e.g., Initial capital, Salary withdrawal"
        disabled={isSubmittingAdd}
      />
      {addFormError && <p role="alert" className="text-sm text-red-400">{addFormError}</p>}
    </>
  );

  const renderEditTransactionFormFields = () => (
    <>
      <Input
        label="Amount"
        type="number"
        id="editAmount"
        value={editAmount}
        onChange={(e) => setEditAmount(e.target.value)}
        placeholder="Enter amount"
        min="0.01"
        step="0.01"
        required
        aria-required="true"
        disabled={isSubmittingEdit}
      />
      <Select 
        label="Transaction Type" 
        id="editType"
        value={editType} 
        onChange={(e) => setEditType(e.target.value as TransactionType)} 
        required 
        aria-required="true"
        disabled={isSubmittingEdit}
      >
        <option value={TransactionType.DEPOSIT}>Deposit</option>
        <option value={TransactionType.WITHDRAWAL}>Withdrawal</option>
      </Select>
      <Select 
        label="User" 
        id="editSelectedUser"
        value={editSelectedUser} 
        onChange={(e) => setEditSelectedUser(e.target.value as User)} 
        required 
        aria-required="true"
        disabled={isSubmittingEdit}
      >
        <option value={User.YAZAN}>{User.YAZAN}</option>
        <option value={User.GHADEER}>{User.GHADEER}</option>
      </Select>
      <Input
        label="Date"
        type="date"
        id="editDate"
        value={editDate} // Already YYYY-MM-DD
        onChange={(e) => setEditDate(e.target.value)}
        required
        aria-required="true"
        disabled={isSubmittingEdit}
      />
      <Input
        label="Description (Optional)"
        type="text"
        id="editDescription"
        value={editDescription}
        onChange={(e) => setEditDescription(e.target.value)}
        placeholder="e.g., Initial capital, Salary withdrawal"
        disabled={isSubmittingEdit}
      />
      {editModalError && <p role="alert" className="text-sm text-red-400">{editModalError}</p>}
    </>
  );
  
  if (isLoadingData) {
    return <div className="text-center py-10">Loading transactions...</div>;
  }

  return (
    <div className="space-y-8">
      {feedbackMessage && (
        <div className={`p-4 mb-4 text-sm rounded-md ${feedbackMessage.toLowerCase().includes('error') || feedbackMessage.toLowerCase().includes('fail') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`} role="alert">
          {feedbackMessage}
        </div>
      )}

      {isAdmin && (
        <Card title="Add New Transaction">
          <form onSubmit={handleAddTransaction} className="space-y-4">
            {renderAddTransactionFormFields()}
            <Button type="submit" variant="primary" isLoading={isSubmittingAdd} disabled={isSubmittingAdd || isSubmittingEdit || isSubmittingDelete}>Add Transaction</Button>
          </form>
        </Card>
      )}

      <Card title="Transaction History">
        {sortedTransactions.length === 0 ? (
          <p className="text-gray-400">No transactions recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-750">
                <tr>
                  <SortableTableHeader<Transaction> name="Date" sortKey="date" currentSortConfig={sortConfig} onRequestSort={requestSort} />
                  <SortableTableHeader<Transaction> name="Type" sortKey="type" currentSortConfig={sortConfig} onRequestSort={requestSort} />
                  <SortableTableHeader<Transaction> name="Amount" sortKey="amount" currentSortConfig={sortConfig} onRequestSort={requestSort} />
                  <SortableTableHeader<Transaction> name="User" sortKey="user" currentSortConfig={sortConfig} onRequestSort={requestSort} />
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Description</th>
                  {isAdmin && <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {sortedTransactions.map((tx) => (
                  <tr key={tx.id} className={`${tx.type === TransactionType.DEPOSIT ? 'text-green-400' : 'text-red-400'} hover:bg-gray-700/30`}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">{formatDateToYYYYMMDD(tx.date)}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">{tx.type}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-semibold">${typeof tx.amount === 'number' ? tx.amount.toFixed(2) : 'N/A'}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">{tx.user}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">{tx.description || '-'}</td>
                    {isAdmin && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm space-x-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditModal(tx)}
                          aria-label={`Edit transaction on ${formatDateToYYYYMMDD(tx.date)} for $${tx.amount}`}
                          disabled={isSubmittingAdd || isSubmittingEdit || isSubmittingDelete}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => openDeleteModal(tx.id)}
                          aria-label={`Delete transaction on ${formatDateToYYYYMMDD(tx.date)} for $${tx.amount}`}
                          disabled={isSubmittingAdd || isSubmittingEdit || isSubmittingDelete}
                        >
                          Delete
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit Transaction Modal */}
      {isAdmin && isEditModalOpen && editingTransaction && (
        <Modal isOpen={isEditModalOpen} onClose={closeEditModal} title="Edit Transaction">
          <form onSubmit={handleUpdateTransaction} className="space-y-4">
            {renderEditTransactionFormFields()}
            <div className="flex justify-end space-x-3 mt-6">
                <Button type="button" variant="secondary" onClick={closeEditModal} disabled={isSubmittingEdit}>Cancel</Button>
                <Button type="submit" variant="primary" isLoading={isSubmittingEdit} disabled={isSubmittingEdit}>Save Changes</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {isAdmin && isDeleteModalOpen && (
        <Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal} title="Confirm Delete Transaction">
          <p>Are you sure you want to delete this transaction? This action may not be reversible if the backend does not support soft deletes.</p>
          {deleteError && <p className="text-sm text-red-400 mt-2" role="alert">{deleteError}</p>}
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="secondary" onClick={closeDeleteModal} disabled={isSubmittingDelete}>Cancel</Button>
            <Button variant="danger" onClick={handleConfirmDelete} isLoading={isSubmittingDelete} disabled={isSubmittingDelete}>Delete Transaction</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DepositsWithdrawalsPage;
