import React, { useEffect, useState } from 'react';
import { DocumentManager } from '../components/DocumentManager';
import ReviewDashboard from './ReviewDashboard';
import { Unit } from '../lib/units';
import { ProfileForm } from '../components/ProfileForm';
import { AdminPanel } from '../components/AdminPanel';
import AppAdmin from './AppAdmin';
import { Login } from '../components/Login';

export default function Home() {
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [view, setView] = useState<'dashboard' | 'profile' | 'admin' | 'login' | 'appadmin' | 'review'>('dashboard');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profileMode, setProfileMode] = useState<'create' | 'edit'>('create');
  const [dashOpen, setDashOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('currentUser');
      if (raw) setCurrentUser(JSON.parse(raw));
    } catch {}
    try {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view');
      if (v === 'admin' || v === 'profile' || v === 'dashboard' || v === 'login' || v === 'appadmin' || v === 'review') {
        setView(v as any);
      }
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="bg-[var(--surface)] shadow-sm border-b border-brand-navy/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            {view === 'login' ? (
              <div className="w-full">
                <h1 className="text-3xl font-bold text-[var(--text)]">Welcome to the Electronic Document Management System</h1>
                <p className="text-[var(--muted)] mt-1">Secure, hierarchical workflow for military document submissions and reviews.</p>
                <p className="text-[var(--muted)] text-sm mt-1">EDMS enforces chain-of-command with role-based access and a linear review state machine from Platoon to Battalion to Commander.</p>
              </div>
            ) : (
              <>
                <div>
                  <h1 className="text-3xl font-bold text-[var(--text)]">Electronic Document Management System</h1>
                  <p className="text-[var(--muted)] mt-1">Marine Corps Unit Document Management</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-[var(--muted)]">
                    {currentUser ? (
                      <div className="text-right">
                        <div className="font-medium text-[var(--text)]">
                          {currentUser.rank} {currentUser.lastName}{currentUser.lastName ? ',' : ''} {currentUser.firstName}{currentUser.mi ? ` ${currentUser.mi}` : ''}
                        </div>
                        <div className="text-xs text-[var(--muted)]">{currentUser.service} • {currentUser.role}</div>
                        {((currentUser?.company && currentUser.company !== 'N/A') || (currentUser?.unit && currentUser.unit !== 'N/A')) && (
                          <div className="text-xs">
                            {[
                              currentUser.company && currentUser.company !== 'N/A' ? currentUser.company : null,
                              currentUser.unit && currentUser.unit !== 'N/A' ? currentUser.unit : null
                            ].filter(Boolean).join(' • ')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-[var(--muted)]">Not signed in</div>
                    )}
                  </div>
              {!currentUser && (
                <button
                  className="bg-brand-navy text-brand-cream px-3 py-2 rounded-lg hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
                  onClick={() => setView('login')}
                >
                  Login
                </button>
              )}
                  {currentUser && (
              <button
                  className="bg-brand-charcoal text-brand-cream px-3 py-2 rounded-lg hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold underline decoration-brand-red-2 underline-offset-4"
                  onClick={() => { setProfileMode('edit'); setView('profile'); }}
                >
                  Manage Profile
                </button>
              )}
                  <div className="relative inline-block">
                    <button
                      className="bg-brand-red text-brand-cream px-3 py-2 rounded-lg hover:bg-brand-red-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold underline decoration-brand-red-2 underline-offset-4"
                      aria-haspopup="menu"
                      aria-expanded={dashOpen}
                      onClick={() => setDashOpen(prev => !prev)}
                    >
                      Dashboards
                    </button>
                    <div
                      className={`${dashOpen ? 'block' : 'hidden'} absolute right-0 mt-2 w-60 bg-[var(--surface)] border-2 border-brand-red-2 rounded-lg shadow-lg`}
                      role="menu"
                      aria-label="Dashboards"
                    >
                      <div className="px-4 py-2 bg-brand-red text-brand-cream rounded-t-lg text-sm font-medium">Dashboards</div>
                      {currentUser && (
                        <button
                          className="w-full text-left px-4 py-2 text-sm hover:bg-brand-cream"
                          role="menuitem"
                          onClick={() => { setView('dashboard'); setDashOpen(false); }}
                        >
                          My Requests
                        </button>
                      )}
                      {(currentUser?.isUnitAdmin) && (
                        <button
                          className="w-full text-left px-4 py-2 text-sm hover:bg-brand-cream"
                          role="menuitem"
                          onClick={() => { setView('admin'); setDashOpen(false); }}
                        >
                          Admin
                        </button>
                      )}
                      {(String(currentUser?.role || '').includes('REVIEW')) && (
                        <button
                          className="w-full text-left px-4 py-2 text-sm hover:bg-brand-cream"
                          role="menuitem"
                          onClick={() => { setView('review'); setDashOpen(false); }}
                        >
                          Review Dashboard
                        </button>
                      )}
                      {currentUser && currentUser.email === 'stephen.shorter@usmc.mil' && String(currentUser.edipi) === '1402008233' && (
                        <button
                          className="w-full text-left px-4 py-2 text-sm hover:bg-brand-cream"
                          role="menuitem"
                          onClick={() => { setView('appadmin'); setDashOpen(false); }}
                        >
                          App Admin
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {view === 'profile' ? (
          <ProfileForm 
            mode={profileMode}
            initial={profileMode === 'edit' ? (currentUser || {}) : {}}
            onSaved={(user) => { setCurrentUser(user); setView('dashboard'); }} 
          />
        ) : view === 'admin' ? (
          <AdminPanel />
        ) : view === 'appadmin' ? (
          <AppAdmin />
        ) : view === 'login' ? (
          <Login 
            onLoggedIn={(user) => { setCurrentUser(user); setView('dashboard'); }} 
            onCreateAccount={() => { setProfileMode('create'); setView('profile'); }} 
          />
        ) : view === 'review' ? (
          <ReviewDashboard />
        ) : (
          <DocumentManager selectedUnit={selectedUnit} />
        )}
      </main>
    </div>
  );
}
