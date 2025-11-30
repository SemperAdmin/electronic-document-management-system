import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DocumentManager } from '../components/DocumentManager';
import ReviewDashboard from './ReviewDashboard';
import SectionDashboard from './SectionDashboard';
import CommandDashboard from './CommandDashboard';
import { hasCommandDashboardAccess } from '../lib/visibility';
import { Unit } from '../lib/units';
import { ProfileForm } from '../components/ProfileForm';
import { AdminPanel } from '../components/AdminPanel';
import AppAdmin from './AppAdmin';
import { Login } from '../components/Login';

export default function Home() {
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [view, setView] = useState<'dashboard' | 'profile' | 'admin' | 'login' | 'appadmin' | 'review' | 'section' | 'command'>('login');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profileMode, setProfileMode] = useState<'create' | 'edit'>('create');
  const [dashOpen, setDashOpen] = useState(false);
  const [hasSectionDashboard, setHasSectionDashboard] = useState(false);
  const [hasCommandDashboard, setHasCommandDashboard] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('currentUser');
      if (raw) setCurrentUser(JSON.parse(raw));
    } catch {}
    try {
      const rawCU = localStorage.getItem('currentUser');
      const rawUS = localStorage.getItem('unit_structure');
      if (rawCU && rawUS) {
        const cu = JSON.parse(rawCU);
        const us = JSON.parse(rawUS);
        const uic = cu?.unitUic || '';
        const c = (cu?.company && cu.company !== 'N/A') ? cu.company : '';
        const p = (cu?.unit && cu.unit !== 'N/A') ? cu.unit : '';
        const linked = us?.[uic]?._platoonSectionMap?.[c]?.[p] || '';
        setHasSectionDashboard(!!linked);
        setHasCommandDashboard(hasCommandDashboardAccess(cu, us));
      } else {
        setHasSectionDashboard(false);
        setHasCommandDashboard(false);
      }
    } catch {
      setHasSectionDashboard(false);
      setHasCommandDashboard(false);
    }
    try {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view');
      if (v === 'admin' || v === 'profile' || v === 'dashboard' || v === 'login' || v === 'appadmin' || v === 'review' || v === 'section' || v === 'command') {
        setView(v as any);
      } else {
        const hasUser = !!localStorage.getItem('currentUser');
        setView(hasUser ? 'dashboard' : 'login');
      }
    } catch {
      const hasUser = !!localStorage.getItem('currentUser');
      setView(hasUser ? 'dashboard' : 'login');
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      try {
        const rawCU = localStorage.getItem('currentUser');
        const rawUS = localStorage.getItem('unit_structure');
        if (rawCU && rawUS) {
          const cu = JSON.parse(rawCU);
          const us = JSON.parse(rawUS);
          const uic = cu?.unitUic || '';
          const c = (cu?.company && cu.company !== 'N/A') ? cu.company : '';
          const p = (cu?.unit && cu.unit !== 'N/A') ? cu.unit : '';
          const linked = us?.[uic]?._platoonSectionMap?.[c]?.[p] || '';
          setHasSectionDashboard(!!linked);
          setHasCommandDashboard(hasCommandDashboardAccess(cu, us));
        }
      } catch {}
    }
    window.addEventListener('unit_structure_updated', handler)
    return () => window.removeEventListener('unit_structure_updated', handler)
  }, [])

  useEffect(() => {
    try {
      const rawUS = localStorage.getItem('unit_structure');
      if (!currentUser || !rawUS) { setHasSectionDashboard(false); return; }
      const us = JSON.parse(rawUS);
      const uic = currentUser?.unitUic || '';
      const c = (currentUser?.company && currentUser.company !== 'N/A') ? currentUser.company : '';
      const p = (currentUser?.unit && currentUser.unit !== 'N/A') ? currentUser.unit : '';
      const linked = us?.[uic]?._platoonSectionMap?.[c]?.[p] || '';
      setHasSectionDashboard(!!linked);
      setHasCommandDashboard(hasCommandDashboardAccess(currentUser, us));
    } catch {
      setHasSectionDashboard(false);
      setHasCommandDashboard(false);
    }
  }, [currentUser]);

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
                <div className="w-fit">
                  <h1 className="text-3xl font-bold text-[var(--text)]">Electronic Document Management System</h1>
                  <div className="flex items-center justify-between mt-1 w-full">
                    <p className="text-[var(--muted)]">Marine Corps Unit Document Management</p>
                    <div className="text-xl text-brand-red">by Semper Admin</div>
                  </div>
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
              {currentUser && (
                <button
                  className="bg-brand-navy text-brand-cream px-3 py-2 rounded-lg hover:bg-brand-red-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
                  onClick={() => {
                    try { localStorage.removeItem('currentUser') } catch {}
                    setCurrentUser(null)
                    setDashOpen(false)
                    setView('login')
                    navigate('/?view=login')
                  }}
                  aria-label="Logout"
                >
                  Logout
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

                      <div role="group" aria-label="My">
                        {currentUser && (
                          <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-brand-cream"
                            role="menuitem"
                            onClick={() => { setView('dashboard'); setDashOpen(false); }}
                          >
                            My Requests
                          </button>
                        )}
                      </div>

                      <div className="my-2 border-t border-brand-navy/20" />

                      <div role="group" aria-label="Administration">
                        {(currentUser?.isUnitAdmin) && (
                          <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-brand-cream"
                            role="menuitem"
                            onClick={() => { setView('admin'); setDashOpen(false); }}
                          >
                            Admin
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

                      <div className="my-2 border-t border-brand-navy/20" />

                      <div role="group" aria-label="Dashboards">
                        {(currentUser && hasSectionDashboard) && (
                          <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-brand-cream"
                            role="menuitem"
                            onClick={() => { setView('section'); setDashOpen(false); }}
                          >
                            Battalion Section Dashboard
                          </button>
                        )}
                        {(String(currentUser?.role || '') === 'COMMANDER' || (currentUser?.isCommandStaff && hasCommandDashboard)) && (
                          <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-brand-cream"
                            role="menuitem"
                            onClick={() => { setView('command'); setDashOpen(false); }}
                          >
                            Command Sections Dashboard
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
                      </div>
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
        ) : view === 'section' ? (
          <SectionDashboard />
        ) : view === 'command' ? (
          <CommandDashboard />
        ) : (
          <DocumentManager selectedUnit={selectedUnit} />
        )}
      </main>
    </div>
  );
}
