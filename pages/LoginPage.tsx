
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom'; // Changed from useHistory
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { ROUTE_PATHS } from '../constants';

interface LocationState {
  from?: {
    pathname?: string;
  };
}

const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate(); // Changed from useHistory
  const location = useLocation(); // No generic type needed in v6+ for simple state access

  const fromPathname = (location.state as LocationState)?.from?.pathname;
  const redirectTo = (fromPathname && fromPathname !== ROUTE_PATHS.LOGIN) ? fromPathname : ROUTE_PATHS.REPORT;


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier || !password) {
      setError('Please enter your username/email/phone and password.');
      return;
    }
    const success = await login(identifier, password);
    if (success) {
      navigate(redirectTo, { replace: true }); // Use navigate with replace option
    } else {
      setError('Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-150px)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <Card title="Login to Your Account">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              id="identifier"
              label="Username, Email, or Phone"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
              placeholder="Enter username, email, or phone"
              aria-describedby="identifier-error"
            />
            <Input
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              placeholder="Enter your password"
              aria-describedby="password-error"
            />
            {error && <p id="identifier-error" className="text-sm text-red-400" role="alert">{error}</p>}
            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading} disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
