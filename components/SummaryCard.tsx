
import React from 'react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  className?: string;
  valueClassName?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, className = '', valueClassName = '' }) => {
  return (
    <div className={`bg-gray-800 p-4 rounded-lg shadow-md text-center ${className}`}>
      <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</h4>
      <p className={`text-2xl font-bold text-gray-100 mt-1 ${valueClassName}`}>{value}</p>
    </div>
  );
};

export default SummaryCard;
