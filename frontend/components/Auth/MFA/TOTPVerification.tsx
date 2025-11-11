import React, { useState } from 'react';

interface TOTPVerificationProps {
  onVerify: (code: string) => void;
  onCancel: () => void;
}

const TOTPVerification: React.FC<TOTPVerificationProps> = ({ onVerify, onCancel }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      setError('Please enter the verification code');
      return;
    }
    
    if (code.length !== 6 || !/^\d+$/.test(code)) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Call backend to verify TOTP code
      await onVerify(code);
      
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
      console.error('Error verifying code:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow only digits and limit to 6 characters
    if (/^\d*$/.test(value) && value.length <= 6) {
      setCode(value);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Two-Factor Authentication</h2>
      <p className="mb-6 text-gray-600">
        Enter the 6-digit code from your authenticator app to continue.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-1">
            Verification Code
          </label>
          <input
            type="text"
            id="verificationCode"
            value={code}
            onChange={handleInputChange}
            placeholder="Enter 6-digit code"
            inputMode="numeric"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-center tracking-wider"
            maxLength={6}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Need help?{' '}
          <a href="#" className="text-indigo-600 hover:text-indigo-500">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
};

export default TOTPVerification;