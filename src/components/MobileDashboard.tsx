import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  FileText, 
  Upload, 
  Settings, 
  Bell, 
  WifiOff, 
  RefreshCw,
  Menu,
  X,
  User,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { TouchOptimizedButton } from './MobileLayout';
import { useMobileLayout } from './MobileLayout';

interface MobileDashboardProps {
  currentUser: any;
  onLogout: () => void;
  onNavigate: (view: string) => void;
}

interface DashboardCard {
  id: string;
  title: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  action: () => void;
}

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<number>(0);
  const isDraggingRef = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
      touchStartRef.current = e.touches[0].clientY;
      isDraggingRef.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDraggingRef.current || window.scrollY > 0) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartRef.current;
    
    if (diff > 0 && diff < 150) {
      setPullDistance(diff);
      e.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!isDraggingRef.current) return;
    
    isDraggingRef.current = false;
    
    if (pullDistance > 80) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div ref={containerRef} className="relative">
      <div 
        className="absolute top-0 left-0 right-0 flex items-center justify-center text-brand-navy"
        style={{
          transform: `translateY(${Math.min(pullDistance * 0.5, 60)}px)`,
          opacity: Math.min(pullDistance / 100, 1),
          height: '60px',
        }}
      >
        <div className="flex items-center gap-2">
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">
            {pullDistance > 80 ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      </div>
      
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isDraggingRef.current ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const MobileDashboard: React.FC<MobileDashboardProps> = ({
  currentUser,
  onLogout,
  onNavigate,
}) => {
  const { isMobile } = useMobileLayout();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState(3);
  const [dashboardCards, setDashboardCards] = useState<DashboardCard[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const cards: DashboardCard[] = [
      {
        id: 'documents',
        title: 'My Documents',
        count: 12,
        icon: <FileText className="w-6 h-6" />,
        color: 'bg-blue-500',
        action: () => onNavigate('documents'),
      },
      {
        id: 'pending',
        title: 'Pending Review',
        count: 3,
        icon: <Bell className="w-6 h-6" />,
        color: 'bg-orange-500',
        action: () => onNavigate('pending'),
      },
      {
        id: 'upload',
        title: 'Upload Document',
        icon: <Upload className="w-6 h-6" />,
        color: 'bg-green-500',
        action: () => onNavigate('upload'),
      },
      {
        id: 'settings',
        title: 'Settings',
        icon: <Settings className="w-6 h-6" />,
        color: 'bg-gray-500',
        action: () => onNavigate('settings'),
      },
    ];

    if (currentUser?.isUnitAdmin) {
      cards.splice(2, 0, {
        id: 'admin',
        title: 'Admin Panel',
        count: 5,
        icon: <Settings className="w-6 h-6" />,
        color: 'bg-purple-500',
        action: () => onNavigate('admin'),
      });
    }

    setDashboardCards(cards);
  }, [currentUser, onNavigate]);

  const handleRefresh = async () => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    setNotifications(prev => Math.max(0, prev - 1));
  };

  const menuItems = [
    {
      id: 'profile',
      label: 'Profile',
      icon: <User className="w-5 h-5" />,
      action: () => {
        setSidebarOpen(false);
        onNavigate('profile');
      },
    },
    {
      id: 'logout',
      label: 'Logout',
      icon: <LogOut className="w-5 h-5" />,
      action: () => {
        setSidebarOpen(false);
        onLogout();
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-brand-navy text-white sticky top-0 z-40 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <TouchOptimizedButton
              onClick={() => setSidebarOpen(!sidebarOpen)}
              variant="secondary"
              size="small"
              ariaLabel="Open menu"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </TouchOptimizedButton>
            <h1 className="text-lg font-semibold">EDMS</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {!isOnline && (
              <div className="flex items-center gap-1 text-yellow-300">
                <WifiOff className="w-4 h-4" />
                <span className="text-xs">Offline</span>
              </div>
            )}
            
            {notifications > 0 && (
              <div className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {notifications}
                </span>
              </div>
            )}
            
            <div className="w-8 h-8 rounded-full bg-brand-cream text-brand-navy flex items-center justify-center text-xs font-semibold">
              {currentUser ? `${currentUser.firstName?.[0] || ''}${currentUser.lastName?.[0] || ''}`.toUpperCase() : 'U'}
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            className="fixed left-0 top-0 h-full w-72 bg-white shadow-xl z-50"
          >
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                <TouchOptimizedButton
                  onClick={() => setSidebarOpen(false)}
                  variant="secondary"
                  size="small"
                  ariaLabel="Close menu"
                >
                  <X className="w-5 h-5" />
                </TouchOptimizedButton>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-brand-navy text-brand-cream flex items-center justify-center text-sm font-semibold">
                  {currentUser ? `${currentUser.firstName?.[0] || ''}${currentUser.lastName?.[0] || ''}`.toUpperCase() : 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {currentUser ? `${currentUser.rank} ${currentUser.lastName}` : 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {currentUser?.role || 'Role'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4">
              {menuItems.map((item) => (
                <TouchOptimizedButton
                  key={item.id}
                  onClick={item.action}
                  variant="secondary"
                  className="w-full mb-2 justify-start"
                >
                  {item.icon}
                  <span className="ml-3">{item.label}</span>
                </TouchOptimizedButton>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="px-4 py-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome back, {currentUser?.firstName || 'User'}!
            </h2>
            <p className="text-gray-600">
              {isOnline ? 'You are connected and ready to work.' : 'Working offline - changes will sync when connected.'}
            </p>
          </div>

          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {dashboardCards.map((card) => (
              <motion.div
                key={card.id}
                whileTap={{ scale: 0.98 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <TouchOptimizedButton
                  onClick={card.action}
                  variant="secondary"
                  className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`${card.color} text-white p-2 rounded-lg`}>
                        {card.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{card.title}</h3>
                        {card.count !== undefined && (
                          <p className="text-sm text-gray-500">{card.count} items</p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </TouchOptimizedButton>
              </motion.div>
            ))}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Document approved</p>
                  <p className="text-xs text-gray-500">2 minutes ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Document uploaded</p>
                  <p className="text-xs text-gray-500">15 minutes ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Pending review</p>
                  <p className="text-xs text-gray-500">1 hour ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PullToRefresh>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-around">
          <TouchOptimizedButton
            onClick={() => onNavigate('dashboard')}
            variant="secondary"
            size="small"
            className="flex-col py-2"
            ariaLabel="Home"
          >
            <Home className="w-5 h-5 mb-1" />
            <span className="text-xs">Home</span>
          </TouchOptimizedButton>

          <TouchOptimizedButton
            onClick={() => onNavigate('documents')}
            variant="secondary"
            size="small"
            className="flex-col py-2"
            ariaLabel="Documents"
          >
            <FileText className="w-5 h-5 mb-1" />
            <span className="text-xs">Docs</span>
          </TouchOptimizedButton>

          <TouchOptimizedButton
            onClick={() => onNavigate('upload')}
            variant="primary"
            size="small"
            className="flex-col py-2 rounded-full"
            ariaLabel="Upload"
          >
            <Upload className="w-6 h-6 mb-1" />
            <span className="text-xs">Upload</span>
          </TouchOptimizedButton>

          <TouchOptimizedButton
            onClick={() => onNavigate('notifications')}
            variant="secondary"
            size="small"
            className="flex-col py-2 relative"
            ariaLabel="Notifications"
          >
            <Bell className="w-5 h-5 mb-1" />
            <span className="text-xs">Alerts</span>
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {notifications}
              </span>
            )}
          </TouchOptimizedButton>

          <TouchOptimizedButton
            onClick={() => onNavigate('settings')}
            variant="secondary"
            size="small"
            className="flex-col py-2"
            ariaLabel="Settings"
          >
            <Settings className="w-5 h-5 mb-1" />
            <span className="text-xs">Settings</span>
          </TouchOptimizedButton>
        </div>
      </nav>

      {/* Safe area padding for bottom navigation */}
      <div className="h-20"></div>
    </div>
  );
};