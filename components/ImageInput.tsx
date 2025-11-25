
import React, { useRef, useState, useEffect } from 'react';
import { ImagePlus, X, FolderOpen, UploadCloud, FileImage, AlertCircle } from 'lucide-react';
import { InputImage, ThemeColor } from '../types';

interface ImageInputProps {
  index: number;
  image: InputImage | null;
  onFileSelect: (file: File | null) => void;
  onServerSelectRequest: () => void;
  onUpload?: () => void;
  onClear: () => void;
  disabled?: boolean;
  theme: ThemeColor;
  allowRemote: boolean;
}

const ImageInput: React.FC<ImageInputProps> = ({ index, image, onFileSelect, onServerSelectRequest, onUpload, onClear, disabled, theme, allowRemote }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewError, setPreviewError] = useState(false);

  // Reset error state when the image source changes
  useEffect(() => {
      setPreviewError(false);
  }, [image]);

  const handleContainerClick = () => {
    if (!image && !disabled) {
      inputRef.current?.click();
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClear();
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleServerBtnClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onServerSelectRequest();
  }

  return (
    <div 
      className={`relative aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden group
        ${disabled 
            ? 'border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 opacity-50 cursor-not-allowed' 
            : `border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 hover:border-${theme}-500 dark:hover:border-${theme}-500`}
        ${image ? `border-solid border-${theme}-500` : ''}
      `}
      onClick={handleContainerClick}
    >
      <input 
        type="file" 
        ref={inputRef}
        onChange={(e) => {
            if (e.target.files?.[0]) onFileSelect(e.target.files[0]);
        }}
        className="hidden" 
        accept="image/*,.heic,.heif"
        disabled={disabled}
      />

      {image ? (
        <>
          {previewError ? (
              <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-2 text-center w-full">
                  <FileImage size={32} className="mb-2" />
                  <span className="text-[10px] font-mono truncate max-w-full px-2">
                      {image.filename || image.file?.name}
                  </span>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-orange-500">
                      <AlertCircle size={10} />
                      <span>No Preview</span>
                  </div>
              </div>
          ) : (
              <img 
                src={image.previewUrl} 
                alt={`Input ${index + 1}`} 
                onError={() => setPreviewError(true)}
                className="w-full h-full object-cover"
              />
          )}
          
          {/* Action Buttons */}
          <div className="absolute top-1 right-1 flex gap-1 z-10">
              {/* Save/Upload Button - Only for local files */}
              {image.type === 'file' && onUpload && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onUpload(); }}
                    className="bg-white/80 dark:bg-black/60 text-gray-700 dark:text-white rounded-full p-1.5 hover:bg-blue-50 dark:hover:bg-blue-500 hover:text-blue-600 dark:hover:text-white transition-colors backdrop-blur-sm shadow-sm"
                    title="Save to Server (Input Folder)"
                >
                    <UploadCloud size={14} />
                </button>
              )}
              
              {/* Clear Button */}
              <button 
                onClick={handleClear}
                className="bg-white/80 dark:bg-black/60 text-gray-700 dark:text-white rounded-full p-1.5 hover:bg-red-50 dark:hover:bg-red-500 hover:text-red-600 dark:hover:text-white transition-colors backdrop-blur-sm shadow-sm"
                title="Remove Image"
              >
                <X size={14} />
              </button>
          </div>

          <div className="absolute bottom-0 w-full bg-white/90 dark:bg-black/70 text-xs text-gray-800 dark:text-white p-1 text-center truncate backdrop-blur-sm">
             {image.type === 'server' ? 'Server: ' : 'Upload: '}
             {image.filename || image.file?.name}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full">
            <div className="flex flex-col items-center mb-2">
                <ImagePlus size={24} className={`mb-1 ${disabled ? 'text-gray-400 dark:text-gray-700' : 'text-gray-400 dark:text-gray-400'}`} />
                <span className={`text-xs ${disabled ? 'text-gray-400 dark:text-gray-700' : 'text-gray-500 dark:text-gray-400'}`}>
                    {index === 0 ? "Main Image" : `Img ${index + 1}`}
                </span>
            </div>
            
            {!disabled && (
                <div className="flex gap-2 mt-1">
                     <button 
                        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                        className={`p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-${theme}-50 dark:hover:bg-${theme}-600 rounded text-gray-600 dark:text-gray-300 hover:text-${theme}-600 dark:hover:text-white transition-colors shadow-sm`}
                        title="Upload from Device"
                     >
                        <ImagePlus size={16} />
                     </button>
                     {allowRemote && (
                         <button 
                            onClick={handleServerBtnClick}
                            className={`p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-${theme}-50 dark:hover:bg-${theme}-600 rounded text-gray-600 dark:text-gray-300 hover:text-${theme}-600 dark:hover:text-white transition-colors shadow-sm`}
                            title="Select from Server Input Folder"
                         >
                            <FolderOpen size={16} />
                         </button>
                     )}
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default ImageInput;
