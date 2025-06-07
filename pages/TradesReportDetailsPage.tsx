
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Trade, SortConfig, SortDirection, SortableKeys } from '../types';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import SortableTableHeader from '../components/SortableTableHeader';
import { fetchDataFromSheet } from '../services/googleSheetsService';
import { formatDateToYYYYMMDD } from '../utils/dateUtils'; 
import { QUICK_FILTER_RANGES } from '../constants';

type TradeSortKeys = SortableKeys<Trade>;

const TradesReportDetailsPage: React.FC = () => {
  const [tradesStore, setTradesStore] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [isFilterCardCollapsed, setIsFilterCardCollapsed] = useState<boolean>(true); // Filters collapsed by default
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterTradeName, setFilterTradeName] = useState<string>('');
  const [filterMinProfitLoss, setFilterMinProfitLoss] = useState<string>('');
  const [filterMaxProfitLoss, setFilterMaxProfitLoss] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig<Trade> | null>(null);
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
      const { trades } = await fetchDataFromSheet();
      setTradesStore(trades);
      setIsLoading(false);
    };
    loadData();
    applyQuickFilter(QUICK_FILTER_RANGES.ALL_TIME); // Initialize with all time
  }, [applyQuickFilter]);


  const getAdjustedEndDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date;
  };

  const filteredTrades = useMemo(() => {
    const startDate = filterStartDate ? new Date(filterStartDate) : null;
    const endDate = getAdjustedEndDate(filterEndDate);
    const minPL = filterMinProfitLoss !== '' ? parseFloat(filterMinProfitLoss) : null;
    const maxPL = filterMaxProfitLoss !== '' ? parseFloat(filterMaxProfitLoss) : null;

    let items = tradesStore
      .filter(trade => {
        const tradeDate = new Date(trade.date); 
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
      <Card 
        title="Trade Log Filters"
        isCollapsible={true}
        isCollapsed={isFilterCardCollapsed}
        onTitleClick={() => setIsFilterCardCollapsed(!isFilterCardCollapsed)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 items-end">
          <Input
            label="Start Date"
            type="date"
            value={filterStartDate}
            onChange={(e) => {setFilterStartDate(e.target.value); setActiveQuickFilter('');}}
            aria-label="Filter start date for trades"
          />
          <Input
            label="End Date"
            type="date"
            value={filterEndDate}
            onChange={(e) => {setFilterEndDate(e.target.value); setActiveQuickFilter('');}}
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
