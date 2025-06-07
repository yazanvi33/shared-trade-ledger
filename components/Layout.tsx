
import React from 'react';
import Navbar from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
      <footer className="bg-gray-800 text-center py-4 text-sm text-gray-400">
        © {new Date().getFullYear()} Shared Trade Ledger. All rights reserved.
      </footer>
    </div>
  );
};

export default Layout;
