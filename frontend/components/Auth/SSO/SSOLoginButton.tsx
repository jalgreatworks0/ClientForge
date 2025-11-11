import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SSOLoginButtonProps {
  providerType: string;
  displayName: string;
  icon?: React.ReactNode;
}

const SSOLoginButton: React.FC<SSOLoginButtonProps> = ({ 
  providerType, 
  displayName,
  icon
}) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      setLoading(true);
      
      // Initiate SSO flow by redirecting to backend endpoint
      const response = await fetch('/api/v1/auth/sso/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          providerType,
          redirectUrl: window.location.origin + '/auth/callback'
        })
      });
      
      const data = await response.json();
      
      if (data.url) {
        // Redirect to SSO provider
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to initiate SSO');
      }
    } catch (error) {
      console.error('SSO login error:', error);
      // Handle error - show user notification
      alert(`Login failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="text-sm font-medium text-gray-700">
        {loading ? 'Redirecting...' : `Continue with ${displayName}`}
      </span>
    </button>
  );
};

export default SSOLoginButton;