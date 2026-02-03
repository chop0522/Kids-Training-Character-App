import { buildPublicWebUrl, PUBLIC_WEB_PATHS } from './publicWeb';

export const SUPPORT_EMAIL = 'gambari.album.support@gmail.com';

export const PRIVACY_URL = () => buildPublicWebUrl(PUBLIC_WEB_PATHS.privacy);
export const TERMS_URL = () => buildPublicWebUrl(PUBLIC_WEB_PATHS.terms);
export const SUPPORT_URL = () => buildPublicWebUrl(PUBLIC_WEB_PATHS.support);
