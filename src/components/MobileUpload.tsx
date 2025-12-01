import React, { useState, useRef, useCallback, DragEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Upload, 
  FileText, 
  Image, 
  X, 
  CheckCircle, 
  AlertCircle,
  ArrowLeft,
  RotateCcw,
  Crop,
  Check
} from 'lucide-react';
import { TouchOptimizedButton } from './MobileLayout';
import { useMobileLayout } from './MobileLayout';

interface UploadFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  type: 'document' | 'image';
  metadata?: {
    title: string;
    description: string;
    tags: string[];
  };
}

interface MobileUploadProps {
  onUploadComplete: (files: UploadFile[]) => void;
  onCancel: () => void;
  maxFileSize?: number;
  acceptedFormats?: string[];
}

const CameraCapture: React.FC<{
  onCapture: (file: File) => void;
  onCancel: () => void;
}> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  };

  const retakeImage = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmCapture = () => {
    if (capturedImage && canvasRef.current) {
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapture(file);
        }
      }, 'image/jpeg', 0.9);
    }
  };

  useEffect(() => {
    startCamera();
    return stopCamera;
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 bg-black text-white">
        <TouchOptimizedButton
          onClick={onCancel}
          variant="secondary"
          size="small"
          className="text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </TouchOptimizedButton>
        <h2 className="text-lg font-semibold">Camera Capture</h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 relative">
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="absolute bottom-8 left-0 right-0 flex justify-center">
              <TouchOptimizedButton
                onClick={captureImage}
                variant="primary"
                size="large"
                className="rounded-full w-16 h-16 bg-white border-4 border-gray-300"
              >
                <div className="w-12 h-12 bg-white rounded-full" />
              </TouchOptimizedButton>
            </div>
          </>
        ) : (
          <>
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-contain"
            />
            
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4">
              <TouchOptimizedButton
                onClick={retakeImage}
                variant="secondary"
                size="medium"
                className="bg-white text-gray-900"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Retake
              </TouchOptimizedButton>
              
              <TouchOptimizedButton
                onClick={confirmCapture}
                variant="primary"
                size="medium"
              >
                <Check className="w-5 h-5 mr-2" />
                Use Photo
              </TouchOptimizedButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const FilePreview: React.FC<{
  file: UploadFile;
  onRemove: () => void;
  onMetadataChange: (metadata: any) => void;
}> = ({ file, onRemove, onMetadataChange }) => {
  const [metadata, setMetadata] = useState(file.metadata || {
    title: file.file.name.replace(/\.[^/.]+$/, ''),
    description: '',
    tags: [],
  });
  const [newTag, setNewTag] = useState('');

  const handleMetadataChange = (field: string, value: any) => {
    const newMetadata = { ...metadata, [field]: value };
    setMetadata(newMetadata);
    onMetadataChange(newMetadata);
  };

  const addTag = () => {
    if (newTag.trim() && !metadata.tags.includes(newTag.trim())) {
      const updatedTags = [...metadata.tags, newTag.trim()];
      handleMetadataChange('tags', updatedTags);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const updatedTags = metadata.tags.filter(tag => tag !== tagToRemove);
    handleMetadataChange('tags', updatedTags);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              {file.type === 'image' ? (
                <Image className="w-6 h-6 text-gray-400" />
              ) : (
                <FileText className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {metadata.title || file.file.name}
              </h3>
              <p className="text-xs text-gray-500">
                {(file.file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          
          <TouchOptimizedButton
            onClick={onRemove}
            variant="secondary"
            size="small"
            ariaLabel="Remove file"
          >
            <X className="w-4 h-4" />
          </TouchOptimizedButton>
        </div>

        {/* Upload Progress */}
        {file.status === 'uploading' && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Uploading...</span>
              <span>{file.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-brand-navy h-2 rounded-full transition-all duration-300"
                style={{ width: `${file.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Status Indicators */}
        <div className="mb-4">
          {file.status === 'success' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Upload Complete</span>
            </div>
          )}
          {file.status === 'error' && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Upload Failed</span>
            </div>
          )}
        </div>

        {/* Metadata Form */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Document Title
            </label>
            <input
              type="text"
              value={metadata.title}
              onChange={(e) => handleMetadataChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
              placeholder="Enter document title"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={metadata.description}
              onChange={(e) => handleMetadataChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy resize-none"
              placeholder="Enter document description"
              rows={2}
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
                placeholder="Add a tag"
              />
              <TouchOptimizedButton
                onClick={addTag}
                variant="secondary"
                size="small"
              >
                Add
              </TouchOptimizedButton>
            </div>
            <div className="flex flex-wrap gap-1">
              {metadata.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const MobileUpload: React.FC<MobileUploadProps> = ({
  onUploadComplete,
  onCancel,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  acceptedFormats = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.tiff'],
}) => {
  const { isMobile } = useMobileLayout();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    if (file.size > maxFileSize) {
      alert(`File size exceeds ${(maxFileSize / 1024 / 1024).toFixed(0)}MB limit`);
      return false;
    }
    
    const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!acceptedFormats.includes(extension)) {
      alert(`File format ${extension} is not supported`);
      return false;
    }
    
    return true;
  };

  const addFile = (file: File) => {
    if (!validateFile(file)) return;

    const newFile: UploadFile = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      status: 'pending',
      progress: 0,
      type: file.type.startsWith('image/') ? 'image' : 'document',
    };

    setFiles(prev => [...prev, newFile]);
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const updateFileMetadata = (fileId: string, metadata: any) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, metadata } : f
    ));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      Array.from(selectedFiles).forEach(addFile);
    }
  };

  const handleCameraCapture = (file: File) => {
    addFile(file);
    setIsCameraMode(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = event.dataTransfer.files;
    if (droppedFiles) {
      Array.from(droppedFiles).forEach(addFile);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const uploadFiles = async () => {
    const filesToUpload = files.filter(f => f.status === 'pending');
    
    for (const file of filesToUpload) {
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      try {
        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 200));
          setFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, progress } : f
          ));
        }

        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'success', progress: 100 } : f
        ));
      } catch (error) {
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'error' } : f
        ));
      }
    }

    setTimeout(() => {
      onUploadComplete(files);
    }, 1000);
  };

  if (isCameraMode) {
    return <CameraCapture onCapture={handleCameraCapture} onCancel={() => setIsCameraMode(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white sticky top-0 z-40 shadow-sm border-b">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TouchOptimizedButton
              onClick={onCancel}
              variant="secondary"
              size="small"
              ariaLabel="Cancel upload"
            >
              <ArrowLeft className="w-5 h-5" />
            </TouchOptimizedButton>
            <h1 className="text-lg font-semibold text-gray-900">Upload Documents</h1>
          </div>
          
          {files.length > 0 && (
            <TouchOptimizedButton
              onClick={uploadFiles}
              variant="primary"
              size="small"
              disabled={files.some(f => f.status === 'uploading')}
            >
              Upload All
            </TouchOptimizedButton>
          )}
        </div>
      </header>

      <div className="px-4 py-6">
        {/* Upload Methods */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <TouchOptimizedButton
            onClick={() => fileInputRef.current?.click()}
            variant="secondary"
            className="flex-col py-6"
          >
            <Upload className="w-8 h-8 mb-2" />
            <span className="text-sm font-medium">Choose Files</span>
            <span className="text-xs text-gray-500 mt-1">PDF, DOC, Images</span>
          </TouchOptimizedButton>
          
          <TouchOptimizedButton
            onClick={() => setIsCameraMode(true)}
            variant="secondary"
            className="flex-col py-6"
          >
            <Camera className="w-8 h-8 mb-2" />
            <span className="text-sm font-medium">Camera</span>
            <span className="text-xs text-gray-500 mt-1">Take Photo</span>
          </TouchOptimizedButton>
        </div>

        {/* Drag and Drop Area */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            isDragging 
              ? 'border-brand-navy bg-brand-navy/5' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Drop files here
          </h3>
          <p className="text-xs text-gray-500">
            or click to browse. Max size: {(maxFileSize / 1024 / 1024).toFixed(0)}MB
          </p>
        </div>

        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedFormats.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* File Previews */}
        {files.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Files to Upload ({files.length})
            </h2>
            <div className="space-y-4">
              {files.map((file) => (
                <FilePreview
                  key={file.id}
                  file={file}
                  onRemove={() => removeFile(file.id)}
                  onMetadataChange={(metadata) => updateFileMetadata(file.id, metadata)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Upload Guidelines */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            Upload Guidelines
          </h3>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Maximum file size: {(maxFileSize / 1024 / 1024).toFixed(0)}MB per file</li>
            <li>• Supported formats: {acceptedFormats.join(', ')}</li>
            <li>• Documents will be processed for text extraction</li>
            <li>• Images will be optimized for mobile viewing</li>
            <li>• All uploads are encrypted and secure</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
