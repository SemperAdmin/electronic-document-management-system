import React from 'react';

interface SkipLinkProps {
  targetId?: string;
  label?: string;
}

/**
 * Skip to main content link for keyboard navigation accessibility
 * Should be placed at the very beginning of the page
 */
export const SkipLink: React.FC<SkipLinkProps> = ({
  targetId = 'main-content',
  label = 'Skip to main content',
}) => {
  return (
    <a href={`#${targetId}`} className="skip-link">
      {label}
    </a>
  );
};

/**
 * Main content wrapper that receives focus from skip link
 */
export const MainContent: React.FC<{
  children: React.ReactNode;
  id?: string;
  className?: string;
}> = ({ children, id = 'main-content', className = '' }) => {
  return (
    <main id={id} className={className} tabIndex={-1}>
      {children}
    </main>
  );
};
