
// Color manipulation helpers

export const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

export const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

export const adjustBrightness = (hex: string, percent: number) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    // Linear interpolation towards black (negative percent) or white (positive percent)
    const target = percent > 0 ? 255 : 0;
    const p = Math.abs(percent / 100);

    const newR = Math.round(rgb.r + (target - rgb.r) * p);
    const newG = Math.round(rgb.g + (target - rgb.g) * p);
    const newB = Math.round(rgb.b + (target - rgb.b) * p);

    return rgbToHex(newR, newG, newB);
};
