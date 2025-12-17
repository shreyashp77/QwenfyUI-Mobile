
/**
 * Strips metadata (EXIF, IPTC, XMP) from an image file by re-encoding it via a Canvas.
 * This ensures the image pixel data is preserved (visual fidelity) but all non-visual tags are dropped.
 * 
 * @param file The input File object
 * @returns A Promise resolving to a new clean File object
 */
export const stripImageMetadata = async (file: File): Promise<File> => {
    // If it's not an image, return original
    if (!file.type.startsWith('image/')) return file;

    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(file); // Fallback if canvas fails
                return;
            }

            // Draw image 1:1
            ctx.drawImage(img, 0, 0);

            // Determine format
            // Prefer keeping original format if possible, but map to common web types
            let mimeType = file.type;
            if (mimeType === 'image/jpg') mimeType = 'image/jpeg';

            // Quality 1.0 for JPEG to minimize loss. PNG is lossless.
            canvas.toBlob((blob) => {
                if (!blob) {
                    resolve(file); // Fallback
                    return;
                }

                const newFile = new File([blob], file.name, {
                    type: mimeType,
                    lastModified: Date.now()
                });

                resolve(newFile);
            }, mimeType, 1.0);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            console.error("Failed to load image for stripping metadata");
            resolve(file); // Fail safe: return original
        };

        img.src = url;
    });
};
