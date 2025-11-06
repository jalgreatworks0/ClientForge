import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { toast } from 'react-hot-toast'

// Validation schema with Zod
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password)
      toast.success('Welcome back!')
      navigate('/')
    } catch (error) {
      setError('root', {
        message: 'Invalid email or password',
      })
      toast.error('Invalid credentials')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-alabaster-100 px-4">
      <div className="w-full max-w-md">
        {/* White card */}
        <div className="bg-white rounded-xl shadow-elegant p-10">

          {/* Logo section */}
          <div className="flex flex-col items-center mb-8">
            {/* Logo */}
            <div className="mb-3">
              <img
                src="/logo.png"
                alt="ClientForge Logo"
                className="w-12 h-12 object-contain"
              />
            </div>

            {/* Company name */}
            <h1 className="text-3xl font-bold text-gray-900 mb-2 font-syne">
              ClientForge
            </h1>

            {/* Subtitle */}
            <p className="text-sm text-gray-600 mb-1 font-syne-mono">
              Enterprise CRM Platform
            </p>

            {/* Powered by */}
            <p className="text-xs text-gray-500 font-syne-mono">
              powered by Abstract Creatives
            </p>
          </div>

          {/* Login heading */}
          <h2 className="text-xl font-semibold text-gray-900 mb-6 font-syne">
            Login
          </h2>

          {/* Form section */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>

            {/* Root error display */}
            {errors.root && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
                <p className="text-sm text-red-800 font-syne-mono">{errors.root.message}</p>
              </div>
            )}

            {/* Email field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2 font-syne-mono"
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
                  w-full px-4 py-3 text-base font-syne-mono
                  border rounded-lg
                  transition-all duration-200
                  focus:outline-none focus:ring-2
                  ${errors.email
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }
                `}
                placeholder="Enter your email"
              />
              {errors.email && (
                <p id="email-error" className="mt-2 text-sm text-red-600 font-syne-mono" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password field with toggle */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2 font-syne-mono"
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
                    w-full px-4 py-3 pr-12 text-base font-syne-mono
                    border rounded-lg
                    transition-all duration-200
                    focus:outline-none focus:ring-2
                    ${errors.password
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }
                  `}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-2 text-sm text-red-600 font-syne-mono" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="
                w-full px-6 py-3 text-base font-medium text-white font-syne-mono
                bg-gray-900 rounded-lg
                hover:bg-gray-800
                focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                transform hover:scale-[1.01] active:scale-[0.99]
                transition-all duration-200
                shadow-sm
              "
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging in...
                </span>
              ) : (
                'Login to ClientForge'
              )}
            </button>
          </form>

          {/* Footer section */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 font-syne-mono">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/signup')}
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors focus:outline-none focus:underline"
              >
                Create Account
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
