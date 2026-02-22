/**
 * Cloudinary utility for constructing optimized image URLs.
 * 
 * Since Cloudinary "fetch" delivery is not enabled on this account,
 * external URLs are returned as-is. Only Cloudinary public IDs
 * (images uploaded to Cloudinary) get transformed into Cloudinary URLs.
 */

const CLOUD_NAME = import.meta.env?.PUBLIC_CLOUDINARY_CLOUD_NAME || 'du7qfnalk';

interface CloudinaryOptions {
    width?: number;
    height?: number;
    quality?: string;
    format?: string;
    crop?: string;
    gravity?: string;
}

/**
 * Returns the best URL for an image source:
 * - Cloudinary public IDs → full Cloudinary delivery URL with transformations
 * - Full external URLs → returned unchanged (fetch not enabled)
 * - Local paths → returned unchanged
 */
export function getCloudinaryUrl(src: string, options: CloudinaryOptions = {}): string {
    if (!src) return src;

    // Local assets — return as-is
    if (src.startsWith('/') && !src.startsWith('//')) {
        return src;
    }

    // Already a full URL (external or Cloudinary) — return as-is
    if (src.startsWith('http://') || src.startsWith('https://')) {
        return src;
    }

    // Cloudinary public ID — build delivery URL with transformations
    const transforms: string[] = ['f_auto', `q_${options.quality || 'auto'}`];
    if (options.width) transforms.push(`w_${options.width}`);
    if (options.height) transforms.push(`h_${options.height}`);
    if (options.crop) transforms.push(`c_${options.crop}`);
    if (options.gravity) transforms.push(`g_${options.gravity}`);

    const transformString = transforms.join(',');
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformString}/${src}`;
}

/**
 * Client-safe version (for React components).
 * Same logic but with hardcoded cloud name since import.meta.env
 * is not available in client-side JS.
 */
export function getCloudinaryImageUrl(src: string, options: CloudinaryOptions = {}): string {
    if (!src) return src;

    if (src.startsWith('/') && !src.startsWith('//')) return src;

    // Full URLs — return as-is
    if (src.startsWith('http://') || src.startsWith('https://')) return src;

    // Cloudinary public ID — build URL
    const transforms: string[] = ['f_auto', `q_${options.quality || 'auto'}`];
    if (options.width) transforms.push(`w_${options.width}`);
    if (options.height) transforms.push(`h_${options.height}`);
    if (options.crop) transforms.push(`c_${options.crop}`);
    if (options.gravity) transforms.push(`g_${options.gravity}`);

    const transformString = transforms.join(',');
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformString}/${src}`;
}
