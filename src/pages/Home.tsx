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
import { getUserByIdLegacy } from '../lib/db';
import { listInstallationsLegacy } from '../lib/db';

// Permission storage keys
const PERMISSION_KEYS = {
  SECTION: 'perm_section',
  COMMAND: 'perm_command',
  INST_SECTION: 'perm_inst_section',
  INST_COMMAND: 'perm_inst_command',
  HQMC_SECTION: 'perm_hqmc_section',
  HQMC_APPROVER: 'perm_hqmc_approver',
} as const;

const getCachedPermission = (key: string): boolean => {
  try {
    return localStorage.getItem(key) === 'true';
  } catch (error) {
    console.error(`Failed to read from localStorage for key "${key}":`, error);
    return false;
  }
};

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
  // Load cached dashboard permissions from localStorage to prevent permission loss on refresh
  const [hasSectionDashboard, setHasSectionDashboard] = useState(() => getCachedPermission(PERMISSION_KEYS.SECTION));
  const [hasCommandDashboard, setHasCommandDashboard] = useState(() => getCachedPermission(PERMISSION_KEYS.COMMAND));
  const [hasInstallationSectionDashboard, setHasInstallationSectionDashboard] = useState(() => getCachedPermission(PERMISSION_KEYS.INST_SECTION));
  const [hasInstallationCommandDashboard, setHasInstallationCommandDashboard] = useState(() => getCachedPermission(PERMISSION_KEYS.INST_COMMAND));
  const [hasHQMCSectionDashboard, setHasHQMCSectionDashboard] = useState(() => getCachedPermission(PERMISSION_KEYS.HQMC_SECTION));
  const [hasHQMCApproverDashboard, setHasHQMCApproverDashboard] = useState(() => getCachedPermission(PERMISSION_KEYS.HQMC_APPROVER));
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
      // Clear cached permissions on logout
      Object.values(PERMISSION_KEYS).forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error(`Failed to remove item from localStorage for key "${key}":`, error);
        }
      });
    }
  }, [currentUser]);

  // Cache dashboard permissions to localStorage to persist across refreshes
  useEffect(() => {
    if (!currentUser) return;

    const permissionsToCache: Record<string, boolean> = {
      [PERMISSION_KEYS.SECTION]: hasSectionDashboard,
      [PERMISSION_KEYS.COMMAND]: hasCommandDashboard,
      [PERMISSION_KEYS.INST_SECTION]: hasInstallationSectionDashboard,
      [PERMISSION_KEYS.INST_COMMAND]: hasInstallationCommandDashboard,
      [PERMISSION_KEYS.HQMC_SECTION]: hasHQMCSectionDashboard,
      [PERMISSION_KEYS.HQMC_APPROVER]: hasHQMCApproverDashboard,
    };

    for (const [key, value] of Object.entries(permissionsToCache)) {
      try {
        localStorage.setItem(key, String(value));
      } catch (error) {
        console.error(`Failed to set item in localStorage for key "${key}":`, error);
      }
    }
  }, [currentUser, hasSectionDashboard, hasCommandDashboard, hasInstallationSectionDashboard, hasInstallationCommandDashboard, hasHQMCSectionDashboard, hasHQMCApproverDashboard]);

  // Refresh currentUser from Supabase to pick up new privileges (e.g., installation admin)
  // Preserve local admin flags if server returns null/false (prevents data loss if DB is cleared)
  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const id = currentUser?.id || '';
        if (!id) return;
        const fresh = await getUserByIdLegacy(id);
        if (fresh && !canceled) {
          // Merge: prefer server values, but preserve local admin flags if server returns falsy
          const merged: UserRecord = {
            ...fresh,
            // Preserve admin flags if local has them but server doesn't
            isAppAdmin: fresh.isAppAdmin || currentUser?.isAppAdmin || false,
            isUnitAdmin: fresh.isUnitAdmin || currentUser?.isUnitAdmin || false,
            isInstallationAdmin: fresh.isInstallationAdmin || currentUser?.isInstallationAdmin || false,
            isHqmcAdmin: fresh.isHqmcAdmin || currentUser?.isHqmcAdmin || false,
            isCommandStaff: fresh.isCommandStaff || currentUser?.isCommandStaff || false,
            // Preserve IDs if local has them but server doesn't
            installationId: fresh.installationId || currentUser?.installationId,
            hqmcDivision: fresh.hqmcDivision || currentUser?.hqmcDivision,
          };
          setCurrentUser(merged);
          localStorage.setItem('currentUser', JSON.stringify(merged));
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

  // Compute dashboard permissions - preserve cached values, only update when we have positive results
  useEffect(() => {
    if (!currentUser) return;

    // Section dashboard - based on unit structure platoon-section mapping
    try {
      const rawUS = localStorage.getItem('unit_structure')
      if (rawUS) {
        const us = JSON.parse(rawUS)
        const uic = currentUser?.unitUic || ''
        const c = (currentUser?.company && currentUser.company !== 'N/A') ? currentUser.company : ''
        const p = (currentUser?.platoon && currentUser.platoon !== 'N/A') ? currentUser.platoon : ''
        const linked = us?.[uic]?._platoonSectionMap?.[c]?.[p] || ''
        // Only set true - don't overwrite cached value with false
        if (linked) setHasSectionDashboard(true)
      }
    } catch (e) {
      console.error('Failed to parse unit structure for section dashboard check', e)
    }

    // Command dashboard - based on command staff flag
    if (currentUser?.isCommandStaff) {
      setHasCommandDashboard(true)
    }

    // Installation dashboards - async fetch
    ;(async () => {
      try {
        const iid = currentUser?.installationId || ''
        if (!iid) return // Keep cached values
        const installs = await listInstallationsLegacy()
        try { localStorage.setItem('installations_cache', JSON.stringify(installs)) } catch {}
        const target: any = (installs as any[])?.find((i: any) => i.id === iid)
        const meId = currentUser?.id || ''
        const hasInstSection = !!(target && target.sectionAssignments && Object.values(target.sectionAssignments).some((arr: any) => Array.isArray(arr) && arr.includes(meId)))
        const hasInstCommand = !!(target && (
          (target.commandSectionAssignments && Object.values(target.commandSectionAssignments).some((arr: any) => Array.isArray(arr) && arr.includes(meId))) ||
          (target.commanderUserId && String(target.commanderUserId) === meId)
        ))
        // Only update to true - preserve cached values otherwise
        if (hasInstSection) setHasInstallationSectionDashboard(true)
        if (hasInstCommand) setHasInstallationCommandDashboard(true)
      } catch {
        // On error, keep cached values
      }
    })()

    // HQMC dashboards - async fetch
    ;(async () => {
      try {
        const myDiv = String(currentUser?.hqmcDivision || '')
        const meId = String(currentUser?.id || '')
        // If user is HQMC admin, ensure they have section access
        if (currentUser?.isHqmcAdmin) setHasHQMCSectionDashboard(true)
        if (!myDiv || !meId) return // Keep cached values
        const { listHQMCSectionAssignmentsLegacy } = await import('../lib/db')
        const rows = await listHQMCSectionAssignmentsLegacy()
        const hasSection = rows.some(r => r.division_code === myDiv && ((r.reviewers || []).includes(meId) || (r.approvers || []).includes(meId)))
        const isApprover = rows.some(r => r.division_code === myDiv && (r.approvers || []).includes(meId))
        if (hasSection) setHasHQMCSectionDashboard(true)
        if (isApprover) setHasHQMCApproverDashboard(true)
      } catch {
        // On error, preserve HQMC admin access if applicable
        if (currentUser?.isHqmcAdmin) setHasHQMCSectionDashboard(true)
      }
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
  
