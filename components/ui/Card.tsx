
import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
  onTitleClick?: () => void;
  isCollapsible?: boolean;
  isCollapsed?: boolean;
}

const Card: React.FC<CardProps> = ({ 
    title, 
    children, 
    className = '', 
    titleClassName = '',
    onTitleClick,
    isCollapsible,
    isCollapsed 
}) => {
  return (
    <div className={`bg-gray-800 shadow-lg rounded-lg overflow-hidden ${className}`}>
      {title && (
        <div 
            className={`px-4 py-3 border-b border-gray-700 ${titleClassName} ${onTitleClick ? 'cursor-pointer hover:bg-gray-750 transition-colors duration-150' : ''}`}
            onClick={onTitleClick}
            role={onTitleClick ? "button" : undefined}
            tabIndex={onTitleClick ? 0 : undefined}
            onKeyDown={onTitleClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTitleClick(); } } : undefined}
            aria-expanded={isCollapsible ? !isCollapsed : undefined}
        >
          <h3 className="text-lg font-semibold text-gray-100 flex justify-between items-center">
            <span>{title}</span>
            {isCollapsible && (
              <span className="text-xs text-gray-400 ml-2 p-1 rounded hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500" aria-hidden="true">
                {isCollapsed ? '▼ Show Filters' : '▲ Hide Filters'} 
              </span>
            )}
          </h3>
        </div>
      )}
      <div className={`p-4 ${isCollapsible && isCollapsed ? 'hidden' : 'block'}`}> 
        {children}
      </div>
    </div>
  );
};

export default Card;
