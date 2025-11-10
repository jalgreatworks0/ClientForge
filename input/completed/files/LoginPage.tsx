import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';

// Validation schema
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      // Replace with your actual API endpoint
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        setError('root', {
          message: 'Invalid email or password',
        });
        return;
      }

      // Redirect on success
      window.location.href = '/dashboard';
    } catch (error) {
      setError('root', {
        message: 'Network error. Please try again.',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* White card */}
        <div className="bg-white rounded-xl shadow-md p-10">
          
          {/* Logo section */}
          <div className="flex flex-col items-center mb-8">
            {/* Flame logo */}
            <div className="mb-4">
              <svg 
                width="64" 
                height="64" 
                viewBox="0 0 64 64" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  d="M32 8C32 8 24 16 24 28C24 34.6274 28.4772 40 32 40C35.5228 40 40 34.6274 40 28C40 16 32 8 32 8Z" 
                  fill="#1F2937"
                />
                <path 
                  d="M32 20C32 20 28 24 28 30C28 33.3137 29.7909 36 32 36C34.2091 36 36 33.3137 36 30C36 24 32 20 32 20Z" 
                  fill="#4B5563"
                />
                <circle cx="32" cy="44" r="3" fill="#1F2937" />
              </svg>
            </div>
            
            {/* Company name */}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ClientForge
            </h1>
            
            {/* Subtitle */}
            <p className="text-sm text-gray-600 mb-1">
              Enterprise CRM Platform
            </p>
            
            {/* Powered by */}
            <p className="text-xs text-gray-500">
              powered by Abstract Creatives
            </p>
          </div>

          {/* Login heading */}
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Login
          </h2>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            
            {/* Root error display */}
            {errors.root && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3" role="alert">
                <p className="text-sm text-red-800">{errors.root.message}</p>
              </div>
            )}

            {/* Email field */}
            <div>
              <label 
                htmlFor="email" 
                className="block text-sm text-gray-700 mb-2"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                autoComplete="username"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
                {...register('email')}
                className={`
                  w-full px-4 py-2.5 text-base
                  border rounded-lg
                  bg-white
                  transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${errors.email 
                    ? 'border-red-500' 
                    : 'border-gray-300'
                  }
                `}
                placeholder=""
              />
              {errors.email && (
                <p id="email-error" className="mt-1.5 text-sm text-red-600" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label 
                htmlFor="password" 
                className="block text-sm text-gray-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  {...register('password')}
                  className={`
                    w-full px-4 py-2.5 pr-12 text-base
                    border rounded-lg
                    bg-white
                    transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                    ${errors.password 
                      ? 'border-red-500' 
                      : 'border-gray-300'
                    }
                  `}
                  placeholder=""
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1.5 text-sm text-red-600" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="
                w-full px-6 py-3 text-base font-medium text-white
                bg-gray-900 rounded-lg
                hover:bg-gray-800
                focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
                mt-6
              "
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Logging in...
                </span>
              ) : (
                'Login to ClientForge'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <a 
                href="/signup" 
                className="font-semibold text-gray-900 hover:text-gray-700 transition-colors focus:outline-none focus:underline"
              >
                Create Account
              </a>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
