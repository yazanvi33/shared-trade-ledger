
import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom'; // Changed from useHistory
import { ROUTE_PATHS } from '../constants'; // Removed APP_NAME
import { useAuth } from '../hooks/useAuth';
import { UserRole, User } from '../types';
import Button from './ui/Button';

const Navbar: React.FC = () => {
  const { currentUser, logout, isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate(); // Changed from useHistory

  const navLinkBaseClass = "block md:inline-block px-3 py-2 rounded-md text-sm font-medium transition-colors";
  const activeNavLinkClass = "bg-gray-700 text-white";
  const inactiveNavLinkClass = "text-gray-300 hover:bg-gray-700 hover:text-white";

  const getNavLinkClass = ({ isActive }: { isActive: boolean }) => 
    `${navLinkBaseClass} ${isActive ? activeNavLinkClass : inactiveNavLinkClass}`;

  const handleLogout = () => {
    logout(); // logout already navigates
    setIsMobileMenuOpen(false); // Close menu on logout
  };
  
  const handleNavigationAndCloseMenu = (path?: string) => {
    if (path) {
        navigate(path);
    }
    setIsMobileMenuOpen(false); // Close menu on navigation or logo click
  };

  const navLinks = (
    <>
      {currentUser?.role === UserRole.ADMIN && (
        <NavLink
          to={ROUTE_PATHS.HOME}
          className={getNavLinkClass}
          onClick={() => handleNavigationAndCloseMenu()}
        >
          Deposits/Withdrawals
        </NavLink>
      )}
      {currentUser?.role === UserRole.ADMIN && (
        <NavLink
          to={ROUTE_PATHS.TRADES}
          className={getNavLinkClass}
          onClick={() => handleNavigationAndCloseMenu()}
        >
          Enter Trades
        </NavLink>
      )}
      <NavLink
        to={ROUTE_PATHS.REPORT}
        className={getNavLinkClass}
        onClick={() => handleNavigationAndCloseMenu()}
      >
        Summary Report
      </NavLink>
      <NavLink
        to={ROUTE_PATHS.REPORT_TRANSACTIONS}
        className={getNavLinkClass}
        onClick={() => handleNavigationAndCloseMenu()}
      >
        Transactions Log
      </NavLink>
      <NavLink
        to={ROUTE_PATHS.REPORT_TRADES_DETAILS}
        className={getNavLinkClass}
        onClick={() => handleNavigationAndCloseMenu()}
      >
        Trades Log
      </NavLink>
      <NavLink
        to={ROUTE_PATHS.SETTINGS}
        className={getNavLinkClass}
        onClick={() => handleNavigationAndCloseMenu()}
      >
        Settings
      </NavLink>
    </>
  );

  return (
    <nav className="bg-gray-800 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link 
              to={isAuthenticated ? (currentUser?.role === UserRole.ADMIN ? ROUTE_PATHS.HOME : ROUTE_PATHS.REPORT) : ROUTE_PATHS.LOGIN} 
              className="font-bold text-xl text-white"
              onClick={() => handleNavigationAndCloseMenu()}
            >
              <img src="/icons/logo.png" alt="Shared Trade Ledger Icon" className="h-9 w-9 mr-2" />
              <span className="sr-only">Shared Trade Ledger</span> {/* For accessibility */}
            </Link>
          </div>
          
          {/* Desktop Nav Links */}
          {isAuthenticated && currentUser && (
            <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {navLinks}
            </div>
          )}

          {/* Right side: Desktop User Info/Login OR Mobile Hamburger */}
          <div className="flex items-center">
            {isAuthenticated && currentUser ? (
              <>
                <div className="hidden md:flex items-center space-x-3">
                  <span className="text-gray-300 text-sm">Hi, {currentUser.username}</span>
                  <Button onClick={handleLogout} variant="secondary" size="sm">Logout</Button>
                </div>
                <div className="md:hidden ml-3">
                  <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    type="button"
                    className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                    aria-controls="mobile-menu"
                    aria-expanded={isMobileMenuOpen}
                  >
                    <span className="sr-only">Open main menu</span>
                    {isMobileMenuOpen ? (
                      <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <NavLink
                to={ROUTE_PATHS.LOGIN}
                className={`${inactiveNavLinkClass} bg-blue-600 hover:bg-blue-700 text-white`}
                onClick={() => handleNavigationAndCloseMenu()}
              >
                Login
              </NavLink>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isAuthenticated && currentUser && isMobileMenuOpen && (
        <div className="md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-700">
            <div className="flex items-center px-5">
              <img className="h-10 w-10 rounded-full object-cover" src={currentUser.profilePic || `https://via.placeholder.com/40/${currentUser.id === User.YAZAN ? '007bff' : '28a745'}/FFFFFF?Text=${currentUser.username.charAt(0)}`} alt={`${currentUser.username}'s profile`} />
              <div className="ml-3">
                <div className="text-base font-medium leading-none text-white">{currentUser.username}</div>
                <div className="text-sm font-medium leading-none text-gray-400">{currentUser.email}</div>
              </div>
            </div>
            <div className="mt-3 px-2 space-y-1">
              <Button onClick={handleLogout} variant="secondary" size="sm" className="w-full text-left !block">Logout</Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
