import React, { useState } from 'react';
import { sha256Hex } from '@/lib/crypto';
import { listUsers, getUserByEmail } from '@/lib/db';
import { signInWithPassword } from '@/lib/auth';
import { ALLOW_EDIPI_LOGIN } from '@/config/auth';

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

interface LoginProps {
  onLoggedIn: (user: UserProfile) => void;
  onCreateAccount: () => void;
}

 

export const Login: React.FC<LoginProps> = ({ onLoggedIn, onCreateAccount }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  React.useEffect(() => {}, [])

  

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      let emailForLogin = identifier.trim().toLowerCase()
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      // Prefer Supabase auth for email logins to avoid REST 401 on edms_users
      if (emailPattern.test(emailForLogin)) {
        const { data, error } = await signInWithPassword(emailForLogin, password)
        if (error) { setFeedback({ type: 'error', message: 'Invalid credentials.' }); return }
        const profile = await getUserByEmail(emailForLogin)
        if (!profile) { setFeedback({ type: 'error', message: 'User profile not found.' }); return }
        setFeedback({ type: 'success', message: 'Logged in.' });
        onLoggedIn(profile as any)
        return
      }

      // EDIPI login (fallback): requires users list access; may be unavailable in prod
      if (!ALLOW_EDIPI_LOGIN) {
        setFeedback({ type: 'error', message: 'Please log in with email.' });
        return
      }
      const isEdipiLike = /^[0-9]{10}$/.test(identifier)
      if (!isEdipiLike) {
        setFeedback({ type: 'error', message: 'Enter a valid email or 10-digit EDIPI.' })
        return
      }
      const users: any[] = (await listUsers()) as any
      const user = users.find(u => String(u.edipi) === identifier)
      emailForLogin = String(user?.email || '')
      if (!user || !emailForLogin) { setFeedback({ type: 'error', message: 'Account not found.' }); return }
      const { error } = await signInWithPassword(emailForLogin, password)
      if (error) { setFeedback({ type: 'error', message: 'Invalid credentials.' }); return }
      setFeedback({ type: 'success', message: 'Logged in.' })
      onLoggedIn(user)
    } catch {
      setFeedback({ type: 'error', message: 'Login failed.' });
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Login</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{ALLOW_EDIPI_LOGIN ? 'Email or EDIPI' : 'Email'}</label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {feedback && (
          <div className={`p-3 rounded-lg border ${feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {feedback.message}
          </div>
        )}
        <div className="flex justify-between items-center">
          <button type="button" onClick={onCreateAccount} className="text-blue-600 hover:underline">Create Account</button>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Login</button>
        </div>
      </form>

    </div>
  );
};
