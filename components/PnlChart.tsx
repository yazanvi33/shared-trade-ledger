import React from 'react';
import { DailyPnl } from '../types';

interface PnlChartProps {
  data: DailyPnl[];
}

const PnlChart: React.FC<PnlChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-gray-400 text-center py-4">No P/L data available for chart.</p>;
  }

  const sortedData = [...data].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const maxDailyValue = Math.max(
    ...sortedData.map(d => d.dailyProfit),
    ...sortedData.map(d => d.dailyLoss), 
    1 
  ); 
  const chartHeightPx = 250; 

  return (
    <div className="bg-gray-850 p-4 rounded-lg shadow w-full">
      <h3 className="text-lg font-semibold text-gray-200 mb-6 text-center">Daily Profit/Loss Trend</h3>
      <div 
        className="relative flex justify-start items-end border-l-2 border-b-2 border-gray-600 pl-2 pr-1 space-x-1 min-h-[300px]"
        style={{ height: `${chartHeightPx + 60}px`, overflowX: 'auto', overflowY: 'hidden' }}
        aria-label="Daily profit and loss bar chart"
        role="figure"
      >
        {/* Y-axis labels */}
        <div className="absolute left-[-45px] top-0 bottom-[50px] flex flex-col justify-between text-xs text-gray-400 pr-1 w-[40px] text-right">
            <span>${maxDailyValue.toFixed(0)}</span>
            {maxDailyValue > 1 && <span>${(maxDailyValue / 2).toFixed(0)}</span>}
            <span>$0</span>
        </div>


        {sortedData.map((item, index) => {
          const profitBarHeight = maxDailyValue > 0 ? (item.dailyProfit / maxDailyValue) * chartHeightPx : 0;
          const lossBarHeight = maxDailyValue > 0 ? (item.dailyLoss / maxDailyValue) * chartHeightPx : 0;
          const barWidth = 'w-3 sm:w-4';
          
          return (
            <div 
                key={item.date} 
                className="flex flex-col-reverse items-center group relative pt-2" 
                style={{height: `${chartHeightPx + 50}px`}} 
            >
                {/* Bar Container */}
                <div className="flex items-end h-full px-0.5 sm:px-1"> 
                    <div 
                        className={`${barWidth} bg-green-500 rounded-t hover:opacity-75 transition-opacity relative`}
                        style={{ height: `${profitBarHeight}px`, minHeight: profitBarHeight > 0 ? '2px' : '0px' }}
                        aria-label={`Profit on ${item.date}: $${item.dailyProfit.toFixed(2)}`}
                    >
                        {profitBarHeight > 15 && item.dailyProfit > 0 && (
                            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-xxs text-green-300 whitespace-nowrap">
                                ${item.dailyProfit.toFixed(0)}
                            </span>
                        )}
                    </div>
                    <div 
                        className={`${barWidth} bg-red-500 rounded-t hover:opacity-75 transition-opacity ml-px relative`} 
                        style={{ height: `${lossBarHeight}px`, minHeight: lossBarHeight > 0 ? '2px' : '0px' }}
                        aria-label={`Loss on ${item.date}: $${item.dailyLoss.toFixed(2)}`}
                    >
                        {lossBarHeight > 15 && item.dailyLoss > 0 && (
                             <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-xxs text-red-300 whitespace-nowrap">
                                ${item.dailyLoss.toFixed(0)}
                            </span>
                        )}
                    </div>
                </div>
                {/* Date Label (X-axis) */}
                <div 
                    className="text-xxs text-gray-400 mt-1 whitespace-nowrap origin-top-left relative transform -rotate-[60deg]"
                    style={{ 
                        fontSize: '0.6rem', 
                        width: '50px', 
                        position: 'absolute', 
                        bottom: '-5px', 
                        left: '50%', 
                        transform: 'translateX(-50%) translateY(100%) rotate(-60deg)', 
                        paddingTop: '3px'
                    }}
                >
                    {item.date.substring(5)} {/* Show MM-DD */}
                </div>
              
                {/* Combined Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-950 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg whitespace-nowrap">
                    Date: {item.date}<br />
                    Profit: ${item.dailyProfit.toFixed(2)}<br />
                    Loss: ${item.dailyLoss.toFixed(2)}<br />
                    Net: ${item.pnl.toFixed(2)}
                </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-center space-x-4 mt-6 text-xs text-gray-400">
        <span><span className="inline-block w-3 h-3 bg-green-500 rounded-sm mr-1 align-middle"></span> Profit</span>
        <span><span className="inline-block w-3 h-3 bg-red-500 rounded-sm mr-1 align-middle"></span> Loss</span>
      </div>
    </div>
  );
};

export default PnlChart;