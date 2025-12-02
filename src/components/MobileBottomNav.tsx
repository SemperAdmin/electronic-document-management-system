import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  FileText, 
  Upload, 
  Search, 
  Settings,
  Plus,
  Filter,
  SortAsc,
  Grid3x3,
  List
} from 'lucide-react';
import { useMobileLayout } from './MobileLayout';
import { clsx } from 'clsx';

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  contextualActions?: {
    showPlus?: boolean;
    showFilter?: boolean;
    showSort?: boolean;
    showViewToggle?: boolean;
    onPlusClick?: () => void;
    onFilterClick?: () => void;
    onSortClick?: () => void;
    onViewToggle?: () => void;
  };
  documentCount?: number;
  uploadProgress?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  contextualActions = {},
  documentCount = 0,
  uploadProgress
}) => {
  const { isMobile } = useMobileLayout();
  const [showContextualMenu, setShowContextualMenu] = useState(false);
  const [hapticEnabled, setHapticEnabled] = useState(false);

  useEffect(() => {
    // Check if haptic feedback is available
    if ('vibrate' in navigator) {
      setHapticEnabled(true);
    }
  }, []);

  const triggerHaptic = (pattern: number | number[] = 10) => {
    if (hapticEnabled && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const handleTabPress = (tab: string) => {
    triggerHaptic(10);
    onTabChange(tab);
  };

  const handleContextualAction = (action: () => void) => {
    triggerHaptic(15);
    action();
    setShowContextualMenu(false);
  };

  const tabs = [
    { id: 'dashboard', icon: Home, label: 'Home', showCount: false },
    { id: 'documents', icon: FileText, label: 'Docs', showCount: true },
    { id: 'upload', icon: Upload, label: 'Upload', showCount: false },
    { id: 'search', icon: Search, label: 'Search', showCount: false },
    { id: 'settings', icon: Settings, label: 'Settings', showCount: false }
  ];

  return null;

  return (
    <>
      {/* Contextual Actions Menu */}
      <AnimatePresence>
        {showContextualMenu && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-4 right-4 z-50"
          >
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-2">
              <div className="grid grid-cols-2 gap-2">
                {contextualActions.showPlus && (
                  <button
                    onClick={() => handleContextualAction(contextualActions.onPlusClick || (() => {}))}
                    className="flex flex-col items-center justify-center p-3 rounded-lg bg-blue-50 text-blue-600 active:bg-blue-100 transition-colors"
                  >
                    <Plus className="w-5 h-5 mb-1" />
                    <span className="text-xs font-medium">Add New</span>
                  </button>
                )}
                {contextualActions.showFilter && (
                  <button
                    onClick={() => handleContextualAction(contextualActions.onFilterClick || (() => {}))}
                    className="flex flex-col items-center justify-center p-3 rounded-lg bg-green-50 text-green-600 active:bg-green-100 transition-colors"
                  >
                    <Filter className="w-5 h-5 mb-1" />
                    <span className="text-xs font-medium">Filter</span>
                  </button>
                )}
                {contextualActions.showSort && (
                  <button
                    onClick={() => handleContextualAction(contextualActions.onSortClick || (() => {}))}
                    className="flex flex-col items-center justify-center p-3 rounded-lg bg-purple-50 text-purple-600 active:bg-purple-100 transition-colors"
                  >
                    <SortAsc className="w-5 h-5 mb-1" />
                    <span className="text-xs font-medium">Sort</span>
                  </button>
                )}
                {contextualActions.showViewToggle && (
                  <button
                    onClick={() => handleContextualAction(contextualActions.onViewToggle || (() => {}))}
                    className="flex flex-col items-center justify-center p-3 rounded-lg bg-orange-50 text-orange-600 active:bg-orange-100 transition-colors"
                  >
                    <Grid3x3 className="w-5 h-5 mb-1" />
                    <span className="text-xs font-medium">View</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  triggerHaptic(5);
                  setShowContextualMenu(false);
                }}
                className="w-full mt-2 p-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Progress Indicator */}
      <AnimatePresence>
        {uploadProgress !== undefined && uploadProgress > 0 && uploadProgress < 100 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-4 right-4 z-40"
          >
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Uploading...</span>
                <span className="text-sm text-gray-500">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-blue-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
        <div className="flex items-center justify-around h-16 safe-area-pb">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const hasCount = tab.showCount && documentCount > 0;

            return (
              <motion.button
                key={tab.id}
                onClick={() => handleTabPress(tab.id)}
                className={clsx(
                  'relative flex flex-col items-center justify-center h-full px-3 min-w-0',
                  'transition-colors duration-200',
                  isActive 
                    ? 'text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                )}
                whileTap={{ scale: 0.95 }}
                onContextMenu={(e) => {
                  // Long press for contextual actions
                  if (tab.id === 'documents' && Object.keys(contextualActions).length > 0) {
                    e.preventDefault();
                    triggerHaptic(20);
                    setShowContextualMenu(true);
                  }
                }}
              >
                <div className="relative">
                  <Icon className={clsx(
                    'w-6 h-6 transition-colors',
                    isActive ? 'text-blue-600' : 'text-gray-500'
                  )} />
                  {hasCount && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center"
                    >
                      {documentCount > 99 ? '99+' : documentCount}
                    </motion.span>
                  )}
                </div>
                <span className={clsx(
                  'text-xs mt-1 font-medium transition-colors',
                  isActive ? 'text-blue-600' : 'text-gray-500'
                )}>
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export const MobileFloatingActionButton: React.FC<{
  onClick: () => void;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'purple';
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
}> = ({
  onClick,
  icon = <Plus className="w-6 h-6" />,
  color = 'blue',
  position = 'bottom-right'
}) => {
  const { isMobile } = useMobileLayout();
  const [hapticEnabled, setHapticEnabled] = useState(false);

  useEffect(() => {
    if ('vibrate' in navigator) {
      setHapticEnabled(true);
    }
  }, []);

  const triggerHaptic = () => {
    if (hapticEnabled && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const colorClasses = {
    blue: 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white',
    green: 'bg-green-500 hover:bg-green-600 active:bg-green-700 text-white',
    red: 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white',
    purple: 'bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white'
  };

  const positionClasses = {
    'bottom-right': 'bottom-20 right-4',
    'bottom-left': 'bottom-20 left-4',
    'bottom-center': 'bottom-20 left-1/2 transform -translate-x-1/2'
  };

  if (!isMobile) return null;

  return (
    <motion.button
      onClick={() => {
        triggerHaptic();
        onClick();
      }}
      className={clsx(
        'fixed z-40 w-14 h-14 rounded-full shadow-lg transition-all duration-200',
        'flex items-center justify-center',
        colorClasses[color],
        positionClasses[position]
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
    >
      {icon}
    </motion.button>
  );
};