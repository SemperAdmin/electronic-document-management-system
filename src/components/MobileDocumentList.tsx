import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  Download, 
  Share, 
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  Mic,
  MicOff
} from 'lucide-react';
import { TouchOptimizedButton } from './MobileLayout';
import { useMobileLayout } from './MobileLayout';

interface Document {
  id: string;
  title: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected' | 'draft';
  createdAt: string;
  size: string;
  thumbnail?: string;
  description?: string;
}

interface MobileDocumentListProps {
  documents: Document[];
  onDocumentSelect: (document: Document) => void;
  onDocumentAction: (action: string, document: Document) => void;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

interface SwipeAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  action: (document: Document) => void;
}

const DocumentCard: React.FC<{
  document: Document;
  onSelect: (document: Document) => void;
  onAction: (action: string, document: Document) => void;
}> = ({ document, onSelect, onAction }) => {
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const { isMobile } = useMobileLayout();

  const swipeActions: SwipeAction[] = [
    {
      id: 'view',
      label: 'View',
      icon: <Eye className="w-4 h-4" />,
      color: 'bg-blue-500',
      action: () => onSelect(document),
    },
    {
      id: 'download',
      label: 'Download',
      icon: <Download className="w-4 h-4" />,
      color: 'bg-green-500',
      action: () => onAction('download', document),
    },
    {
      id: 'share',
      label: 'Share',
      icon: <Share className="w-4 h-4" />,
      color: 'bg-purple-500',
      action: () => onAction('share', document),
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      color: 'bg-red-500',
      action: () => onAction('delete', document),
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    startXRef.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = startXRef.current - currentX;
    
    if (diff > 0 && diff < 200) {
      setSwipeX(diff);
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile) return;
    setIsSwiping(false);
    
    if (swipeX > 100) {
      setSwipeX(120);
    } else {
      setSwipeX(0);
    }
  };

  return (
    <div className="relative mb-3">
      {/* Swipe Actions */}
      <div className="absolute inset-0 flex items-center justify-end pr-4">
        <div className="flex gap-1">
          {swipeActions.slice(0, 3).map((action) => (
            <TouchOptimizedButton
              key={action.id}
              onClick={action.action}
              className={`${action.color} text-white px-3 py-2 rounded-lg text-xs font-medium`}
              size="small"
            >
              {action.icon}
              <span className="ml-1 hidden sm:inline">{action.label}</span>
            </TouchOptimizedButton>
          ))}
        </div>
      </div>

      {/* Document Card */}
      <motion.div
        ref={cardRef}
        className="relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
        style={{
          transform: `translateX(-${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        whileTap={{ scale: 0.98 }}
      >
        <div 
          className="p-4 cursor-pointer"
          onClick={() => onSelect(document)}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {document.thumbnail ? (
                <img 
                  src={document.thumbnail} 
                  alt={document.title}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">
                    {document.title}
                  </h3>
                  {document.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {document.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">{document.size}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{document.createdAt}</span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2 ml-2">
                  {getStatusIcon(document.status)}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                    {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export const MobileDocumentList: React.FC<MobileDocumentListProps> = ({
  documents: initialDocuments,
  onDocumentSelect,
  onDocumentAction,
  loading = false,
  hasMore = true,
  onLoadMore,
}) => {
  const { isMobile } = useMobileLayout();
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(loading);
  const [isVoiceSearch, setIsVoiceSearch] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastDocumentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDocuments(initialDocuments);
  }, [initialDocuments]);

  useEffect(() => {
    setVoiceSupported('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }, []);

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const startVoiceSearch = () => {
    if (!voiceSupported) return;
    
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    setIsVoiceSearch(true);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      setIsVoiceSearch(false);
    };
    
    recognition.onerror = () => {
      setIsVoiceSearch(false);
    };
    
    recognition.onend = () => {
      setIsVoiceSearch(false);
    };
    
    recognition.start();
  };

  const loadMoreDocuments = useCallback(async () => {
    if (isLoading || !hasMore || !onLoadMore) return;
    
    setIsLoading(true);
    try {
      await onLoadMore();
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, onLoadMore]);

  useEffect(() => {
    if (!hasMore || !onLoadMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          loadMoreDocuments();
        }
      },
      { threshold: 0.1 }
    );

    if (lastDocumentRef.current) {
      observerRef.current.observe(lastDocumentRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMoreDocuments, hasMore, isLoading]);

  const statusOptions = [
    { value: 'all', label: 'All Status', count: documents.length },
    { value: 'pending', label: 'Pending', count: documents.filter(d => d.status === 'pending').length },
    { value: 'approved', label: 'Approved', count: documents.filter(d => d.status === 'approved').length },
    { value: 'rejected', label: 'Rejected', count: documents.filter(d => d.status === 'rejected').length },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white sticky top-0 z-40 shadow-sm border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold text-gray-900">Documents</h1>
            <TouchOptimizedButton
              onClick={() => {}}
              variant="secondary"
              size="small"
              ariaLabel="Filter options"
            >
              <Filter className="w-4 h-4" />
            </TouchOptimizedButton>
          </div>
          
          {/* Search Bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-navy text-base"
            />
            {voiceSupported && (
              <TouchOptimizedButton
                onClick={startVoiceSearch}
                variant="secondary"
                size="small"
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                ariaLabel="Voice search"
              >
                {isVoiceSearch ? (
                  <MicOff className="w-4 h-4 text-red-500" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </TouchOptimizedButton>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {statusOptions.map((option) => (
              <TouchOptimizedButton
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
                variant={statusFilter === option.value ? 'primary' : 'secondary'}
                size="small"
                className="whitespace-nowrap"
              >
                {option.label} ({option.count})
              </TouchOptimizedButton>
            ))}
          </div>
        </div>
      </header>

      {/* Document List */}
      <div ref={listRef} className="px-4 py-4">
        {filteredDocuments.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
            <p className="text-gray-500">
              {searchQuery ? 'Try adjusting your search terms' : 'No documents available at the moment'}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {filteredDocuments.map((document, index) => (
            <div
              key={document.id}
              ref={index === filteredDocuments.length - 1 ? lastDocumentRef : null}
            >
              <DocumentCard
                document={document}
                onSelect={onDocumentSelect}
                onAction={onDocumentAction}
              />
            </div>
          ))}
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-navy"></div>
          </div>
        )}

        {/* Load More */}
        {!isLoading && hasMore && filteredDocuments.length > 0 && (
          <div className="text-center py-4">
            <TouchOptimizedButton
              onClick={loadMoreDocuments}
              variant="secondary"
              size="medium"
            >
              Load More Documents
            </TouchOptimizedButton>
          </div>
        )}

        {/* End of List */}
        {!hasMore && filteredDocuments.length > 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">You've reached the end of the list</p>
          </div>
        )}
      </div>
    </div>
  );
};