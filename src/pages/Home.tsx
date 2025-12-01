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
import { MobileLogin } from '../components/MobileLogin';
import { MobileLayoutProvider, useMobileLayout } from '../components/MobileLayout';
import { MobileDashboard } from '../components/MobileDashboard';
import { MobileDocumentList } from '../components/MobileDocumentList';
import { MobileDocumentViewer } from '../components/MobileDocumentViewer';
import { MobileUpload } from '../components/MobileUpload';
import { MobileBottomNav, MobileFloatingActionButton } from '../components/MobileBottomNav';
import { AccessibilityProvider, MobileAccessibilityButton } from '../components/MobileAccessibility';
import { OfflineProvider } from '../components/MobileOffline';
 
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
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [mobileActiveTab, setMobileActiveTab] = useState('dashboard');
  const navigate = useNavigate();
  const { isMobile } = useMobileLayout();

  

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
    const isCmd = String(currentUser?.role || '') === 'COMMANDER' || !!currentUser?.isCommandStaff;
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
          isMobile ? (
            <MobileLogin 
              onLoggedIn={(user) => { setCurrentUser(user); setView('dashboard'); }} 
              onCreateAccount={() => { setProfileMode('create'); setView('profile'); }} 
            />
          ) : (
            <Login 
              onLoggedIn={(user) => { setCurrentUser(user); setView('dashboard'); }} 
              onCreateAccount={() => { setProfileMode('create'); setView('profile'); }} 
            />
          )
        ) : view === 'review' ? (
          <ReviewDashboard />
        ) : view === 'section' ? (
          <SectionDashboard />
        ) : view === 'command' ? (
          <CommandDashboard />
        ) : isMobile ? (
          view === 'documents' ? (
            <MobileDocumentList
              documents={[]}
              onDocumentSelect={(doc) => {
                setSelectedDocument(doc);
                setView('document-viewer');
              }}
              onDocumentAction={(action, doc) => {
                if (action === 'download') {
                  /* no-op in demo */
                }
              }}
            />
          ) : view === 'document-viewer' ? (
            <MobileDocumentViewer
              document={selectedDocument}
              onClose={() => setView('documents')}
            />
          ) : view === 'upload' ? (
            <MobileUpload
              onUploadComplete={() => setView('documents')}
              onCancel={() => setView('documents')}
            />
          ) : (
            <MobileDashboard 
              currentUser={currentUser}
              onLogout={() => {
                setCurrentUser(null)
                setDashOpen(false)
                setView('login')
                navigate('/?view=login')
              }}
              onNavigate={(view) => setView(view as any)}
            />
          )
        ) : (
          <DocumentManager selectedUnit={selectedUnit} currentUser={currentUser} />
        )}
      </main>
      
      {/* Mobile Components */}
      {isMobile && currentUser && (
        <>
          <MobileBottomNav
            activeTab={mobileActiveTab}
            onTabChange={(tab) => {
              setMobileActiveTab(tab);
              switch (tab) {
                case 'dashboard':
                  setView('dashboard');
                  break;
                case 'documents':
                  setView('documents');
                  break;
                case 'upload':
                  setView('upload');
                  break;
                case 'search':
                  // TODO: Implement search view
                  break;
                case 'settings':
                  setView('profile');
                  break;
              }
            }}
            contextualActions={{
              showPlus: view === 'documents',
              showFilter: view === 'documents',
              showSort: view === 'documents',
              onPlusClick: () => setView('upload'),
              onFilterClick: () => {
                // TODO: Implement filter functionality
                console.log('Filter clicked');
              },
              onSortClick: () => {
                // TODO: Implement sort functionality
                console.log('Sort clicked');
              }
            }}
            documentCount={0}
          />
          <MobileAccessibilityButton />
        </>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <MobileLayoutProvider>
      <AccessibilityProvider>
        <OfflineProvider>
          <HomeContent />
        </OfflineProvider>
      </AccessibilityProvider>
    </MobileLayoutProvider>
  );
}
  
