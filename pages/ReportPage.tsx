
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Transaction, Trade, User, TransactionType, DailyPnl, UserProfiles, UserProfile, SortConfig, SortDirection, SortableKeys, UserRole } from '../types';
import { DEFAULT_USER_PROFILES, QUICK_FILTER_RANGES } from '../constants';
import Card from '../components/ui/Card'; 
import SummaryCard from '../components/SummaryCard';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import PnlChart from '../components/PnlChart';
import SortableTableHeader from '../components/SortableTableHeader';
import { useAuth } from '../hooks/useAuth';
// import useLocalStorage from '../hooks/useLocalStorage'; // No longer needed for profiles here
import { fetchDataFromSheet } from '../services/googleSheetsService';
import { formatDateToYYYYMMDD } from '../utils/dateUtils'; // Import the new utility


type DailyPnlSortKeys = SortableKeys<DailyPnl>;

interface PnlAggregatedData {
  dailyProfit: number;
  dailyLoss: number;
  capitalAtStartOfDay: number;
}

const ReportPage: React.FC = () => {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  
  const { currentUser, allUserProfiles, isLoading: authIsLoading } = useAuth(); 

  const [isFilterCardCollapsed, setIsFilterCardCollapsed] = useState<boolean>(true); // Filters collapsed by default
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterTradeName, setFilterTradeName] = useState<string>('');
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>(QUICK_FILTER_RANGES.ALL_TIME);
  const [dailyPnlSortConfig, setDailyPnlSortConfig] = useState<SortConfig<DailyPnl> | null>(null);

  const [isOverallSnapshotCollapsed, setIsOverallSnapshotCollapsed] = useState<boolean>(true);
  const [isYazanAccountCardCollapsed, setIsYazanAccountCardCollapsed] = useState<boolean>(true);
  const [isGhadeerAccountCardCollapsed, setIsGhadeerAccountCardCollapsed] = useState<boolean>(true);


  const applyQuickFilter = useCallback((filterType: string) => {
    setActiveQuickFilter(filterType);
    const today = new Date();
    let start = '';
    let end = ''; // Default for ALL_TIME

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
      case QUICK_FILTER_RANGES.THIS_WEEK: // Monday to Sunday
        const currentDay = today.getDay(); // Sunday = 0, Monday = 1, ... Saturday = 6
        const firstDayOfWeek = new Date(today);
        firstDayOfWeek.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1)); // Adjust to Monday
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
        // start and end remain empty strings
        break;
    }
    setFilterStartDate(start);
    setFilterEndDate(end);
  }, [formatDateToYYYYMMDD]); // Removed setFilterStartDate, setFilterEndDate as they cause infinite loop if applyQuickFilter is in useEffect dependency. formatDateToYYYYMMDD is stable.

  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);
      const { transactions, trades } = await fetchDataFromSheet();
      setAllTransactions(transactions);
      setAllTrades(trades);
      setIsLoadingData(false);
    };
    if (!authIsLoading) {
        loadData();
    }
  }, [authIsLoading]); 

  useEffect(() => {
    applyQuickFilter(QUICK_FILTER_RANGES.ALL_TIME);
  }, [applyQuickFilter]);


  const getAdjustedEndDate = useCallback((dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    // Date strings are YYYY-MM-DD, representing the whole day.
    // new Date(dateStr) will parse it as local time midnight.
    // For end date filtering, we usually want to include the entire day.
    // So if dateStr is '2023-10-20', we want to include everything up to '2023-10-20T23:59:59.999' local.
    // Or, compare against the start of the *next* day.
    // However, since we're comparing Date objects directly, it's often simpler:
    // transactionDate <= endDate. If endDate is new Date('2023-10-20'), it's '2023-10-20T00:00:00'.
    // So, a transaction on '2023-10-20' (parsed as '2023-10-20T00:00:00') will be included.
    const date = new Date(dateStr); // This will be local time 00:00:00
    return date;
  }, []);
  

  const filteredTransactions = useMemo(() => { 
    const startDate = filterStartDate ? new Date(filterStartDate) : null;
    const endDate = getAdjustedEndDate(filterEndDate);

    return allTransactions.filter(transaction => {
      const transactionDate = new Date(transaction.date); // transaction.date is YYYY-MM-DD
      if (startDate && transactionDate < startDate) return false;
      if (endDate && transactionDate > endDate) return false; 
      return true;
    }); 
  }, [allTransactions, filterStartDate, filterEndDate, getAdjustedEndDate]);

  const filteredTradesForPnlAndTable = useMemo(() => { 
    const startDate = filterStartDate ? new Date(filterStartDate) : null;
    const endDate = getAdjustedEndDate(filterEndDate);
    
    return allTrades.filter(trade => {
      const tradeDate = new Date(trade.date); // trade.date is YYYY-MM-DD
      if (startDate && tradeDate < startDate) return false;
      if (endDate && tradeDate > endDate) return false;
      if (filterTradeName && !trade.name.toLowerCase().includes(filterTradeName.toLowerCase())) return false;
      return true;
    });
  }, [allTrades, filterStartDate, filterEndDate, filterTradeName, getAdjustedEndDate]);


  const totalProfitLossFiltered = useMemo(() => 
    filteredTradesForPnlAndTable.reduce((sum, t) => sum + t.profitLoss, 0),
  [filteredTradesForPnlAndTable]);

  const totalDepositsAll = useMemo(() => 
    allTransactions.filter(t => t.type === TransactionType.DEPOSIT).reduce((sum, t) => sum + t.amount, 0), 
  [allTransactions]); 
  
  const totalWithdrawalsAll = useMemo(() => 
    allTransactions.filter(t => t.type === TransactionType.WITHDRAWAL).reduce((sum, t) => sum + t.amount, 0), 
  [allTransactions]); 

  const allTimeTotalProfitLoss = useMemo(() => 
    allTrades.reduce((sum, t) => sum + t.profitLoss, 0),
  [allTrades]);

  const userFinancials = useMemo(() => {
    const profilesToUse = allUserProfiles || DEFAULT_USER_PROFILES;

    const calculatedFinancials: Record<User, { deposits: number, withdrawals: number, capital: number, profile: UserProfile }> = {
      [User.YAZAN]: { deposits: 0, withdrawals: 0, capital: 0, profile: profilesToUse[User.YAZAN] },
      [User.GHADEER]: { deposits: 0, withdrawals: 0, capital: 0, profile: profilesToUse[User.GHADEER] },
    };

    allTransactions.forEach(t => {
      if (calculatedFinancials[t.user]) { 
        if (t.type === TransactionType.DEPOSIT) {
          calculatedFinancials[t.user].deposits += t.amount;
        } else if (t.type === TransactionType.WITHDRAWAL) {
          calculatedFinancials[t.user].withdrawals += t.amount;
        }
      }
    });
    
    const yazanProfile = calculatedFinancials[User.YAZAN].profile;
    const ghadeerProfile = calculatedFinancials[User.GHADEER].profile;

    const yazanProfitSharePercent: number = (typeof yazanProfile?.profitShare === 'number' && !isNaN(yazanProfile.profitShare)) 
                                            ? yazanProfile.profitShare : 0;
    const ghadeerProfitSharePercent: number = (typeof ghadeerProfile?.profitShare === 'number' && !isNaN(ghadeerProfile.profitShare)) 
                                              ? ghadeerProfile.profitShare : 0;

    const yazanProfitShareRatio: number = yazanProfitSharePercent / 100;
    const yazanShareOfPnl: number = allTimeTotalProfitLoss * yazanProfitShareRatio;

    calculatedFinancials[User.YAZAN].capital = 
        calculatedFinancials[User.YAZAN].deposits + 
        yazanShareOfPnl - 
        calculatedFinancials[User.YAZAN].withdrawals;

    const ghadeerProfitShareRatio: number = ghadeerProfitSharePercent / 100;
    const ghadeerShareOfPnl: number = allTimeTotalProfitLoss * ghadeerProfitShareRatio;

    calculatedFinancials[User.GHADEER].capital = 
        calculatedFinancials[User.GHADEER].deposits + 
        ghadeerShareOfPnl - 
        calculatedFinancials[User.GHADEER].withdrawals;
    
    return calculatedFinancials;
  }, [allTransactions, allTrades, allUserProfiles, allTimeTotalProfitLoss]);

  const totalAccountBalance = useMemo(() => 
    userFinancials[User.YAZAN].capital + userFinancials[User.GHADEER].capital,
  [userFinancials]);


  const dailyPnlDataRaw = useMemo<DailyPnl[]>(() => {
    const pnlByDate: { [date: string]: PnlAggregatedData } = {};
    const allGlobalEntries: Array<{ date: string; amount: number; type: 'deposit' | 'withdrawal' | 'trade_pnl' }> = [];
    
    allTransactions.forEach(t => { 
        if (t.type === TransactionType.DEPOSIT) allGlobalEntries.push({ date: t.date, amount: t.amount, type: 'deposit' });
        else if (t.type === TransactionType.WITHDRAWAL) allGlobalEntries.push({ date: t.date, amount: -t.amount, type: 'withdrawal' });
    });
    allTrades.forEach(t => allGlobalEntries.push({ date: t.date, amount: t.profitLoss, type: 'trade_pnl' })); 
    
    allGlobalEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || (a.type === 'deposit' || a.type === 'withdrawal' ? -1 : 1));

    const dailyCapitalMap: Map<string, number> = new Map();
    let runningCapital = 0;
    
    for (const entry of allGlobalEntries) {
        const entryDateStr = formatDateToYYYYMMDD(entry.date);
        if (!dailyCapitalMap.has(entryDateStr)) {
            dailyCapitalMap.set(entryDateStr, runningCapital);
        }
        if (entry.type === 'deposit' || entry.type === 'withdrawal') { 
            runningCapital += entry.amount;
        }
    }
    
    filteredTradesForPnlAndTable.forEach(trade => { 
      const tradeDateStr = formatDateToYYYYMMDD(trade.date);
      if (!pnlByDate[tradeDateStr]) {
        let capitalForDate = 0;
        const tradeDateObj = new Date(tradeDateStr); 
        let capValFromMap: number | undefined = dailyCapitalMap.get(tradeDateStr);
        
        if (capValFromMap === undefined) {
          const sortedCapitalDates = Array.from(dailyCapitalMap.keys()).sort((a,b) => new Date(a).getTime() - new Date(b).getTime());
          let closestPastDateCapital: number | undefined;
          for (let i = sortedCapitalDates.length - 1; i >= 0; i--) {
            if (new Date(sortedCapitalDates[i]) < tradeDateObj) { //Strictly before trade date for Start of Day
              closestPastDateCapital = dailyCapitalMap.get(sortedCapitalDates[i]);
              // also need to sum up deposits/withdrawals between closestPastDateCapital and tradeDateObj
              let capitalAtTradeDateStart = dailyCapitalMap.get(sortedCapitalDates[i])!; // Non-null assertion
              allTransactions.forEach(tx => {
                const txDate = new Date(tx.date);
                if (txDate >= new Date(sortedCapitalDates[i]) && txDate < tradeDateObj) {
                   if (tx.type === TransactionType.DEPOSIT) capitalAtTradeDateStart += tx.amount;
                   else capitalAtTradeDateStart -= tx.amount;
                }
              });
              capValFromMap = capitalAtTradeDateStart;
              break;
            }
          }
           if (capValFromMap === undefined) { // If no capital records before this date, check for same day deposits
             let sameDayInitialCapital = 0;
             allTransactions.forEach(tx => {
                if (formatDateToYYYYMMDD(tx.date) === tradeDateStr && tx.type === TransactionType.DEPOSIT) {
                    // This logic for same-day initial capital might be complex if trades can happen before deposits on the same day.
                    // Assuming deposits establish capital before trades for simplicity here.
                    sameDayInitialCapital += tx.amount;
                }
             });
             capValFromMap = sameDayInitialCapital;
           }

        }
        capitalForDate = capValFromMap ?? 0; 
        
        pnlByDate[tradeDateStr] = { dailyProfit: 0, dailyLoss: 0, capitalAtStartOfDay: capitalForDate };
      }

      if (trade.profitLoss > 0) {
        pnlByDate[tradeDateStr].dailyProfit += trade.profitLoss;
      } else if (trade.profitLoss < 0) {
        pnlByDate[tradeDateStr].dailyLoss += Math.abs(trade.profitLoss);
      }
    });
    
    return Object.entries(pnlByDate)
      .map(([date, data]: [string, PnlAggregatedData]) => { 
        const capitalStart = data.capitalAtStartOfDay; 
        const netPnl = data.dailyProfit - data.dailyLoss; 
        const pnlPercentage = (capitalStart > 0) ? (netPnl / capitalStart) * 100 : (netPnl !== 0 ? null : 0) ; 
        return { date, dailyProfit: data.dailyProfit, dailyLoss: data.dailyLoss, pnl: netPnl, pnlPercentage };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredTradesForPnlAndTable, allTransactions, allTrades, formatDateToYYYYMMDD]); 
  
  const requestDailyPnlSort = (key: DailyPnlSortKeys) => {
    let direction = SortDirection.ASC;
    if (dailyPnlSortConfig && dailyPnlSortConfig.key === key && dailyPnlSortConfig.direction === SortDirection.ASC) {
      direction = SortDirection.DESC;
    }
    setDailyPnlSortConfig({ key, direction });
  };

  const sortedDailyPnlData = useMemo(() => {
    let sortableItems = [...dailyPnlDataRaw];
    if (dailyPnlSortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aVal = a[dailyPnlSortConfig.key];
        const bVal = b[dailyPnlSortConfig.key];

        if (dailyPnlSortConfig.key === 'pnlPercentage') {
            const finalA = aVal === null ? -Infinity : aVal as number; 
            const finalB = bVal === null ? -Infinity : bVal as number;
            return dailyPnlSortConfig.direction === SortDirection.ASC ? finalA - finalB : finalB - finalA;
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return dailyPnlSortConfig.direction === SortDirection.ASC ? aVal - bVal : bVal - aVal;
        }
        if (typeof aVal === 'string' && typeof bVal === 'string') { 
          if (dailyPnlSortConfig.key === 'date') {
            return dailyPnlSortConfig.direction === SortDirection.ASC 
                ? new Date(aVal).getTime() - new Date(bVal).getTime() 
                : new Date(bVal).getTime() - new Date(aVal).getTime();
          }
          return dailyPnlSortConfig.direction === SortDirection.ASC ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return 0;
      });
    }
    return sortableItems;
  }, [dailyPnlDataRaw, dailyPnlSortConfig]);


  const chartTotalProfit = useMemo(() =>
    dailyPnlDataRaw.reduce((sum, d) => sum + (Number(d.dailyProfit) || 0), 0),
  [dailyPnlDataRaw]);
  
  const chartTotalLoss = useMemo(() =>
    dailyPnlDataRaw.reduce((sum, d) => sum + (Number(d.dailyLoss) || 0), 0),
  [dailyPnlDataRaw]);

  const chartNetPnl = useMemo(() => chartTotalProfit - chartTotalLoss, [chartTotalProfit, chartTotalLoss]);


  const renderUserFinancialCard = (user: User, isCollapsed: boolean, onTitleClick: () => void) => {
    const data = userFinancials[user];
    if (!data || !data.profile) { 
        return (
             <Card title={`${user}'s Account (Loading...)`} className="flex-1 min-w-[280px] md:min-w-[300px]" key={user}>
                <p>User profile data is loading or not available.</p>
             </Card>
        );
    }
    return (
      <Card 
        title={`${data.profile.name}'s Account`} 
        className="flex-1 min-w-[280px] md:min-w-[300px]" 
        key={user}
        isCollapsible={true}
        isCollapsed={isCollapsed}
        onTitleClick={onTitleClick}
      >
        <div className="flex items-center mb-4">
          <img 
            src={data.profile.profilePic || `https://via.placeholder.com/80/${user === User.YAZAN ? '007bff' : '28a745'}/FFFFFF?Text=${user.charAt(0)}`} 
            alt={`${data.profile.name}'s profile`} 
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover mr-3 sm:mr-4"
            onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null; 
                target.src = `https://via.placeholder.com/80/${user === User.YAZAN ? '007bff' : '28a745'}/FFFFFF?Text=${user.charAt(0)}`;
            }}
            />
          <div>
            <p className="text-lg sm:text-xl font-semibold text-gray-100">{data.profile.name}</p>
            <p className="text-xs sm:text-sm text-gray-400 break-all">{data.profile.email}</p>
          </div>
        </div>
        <div className="space-y-2">
          <SummaryCard title="Capital (All Time)" value={`$${data.capital.toFixed(2)}`} valueClassName={data.capital >= 0 ? 'text-blue-400' : 'text-orange-400'} className="bg-gray-750 py-2" />
          <SummaryCard title="Deposits (All Time)" value={`$${data.deposits.toFixed(2)}`} valueClassName="text-green-400" className="bg-gray-750 py-2" />
          <SummaryCard title="Withdrawals (All Time)" value={`$${data.withdrawals.toFixed(2)}`} valueClassName="text-red-400" className="bg-gray-750 py-2" />
        </div>
      </Card>
    );
  }

  if (isLoadingData || authIsLoading) {
    return <div className="text-center py-10">Loading report data...</div>;
  }

  return (
    <div className="space-y-8">
      <Card 
        title="Report Filters"
        isCollapsible={true}
        isCollapsed={isFilterCardCollapsed}
        onTitleClick={() => setIsFilterCardCollapsed(!isFilterCardCollapsed)}
      >
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 pt-3">
              <Input
                label="Start Date (for P/L data)"
                type="date"
                value={filterStartDate}
                onChange={(e) => { setFilterStartDate(e.target.value); setActiveQuickFilter(''); }}
                aria-label="Filter start date for profit and loss data"
              />
              <Input
                label="End Date (for P/L data)"
                type="date"
                value={filterEndDate}
                onChange={(e) => { setFilterEndDate(e.target.value); setActiveQuickFilter(''); }}
                aria-label="Filter end date for profit and loss data"
              />
              <Input
                label="Filter Trades by Name (for P/L data)"
                type="text"
                value={filterTradeName}
                onChange={(e) => setFilterTradeName(e.target.value)}
                placeholder="e.g., Bitcoin"
                aria-label="Filter by trade name for profit and loss data"
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
            <p className="text-xs text-gray-400 mt-3">Note: These filters apply to the P/L chart, daily breakdown, and the filtered trades table below (if trade name is specified). Overall snapshot and user accounts always reflect all-time data.</p>
          </>
      </Card>

      <Card 
        title="Overall Financial" /* MODIFIED TEXT */
        isCollapsible={true}
        isCollapsed={isOverallSnapshotCollapsed}
        onTitleClick={() => setIsOverallSnapshotCollapsed(!isOverallSnapshotCollapsed)}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard title="Total Deposits" value={`$${totalDepositsAll.toFixed(2)}`} valueClassName="text-green-400" />
          <SummaryCard title="Total Withdrawals" value={`$${totalWithdrawalsAll.toFixed(2)}`} valueClassName="text-red-400" />
          <SummaryCard title="P/L (Filtered Period)" value={`$${totalProfitLossFiltered.toFixed(2)}`} valueClassName={totalProfitLossFiltered >= 0 ? 'text-green-400' : 'text-red-400'} />
          <SummaryCard title="Total Account Balance" value={`$${totalAccountBalance.toFixed(2)}`} valueClassName={totalAccountBalance >= 0 ? 'text-blue-400' : 'text-orange-400'} />
        </div>
      </Card>
      
      <div className="flex flex-col md:flex-row flex-wrap gap-6 justify-around">
        {renderUserFinancialCard(User.YAZAN, isYazanAccountCardCollapsed, () => setIsYazanAccountCardCollapsed(!isYazanAccountCardCollapsed))}
        {renderUserFinancialCard(User.GHADEER, isGhadeerAccountCardCollapsed, () => setIsGhadeerAccountCardCollapsed(!isGhadeerAccountCardCollapsed))}
      </div>
      
      <Card title="Profit/Loss Over Time (Filtered Period)">
        {dailyPnlDataRaw.length > 0 ? (
          <>
            <PnlChart data={dailyPnlDataRaw} />
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <SummaryCard title="Total Profit (Chart Period)" value={`$${chartTotalProfit.toFixed(2)}`} valueClassName="text-green-500" className="bg-gray-750"/>
                <SummaryCard title="Total Loss (Chart Period)" value={`$${chartTotalLoss.toFixed(2)}`} valueClassName="text-red-500" className="bg-gray-750"/>
                <SummaryCard title="Net P/L (Chart Period)" value={`$${chartNetPnl.toFixed(2)}`} valueClassName={chartNetPnl >= 0 ? "text-blue-400" : "text-orange-400"} className="bg-gray-750"/>
            </div>
          </>
        ) : (
            <p className="text-gray-400 text-center py-5">No P/L data to display chart for the selected period/filters.</p>
        )}
      </Card>

      <Card title="Daily Profit/Loss Breakdown (Filtered Period)">
        {sortedDailyPnlData.length === 0 ? (
          <p className="text-gray-400">No trade data available for the selected period/filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-750">
                <tr>
                  <SortableTableHeader<DailyPnl> name="Date" sortKey="date" currentSortConfig={dailyPnlSortConfig} onRequestSort={requestDailyPnlSort} />
                  <SortableTableHeader<DailyPnl> name="Profit" sortKey="dailyProfit" currentSortConfig={dailyPnlSortConfig} onRequestSort={requestDailyPnlSort} />
                  <SortableTableHeader<DailyPnl> name="Loss" sortKey="dailyLoss" currentSortConfig={dailyPnlSortConfig} onRequestSort={requestDailyPnlSort} />
                  <SortableTableHeader<DailyPnl> name="Net P/L" sortKey="pnl" currentSortConfig={dailyPnlSortConfig} onRequestSort={requestDailyPnlSort} />
                  <SortableTableHeader<DailyPnl> name="Net P/L % (vs Start of Day Capital)" sortKey="pnlPercentage" currentSortConfig={dailyPnlSortConfig} onRequestSort={requestDailyPnlSort} />
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {sortedDailyPnlData.map(item => (
                  <tr key={item.date} className="hover:bg-gray-700/30">
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">{formatDateToYYYYMMDD(item.date)}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-green-400">${item.dailyProfit.toFixed(2)}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-red-400">${item.dailyLoss.toFixed(2)}</td>
                    <td className={`px-4 py-2 whitespace-nowrap text-sm font-semibold ${item.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${item.pnl.toFixed(2)}
                    </td>
                    <td className={`px-4 py-2 whitespace-nowrap text-sm ${item.pnlPercentage === null ? 'text-gray-500' : (item.pnl >= 0 ? 'text-green-400' : 'text-red-400')}`}>
                      {item.pnlPercentage !== null ? `${item.pnlPercentage.toFixed(2)}%` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      
      {filterTradeName && ( 
        <Card title={`Filtered Trades Matching Name: "${filterTradeName}" (within selected dates)`}>
            {filteredTradesForPnlAndTable.filter(t => t.name.toLowerCase().includes(filterTradeName.toLowerCase())).length === 0 ? 
            <p className="text-gray-400">No trades match your filter criteria.</p>
            : (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-750">
                    <tr>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Profit/Loss</th>
                    </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {filteredTradesForPnlAndTable
                        .filter(t => t.name.toLowerCase().includes(filterTradeName.toLowerCase()))
                        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((trade) => ( 
                    <tr key={trade.id} className="hover:bg-gray-700/30">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">{formatDateToYYYYMMDD(trade.date)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">{trade.name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">{trade.type}</td>
                        <td className={`px-4 py-2 whitespace-nowrap text-sm font-semibold ${trade.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${trade.profitLoss.toFixed(2)}
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
            )}
        </Card>
      )}
    </div>
  );
};

export default ReportPage;
