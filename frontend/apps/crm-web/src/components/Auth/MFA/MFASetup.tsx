/**
 * MFASetup.tsx
 * Multi-Factor Authentication Setup Component
 *
 * Handles TOTP MFA enrollment with QR code scanning and backup code generation
 */

import React, { useState, useEffect } from 'react';
import { Shield, Download, Check, AlertCircle, Loader2, Smartphone, Key } from 'lucide-react';
import { cn } from '../../../utils/helpers';

export interface MFASetupProps {
  userId?: string;
  userEmail?: string;
  onSetupComplete: (backupCodes: string[]) => void;
  onCancel?: () => void;
  className?: string;
}

type SetupStep = 'intro' | 'generate' | 'verify' | 'backup';

interface TOTPSetupData {
  secret: string;
  qrCode: string;
  backupCodes: string[];
  provisioningUrl: string;
}

export const MFASetup: React.FC<MFASetupProps> = ({
  userId,
  userEmail,
  onSetupComplete,
  onCancel,
  className
}) => {
  const [currentStep, setCurrentStep] = useState<SetupStep>('intro');
  const [setupData, setSetupData] = useState<TOTPSetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codesDownloaded, setCodesDownloaded] = useState(false);

  // Auto-focus verification input when QR code is displayed
  useEffect(() => {
    if (currentStep === 'verify' && setupData) {
      const input = document.getElementById('verification-code');
      if (input) {
        input.focus();
      }
    }
  }, [currentStep, setupData]);

  /**
   * Generate TOTP secret and QR code
   */
  const handleGenerateSecret = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/v1/auth/mfa/totp/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate MFA secret');
      }

      const data = await response.json();

      if (!data.success || !data.totp) {
        throw new Error('Invalid response from server');
      }

      setSetupData(data.totp);
      setCurrentStep('verify');

    } catch (err: any) {
      setError(err.message || 'Failed to generate MFA secret');
      console.error('[MFA Setup] Error generating secret:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verify TOTP code entered by user
   */
  const handleVerifyCode = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/v1/auth/mfa/totp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          code: verificationCode
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Verification failed');
      }

      const data = await response.json();

      if (data.success) {
        setCurrentStep('backup');
      } else {
        setError('Invalid verification code. Please try again.');
      }

    } catch (err: any) {
      setError(err.message || 'Verification failed');
      console.error('[MFA Setup] Error verifying code:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Download backup codes as text file
   */
  const handleDownloadBackupCodes = () => {
    if (!setupData?.backupCodes) return;

    const timestamp = new Date().toISOString().split('T')[0];
    const header = `ClientForge CRM - MFA Backup Codes
Generated: ${new Date().toLocaleString()}
Email: ${userEmail || 'N/A'}

IMPORTANT: Keep these codes in a secure location!
- Each code can only be used once
- Use them if you lose access to your authenticator app
- Do not share these codes with anyone

Backup Codes:
-------------------\n`;

    const codesText = setupData.backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n');
    const footer = '\n-------------------\nEnd of backup codes';

    const fullText = header + codesText + footer;

    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clientforge-mfa-backup-codes-${timestamp}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setCodesDownloaded(true);
  };

  /**
   * Complete MFA setup
   */
  const handleComplete = () => {
    if (setupData?.backupCodes) {
      onSetupComplete(setupData.backupCodes);
    }
  };

  /**
   * Handle verification code input (digits only)
   */
  const handleCodeInput = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 6);
    setVerificationCode(digitsOnly);
    setError(null);
  };

  /**
   * Render introduction step
   */
  const renderIntro = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Enable Two-Factor Authentication
        </h2>
        <p className="text-gray-600">
          Add an extra layer of security to your account
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          How it works:
        </h3>
        <ul className="space-y-2 text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">1.</span>
            <span>Install an authenticator app (Google Authenticator, Authy, etc.)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">2.</span>
            <span>Scan the QR code or enter the secret key manually</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">3.</span>
            <span>Enter the 6-digit code to verify your setup</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">4.</span>
            <span>Save your backup codes in a secure location</span>
          </li>
        </ul>
      </div>

      <div className="flex gap-3">
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleGenerateSecret}
          disabled={loading}
          className={cn(
            "flex-1 px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg",
            "hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500",
            "transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
            "flex items-center justify-center gap-2"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Key className="w-5 h-5" />
              Get Started
            </>
          )}
        </button>
      </div>
    </div>
  );

  /**
   * Render verification step with QR code
   */
  const renderVerification = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Scan QR Code
        </h2>
        <p className="text-gray-600">
          Use your authenticator app to scan this code
        </p>
      </div>

      {setupData && (
        <>
          {/* QR Code Display */}
          <div className="flex flex-col items-center">
            <div className="bg-white p-6 rounded-xl shadow-md border-2 border-gray-200 mb-4">
              <img
                src={setupData.qrCode}
                alt="MFA QR Code"
                className="w-64 h-64"
              />
            </div>
            <p className="text-sm text-gray-500 mb-2">Can't scan the code?</p>
            <div className="bg-gray-100 px-4 py-2 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Enter this code manually:</p>
              <code className="text-sm font-mono text-gray-900 break-all">
                {setupData.secret}
              </code>
            </div>
          </div>

          {/* Verification Code Input */}
          <div>
            <label
              htmlFor="verification-code"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Enter 6-digit code from your app
            </label>
            <input
              type="text"
              id="verification-code"
              value={verificationCode}
              onChange={(e) => handleCodeInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && verificationCode.length === 6) {
                  handleVerifyCode();
                }
              }}
              placeholder="000000"
              maxLength={6}
              className={cn(
                "w-full px-4 py-3 text-center text-2xl font-mono tracking-widest",
                "border rounded-lg shadow-sm",
                "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                error ? "border-red-300" : "border-gray-300"
              )}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-4 bg-red-50 text-red-700 rounded-lg" role="alert">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <button
            onClick={handleVerifyCode}
            disabled={loading || verificationCode.length !== 6}
            className={cn(
              "w-full px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg",
              "hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500",
              "transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center justify-center gap-2"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Verify & Continue
              </>
            )}
          </button>
        </>
      )}
    </div>
  );

  /**
   * Render backup codes step
   */
  const renderBackupCodes = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Setup Complete!
        </h2>
        <p className="text-gray-600">
          Two-factor authentication has been enabled successfully
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
        <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Important: Save Your Backup Codes
        </h3>
        <ul className="space-y-2 text-amber-800 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-amber-600">•</span>
            <span>Keep these codes in a secure location (password manager, safe, etc.)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-600">•</span>
            <span>Use them if you lose access to your authenticator app</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-600">•</span>
            <span>Each code can only be used once and will be deleted after use</span>
          </li>
        </ul>
      </div>

      {setupData?.backupCodes && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Your Backup Codes:</h3>
          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {setupData.backupCodes.map((code, index) => (
                <div
                  key={index}
                  className="bg-white px-3 py-2 rounded border border-gray-300 text-center"
                >
                  {code}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={handleDownloadBackupCodes}
          className={cn(
            "w-full px-4 py-3 font-medium rounded-lg transition-colors",
            "flex items-center justify-center gap-2",
            codesDownloaded
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-gray-800 text-white hover:bg-gray-900"
          )}
        >
          {codesDownloaded ? (
            <>
              <Check className="w-5 h-5" />
              Backup Codes Downloaded
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Download Backup Codes
            </>
          )}
        </button>

        <button
          onClick={handleComplete}
          disabled={!codesDownloaded}
          className={cn(
            "w-full px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg",
            "hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500",
            "transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          Continue to Dashboard
        </button>

        {!codesDownloaded && (
          <p className="text-sm text-center text-gray-500">
            Please download your backup codes before continuing
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className={cn("max-w-lg mx-auto p-6", className)}>
      {currentStep === 'intro' && renderIntro()}
      {currentStep === 'verify' && renderVerification()}
      {currentStep === 'backup' && renderBackupCodes()}
    </div>
  );
};

export default MFASetup;
