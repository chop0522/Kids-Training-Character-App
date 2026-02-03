import { buildPublicWebUrl, PUBLIC_WEB_PATHS } from './publicWeb';

export const OPERATOR_DISPLAY_NAME = '運営者名（仮）';
export const CONTACT_EMAIL = 'support@example.com';
export const ANALYTICS_ENABLED = false;
export const ADS_ENABLED = false;
export const LEGAL_UPDATED_AT = '2026/02/03';

export const PRIVACY_POLICY_URL = () => buildPublicWebUrl(PUBLIC_WEB_PATHS.privacy);
export const TERMS_URL = () => buildPublicWebUrl(PUBLIC_WEB_PATHS.terms);
export const SUPPORT_URL = () => buildPublicWebUrl(PUBLIC_WEB_PATHS.support);
