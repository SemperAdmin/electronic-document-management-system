import React, { memo } from 'react';

/**
 * Floating feedback button that navigates to the Sentinel Directives Hub
 */
export const FeedbackButton: React.FC = memo(function FeedbackButton() {
  const handleClick = () => {
    window.location.href =
      'https://semperadmin.github.io/Sentinel/#detail/electronic-document-management-system/todo';
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-8 right-8 bg-brand-navy hover:bg-brand-gold text-brand-cream hover:text-brand-navy border-none px-5 py-3 rounded-full text-base font-semibold cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 z-[1000] flex items-center gap-2"
      title="Share Feedback"
      style={{
        boxShadow: '0 4px 12px rgba(17, 43, 63, 0.3)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(212, 166, 74, 0.4)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(17, 43, 63, 0.3)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <span role="img" aria-label="feedback">
        💬
      </span>
      Feedback
    </button>
  );
});
