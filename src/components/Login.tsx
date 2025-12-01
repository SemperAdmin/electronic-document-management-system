import React, { useState } from 'react';
import { getUserByEmail, getUserByEdipi } from '@/lib/db';
import { sha256Hex } from '@/lib/crypto';
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
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const isEdipiLike = /^[0-9]{10}$/.test(identifier)
      let user: any = null
      let emailForLogin = identifier.trim().toLowerCase()

      if (ALLOW_EDIPI_LOGIN && isEdipiLike) {
        user = await getUserByEdipi(String(identifier))
        emailForLogin = String(user?.email || '')
      } else if (emailPattern.test(emailForLogin)) {
        user = await getUserByEmail(emailForLogin)
      } else {
        setFeedback({ type: 'error', message: 'Enter a valid email or 10-digit EDIPI.' })
        return
      }

      if (!user || !emailForLogin) { setFeedback({ type: 'error', message: 'Account not found.' }); return }

      const storedRaw = String((user as any).passwordHash || (user as any).password_hash || '').trim()
      if (!storedRaw) { setFeedback({ type: 'error', message: 'No password set for this user.' }); return }
      const hashHex = await sha256Hex(password)
      const isHex64 = /^[0-9a-f]{64}$/i.test(storedRaw)
      const ok = isHex64 ? (storedRaw.toLowerCase() === hashHex.toLowerCase()) : (storedRaw === password)
      if (!ok) { setFeedback({ type: 'error', message: 'Invalid credentials.' }); return }

      // success
      const profile = await getUserByEmail(emailForLogin)
      if (!profile) {
        console.error('[Login] User profile not found after successful password verification', { emailForLogin })
        setFeedback({ type: 'error', message: 'User profile not found.' })
        return
      }
      setFeedback({ type: 'success', message: 'Logged in.' })
      onLoggedIn(profile as any)

    } catch (error) {
      console.error('[Login] Login failed:', error)
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
