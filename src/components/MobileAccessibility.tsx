import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  Volume2, 
  VolumeX, 
  Contrast, 
  Sun, 
  Moon,
  Settings,
  Accessibility,
  ZoomIn,
  ZoomOut,
  Type
} from 'lucide-react';
import { useMobileLayout } from './MobileLayout';
import { clsx } from 'clsx';

interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  screenReader: boolean;
  voiceNavigation: boolean;
  reducedMotion: boolean;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  focusIndicators: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSetting: (key: keyof AccessibilitySettings, value: any) => void;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

export const AccessibilityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    highContrast: false,
    largeText: false,
    screenReader: false,
    voiceNavigation: false,
    reducedMotion: false,
    colorBlindMode: 'none',
    fontSize: 'medium',
    focusIndicators: true
  });

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [announcement, setAnnouncement] = useState<string>('');

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('accessibility-settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    const savedDarkMode = localStorage.getItem('dark-mode');
    if (savedDarkMode) {
      setIsDarkMode(JSON.parse(savedDarkMode));
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));
  }, [settings]);

  // Apply accessibility settings to document
  useEffect(() => {
    const root = document.documentElement;
    
    // High contrast mode
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Large text mode
    if (settings.largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }

    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    // Color blind modes
    root.classList.remove('protanopia', 'deuteranopia', 'tritanopia');
    if (settings.colorBlindMode !== 'none') {
      root.classList.add(settings.colorBlindMode);
    }

    // Font size classes
    root.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large');
    root.classList.add(`font-${settings.fontSize}`);

    // Dark mode
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Focus indicators
    if (settings.focusIndicators) {
      root.classList.add('focus-indicators');
    } else {
      root.classList.remove('focus-indicators');
    }
  }, [settings, isDarkMode]);

  const updateSetting = (key: keyof AccessibilitySettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('dark-mode', JSON.stringify(newDarkMode));
  };

  const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (settings.screenReader) {
      setAnnouncement(message);
      setTimeout(() => setAnnouncement(''), 1000);
    }
  };

  return (
    <AccessibilityContext.Provider value={{
      settings,
      updateSetting,
      announceToScreenReader,
      isDarkMode,
      toggleDarkMode
    }}>
      {children}
      {/* Screen reader announcement area */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </div>
    </AccessibilityContext.Provider>
  );
};

export const MobileAccessibilityPanel: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { settings, updateSetting, isDarkMode, toggleDarkMode } = useAccessibility();
  const { isMobile } = useMobileLayout();
  const [activeSection, setActiveSection] = useState<'visual' | 'audio' | 'navigation'>('visual');

  if (!isMobile) return null;

  const sections = [
    { id: 'visual', label: 'Visual', icon: Eye },
    { id: 'audio', label: 'Audio', icon: Volume2 },
    { id: 'navigation', label: 'Navigation', icon: Settings }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg z-50 max-h-96"
            role="dialog"
            aria-labelledby="accessibility-title"
          >
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 id="accessibility-title" className="text-lg font-semibold text-gray-900">
                  Accessibility Settings
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Close accessibility settings"
                >
                  <span className="text-xl">×</span>
                </button>
              </div>

              {/* Section Tabs */}
              <div className="flex space-x-1 mb-4 bg-gray-100 rounded-lg p-1">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id as any)}
                      className={clsx(
                        'flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-colors',
                        activeSection === section.id
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      )}
                      aria-pressed={activeSection === section.id}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {section.label}
                    </button>
                  );
                })}
              </div>

              {/* Settings Content */}
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {activeSection === 'visual' && (
                  <>
                    {/* Dark Mode Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {isDarkMode ? (
                          <Sun className="w-5 h-5 mr-3 text-gray-600" />
                        ) : (
                          <Moon className="w-5 h-5 mr-3 text-gray-600" />
                        )}
                        <span className="text-gray-700">Dark Mode</span>
                      </div>
                      <button
                        onClick={toggleDarkMode}
                        className={clsx(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                          isDarkMode ? 'bg-blue-600' : 'bg-gray-200'
                        )}
                        aria-pressed={isDarkMode}
                      >
                        <span
                          className={clsx(
                            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                            isDarkMode ? 'translate-x-6' : 'translate-x-1'
                          )}
                        />
                      </button>
                    </div>

                    {/* High Contrast */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Contrast className="w-5 h-5 mr-3 text-gray-600" />
                        <span className="text-gray-700">High Contrast</span>
                      </div>
                      <button
                        onClick={() => updateSetting('highContrast', !settings.highContrast)}
                        className={clsx(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                          settings.highContrast ? 'bg-blue-600' : 'bg-gray-200'
                        )}
                        aria-pressed={settings.highContrast}
                      >
                        <span
                          className={clsx(
                            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                            settings.highContrast ? 'translate-x-6' : 'translate-x-1'
                          )}
                        />
                      </button>
                    </div>

                    {/* Font Size */}
                    <div>
                      <div className="flex items-center mb-2">
                        <Type className="w-5 h-5 mr-3 text-gray-600" />
                        <span className="text-gray-700">Font Size</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {(['small', 'medium', 'large', 'extra-large'] as const).map((size) => (
                          <button
                            key={size}
                            onClick={() => updateSetting('fontSize', size)}
                            className={clsx(
                              'py-2 px-3 rounded-md text-sm font-medium transition-colors',
                              settings.fontSize === size
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            )}
                            aria-pressed={settings.fontSize === size}
                          >
                            {size.charAt(0).toUpperCase() + size.slice(1).replace('-', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Focus Indicators */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Accessibility className="w-5 h-5 mr-3 text-gray-600" />
                        <span className="text-gray-700">Focus Indicators</span>
                      </div>
                      <button
                        onClick={() => updateSetting('focusIndicators', !settings.focusIndicators)}
                        className={clsx(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                          settings.focusIndicators ? 'bg-blue-600' : 'bg-gray-200'
                        )}
                        aria-pressed={settings.focusIndicators}
                      >
                        <span
                          className={clsx(
                            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                            settings.focusIndicators ? 'translate-x-6' : 'translate-x-1'
                          )}
                        />
                      </button>
                    </div>
                  </>
                )}

                {activeSection === 'audio' && (
                  <>
                    {/* Screen Reader */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Volume2 className="w-5 h-5 mr-3 text-gray-600" />
                        <span className="text-gray-700">Screen Reader</span>
                      </div>
                      <button
                        onClick={() => updateSetting('screenReader', !settings.screenReader)}
                        className={clsx(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                          settings.screenReader ? 'bg-blue-600' : 'bg-gray-200'
                        )}
                        aria-pressed={settings.screenReader}
                      >
                        <span
                          className={clsx(
                            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                            settings.screenReader ? 'translate-x-6' : 'translate-x-1'
                          )}
                        />
                      </button>
                    </div>

                    {/* Voice Navigation */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <VolumeX className="w-5 h-5 mr-3 text-gray-600" />
                        <span className="text-gray-700">Voice Navigation</span>
                      </div>
                      <button
                        onClick={() => updateSetting('voiceNavigation', !settings.voiceNavigation)}
                        className={clsx(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                          settings.voiceNavigation ? 'bg-blue-600' : 'bg-gray-200'
                        )}
                        aria-pressed={settings.voiceNavigation}
                      >
                        <span
                          className={clsx(
                            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                            settings.voiceNavigation ? 'translate-x-6' : 'translate-x-1'
                          )}
                        />
                      </button>
                    </div>

                    {/* Reduced Motion */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Settings className="w-5 h-5 mr-3 text-gray-600" />
                        <span className="text-gray-700">Reduced Motion</span>
                      </div>
                      <button
                        onClick={() => updateSetting('reducedMotion', !settings.reducedMotion)}
                        className={clsx(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                          settings.reducedMotion ? 'bg-blue-600' : 'bg-gray-200'
                        )}
                        aria-pressed={settings.reducedMotion}
                      >
                        <span
                          className={clsx(
                            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                            settings.reducedMotion ? 'translate-x-6' : 'translate-x-1'
                          )}
                        />
                      </button>
                    </div>
                  </>
                )}

                {activeSection === 'navigation' && (
                  <>
                    {/* Color Blind Mode */}
                    <div>
                      <div className="flex items-center mb-2">
                        <Eye className="w-5 h-5 mr-3 text-gray-600" />
                        <span className="text-gray-700">Color Blind Mode</span>
                      </div>
                      <div className="space-y-2">
                        {[
                          { value: 'none', label: 'None' },
                          { value: 'protanopia', label: 'Protanopia (Red-blind)' },
                          { value: 'deuteranopia', label: 'Deuteranopia (Green-blind)' },
                          { value: 'tritanopia', label: 'Tritanopia (Blue-blind)' }
                        ].map((option) => (
                          <label key={option.value} className="flex items-center">
                            <input
                              type="radio"
                              name="colorBlindMode"
                              value={option.value}
                              checked={settings.colorBlindMode === option.value}
                              onChange={(e) => updateSetting('colorBlindMode', e.target.value)}
                              className="mr-3"
                            />
                            <span className="text-gray-700">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export const MobileAccessibilityButton: React.FC = () => {
  const { isMobile } = useMobileLayout();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  if (!isMobile) return null;

  return (
    <>
      <button
        onClick={() => setIsPanelOpen(true)}
        className="fixed top-4 right-4 z-40 p-3 bg-white rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label="Accessibility settings"
      >
        <Accessibility className="w-5 h-5 text-gray-700" />
      </button>
      <MobileAccessibilityPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </>
  );
};

// Hook for announcing changes to screen readers
export const useScreenReader = () => {
  const { announceToScreenReader, settings } = useAccessibility();
  
  return {
    announce: announceToScreenReader,
    isEnabled: settings.screenReader
  };
};

// Component for screen reader only content
export const ScreenReaderOnly: React.FC<{ children: ReactNode }> = ({ children }) => (
  <div className="sr-only" role="status" aria-live="polite">
    {children}
  </div>
);