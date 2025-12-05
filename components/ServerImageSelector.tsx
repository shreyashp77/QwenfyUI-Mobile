
import React, { useState, useEffect, useMemo } from 'react';
import { X, Image as ImageIcon, Search, ArrowDownAZ, ArrowUpAZ, Calendar, Clock, Loader2 } from 'lucide-react';
import { ThemeColor } from '../types';

interface ServerImageSelectorProps {
  serverAddress: string;
  images: string[];
  onSelect: (filename: string) => void;
  onClose: () => void;
  theme: ThemeColor;
}

type SortOption = 'name' | 'date';
type SortOrder = 'asc' | 'desc';

const ServerImageSelector: React.FC<ServerImageSelectorProps> = ({ serverAddress, images, onSelect, onClose, theme }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [imageDates, setImageDates] = useState<Record<string, number>>({});
  const [loadingDates, setLoadingDates] = useState(false);

  // Fetch Last-Modified dates for images
  useEffect(() => {
    const fetchDates = async () => {
      setLoadingDates(true);
      const dates: Record<string, number> = {};

      // Limit concurrency to avoid browser stalling
      const batchSize = 10;
      for (let i = 0; i < images.length; i += batchSize) {
        const batch = images.slice(i, i + batchSize);
        await Promise.all(batch.map(async (filename) => {
          try {
            const res = await fetch(`${serverAddress}/view?filename=${encodeURIComponent(filename)}&type=input`, { method: 'HEAD' });
            const lastModified = res.headers.get('Last-Modified');
            if (lastModified) {
              dates[filename] = new Date(lastModified).getTime();
            } else {
              dates[filename] = 0;
            }
          } catch (e) {
            dates[filename] = 0;
          }
        }));
      }
      setImageDates(dates);
      setLoadingDates(false);
    };

    if (images.length > 0) {
      fetchDates();
    }
  }, [images, serverAddress]);

  const sortedImages = useMemo(() => {
    let result = images.filter(img =>
      img.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.localeCompare(b);
      } else {
        const dateA = imageDates[a] || 0;
        const dateB = imageDates[b] || 0;
        comparison = dateA - dateB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [images, searchTerm, sortBy, sortOrder, imageDates]);

  const toggleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(option);
      setSortOrder('desc'); // Default to newest/Z-A when switching
    }
  };

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

        {/* Controls */}
        <div className="p-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 space-y-3">
          {/* Search */}
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

          {/* Sorting */}
          <div className="flex gap-2">
            <button
              onClick={() => toggleSort('name')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors border ${sortBy === 'name'
                ? `bg-${theme}-100 dark:bg-${theme}-900/30 border-${theme}-500 text-${theme}-700 dark:text-${theme}-300`
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              {sortOrder === 'asc' ? <ArrowDownAZ size={14} /> : <ArrowUpAZ size={14} />}
              Name
            </button>
            <button
              onClick={() => toggleSort('date')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors border ${sortBy === 'date'
                ? `bg-${theme}-100 dark:bg-${theme}-900/30 border-${theme}-500 text-${theme}-700 dark:text-${theme}-300`
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              {loadingDates ? <Loader2 size={14} className="animate-spin" /> : (sortOrder === 'desc' ? <Calendar size={14} /> : <Clock size={14} />)}
              Date
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {sortedImages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 space-y-2">
              <ImageIcon size={48} className="opacity-20" />
              <p>No images found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {sortedImages.map((filename) => (
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
                    {imageDates[filename] ? (
                      <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate">
                        {new Date(imageDates[filename]).toLocaleDateString()}
                      </p>
                    ) : null}
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