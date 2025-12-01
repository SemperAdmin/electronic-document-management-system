import React, { createContext, useContext, useEffect, useState } from 'react';
import clsx from 'clsx';

interface MobileLayoutContextType {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
  safeArea: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

const MobileLayoutContext = createContext<MobileLayoutContextType>({
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  orientation: 'portrait',
  safeArea: { top: 0, bottom: 0, left: 0, right: 0 },
});

export const useMobileLayout = () => {
  const context = useContext(MobileLayoutContext);
  if (!context) {
    throw new Error('useMobileLayout must be used within a MobileLayoutProvider');
  }
  return context;
};

interface MobileLayoutProviderProps {
  children: React.ReactNode;
}

export const MobileLayoutProvider: React.FC<MobileLayoutProviderProps> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [safeArea, setSafeArea] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth;
      const mobile = width < 768;
      const tablet = width >= 768 && width < 1024;
      const desktop = width >= 1024;
      
      setIsMobile(mobile);
      setIsTablet(tablet);
      setIsDesktop(desktop);
      
      const isLandscape = window.innerWidth > window.innerHeight;
      setOrientation(isLandscape ? 'landscape' : 'portrait');
    };

    const checkSafeArea = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      const safeAreaTop = parseInt(computedStyle.getPropertyValue('--safe-area-top') || '0');
      const safeAreaBottom = parseInt(computedStyle.getPropertyValue('--safe-area-bottom') || '0');
      const safeAreaLeft = parseInt(computedStyle.getPropertyValue('--safe-area-left') || '0');
      const safeAreaRight = parseInt(computedStyle.getPropertyValue('--safe-area-right') || '0');
      
      setSafeArea({
        top: safeAreaTop,
        bottom: safeAreaBottom,
        left: safeAreaLeft,
        right: safeAreaRight,
      });
    };

    checkDeviceType();
    checkSafeArea();
    
    window.addEventListener('resize', checkDeviceType);
    window.addEventListener('orientationchange', checkDeviceType);
    
    return () => {
      window.removeEventListener('resize', checkDeviceType);
      window.removeEventListener('orientationchange', checkDeviceType);
    };
  }, []);

  const value: MobileLayoutContextType = {
    isMobile,
    isTablet,
    isDesktop,
    orientation,
    safeArea,
  };

  return (
    <MobileLayoutContext.Provider value={value}>
      {children}
    </MobileLayoutContext.Provider>
  );
};

interface TouchOptimizedButtonProps {
  children: React.ReactNode;
  onClick?: (...args: any[]) => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  ariaLabel?: string;
  type?: 'button' | 'submit';
}

export const TouchOptimizedButton: React.FC<TouchOptimizedButtonProps> = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'medium',
  className,
  ariaLabel,
  type = 'button',
}) => {
  const { isMobile } = useMobileLayout();
  
  const baseClasses = clsx(
    'inline-flex items-center justify-center font-medium transition-all duration-150',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    {
      'min-h-[44px] min-w-[44px] text-base': isMobile,
      'min-h-[36px] min-w-[36px] text-sm': !isMobile,
    },
    {
      'px-4 py-3 text-base': size === 'large',
      'px-3 py-2 text-base': size === 'medium',
      'px-2 py-1 text-sm': size === 'small',
    },
    {
      'bg-brand-navy text-brand-cream hover:bg-brand-navy/90 focus:ring-brand-navy': variant === 'primary',
      'bg-brand-cream text-brand-navy border border-brand-navy hover:bg-brand-cream/90 focus:ring-brand-navy': variant === 'secondary',
      'bg-brand-red text-white hover:bg-brand-red/90 focus:ring-brand-red': variant === 'danger',
    },
    'rounded-lg',
    className
  );

  const handleClick = () => {
    if (!disabled && !loading && onClick) {
      onClick();
      
      if (isMobile && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled || loading}
      className={baseClasses}
      aria-label={ariaLabel}
      aria-busy={loading}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
};
