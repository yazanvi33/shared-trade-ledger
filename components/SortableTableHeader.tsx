import React from 'react';
import { SortConfig, SortDirection, SortableKeys } from '../types';
import Button from './ui/Button'; // Assuming Button can be used without text for icons

interface SortableTableHeaderProps<T> {
  name: string;
  sortKey: SortableKeys<T>;
  currentSortConfig: SortConfig<T> | null;
  onRequestSort: (key: SortableKeys<T>) => void;
  className?: string;
}

const SortableTableHeader = <T,>({
  name,
  sortKey,
  currentSortConfig,
  onRequestSort,
  className = '',
}: SortableTableHeaderProps<T>) => {
  const isSorted = currentSortConfig?.key === sortKey;
  const sortDirection = isSorted ? currentSortConfig!.direction : SortDirection.NONE;

  const getSortIndicator = () => {
    if (!isSorted) return null; // Or a default "sortable" icon
    if (sortDirection === SortDirection.ASC) return <span className="ml-1">▲</span>; // Up arrow
    if (sortDirection === SortDirection.DESC) return <span className="ml-1">▼</span>; // Down arrow
    return null;
  };

  return (
    <th
      scope="col"
      className={`px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700 ${className}`}
      onClick={() => onRequestSort(sortKey)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onRequestSort(sortKey);}}
      tabIndex={0}
      role="columnheader"
      aria-sort={isSorted ? sortDirection : 'none'}
    >
      <div className="flex items-center">
        {name}
        {getSortIndicator()}
      </div>
    </th>
  );
};

export default SortableTableHeader;