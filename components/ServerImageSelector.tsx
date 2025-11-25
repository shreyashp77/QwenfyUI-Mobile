
import React, { useState } from 'react';
import { X, Image as ImageIcon, Search } from 'lucide-react';
import { ThemeColor } from '../types';

interface ServerImageSelectorProps {
  serverAddress: string;
  images: string[];
  onSelect: (filename: string) => void;
  onClose: () => void;
  theme: ThemeColor;
}

const ServerImageSelector: React.FC<ServerImageSelectorProps> = ({ serverAddress, images, onSelect, onClose, theme }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredImages = images.filter(img => 
    img.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 transition-colors duration-300">
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl h-[80vh] rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-gray-900 dark:text-white">
             <ImageIcon size={20} className={`text-${theme}-500`} />
             <h3 className="text-lg font-bold">Select Server Image</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input 
                    type="text" 
                    placeholder="Search images..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-700 focus:border-${theme}-500 outline-none`}
                />
            </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
            {filteredImages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 space-y-2">
                    <ImageIcon size={48} className="opacity-20" />
                    <p>No images found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {filteredImages.map((filename) => (
                        <button 
                            key={filename}
                            onClick={() => onSelect(filename)}
                            className={`group relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-black hover:border-${theme}-500 dark:hover:border-${theme}-500 transition-all text-left`}
                        >
                            <img 
                                loading="lazy"
                                src={`${serverAddress}/view?filename=${encodeURIComponent(filename)}&type=input`}
                                alt={filename}
                                className="w-full h-full object-contain p-1"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-white/90 dark:bg-black/70 p-1.5 backdrop-blur-sm">
                                <p className="text-[10px] text-gray-800 dark:text-gray-200 truncate font-mono">{filename}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ServerImageSelector;