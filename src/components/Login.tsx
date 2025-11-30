import React, { useState } from 'react';

interface UserProfile {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  mi?: string;
  email: string;
  edipi: string;
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

const sha256 = async (value: string) => {
  const enc = new TextEncoder();
  const data = enc.encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
};

export const Login: React.FC<LoginProps> = ({ onLoggedIn, onCreateAccount }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const users: UserProfile[] = [];
      // Load static users from src/users
      const staticUserModules = import.meta.glob('../users/*.json', { eager: true });
      const staticUsers: UserProfile[] = Object.values(staticUserModules).map((m: any) => (m?.default ?? m) as UserProfile);
      users.push(...staticUsers);
      // Merge with localStorage users
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('fs/users/') && key.endsWith('.json')) {
          const rawU = localStorage.getItem(key);
          if (rawU) users.push(JSON.parse(rawU));
        }
      }
      const user = users.find(u => u.email.toLowerCase() === identifier.toLowerCase() || u.edipi === identifier);
      if (!user) {
        setFeedback({ type: 'error', message: 'Account not found.' });
        return;
      }
      const hash = await sha256(password);
      if (hash !== user.passwordHash) {
        setFeedback({ type: 'error', message: 'Invalid credentials.' });
        return;
      }
      localStorage.setItem('currentUser', JSON.stringify(user));
      setFeedback({ type: 'success', message: 'Logged in.' });
      onLoggedIn(user);
    } catch {
      setFeedback({ type: 'error', message: 'Login failed.' });
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Login</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email or EDIPI</label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
