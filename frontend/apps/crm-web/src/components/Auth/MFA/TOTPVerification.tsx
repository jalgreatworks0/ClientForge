/**
 * TOTPVerification.tsx
 * Two-Factor Authentication verification component for login flow
 *
 * Prompts user for 6-digit TOTP code from authenticator app
 * with account lockout handling and backup code option
 */

import React, { useState, useEffect } from 'react';
import { Shield, AlertCircle, Loader2, KeyRound, Lock } from 'lucide-react';
import { cn } from '../../../utils/helpers';

export interface TOTPVerificationProps {
  onSuccess: (verified: boolean) => void;
  onUseBackupCode?: () => void;
  onCancel?: () => void;
  userEmail?: string;
  className?: string;
}

interface LockoutInfo {
  isLocked: boolean;
  remainingMinutes?: number;
  attemptsRemaining?: number;
}

export const TOTPVerification: React.FC<TOTPVerificationProps> = ({
  onSuccess,
  onUseBackupCode,
  onCancel,
  userEmail,
  className
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockoutInfo, setLockoutInfo] = useState<LockoutInfo>({ isLocked: false });

  // Auto-focus input on mount
  useEffect(() => {
    const input = document.getElementById('totp-code');
    if (input) {
      input.focus();
    }
  }, []);

  /**
   * Handle TOTP code verification
   */
  const handleVerifyCode = async () => {
    if (!code.trim() || code.length !== 6) {
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
        body: JSON.stringify({ code })
      });

      const data = await response.json();

      if (response.status === 429) {
        // Account locked
        setLockoutInfo({
          isLocked: true,
          remainingMinutes: extractRemainingMinutes(data.message)
        });
        setError(data.message || 'Account locked due to too many failed attempts');
        return;
      }

      if (!response.ok) {
        // Check for attempts remaining in response
        if (data.attemptsRemaining !== undefined) {
          setLockoutInfo({
            isLocked: false,
            attemptsRemaining: data.attemptsRemaining
          });
        }
        throw new Error(data.message || 'Invalid verification code');
      }

      if (data.success) {
        onSuccess(true);
      } else {
        setError('Invalid verification code. Please try again.');
        setCode(''); // Clear input on failure
      }

    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
      setCode(''); // Clear input on error
      console.error('[MFA Verification] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle code input (digits only, max 6)
   */
  const handleCodeInput = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 6);
    setCode(digitsOnly);
    setError(null);

    // Auto-submit when 6 digits entered
    if (digitsOnly.length === 6) {
      // Small delay to show the last digit
      setTimeout(() => {
        handleVerifyCode();
      }, 100);
    }
  };

  /**
   * Extract remaining minutes from lockout error message
   */
  const extractRemainingMinutes = (message: string): number => {
    const match = message.match(/(\d+)\s*minute/i);
    return match ? parseInt(match[1], 10) : 15;
  };

  /**
   * Handle Enter key press
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6 && !loading) {
      handleVerifyCode();
    }
  };

  return (
    <div className={cn("max-w-md mx-auto p-6", className)}>
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Two-Factor Authentication
        </h2>
        <p className="text-gray-600">
          {userEmail ? `Verifying login for ${userEmail}` : 'Enter your verification code to continue'}
        </p>
      </div>

      {/* Account Lockout Warning */}
      {lockoutInfo.isLocked && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Account Locked</h3>
              <p className="text-sm text-red-700">
                Too many failed attempts. Please try again in {lockoutInfo.remainingMinutes} minutes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Attempts Remaining Warning */}
      {!lockoutInfo.isLocked && lockoutInfo.attemptsRemaining !== undefined && lockoutInfo.attemptsRemaining <= 2 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-800">
                <span className="font-semibold">{lockoutInfo.attemptsRemaining} attempts remaining</span> before your account is locked for 15 minutes.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Verification Code Input */}
        <div>
          <label
            htmlFor="totp-code"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Enter 6-digit code from your authenticator app
          </label>
          <input
            type="text"
            id="totp-code"
            value={code}
            onChange={(e) => handleCodeInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="000000"
            maxLength={6}
            inputMode="numeric"
            disabled={loading || lockoutInfo.isLocked}
            className={cn(
              "w-full px-4 py-3 text-center text-2xl font-mono tracking-widest",
              "border rounded-lg shadow-sm",
              "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
              "transition-colors",
              "disabled:bg-gray-100 disabled:cursor-not-allowed",
              error ? "border-red-300" : "border-gray-300"
            )}
          />
          <p className="mt-2 text-xs text-gray-500 text-center">
            Code automatically submits when complete
          </p>
        </div>

        {/* Error Display */}
        {error && !lockoutInfo.isLocked && (
          <div className="flex items-start gap-2 p-4 bg-red-50 text-red-700 rounded-lg" role="alert">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleVerifyCode}
            disabled={loading || code.length !== 6 || lockoutInfo.isLocked}
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
                <KeyRound className="w-5 h-5" />
                Verify Code
              </>
            )}
          </button>

          {/* Backup Code Option */}
          {onUseBackupCode && !lockoutInfo.isLocked && (
            <button
              onClick={onUseBackupCode}
              disabled={loading}
              className={cn(
                "w-full px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg",
                "hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500",
                "transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              Use Backup Code Instead
            </button>
          )}

          {/* Cancel Button */}
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={loading}
              className={cn(
                "w-full px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg",
                "hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500",
                "transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              Cancel
            </button>
          )}
        </div>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Lost access to your authenticator app?{' '}
            {onUseBackupCode ? (
              <button
                onClick={onUseBackupCode}
                className="text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Use a backup code
              </button>
            ) : (
              <span className="text-indigo-600">Contact support</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TOTPVerification;
