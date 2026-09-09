/**
 * Google OAuth 2.0 Scope & URL Parameter Helpers for Backend Operations
 */
export const GOOGLE_API_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/documents',
  'openid',
  'email',
  'profile',
].join(' ');

export const GOOGLE_OAUTH_PARAMS = {
  access_type: 'offline',
  prompt: 'consent',
  scope: GOOGLE_API_SCOPES,
};

export const GOOGLE_CONNECTOR_SCOPES: Record<string, string[]> = {
  gmail: ['gmail.modify', 'gmail.send', 'gmail.readonly'],
  'google-sheets': ['spreadsheets'],
  'google-drive': ['drive', 'drive.file'],
  'google-calendar': ['calendar'],
  'google-docs': ['documents'],
};
