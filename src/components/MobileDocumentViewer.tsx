import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  Share, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Maximize,
  Minimize,
  Edit,
  Save
} from 'lucide-react';
import { TouchOptimizedButton } from './MobileLayout';
import { useMobileLayout } from './MobileLayout';

interface DocumentPage {
  id: string;
  url: string;
  thumbnail?: string;
  annotations?: any[];
}

interface MobileDocumentViewerProps {
  document: {
    id: string;
    title: string;
    pages: DocumentPage[];
    totalPages: number;
  };
  onClose: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onAnnotate?: (pageId: string, annotation: any) => void;
}

export const MobileDocumentViewer: React.FC<MobileDocumentViewerProps> = ({
  document,
  onClose,
  onDownload,
  onShare,
  onAnnotate,
}) => {
  const { isMobile } = useMobileLayout();
  const [currentPage, setCurrentPage] = useState(0);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [annotations, setAnnotations] = useState<{[key: string]: any[]}>({});
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const [isPinching, setIsPinching] = useState(false);
  
  const viewerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft') {
        navigatePage('prev');
      } else if (e.key === 'ArrowRight') {
        navigatePage('next');
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setScale(prev => Math.min(prev + 0.25, 3));
      } else if (e.key === '-') {
        e.preventDefault();
        setScale(prev => Math.max(prev - 0.25, 0.5));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onClose]);

  const navigatePage = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentPage > 0) {
      setCurrentPage(currentPage - 1);
    } else if (direction === 'next' && currentPage < document.totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      setIsPinching(true);
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      setLastTouchDistance(distance);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && touchStart && !isPinching) {
      const currentX = e.touches[0].clientX;
      const diffX = currentX - touchStart.x;
      
      if (Math.abs(diffX) > 50) {
        if (diffX > 0) {
          navigatePage('prev');
        } else {
          navigatePage('next');
        }
        setTouchStart({ x: currentX, y: e.touches[0].clientY });
      }
    } else if (e.touches.length === 2 && isPinching) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      if (lastTouchDistance && Math.abs(distance - lastTouchDistance) > 10) {
        const scaleChange = (distance - lastTouchDistance) / 100;
        setScale(prev => Math.max(0.5, Math.min(3, prev + scaleChange)));
        setLastTouchDistance(distance);
      }
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
    setIsPinching(false);
    setLastTouchDistance(null);
  };

  const handlePinch = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale(prev => Math.max(0.5, Math.min(3, prev + delta)));
    }
  };

  const handleAnnotation = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAnnotating || !onAnnotate) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const annotation = {
      id: Date.now().toString(),
      x,
      y,
      type: 'note',
      content: '',
      timestamp: new Date().toISOString(),
    };
    
    const currentPageId = document.pages[currentPage]?.id;
    if (currentPageId) {
      onAnnotate(currentPageId, annotation);
      setAnnotations(prev => ({
        ...prev,
        [currentPageId]: [...(prev[currentPageId] || []), annotation],
      }));
    }
  };

  const currentPageId = document.pages[currentPage]?.id;
  const currentAnnotations = currentPageId ? annotations[currentPageId] || [] : [];

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TouchOptimizedButton
            onClick={onClose}
            variant="secondary"
            size="small"
            className="text-white"
            ariaLabel="Close viewer"
          >
            <X className="w-5 h-5" />
          </TouchOptimizedButton>
          <div className="min-w-0">
            <h2 className="text-sm font-medium truncate">{document.title}</h2>
            <p className="text-xs text-gray-400">
              Page {currentPage + 1} of {document.totalPages}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <TouchOptimizedButton
            onClick={() => setIsAnnotating(!isAnnotating)}
            variant={isAnnotating ? 'primary' : 'secondary'}
            size="small"
            ariaLabel="Toggle annotation mode"
          >
            <Edit className="w-4 h-4" />
          </TouchOptimizedButton>
          
          <TouchOptimizedButton
            onClick={() => setIsFullscreen(!isFullscreen)}
            variant="secondary"
            size="small"
            ariaLabel="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </TouchOptimizedButton>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TouchOptimizedButton
            onClick={() => navigatePage('prev')}
            disabled={currentPage === 0}
            variant="secondary"
            size="small"
            ariaLabel="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </TouchOptimizedButton>
          
          <span className="text-sm font-medium min-w-[60px] text-center">
            {currentPage + 1} / {document.totalPages}
          </span>
          
          <TouchOptimizedButton
            onClick={() => navigatePage('next')}
            disabled={currentPage === document.totalPages - 1}
            variant="secondary"
            size="small"
            ariaLabel="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </TouchOptimizedButton>
        </div>
        
        <div className="flex items-center gap-2">
          <TouchOptimizedButton
            onClick={() => setScale(prev => Math.max(0.5, prev - 0.25))}
            disabled={scale <= 0.5}
            variant="secondary"
            size="small"
            ariaLabel="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </TouchOptimizedButton>
          
          <span className="text-sm min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
          
          <TouchOptimizedButton
            onClick={() => setScale(prev => Math.min(3, prev + 0.25))}
            disabled={scale >= 3}
            variant="secondary"
            size="small"
            ariaLabel="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </TouchOptimizedButton>
          
          <TouchOptimizedButton
            onClick={() => {
              setScale(1);
              setRotation(0);
            }}
            variant="secondary"
            size="small"
            ariaLabel="Reset view"
          >
            <RotateCcw className="w-4 h-4" />
          </TouchOptimizedButton>
        </div>
      </div>

      {/* Document Viewer */}
      <div 
        ref={viewerRef}
        className="flex-1 bg-gray-100 overflow-hidden relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handlePinch}
        onClick={handleAnnotation}
      >
        <motion.div
          className="w-full h-full flex items-center justify-center"
          animate={{
            scale,
            rotate: rotation,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
        >
          {document.pages[currentPage] && (
            <img
              ref={imageRef}
              src={document.pages[currentPage].url}
              alt={`Page ${currentPage + 1}`}
              className="max-w-full max-h-full object-contain select-none"
              draggable={false}
            />
          )}
        </motion.div>
        
        {/* Annotations */}
        {isAnnotating && currentAnnotations.map((annotation) => (
          <div
            key={annotation.id}
            className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg cursor-pointer"
            style={{
              left: `${annotation.x}%`,
              top: `${annotation.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
            title={annotation.content || 'Click to edit note'}
          />
        ))}
      </div>

      {/* Bottom Actions */}
      <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onDownload && (
            <TouchOptimizedButton
              onClick={onDownload}
              variant="secondary"
              size="small"
              ariaLabel="Download document"
            >
              <Download className="w-4 h-4" />
              <span className="ml-2 hidden sm:inline">Download</span>
            </TouchOptimizedButton>
          )}
          
          {onShare && (
            <TouchOptimizedButton
              onClick={onShare}
              variant="secondary"
              size="small"
              ariaLabel="Share document"
            >
              <Share className="w-4 h-4" />
              <span className="ml-2 hidden sm:inline">Share</span>
            </TouchOptimizedButton>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <TouchOptimizedButton
            onClick={() => setRotation(prev => prev - 90)}
            variant="secondary"
            size="small"
            ariaLabel="Rotate left"
          >
            <RotateCcw className="w-4 h-4" />
          </TouchOptimizedButton>
          
          <TouchOptimizedButton
            onClick={() => setRotation(prev => prev + 90)}
            variant="secondary"
            size="small"
            ariaLabel="Rotate right"
          >
            <RotateCcw className="w-4 h-4 rotate-180" />
          </TouchOptimizedButton>
        </div>
      </div>
    </div>
  );
};