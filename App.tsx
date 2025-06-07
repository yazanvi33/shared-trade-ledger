
import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'; // Updated imports
import Layout from './components/Layout';
import DepositsWithdrawalsPage from './pages/DepositsWithdrawalsPage';
import TradesPage from './pages/TradesPage';
import ReportPage from './pages/ReportPage';
import SettingsPage from './pages/SettingsPage';
import TransactionsReportPage from './pages/TransactionsReportPage';
import TradesReportDetailsPage from './pages/TradesReportDetailsPage';
import LoginPage from './pages/LoginPage';
import { ROUTE_PATHS } from './constants';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { UserRole } from './types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children: React.ReactElement; // Expect a single React element
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { currentUser, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><p className="text-xl text-gray-300">Loading...</p></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTE_PATHS.LOGIN} state={{ from: location }} replace />;
  }

  if (allowedRoles && currentUser && !allowedRoles.includes(currentUser.role)) {
    // Redirect to a default authenticated page if role not allowed
    return <Navigate to={ROUTE_PATHS.REPORT} replace />; 
  }

  return children; // Render the protected component
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <Layout>
          <Routes> {/* Replaced Switch with Routes */}
            <Route path={ROUTE_PATHS.LOGIN} element={<LoginPage />} /> {/* Use element prop */}
            
            <Route 
              path={ROUTE_PATHS.HOME} 
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                  <DepositsWithdrawalsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path={ROUTE_PATHS.TRADES} 
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                  <TradesPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path={ROUTE_PATHS.REPORT} 
              element={
                <ProtectedRoute>
                  <ReportPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path={ROUTE_PATHS.SETTINGS} 
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path={ROUTE_PATHS.REPORT_TRANSACTIONS} 
              element={
                <ProtectedRoute>
                  <TransactionsReportPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path={ROUTE_PATHS.REPORT_TRADES_DETAILS} 
              element={
                <ProtectedRoute>
                  <TradesReportDetailsPage />
                </ProtectedRoute>
              } 
            />
            
            {/* Fallback/Catch-all Route */}
            <Route path="*" element={<AuthCatchAll />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </HashRouter>
  );
};

// Component to handle redirection for authenticated/unauthenticated users on unknown paths
const AuthCatchAll: React.FC = () => {
  const { isAuthenticated, isLoading, currentUser } = useAuth();
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><p className="text-xl text-gray-300">Loading...</p></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTE_PATHS.LOGIN} replace />;
  }

  // If authenticated, redirect to a sensible default page based on role
  // This could be more sophisticated (e.g., last visited page, specific dashboard)
  if (currentUser?.role === UserRole.ADMIN) {
    return <Navigate to={ROUTE_PATHS.HOME} replace />; // Admin default
  }
  return <Navigate to={ROUTE_PATHS.REPORT} replace />; // Limited user default
};

export default App;
