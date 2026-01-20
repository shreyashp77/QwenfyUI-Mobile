import { useState, useEffect, useRef } from 'react';
import { X, Trash2, Lock, Image as ImageIcon, Film, ArrowUpRight, Monitor } from 'lucide-react';
import { decryptWithPassword, getOriginalExtension, getMimeType } from '../utils/passwordCrypto';

interface GalleryFile {
    filename: string;
    size: number;
    mtime: number;
}

interface DecryptedItem {
    filename: string;
    url: string;
    type: 'image' | 'video';
    mimeType: string;
}

interface PrivateGalleryProps {
    isOpen: boolean;
    onClose: () => void;
    password: string;
    theme?: string;
    onError?: (message: string) => void;
    onSelect?: (item: { imageUrl: string; filename: string; type: 'image' | 'video' }) => void;
    onSelectVideo?: (item: { imageUrl: string; filename: string; type: 'image' | 'video' }) => void;
    onExtendVideo?: (item: { imageUrl: string; filename: string; type: 'image' | 'video' }) => void;
}

export default function PrivateGallery({
    isOpen,
    onClose,
    password,
    theme = 'indigo',
    onError,
    onSelect,
    onSelectVideo,
    onExtendVideo
}: PrivateGalleryProps) {
    const [files, setFiles] = useState<GalleryFile[]>([]);
    const [decryptedItems, setDecryptedItems] = useState<Map<string, DecryptedItem>>(new Map());
    const [loading, setLoading] = useState(true);
    const [decryptingFiles, setDecryptingFiles] = useState<Set<string>>(new Set());
    const [selectedItem, setSelectedItem] = useState<DecryptedItem | null>(null);
    const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

    // Load file list
    useEffect(() => {
        if (isOpen) {
            loadFiles();
        }
        return () => {
            // Cleanup blob URLs when closing
            decryptedItems.forEach(item => URL.revokeObjectURL(item.url));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const loadFiles = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/gallery/list');
            const data = await res.json();
            if (data.success) {
                setFiles(data.files || []);
                // Auto-decrypt all files
                if (data.files && data.files.length > 0) {
                    decryptAllFiles(data.files);
                }
            }
        } catch (err) {
            console.error('Failed to load gallery files:', err);
        } finally {
            setLoading(false);
        }
    };

    const decryptAllFiles = async (fileList: GalleryFile[]) => {
        for (const file of fileList) {
            if (!decryptedItems.has(file.filename)) {
                await decryptFile(file.filename);
            }
        }
    };

    const decryptFile = async (filename: string) => {
        if (decryptedItems.has(filename) || decryptingFiles.has(filename)) return;

        setDecryptingFiles(prev => new Set(prev).add(filename));

        try {
            // Fetch encrypted file
            const res = await fetch(`/api/gallery/file?filename=${encodeURIComponent(filename)}`);
            if (!res.ok) throw new Error('Failed to fetch file');

            const encryptedBlob = await res.blob();

            // Determine file type from original extension
            const ext = getOriginalExtension(filename);
            let mimeType = getMimeType(ext);
            let isVideo = mimeType.startsWith('video/');

            // Decrypt
            let decryptedBlob = await decryptWithPassword(encryptedBlob, password, mimeType);

            // Fix for existing files with missing extensions: Check MAGIC NUMBERS
            if (mimeType === 'application/octet-stream' || mimeType === 'application/unknown') {
                try {
                    const headerBuffer = await decryptedBlob.slice(0, 12).arrayBuffer();
                    const header = new Uint8Array(headerBuffer);
                    let detectedMime = mimeType;

                    // PNG: 89 50 4E 47 0D 0A 1A 0A
                    if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
                        detectedMime = 'image/png';
                    }
                    // JPEG: FF D8 FF
                    else if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
                        detectedMime = 'image/jpeg';
                    }
                    // GIF: 47 49 46 38
                    else if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38) {
                        detectedMime = 'image/gif';
                    }
                    // WEBM: 1A 45 DF A3
                    else if (header[0] === 0x1A && header[1] === 0x45 && header[2] === 0xDF && header[3] === 0xA3) {
                        detectedMime = 'video/webm';
                    }
                    // MP4 (ftyp): skip first 4, check 'ftyp' at 4-7
                    else if (header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70) {
                        detectedMime = 'video/mp4';
                    }

                    if (detectedMime !== mimeType) {
                        decryptedBlob = new Blob([decryptedBlob], { type: detectedMime });
                        mimeType = detectedMime;
                        isVideo = mimeType.startsWith('video/');
                        console.log('[Gallery] Detected MIME type from signature:', detectedMime);
                    }
                } catch (e) {
                    console.warn('[Gallery] Failed to sniff content type:', e);
                }
            }

            const url = URL.createObjectURL(decryptedBlob);

            const item: DecryptedItem = {
                filename,
                url,
                type: isVideo ? 'video' : 'image',
                mimeType
            };

            setDecryptedItems(prev => new Map(prev).set(filename, item));
        } catch (err: any) {
            console.error(`Failed to decrypt ${filename}:`, err);
            onError?.(`Failed to decrypt file: ${err.message}`);
        } finally {
            setDecryptingFiles(prev => {
                const next = new Set(prev);
                next.delete(filename);
                return next;
            });
        }
    };

    const handleDelete = async (filename: string) => {
        if (!confirm('Delete this item from gallery?')) return;

        try {
            const res = await fetch('/api/gallery/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename })
            });
            const data = await res.json();
            if (data.success) {
                // Revoke blob URL
                const item = decryptedItems.get(filename);
                if (item) URL.revokeObjectURL(item.url);

                // Remove from state
                setFiles(prev => prev.filter(f => f.filename !== filename));
                setDecryptedItems(prev => {
                    const next = new Map(prev);
                    next.delete(filename);
                    return next;
                });
                if (selectedItem?.filename === filename) {
                    setSelectedItem(null);
                }
            }
        } catch (err) {
            console.error('Failed to delete:', err);
        }
    };

    const handleDeleteAll = async () => {
        if (!confirm('WARNING: Are you sure you want to delete ALL items from the gallery?\n\nThis action cannot be undone.')) return;

        try {
            const res = await fetch('/api/gallery/delete-all', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                // Revoke all URLs
                decryptedItems.forEach(item => URL.revokeObjectURL(item.url));

                // Clear state
                setFiles([]);
                setDecryptedItems(new Map());
                setSelectedItem(null);
            }
        } catch (err: any) {
            console.error('Failed to delete all:', err);
            onError?.('Failed to delete all items');
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
            {/* Header */}
            <div className={`bg-gradient-to-r from-${theme}-600 to-${theme}-500 p-4 flex items-center justify-between shrink-0`}>
                <div className="flex items-center gap-3">
                    <Lock className="text-white" size={24} />
                    <h2 className="text-lg font-semibold text-white">Private Gallery</h2>
                    <span className="text-white/70 text-sm">({files.length} items)</span>
                </div>
                <div className="flex items-center gap-2">
                    {files.length > 0 && (
                        <button
                            onClick={handleDeleteAll}
                            className="p-2 rounded-full hover:bg-white/20 transition-colors text-white/90 hover:text-red-200"
                            title="Delete All"
                        >
                            <Trash2 size={24} />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/20 transition-colors"
                    >
                        <X className="text-white" size={24} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className={`w-8 h-8 border-4 border-${theme}-500/30 border-t-${theme}-500 rounded-full animate-spin`}></div>
                    </div>
                ) : files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <ImageIcon size={48} className="mb-4 opacity-50" />
                        <p className="text-lg">No saved items yet</p>
                        <p className="text-sm mt-2">Use "Save to Gallery" on any generation</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {files.map(file => {
                            const item = decryptedItems.get(file.filename);
                            const isDecrypting = decryptingFiles.has(file.filename);

                            return (
                                <div
                                    key={file.filename}
                                    className="relative aspect-square rounded-xl overflow-hidden bg-gray-800 group cursor-pointer"
                                    onClick={() => item && setSelectedItem(item)}
                                >
                                    {isDecrypting ? (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className={`w-6 h-6 border-2 border-${theme}-500/30 border-t-${theme}-500 rounded-full animate-spin`}></div>
                                        </div>
                                    ) : item ? (
                                        item.type === 'video' ? (
                                            <video
                                                ref={el => { if (el) videoRefs.current.set(file.filename, el); }}
                                                src={item.url}
                                                className="w-full h-full object-cover"
                                                autoPlay
                                                loop
                                                muted
                                                playsInline
                                            />
                                        ) : (
                                            <img
                                                src={item.url}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        )
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                                            <Lock size={32} />
                                        </div>
                                    )}

                                    {/* Video indicator */}
                                    {item?.type === 'video' && (
                                        <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded-full flex items-center gap-1">
                                            <Film size={12} className="text-white" />
                                            <span className="text-white text-xs">Video</span>
                                        </div>
                                    )}

                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                        <div className="w-full flex items-center justify-between">
                                            <div className="text-white text-xs truncate flex-1 mr-2">
                                                {formatDate(file.mtime)}
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(file.filename);
                                                }}
                                                className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded-full transition-colors"
                                            >
                                                <Trash2 size={14} className="text-white" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Full-screen preview */}
            {selectedItem && (
                <div
                    className="fixed inset-0 z-60 bg-black flex items-center justify-center"
                    onClick={() => setSelectedItem(null)}
                >
                    <button
                        onClick={() => setSelectedItem(null)}
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
                    >
                        <X className="text-white" size={24} />
                    </button>

                    {selectedItem.type === 'video' ? (
                        <video
                            src={selectedItem.url}
                            className="max-w-full max-h-full"
                            autoPlay
                            loop
                            controls
                            playsInline
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <img
                            src={selectedItem.url}
                            alt=""
                            className="max-w-full max-h-full object-contain"
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}

                    {/* Action Buttons */}
                    <div className="absolute bottom-8 left-0 w-full flex flex-wrap gap-2 justify-center px-4 pointer-events-none">
                        {selectedItem.type === 'video' ? (
                            onExtendVideo && (
                                <button
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        await onExtendVideo({ imageUrl: selectedItem.url, filename: selectedItem.filename, type: 'video' });
                                        setSelectedItem(null);
                                        onClose();
                                    }}
                                    className={`pointer-events-auto flex items-center gap-2 bg-${theme}-600/90 hover:bg-${theme}-500 text-white px-5 py-2.5 text-sm rounded-full font-semibold shadow-lg backdrop-blur-sm transition-all transform hover:scale-105 whitespace-nowrap`}
                                >
                                    Extend Video <Film size={16} />
                                </button>
                            )
                        ) : (
                            <>
                                {onSelect && (
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            await onSelect({ imageUrl: selectedItem.url, filename: selectedItem.filename, type: 'image' });
                                            setSelectedItem(null);
                                            onClose();
                                        }}
                                        className={`pointer-events-auto flex items-center gap-2 bg-${theme}-600/90 hover:bg-${theme}-500 text-white px-5 py-2.5 text-sm rounded-full font-semibold shadow-lg backdrop-blur-sm transition-all transform hover:scale-105 whitespace-nowrap`}
                                    >
                                        Use as Input <ArrowUpRight size={16} />
                                    </button>
                                )}
                                {onSelectVideo && (
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            await onSelectVideo({ imageUrl: selectedItem.url, filename: selectedItem.filename, type: 'image' });
                                            setSelectedItem(null);
                                            onClose();
                                        }}
                                        className={`pointer-events-auto flex items-center gap-2 bg-white/90 hover:bg-white text-gray-900 px-5 py-2.5 text-sm rounded-full font-semibold shadow-lg backdrop-blur-sm transition-all transform hover:scale-105 whitespace-nowrap`}
                                    >
                                        Use for Video <Monitor size={16} />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
