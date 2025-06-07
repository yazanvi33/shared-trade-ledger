import React, { useState, useMemo, useEffect } from 'react';
import { Trade, SortConfig, SortDirection, SortableKeys } from '../types';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import SortableTableHeader from '../components/SortableTableHeader';
import { fetchDataFromSheet } from '../services/googleSheetsService';
import { formatDateToYYYYMMDD } from '../utils/dateUtils'; // Import the new utility

type TradeSortKeys = SortableKeys<Trade>;

const TradesReportDetailsPage: React.FC = () => {
  const [tradesStore, setTradesStore] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterTradeName, setFilterTradeName] = useState<string>('');
  const [filterMinProfitLoss, setFilterMinProfitLoss] = useState<string>('');
  const [filterMaxProfitLoss, setFilterMaxProfitLoss] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig<Trade> | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const { trades } = await fetchDataFromSheet();
      setTradesStore(trades);
      setIsLoading(false);
    };
    loadData();
  }, []);


  const getAdjustedEndDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    // date.setDate(date.getDate() + 1);
    return date;
  };

  const filteredTrades = useMemo(() => {
    const startDate = filterStartDate ? new Date(filterStartDate) : null;
    const endDate = getAdjustedEndDate(filterEndDate);
    const minPL = filterMinProfitLoss !== '' ? parseFloat(filterMinProfitLoss) : null;
    const maxPL = filterMaxProfitLoss !== '' ? parseFloat(filterMaxProfitLoss) : null;

    let items = tradesStore
      .filter(trade => {
        const tradeDate = new Date(trade.date); // Original date might be full ISO
        if (startDate && tradeDate < startDate) return false;
        if (endDate && tradeDate > endDate) return false;
        if (filterTradeName && !trade.name.toLowerCase().includes(filterTradeName.toLowerCase())) return false;
        if (minPL !== null && !isNaN(minPL) && trade.profitLoss < minPL) return false;
        if (maxPL !== null && !isNaN(maxPL) && trade.profitLoss > maxPL) return false;
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
          return sortConfig.direction === SortDirection.ASC ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
         if (sortConfig.key === 'date') {
             // Dates are formatted for display, but original can be used for sorting
             return sortConfig.direction === SortDirection.ASC ? new Date(a.date).getTime() - new Date(b.date).getTime() : new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        return 0;
      });
    } else {
        // Default sort by date descending
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return items;

  }, [tradesStore, filterStartDate, filterEndDate, filterTradeName, filterMinProfitLoss, filterMaxProfitLoss, sortConfig]);
  
  const requestSort = (key: TradeSortKeys) => {
    let direction = SortDirection.ASC;
    if (sortConfig && sortConfig.key === key && sortConfig.direction === SortDirection.ASC) {
      direction = SortDirection.DESC;
    }
    setSortConfig({ key, direction });
  };

  const totalFilteredProfitLoss = useMemo(() => {
    return filteredTrades.reduce((sum, trade) => sum + trade.profitLoss, 0);
  }, [filteredTrades]);

  if (isLoading) {
    return <div className="text-center py-10">Loading trade log...</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-gray-100">Trades Log & Analysis</h1>
      <Card title="Filters">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <Input
            label="Start Date"
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            aria-label="Filter start date for trades"
          />
          <Input
            label="End Date"
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            aria-label="Filter end date for trades"
          />
          <Input
            label="Filter by Currency/Asset Name"
            type="text"
            value={filterTradeName}
            onChange={(e) => setFilterTradeName(e.target.value)}
            placeholder="e.g., Bitcoin, ETH"
            aria-label="Filter trades by currency or asset name"
          />
          <Input
            label="Min Profit/Loss"
            type="number"
            value={filterMinProfitLoss}
            onChange={(e) => setFilterMinProfitLoss(e.target.value)}
            placeholder="e.g., -100 or 50"
            step="any"
            aria-label="Filter trades by minimum profit or loss"
          />
          <Input
            label="Max Profit/Loss"
            type="number"
            value={filterMaxProfitLoss}
            onChange={(e) => setFilterMaxProfitLoss(e.target.value)}
            placeholder="e.g., 1000 or 0"
            step="any"
            aria-label="Filter trades by maximum profit or loss"
          />
        </div>
      </Card>

      <Card title="Filtered Trades List">
        {filteredTrades.length === 0 ? (
          <p className="text-gray-400">No trades match your filter criteria.</p>
        ) : (
          <>
            <div className="mb-4 text-right">
                <p className="text-lg font-semibold text-gray-200">
                    Total P/L for Filtered Trades: 
                    <span className={totalFilteredProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                        ${totalFilteredProfitLoss.toFixed(2)}
                    </span>
                </p>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-750">
                    <tr>
                      <SortableTableHeader<Trade> name="Date" sortKey="date" currentSortConfig={sortConfig} onRequestSort={requestSort} />
                      <SortableTableHeader<Trade> name="Name/Currency" sortKey="name" currentSortConfig={sortConfig} onRequestSort={requestSort} />
                      <SortableTableHeader<Trade> name="Type (Op)" sortKey="type" currentSortConfig={sortConfig} onRequestSort={requestSort} />
                      <SortableTableHeader<Trade> name="Profit/Loss" sortKey="profitLoss" currentSortConfig={sortConfig} onRequestSort={requestSort} />
                    </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {filteredTrades.map((trade) => (
                    <tr key={trade.id} className="hover:bg-gray-700/50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">{formatDateToYYYYMMDD(trade.date)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">{trade.name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">{trade.type}</td>
                        <td className={`px-4 py-2 whitespace-nowrap text-sm font-semibold ${typeof trade.profitLoss === 'number' && trade.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${typeof trade.profitLoss === 'number' ? trade.profitLoss.toFixed(2) : 'N/A'}
                        </td>
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

export default TradesReportDetailsPage;
