import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Download, 
  Upload, 
  Clock,
  AlertCircle,
  CheckCircle,
  Cloud,
  HardDrive
} from 'lucide-react';
import { useMobileLayout } from './MobileLayout';
import { clsx } from 'clsx';

interface OfflineDocument {
  id: string;
  title: string;
  content: string;
  type: string;
  size: number;
  lastModified: string;
  cachedAt: string;
  syncStatus: 'synced' | 'pending' | 'error';
  offlineActions?: OfflineAction[];
}

interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete' | 'upload';
  documentId?: string;
  data: any;
  timestamp: string;
  status: 'pending' | 'synced' | 'error';
  error?: string;
}

interface OfflineContextType {
  isOnline: boolean;
  offlineDocuments: OfflineDocument[];
  pendingActions: OfflineAction[];
  syncStatus: 'idle' | 'syncing' | 'error' | 'complete';
  cacheDocument: (document: any) => Promise<void>;
  queueAction: (action: Omit<OfflineAction, 'id' | 'timestamp' | 'status'>) => void;
  syncPendingActions: () => Promise<void>;
  clearOfflineData: () => void;
  getCachedDocument: (id: string) => OfflineDocument | undefined;
  lastSyncTime: string | null;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

export const OfflineProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineDocuments, setOfflineDocuments] = useState<OfflineDocument[]>([]);
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'complete'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Load offline data from localStorage on mount
  useEffect(() => {
    const loadOfflineData = () => {
      try {
        const cachedDocs = localStorage.getItem('offline-documents');
        const cachedActions = localStorage.getItem('offline-actions');
        const cachedSyncTime = localStorage.getItem('last-sync-time');

        if (cachedDocs) {
          setOfflineDocuments(JSON.parse(cachedDocs));
        }

        if (cachedActions) {
          setPendingActions(JSON.parse(cachedActions));
        }

        if (cachedSyncTime) {
          setLastSyncTime(cachedSyncTime);
        }
      } catch (error) {
        console.error('Error loading offline data:', error);
      }
    };

    loadOfflineData();
  }, []);

  // Save offline data to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('offline-documents', JSON.stringify(offlineDocuments));
      localStorage.setItem('offline-actions', JSON.stringify(pendingActions));
      if (lastSyncTime) {
        localStorage.setItem('last-sync-time', lastSyncTime);
      }
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  }, [offlineDocuments, pendingActions, lastSyncTime]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      syncPendingActions();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const cacheDocument = async (document: any) => {
    try {
      const offlineDoc: OfflineDocument = {
        id: document.id,
        title: document.title,
        content: document.content || '',
        type: document.type || 'unknown',
        size: document.size || 0,
        lastModified: document.lastModified || new Date().toISOString(),
        cachedAt: new Date().toISOString(),
        syncStatus: 'synced',
        offlineActions: []
      };

      setOfflineDocuments(prev => {
        const existing = prev.findIndex(doc => doc.id === document.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = offlineDoc;
          return updated;
        }
        return [...prev, offlineDoc];
      });
    } catch (error) {
      console.error('Error caching document:', error);
    }
  };

  const queueAction = (action: Omit<OfflineAction, 'id' | 'timestamp' | 'status'>) => {
    const newAction: OfflineAction = {
      ...action,
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    setPendingActions(prev => [...prev, newAction]);
  };

  const syncPendingActions = async () => {
    if (!isOnline || pendingActions.length === 0) return;

    setSyncStatus('syncing');
    
    try {
      // Simulate API calls for each pending action
      for (const action of pendingActions) {
        await simulateSyncAction(action);
        
        // Update action status
        setPendingActions(prev => 
          prev.map(a => 
            a.id === action.id 
              ? { ...a, status: 'synced' as const }
              : a
          )
        );
      }

      // Clear synced actions
      setPendingActions(prev => prev.filter(a => a.status !== 'synced'));
      setLastSyncTime(new Date().toISOString());
      setSyncStatus('complete');
      
      // Reset status after delay
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const simulateSyncAction = async (action: OfflineAction): Promise<void> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    // Simulate occasional failures (10% chance)
    if (Math.random() < 0.1) {
      throw new Error('Simulated sync failure');
    }
  };

  const clearOfflineData = () => {
    setOfflineDocuments([]);
    setPendingActions([]);
    setLastSyncTime(null);
    localStorage.removeItem('offline-documents');
    localStorage.removeItem('offline-actions');
    localStorage.removeItem('last-sync-time');
  };

  const getCachedDocument = (id: string): OfflineDocument | undefined => {
    return offlineDocuments.find(doc => doc.id === id);
  };

  return (
    <OfflineContext.Provider value={{
      isOnline,
      offlineDocuments,
      pendingActions,
      syncStatus,
      cacheDocument,
      queueAction,
      syncPendingActions,
      clearOfflineData,
      getCachedDocument,
      lastSyncTime
    }}>
      {children}
      <MobileOfflineIndicator />
    </OfflineContext.Provider>
  );
};

export const MobileOfflineIndicator: React.FC = () => {
  const { isOnline, syncStatus, lastSyncTime, pendingActions } = useOffline();
  const { isMobile } = useMobileLayout();
  const [showDetails, setShowDetails] = useState(false);

  if (!isMobile) return null;

  const getSyncStatusColor = () => {
    switch (syncStatus) {
      case 'syncing': return 'text-blue-600';
      case 'error': return 'text-red-600';
      case 'complete': return 'text-green-600';
      default: return isOnline ? 'text-green-600' : 'text-red-600';
    }
  };

  const getSyncStatusIcon = () => {
    if (syncStatus === 'syncing') return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (syncStatus === 'error') return <AlertCircle className="w-4 h-4" />;
    if (syncStatus === 'complete') return <CheckCircle className="w-4 h-4" />;
    return isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />;
  };

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <>
      {/* Status Bar */}
      <div 
        className={clsx(
          "fixed top-0 left-0 right-0 z-40 p-2 flex items-center justify-between text-xs",
          isOnline ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        )}
      >
        <div className="flex items-center space-x-2">
          {getSyncStatusIcon()}
          <span className="font-medium">
            {isOnline ? 'Online' : 'Offline'}
          </span>
          {pendingActions.length > 0 && (
            <span className="bg-white px-2 py-1 rounded-full text-xs">
              {pendingActions.length} pending
            </span>
          )}
        </div>
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-white hover:bg-opacity-50 transition-colors"
        >
          <Clock className="w-3 h-3" />
          <span>{formatLastSync(lastSyncTime)}</span>
        </button>
      </div>

      {/* Detailed Panel */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-12 left-4 right-4 z-40 bg-white rounded-lg shadow-lg border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Connection Status</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              {/* Connection Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {isOnline ? (
                    <Wifi className="w-5 h-5 text-green-600 mr-2" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-red-600 mr-2" />
                  )}
                  <span className="text-sm font-medium">
                    {isOnline ? 'Connected' : 'Offline'}
                  </span>
                </div>
                <span className={clsx("text-xs px-2 py-1 rounded-full", getSyncStatusColor())}>
                  {syncStatus === 'idle' ? (isOnline ? 'Ready' : 'Offline') : syncStatus}
                </span>
              </div>

              {/* Cached Documents */}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Cached Documents</span>
                  <div className="flex items-center text-xs text-gray-500">
                    <HardDrive className="w-4 h-4 mr-1" />
                    {offlineDocuments.length} files
                  </div>
                </div>
              </div>

              {/* Pending Actions */}
              {pendingActions.length > 0 && (
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Pending Actions</span>
                    <span className="text-xs text-gray-500">{pendingActions.length} items</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {pendingActions.slice(0, 5).map((action) => (
                      <div key={action.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 capitalize">{action.type}</span>
                        <span className={clsx(
                          "px-2 py-1 rounded-full",
                          action.status === 'pending' ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
                        )}>
                          {action.status}
                        </span>
                      </div>
                    ))}
                    {pendingActions.length > 5 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{pendingActions.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sync Button */}
              {isOnline && pendingActions.length > 0 && (
                <div className="border-t pt-3">
                  <button
                    onClick={() => {
                      // Trigger sync
                      const { syncPendingActions } = useOffline();
                      syncPendingActions();
                    }}
                    disabled={syncStatus === 'syncing'}
                    className={clsx(
                      "w-full py-2 px-4 rounded-lg font-medium transition-colors",
                      syncStatus === 'syncing'
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    )}
                  >
                    {syncStatus === 'syncing' ? (
                      <div className="flex items-center justify-center">
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <Upload className="w-4 h-4 mr-2" />
                        Sync Now
                      </div>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export const OfflineDocumentViewer: React.FC<{
  documentId: string;
  onBack: () => void;
}> = ({ documentId, onBack }) => {
  const { getCachedDocument, isOnline } = useOffline();
  const document = getCachedDocument(documentId);

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Cloud className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Document Not Available Offline</h3>
        <p className="text-gray-500 text-center mb-4">
          This document is not cached for offline viewing. Connect to the internet to access it.
        </p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-3 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            ←
          </button>
          <div>
            <h2 className="font-semibold text-gray-900">{document.title}</h2>
            <div className="flex items-center text-xs text-gray-500">
              {!isOnline && <WifiOff className="w-3 h-3 mr-1" />}
              <span>Offline View</span>
            </div>
          </div>
        </div>
        <div className="flex items-center text-xs text-gray-500">
          <Clock className="w-3 h-3 mr-1" />
          <span>Cached {new Date(document.cachedAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Document Content</span>
            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
              {document.type.toUpperCase()}
            </span>
          </div>
          <div className="prose prose-sm max-w-none">
            {document.content ? (
              <pre className="whitespace-pre-wrap text-sm text-gray-700">{document.content}</pre>
            ) : (
              <div className="text-center py-8">
                <Cloud className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Binary content not displayed</p>
              </div>
            )}
          </div>
        </div>

        {/* Document Info */}
        <div className="mt-4 bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-2">Document Information</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>File Size:</span>
              <span>{(document.size / 1024).toFixed(1)} KB</span>
            </div>
            <div className="flex justify-between">
              <span>Last Modified:</span>
              <span>{new Date(document.lastModified).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Cached:</span>
              <span>{new Date(document.cachedAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={clsx(
                "px-2 py-1 rounded-full text-xs",
                document.syncStatus === 'synced' 
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              )}>
                {document.syncStatus}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};