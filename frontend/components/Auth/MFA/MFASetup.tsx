import React, { useState } from 'react';
import QRCode from 'qrcode.react';

interface MFASetupProps {
  onSetupComplete: () => void;
}

const MFASetup: React.FC<MFASetupProps> = ({ onSetupComplete }) => {
  const [secret, setSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateSecret = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Call backend to generate TOTP secret
      const response = await fetch('/api/v1/auth/mfa/setup/totp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          // This would be called from a real implementation
        })
      });
      
      const data = await response.json();
      
      if (data.secret) {
        setSecret(data.secret);
        // In a real app, we'd also get the provisioning URL for QR code
      } else {
        throw new Error(data.error || 'Failed to generate secret');
      }
    } catch (err) {
      setError(err.message || 'Failed to generate MFA secret');
      console.error('Error generating secret:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Call backend to verify TOTP code
      const response = await fetch('/api/v1/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          code: verificationCode,
          mfaType: 'totp'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Generate backup codes
        const backupResponse = await fetch('/api/v1/auth/mfa/backup-codes/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        
        const backupData = await backupResponse.json();
        
        if (backupData.codes) {
          setBackupCodes(backupData.codes);
          onSetupComplete(); // Complete setup
        } else {
          throw new Error(backupData.error || 'Failed to generate backup codes');
        }
      } else {
        setError(data.message || 'Verification failed');
      }
    } catch (err) {
      setError(err.message || 'Verification error');
      console.error('Error verifying code:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackupCodes = () => {
    if (!backupCodes.length) return;
    
    const codesText = backupCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clientforge-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!secret) {
    return (
      <div className="max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-4">Setup Multi-Factor Authentication</h2>
        <p className="mb-6 text-gray-600">
          Enable two-factor authentication to add an extra layer of security to your account.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-800">How it works:</h3>
          <ul className="list-disc list-inside mt-2 space-y-1 text-blue-700">
            <li>Install an authenticator app on your mobile device</li>
            <li>Scan the QR code or enter the secret manually</li>
            <li>Enter the 6-digit code from your app to verify setup</li>
          </ul>
        </div>

        <button
          onClick={handleGenerateSecret}
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          {loading ? 'Generating...' : 'Generate Secret Code'}
        </button>
      </div>
    );
  }

  if (backupCodes.length > 0) {
    return (
      <div className="max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-4">Setup Complete</h2>
        <p className="mb-6 text-gray-600">
          Multi-factor authentication has been enabled successfully.
        </p>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-green-800">Important:</h3>
          <ul className="list-disc list-inside mt-2 space-y-1 text-green-700">
            <li>Save these backup codes in a secure location</li>
            <li>You can use them if you lose access to your authenticator app</li>
            <li>These codes are single-use and will be deleted after one use</li>
          </ul>
        </div>

        <div className="mb-6">
          <h3 className="font-medium text-gray-700 mb-2">Backup Codes:</h3>
          <div className="bg-gray-100 rounded-lg p-4 font-mono text-sm break-all">
            {backupCodes.map((code, index) => (
              <div key={index} className="mb-1">{code}</div>
            ))}
          </div>
        </div>

        <button
          onClick={handleDownloadBackupCodes}
          className="w-full bg-gray-800 text-white py-2 px-4 rounded-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors mb-4"
        >
          Download Backup Codes
        </button>

        <button
          onClick={onSetupComplete}
          className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          Continue to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Verify Your Setup</h2>
      <p className="mb-6 text-gray-600">
        Enter the 6-digit code from your authenticator app to verify your setup.
      </p>

      {secret && (
        <div className="flex flex-col items-center mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border mb-4">
            <QRCode value={`otpauth://totp/ClientForge:${localStorage.getItem('email')}?secret=${secret}&issuer=ClientForge`} />
          </div>
          <p className="text-sm text-gray-500">Scan this QR code with your authenticator app</p>
        </div>
      )}

      <div className="mb-6">
        <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-1">
          Verification Code
        </label>
        <input
          type="text"
          id="verificationCode"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          placeholder="Enter 6-digit code from your app"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <button
        onClick={handleVerifyCode}
        disabled={loading || !verificationCode.trim()}
        className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
      >
        {loading ? 'Verifying...' : 'Verify & Complete Setup'}
      </button>
    </div>
  );
};

export default MFASetup;