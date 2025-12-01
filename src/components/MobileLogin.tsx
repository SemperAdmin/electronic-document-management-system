import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Fingerprint, Smartphone, Tablet, Monitor } from 'lucide-react';
import clsx from 'clsx';
import { useForm } from 'react-hook-form';
import { sha256Hex } from '@/lib/crypto';
import { listUsers } from '@/lib/db';
import { ALLOW_EDIPI_LOGIN } from '@/config/auth';
import { TouchOptimizedButton } from './MobileLayout';
import { useMobileLayout } from './MobileLayout';

interface UserProfile {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  mi?: string;
  email: string;
  edipi: string;
  edipiHash?: string;
  password_hash?: string;
  service: string;
  rank: string;
  role: string;
  battalion: string;
  company: string;
  unit: string;
  unitUic?: string;
  passwordHash: string;
}

interface MobileLoginProps {
  onLoggedIn: (user: UserProfile) => void;
  onCreateAccount: () => void;
}

interface LoginFormData {
  identifier: string;
  password: string;
  rememberMe: boolean;
}

interface BiometricData {
  type: 'fingerprint' | 'face';
  challenge: string;
}

export const MobileLogin: React.FC<MobileLoginProps> = ({ onLoggedIn, onCreateAccount }) => {
  const { isMobile, isTablet } = useMobileLayout();
  const [showPassword, setShowPassword] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'face' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<LoginFormData>({
    defaultValues: {
      identifier: '',
      password: '',
      rememberMe: false,
    },
  });

  const identifierValue = watch('identifier');

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      if ('credentials' in navigator && 'create' in navigator.credentials) {
        const available = await navigator.credentials.get({
          publicKey: {
            challenge: new Uint8Array(32),
            rpId: window.location.hostname,
            allowCredentials: [],
            userVerification: 'preferred',
          },
        }).catch(() => null);
        
        if (available) {
          setBiometricAvailable(true);
          setBiometricType('fingerprint');
        }
      }
    } catch (error) {
      console.log('Biometric check failed:', error);
    }
  };

  const handleBiometricLogin = async () => {
    if (!biometricAvailable) return;
    
    setIsLoading(true);
    setFeedback(null);
    
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          allowCredentials: [],
          userVerification: 'preferred',
        },
      });
      
      if (credential) {
        const users = await listUsers() as UserProfile[];
        const user = users[0];
        if (user) {
          setFeedback({ type: 'success', message: 'Biometric authentication successful!' });
          setTimeout(() => onLoggedIn(user), 1000);
        }
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Biometric authentication failed. Please use password login.' });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setFeedback(null);
    
    try {
      const users: UserProfile[] = (await listUsers()) as any;
      let user: UserProfile | undefined;
      let emailForLogin = data.identifier.trim().toLowerCase();
      
      if (ALLOW_EDIPI_LOGIN) {
        const isEdipiLike = /^[0-9]{10}$/.test(data.identifier);
        if (isEdipiLike) {
          user = users.find(u => String(u.edipi) === data.identifier);
          emailForLogin = String(user?.email || '');
        } else {
          user = users.find(u => String(u.email || '').toLowerCase() === emailForLogin);
        }
      } else {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(emailForLogin)) {
          setFeedback({ type: 'error', message: 'Please enter a valid email.' });
          return;
        }
        user = users.find(u => String(u.email || '').toLowerCase() === emailForLogin);
      }
      
      if (!user) {
        setFeedback({ type: 'error', message: 'Account not found.' });
        return;
      }
      
      const hashHex = await sha256Hex(data.password);
      const storedRaw = String((user as any).passwordHash || (user as any).password_hash || '').trim();
      if (!storedRaw) {
        setFeedback({ type: 'error', message: 'No password set for this user.' });
        return;
      }
      
      const isHex64 = /^[0-9a-f]{64}$/i.test(storedRaw);
      const ok = isHex64 ? (storedRaw.toLowerCase() === hashHex.toLowerCase()) : (storedRaw === data.password);
      
      if (!ok) {
        setFeedback({ type: 'error', message: 'Invalid credentials.' });
        return;
      }
      
      setFeedback({ type: 'success', message: 'Login successful!' });
      
      if (data.rememberMe) {
        localStorage.setItem('rememberedUser', user.email);
      }
      
      setTimeout(() => onLoggedIn(user), 1000);
    } catch (error) {
      setFeedback({ type: 'error', message: 'Login failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const getDeviceIcon = () => {
    if (isMobile) return <Smartphone className="w-6 h-6" />;
    if (isTablet) return <Tablet className="w-6 h-6" />;
    return <Monitor className="w-6 h-6" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-navy to-brand-navy/90 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={clsx(
          'w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden',
          isMobile ? 'mx-4' : 'mx-auto'
        )}
      >
        <div className="bg-brand-navy text-brand-cream p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            {getDeviceIcon()}
          </div>
          <h1 className="text-2xl font-bold mb-2">Mobile EDMS</h1>
          <p className="text-brand-cream/80 text-sm">
            Secure document management for field operations
          </p>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {ALLOW_EDIPI_LOGIN ? 'Email or EDIPI (10 digits)' : 'Email Address'}
              </label>
              <input
                {...register('identifier', {
                  required: 'This field is required',
                  validate: (value) => {
                    if (ALLOW_EDIPI_LOGIN) {
                      const isEdipiLike = /^[0-9]{10}$/.test(value);
                      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
                      return isEdipiLike || isEmail || 'Please enter a valid email or 10-digit EDIPI';
                    }
                    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Please enter a valid email address';
                  },
                })}
                type="text"
                inputMode={ALLOW_EDIPI_LOGIN && /^[0-9]*$/.test(identifierValue) ? 'numeric' : 'email'}
                className={clsx(
                  'w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all',
                  'text-base min-h-[48px]',
                  errors.identifier
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-brand-navy'
                )}
                placeholder={ALLOW_EDIPI_LOGIN ? 'Enter email or EDIPI' : 'Enter your email'}
                disabled={isLoading}
              />
              {errors.identifier && (
                <p className="mt-1 text-sm text-red-600">{errors.identifier.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  })}
                  type={showPassword ? 'text' : 'password'}
                  className={clsx(
                    'w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 transition-all',
                    'text-base min-h-[48px]',
                    errors.password
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-brand-navy'
                  )}
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center">
              <input
                {...register('rememberMe')}
                type="checkbox"
                className="h-5 w-5 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                disabled={isLoading}
              />
              <label className="ml-2 text-sm text-gray-700">
                Remember me on this device
              </label>
            </div>

            <AnimatePresence>
              {feedback && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={clsx(
                    'p-4 rounded-lg border text-center',
                    feedback.type === 'success'
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  )}
                >
                  {feedback.message}
                </motion.div>
              )}
            </AnimatePresence>

            <TouchOptimizedButton
              type="submit"
              loading={isLoading}
              size="large"
              className="w-full"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </TouchOptimizedButton>

            {biometricAvailable && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>
            )}

            {biometricAvailable && (
              <TouchOptimizedButton
                type="button"
                onClick={handleBiometricLogin}
                loading={isLoading}
                variant="secondary"
                size="large"
                className="w-full"
              >
                <>
                  <Fingerprint className="w-5 h-5 mr-2" />
                  {biometricType === 'face' ? 'Sign in with Face ID' : 'Sign in with Fingerprint'}
                </>
              </TouchOptimizedButton>
            )}
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onCreateAccount}
              className="text-brand-navy hover:text-brand-navy/80 text-sm font-medium focus:outline-none focus:underline"
              disabled={isLoading}
            >
              Don't have an account? Create one
            </button>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our terms of service and privacy policy.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            This system is approved for official use only.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
