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
import { loadUnitStructureFromBundle } from '../lib/unitStructure';
import { Header } from '../components/Header';

function HomeContent() {
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [view, setView] = useState<'dashboard' | 'profile' | 'admin' | 'login' | 'appadmin' | 'review' | 'section' | 'command' | 'documents' | 'document-viewer' | 'upload'>('login');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profileMode, setProfileMode] = useState<'create' | 'edit'>('create');
  const [dashOpen, setDashOpen] = useState(false);
  const [hasSectionDashboard, setHasSectionDashboard] = useState(false);
  const [hasCommandDashboard, setHasCommandDashboard] = useState(false);
  const navigate = useNavigate();

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error('Failed to load user from localStorage:', error);
    }
  }, []);

  // Load view from URL params or localStorage
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlView = params.get('view');
      if (urlView === 'admin' || urlView === 'profile' || urlView === 'dashboard' || urlView === 'login' || urlView === 'appadmin' || urlView === 'review' || urlView === 'section' || urlView === 'command' || urlView === 'documents' || urlView === 'document-viewer' || urlView === 'upload') {
        setView(urlView as any);
      } else {
        const savedView = localStorage.getItem('currentView');
        const savedUser = localStorage.getItem('currentUser');
        if (savedView && savedUser) {
          setView(savedView as any);
        } else {
          setView('login');
        }
      }
    } catch {
      setView('login');
    }
  }, []);

  // Save user to localStorage when it changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('currentView');
    }
  }, [currentUser]);

  // Save view to localStorage when it changes (except login)
  useEffect(() => {
    if (view !== 'login' && currentUser) {
      localStorage.setItem('currentView', view);
    }
  }, [view, currentUser]);

  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem('unit_structure');
        if (raw) return;
        const us = await loadUnitStructureFromBundle();
        localStorage.setItem('unit_structure', JSON.stringify(us));
      } catch (error) {
        console.error("Failed to load unit structure:", error);
      }
    })();
  }, []);

  useEffect(() => {
    try {
      const rawUS = localStorage.getItem('unit_structure')
      if (!currentUser || !rawUS) { setHasSectionDashboard(false); return }
      const us = JSON.parse(rawUS)
      const uic = currentUser?.unitUic || ''
      const c = (currentUser?.company && currentUser.company !== 'N/A') ? currentUser.company : ''
      const p = (currentUser?.platoon && currentUser.platoon !== 'N/A') ? currentUser.platoon : ''
      const linked = us?.[uic]?._platoonSectionMap?.[c]?.[p] || ''
      setHasSectionDashboard(!!linked)
    } catch (e) {
      console.error('Failed to parse unit structure for section dashboard check', e)
      setHasSectionDashboard(false)
    }
    const isCmd = currentUser?.isCommandStaff;
    setHasCommandDashboard(!!isCmd);
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header
        currentUser={currentUser}
        hasSectionDashboard={hasSectionDashboard}
        hasCommandDashboard={hasCommandDashboard}
        onManageProfile={() => { setProfileMode('edit'); setView('profile'); navigate('/?view=profile') }}
        onLogout={() => { setCurrentUser(null); setView('login'); navigate('/?view=login') }}
        onNavigate={(v) => { setView(v as any); navigate(`/?view=${v}`) }}
        isLogin={view === 'login'}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {view === 'profile' ? (
          <ProfileForm
            mode={profileMode}
            initial={profileMode === 'edit' ? (currentUser || {}) : {}}
            onSaved={(user) => { setCurrentUser(user); setView('dashboard'); navigate('/?view=dashboard'); }}
          />
        ) : view === 'admin' ? (
          <AdminPanel />
        ) : view === 'appadmin' ? (
          <AppAdmin />
        ) : view === 'login' ? (
          <Login
            onLoggedIn={(user) => { setCurrentUser(user); setView('dashboard'); navigate('/?view=dashboard'); }}
            onCreateAccount={() => { setProfileMode('create'); setView('profile'); navigate('/?view=profile'); }}
          />
        ) : view === 'review' ? (
          <ReviewDashboard />
        ) : view === 'section' ? (
          <SectionDashboard />
        ) : view === 'command' ? (
          <CommandDashboard />
        ) : (
          <DocumentManager selectedUnit={selectedUnit} currentUser={currentUser} />
        )}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <HomeContent />
  );
}
  
