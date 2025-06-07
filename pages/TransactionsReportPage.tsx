
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Transaction, TransactionType, User, ReportFilterUser, ReportFilterTransactionType, SortConfig, SortDirection, SortableKeys } from '../types';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import SortableTableHeader from '../components/SortableTableHeader';
import { fetchDataFromSheet } from '../services/googleSheetsService';
import { formatDateToYYYYMMDD } from '../utils/dateUtils'; 
import { QUICK_FILTER_RANGES } from '../constants';

type TransactionSortKeys = SortableKeys<Transaction>;

const TransactionsReportPage: React.FC = () => {
  const [transactionsStore, setTransactionsStore] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [isFilterCardCollapsed, setIsFilterCardCollapsed] = useState<boolean>(true); // Filters collapsed by default
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterUser, setFilterUser] = useState<ReportFilterUser>(ReportFilterUser.ALL);
  const [filterType, setFilterType] = useState<ReportFilterTransactionType>(ReportFilterTransactionType.ALL);
  const [sortConfig, setSortConfig] = useState<SortConfig<Transaction> | null>(null);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>(QUICK_FILTER_RANGES.ALL_TIME);

  const applyQuickFilter = useCallback((filterType: string) => {
    setActiveQuickFilter(filterType);
    const today = new Date();
    let start = '';
    let end = '';

    switch (filterType) {
      case QUICK_FILTER_RANGES.TODAY:
        start = formatDateToYYYYMMDD(today);
        end = formatDateToYYYYMMDD(today);
        break;
      case QUICK_FILTER_RANGES.YESTERDAY:
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        start = formatDateToYYYYMMDD(yesterday);
        end = formatDateToYYYYMMDD(yesterday);
        break;
      case QUICK_FILTER_RANGES.THIS_WEEK:
        const currentDay = today.getDay();
        const firstDayOfWeek = new Date(today);
        firstDayOfWeek.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
        start = formatDateToYYYYMMDD(firstDayOfWeek);
        const lastDayOfWeek = new Date(firstDayOfWeek);
        lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
        end = formatDateToYYYYMMDD(lastDayOfWeek);
        break;
      case QUICK_FILTER_RANGES.THIS_MONTH:
        start = formatDateToYYYYMMDD(new Date(today.getFullYear(), today.getMonth(), 1));
        end = formatDateToYYYYMMDD(new Date(today.getFullYear(), today.getMonth() + 1, 0));
        break;
      case QUICK_FILTER_RANGES.LAST_MONTH:
        const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        start = formatDateToYYYYMMDD(firstDayLastMonth);
        end = formatDateToYYYYMMDD(new Date(today.getFullYear(), today.getMonth(), 0));
        break;
      case QUICK_FILTER_RANGES.ALL_TIME:
      default:
        break;
    }
    setFilterStartDate(start);
    setFilterEndDate(end);
  }, [formatDateToYYYYMMDD]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const { transactions } = await fetchDataFromSheet();
      setTransactionsStore(transactions);
      setIsLoading(false);
    };
    loadData();
    applyQuickFilter(QUICK_FILTER_RANGES.ALL_TIME); // Initialize with all time
  }, [applyQuickFilter]); // applyQuickFilter is stable due to useCallback dependencies

  const getAdjustedEndDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date;
  };

  const filteredTransactions = useMemo(() => {
    const startDate = filterStartDate ? new Date(filterStartDate) : null;
    const endDate = getAdjustedEndDate(filterEndDate);

    let items = transactionsStore
      .filter(t => {
        const transactionDate = new Date(t.date); 
        if (startDate && transactionDate < startDate) return false;
        if (endDate && transactionDate > endDate) return false;
        if (filterUser !== ReportFilterUser.ALL && t.user !== (filterUser as string)) return false;
        if (filterType !== ReportFilterTransactionType.ALL && t.type !== (filterType as string)) return false;
        return true;
      });
    
    if (sortConfig !== null) {
      items.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === SortDirection.ASC ? aVal - bVal : bVal - aVal;
        }
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          if (sortConfig.key === 'date') {
             return sortConfig.direction === SortDirection.ASC ? new Date(a.date).getTime() - new Date(b.date).getTime() : new Date(b.date).getTime() - new Date(a.date).getTime();
          }
          return sortConfig.direction === SortDirection.ASC ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return 0;
      });
    } else {
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return items;
  }, [transactionsStore, filterStartDate, filterEndDate, filterUser, filterType, sortConfig]);

  const requestSort = (key: TransactionSortKeys) => {
    let direction = SortDirection.ASC;
    if (sortConfig && sortConfig.key === key && sortConfig.direction === SortDirection.ASC) {
      direction = SortDirection.DESC;
    }
    setSortConfig({ key, direction });
  };

  const totalFilteredAmount = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => {
        return sum + (t.type === TransactionType.DEPOSIT ? t.amount : -t.amount);
    },0);
  }, [filteredTransactions]);

  if (isLoading) {
    return <div className="text-center py-10">Loading transaction log...</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-gray-100">Transactions Log</h1>
      <Card 
        title="Transaction Filters"
        isCollapsible={true}
        isCollapsed={isFilterCardCollapsed}
        onTitleClick={() => setIsFilterCardCollapsed(!isFilterCardCollapsed)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 items-end">
          <Input
            label="Start Date"
            type="date"
            value={filterStartDate}
            onChange={(e) => {setFilterStartDate(e.target.value); setActiveQuickFilter('');}}
            aria-label="Filter start date for transactions"
          />
          <Input
            label="End Date"
            type="date"
            value={filterEndDate}
            onChange={(e) => {setFilterEndDate(e.target.value); setActiveQuickFilter('');}}
            aria-label="Filter end date for transactions"
          />
          <Select
            label="Filter by User"
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value as ReportFilterUser)}
            aria-label="Filter transactions by user"
          >
            <option value={ReportFilterUser.ALL}>All Users</option>
            <option value={ReportFilterUser.YAZAN}>{User.YAZAN}</option>
            <option value={ReportFilterUser.GHADEER}>{User.GHADEER}</option>
          </Select>
          <Select
            label="Filter by Type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ReportFilterTransactionType)}
            aria-label="Filter transactions by type"
          >
            <option value={ReportFilterTransactionType.ALL}>All Types</option>
            <option value={ReportFilterTransactionType.DEPOSIT}>Deposit</option>
            <option value={ReportFilterTransactionType.WITHDRAWAL}>Withdrawal</option>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.values(QUICK_FILTER_RANGES).map(filterKey => (
              <Button 
                  key={filterKey} 
                  variant={activeQuickFilter === filterKey ? "primary" : "secondary"}
                  onClick={() => applyQuickFilter(filterKey)}
                  size="sm"
              >
                  {filterKey}
              </Button>
          ))}
        </div>
      </Card>

      <Card title="Filtered Transactions List">
        {filteredTransactions.length === 0 ? (
          <p className="text-gray-400">No transactions match your filter criteria.</p>
        ) : (
          <>
            <div className="mb-4 text-right">
                <p className="text-lg font-semibold text-gray-200">
                    Net Total for Filtered Transactions: 
                    <span className={totalFilteredAmount >= 0 ? 'text-green-400' : 'text-red-400'}>
                        ${totalFilteredAmount.toFixed(2)}
                    </span>
                </p>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-750">
                    <tr>
                      <SortableTableHeader<Transaction> name="Date" sortKey="date" currentSortConfig={sortConfig} onRequestSort={requestSort} />
                      <SortableTableHeader<Transaction> name="User" sortKey="user" currentSortConfig={sortConfig} onRequestSort={requestSort} />
                      <SortableTableHeader<Transaction> name="Type" sortKey="type" currentSortConfig={sortConfig} onRequestSort={requestSort} />
                      <SortableTableHeader<Transaction> name="Amount" sortKey="amount" currentSortConfig={sortConfig} onRequestSort={requestSort} />
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Description</th>
                    </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className={`${tx.type === TransactionType.DEPOSIT ? 'hover:bg-green-900/30' : 'hover:bg-red-900/30'}`}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">{formatDateToYYYYMMDD(tx.date)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">{tx.user}</td>
                        <td className={`px-4 py-2 whitespace-nowrap text-sm font-medium ${tx.type === TransactionType.DEPOSIT ? 'text-green-400' : 'text-red-400'}`}>{tx.type}</td>
                        <td className={`px-4 py-2 whitespace-nowrap text-sm font-semibold ${tx.type === TransactionType.DEPOSIT ? 'text-green-400' : 'text-red-400'}`}>
                        ${typeof tx.amount === 'number' ? tx.amount.toFixed(2) : 'N/A'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-400">{tx.description || '-'}</td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default TransactionsReportPage;
