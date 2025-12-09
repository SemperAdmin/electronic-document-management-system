import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DocumentManager } from '../components/DocumentManager';
import ReviewDashboard from './ReviewDashboard';
import SectionDashboard from './SectionDashboard';
import CommandDashboard from './CommandDashboard';
import InstallationSectionDashboard from './InstallationSectionDashboard';
import InstallationCommandDashboard from './InstallationCommandDashboard';
import InstallationAdmin from './InstallationAdmin';
import HQMCAdmin from './HQMCAdmin';
import HQMCSectionDashboard from './HQMCSectionDashboard';
import HQMCApproverDashboard from './HQMCApproverDashboard';
import { hasCommandDashboardAccess } from '../lib/visibility';
import { Unit } from '../lib/units';
import { ProfileForm } from '../components/ProfileForm';
import { AdminPanel } from '../components/AdminPanel';
import { UserRecord } from '@/types';
import AppAdmin from './AppAdmin';
import { Login } from '../components/Login';
import { loadUnitStructureFromBundle } from '../lib/unitStructure';
import { Header } from '../components/Header';
import { getUserById } from '../lib/db';
import { listInstallations } from '../lib/db';

function HomeContent() {
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [view, setView] = useState<'dashboard' | 'profile' | 'admin' | 'login' | 'appadmin' | 'hqmc-admin' | 'hqmc-section' | 'hqmc-approver' | 'review' | 'section' | 'command' | 'installation' | 'installation-section' | 'installation-command' | 'documents' | 'document-viewer' | 'upload'>('login');
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(() => {
    try {
      const savedUser = localStorage.getItem('currentUser');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error('Failed to parse user from localStorage:', error);
      return null;
    }
  });
  const [profileMode, setProfileMode] = useState<'create' | 'edit'>('create');
  const [dashOpen, setDashOpen] = useState(false);
  const [hasSectionDashboard, setHasSectionDashboard] = useState(false);
  const [hasCommandDashboard, setHasCommandDashboard] = useState(false);
  const [hasInstallationSectionDashboard, setHasInstallationSectionDashboard] = useState(false);
  const [hasInstallationCommandDashboard, setHasInstallationCommandDashboard] = useState(false);
  const [hasHQMCSectionDashboard, setHasHQMCSectionDashboard] = useState(false);
  const [hasHQMCApproverDashboard, setHasHQMCApproverDashboard] = useState(false);
  const navigate = useNavigate();

  // Load view from URL params or localStorage
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlView = params.get('view');
      if (urlView === 'admin' || urlView === 'profile' || urlView === 'dashboard' || urlView === 'login' || urlView === 'appadmin' || urlView === 'hqmc-admin' || urlView === 'hqmc-section' || urlView === 'hqmc-approver' || urlView === 'review' || urlView === 'section' || urlView === 'command' || urlView === 'installation' || urlView === 'installation-section' || urlView === 'installation-command' || urlView === 'documents' || urlView === 'document-viewer' || urlView === 'upload') {
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

  // Refresh currentUser from Supabase to pick up new privileges (e.g., installation admin)
  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const id = currentUser?.id || '';
        if (!id) return;
        const fresh = await getUserById(id);
        if (fresh && !canceled) {
          setCurrentUser(fresh);
          localStorage.setItem('currentUser', JSON.stringify(fresh));
        }
      } catch {}
    })();
    return () => { canceled = true };
  }, []);

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
    (async () => {
      try {
        const iid = currentUser?.installationId || ''
        if (!iid) { setHasInstallationSectionDashboard(false); setHasInstallationCommandDashboard(false); return }
        const installs = await listInstallations()
        try { localStorage.setItem('installations_cache', JSON.stringify(installs)) } catch {}
        const target: any = (installs as any[])?.find((i: any) => i.id === iid)
        const meId = currentUser?.id || ''
        const hasInstSection = !!(target && target.sectionAssignments && Object.values(target.sectionAssignments).some((arr: any) => Array.isArray(arr) && arr.includes(meId)))
        const hasInstCommand = !!(target && (
          (target.commandSectionAssignments && Object.values(target.commandSectionAssignments).some((arr: any) => Array.isArray(arr) && arr.includes(meId))) ||
          (target.commanderUserId && String(target.commanderUserId) === meId)
        ))
        setHasInstallationSectionDashboard(hasInstSection)
        setHasInstallationCommandDashboard(hasInstCommand)
      } catch {
        setHasInstallationSectionDashboard(false)
        setHasInstallationCommandDashboard(false)
      }
    })()
    ;(async () => {
      try {
        const myDiv = String(currentUser?.hqmcDivision || '')
        const meId = String(currentUser?.id || '')
        if (!myDiv || !meId) { setHasHQMCSectionDashboard(!!currentUser?.isHqmcAdmin); return }
        const { listHQMCSectionAssignments } = await import('../lib/db')
        const rows = await listHQMCSectionAssignments()
        const any = rows.some(r => r.division_code === myDiv && ((r.reviewers || []).includes(meId) || (r.approvers || []).includes(meId)))
        setHasHQMCSectionDashboard(any || !!currentUser?.isHqmcAdmin)
        const isApprover = rows.some(r => r.division_code === myDiv && (r.approvers || []).includes(meId))
        setHasHQMCApproverDashboard(isApprover)
      } catch { setHasHQMCSectionDashboard(!!currentUser?.isHqmcAdmin) }
    })()
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header
        currentUser={currentUser}
        hasSectionDashboard={hasSectionDashboard}
        hasCommandDashboard={hasCommandDashboard}
        hasInstallationSectionDashboard={hasInstallationSectionDashboard}
        hasInstallationCommandDashboard={hasInstallationCommandDashboard}
        hasHQMCSectionDashboard={hasHQMCSectionDashboard}
        hasHQMCApproverDashboard={hasHQMCApproverDashboard}
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
        ) : view === 'installation' ? (
          <InstallationAdmin />
        ) : view === 'hqmc-admin' ? (
          <HQMCAdmin />
        ) : view === 'installation-section' ? (
          <InstallationSectionDashboard />
        ) : view === 'installation-command' ? (
          <InstallationCommandDashboard />
        ) : view === 'hqmc-section' ? (
          <HQMCSectionDashboard />
        ) : view === 'hqmc-approver' ? (
          <HQMCApproverDashboard />
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
  
