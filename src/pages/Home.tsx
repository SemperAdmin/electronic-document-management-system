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
 
import logoImg from '../assets/images/logo.png';
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

  

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view');
      if (v === 'admin' || v === 'profile' || v === 'dashboard' || v === 'login' || v === 'appadmin' || v === 'review' || v === 'section' || v === 'command' || v === 'documents' || v === 'document-viewer' || v === 'upload') {
        setView(v as any);
      } else {
        setView('login');
      }
    } catch {
      setView('login');
    }
  }, []);

  useEffect(() => {}, [])

  useEffect(() => {
    setHasSectionDashboard(false);
    const isCmd = String(currentUser?.role || '') === 'COMMANDER';
    setHasCommandDashboard(isCmd);
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header
        currentUser={currentUser}
        hasSectionDashboard={hasSectionDashboard}
        hasCommandDashboard={hasCommandDashboard}
        onManageProfile={() => { setProfileMode('edit'); setView('profile') }}
        onLogout={() => { setCurrentUser(null); setView('login'); navigate('/?view=login') }}
        onNavigate={(v) => setView(v as any)}
        isLogin={view === 'login'}
      />

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
  
