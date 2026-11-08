import { validateWeddingId } from './wedding';
export const demoMode = import.meta.env.VITE_SITE_MODE === 'demo';
export const siteId = import.meta.env.VITE_SITE_ID || 'test';
export const weddingId = validateWeddingId(import.meta.env.VITE_WEDDING_ID);
