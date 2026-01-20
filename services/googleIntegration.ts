
// A singleton service to handle Google Workspace integration via Client-side OAuth 2.0
// Uses GIS (Google Identity Services) for Auth and GAPI for API calls.

import { GoogleCalendarEvent, GoogleContact } from '../types';

// Declare global Google variables
declare var gapi: any;
declare var google: any;

// Replace with your actual Client ID from Google Cloud Console
// NOTE: In production, this should be in an environment variable
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com';
const API_KEY = process.env.GOOGLE_API_KEY || 'YOUR_API_KEY_HERE'; 

// Scopes for the integration
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/drive.readonly'
].join(' ');

class GoogleIntegrationService {
  private tokenClient: any;
  private gapiInited = false;
  private gisInited = false;
  private accessToken: string | null = null;
  private tokenExpiration: number = 0;

  constructor() {
    this.accessToken = sessionStorage.getItem('ace_google_token');
    const exp = sessionStorage.getItem('ace_google_exp');
    if (exp) this.tokenExpiration = parseInt(exp, 10);
  }

  get isConnected(): boolean {
    return !!this.accessToken && Date.now() < this.tokenExpiration;
  }

  async initialize(): Promise<void> {
    if (this.gapiInited && this.gisInited) return;

    // Load GAPI (for API calls)
    await new Promise<void>((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        gapi.load('client', async () => {
          await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: [
              'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
              'https://people.googleapis.com/$discovery/rest?version=v1',
              'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest',
              'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
            ],
          });
          this.gapiInited = true;
          resolve();
        });
      };
      document.body.appendChild(script);
    });

    // Load GIS (for Auth)
    await new Promise<void>((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        // @ts-ignore
        this.tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (resp: any) => {
            if (resp.error !== undefined) {
              throw (resp);
            }
            this.accessToken = resp.access_token;
            this.tokenExpiration = Date.now() + (resp.expires_in * 1000);
            
            // Session persistence (Basic security, clears on browser close usually)
            sessionStorage.setItem('ace_google_token', resp.access_token);
            sessionStorage.setItem('ace_google_exp', this.tokenExpiration.toString());
            
            // Emit event for UI update
            window.dispatchEvent(new CustomEvent('ace_google_connected'));
          },
        });
        this.gisInited = true;
        resolve();
      };
      document.body.appendChild(script);
    });
  }

  login() {
    if (!this.tokenClient) {
      console.error("Google Integration not initialized");
      return;
    }
    
    // Skip if valid token exists (or force refresh if needed)
    if (this.isConnected) {
        // Maybe check scope? For now assume connected.
        window.dispatchEvent(new CustomEvent('ace_google_connected'));
        return;
    }

    if (gapi.client.getToken() === null) {
      this.tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
      this.tokenClient.requestAccessToken({prompt: ''});
    }
  }

  logout() {
    const token = this.accessToken;
    if (token) {
      // @ts-ignore
      google.accounts.oauth2.revoke(token, () => {console.log('Revoked')});
      gapi.client.setToken(null);
      this.accessToken = null;
      this.tokenExpiration = 0;
      sessionStorage.removeItem('ace_google_token');
      sessionStorage.removeItem('ace_google_exp');
      window.dispatchEvent(new CustomEvent('ace_google_disconnected'));
    }
  }

  // --- API CALLS ---

  private async ensureToken() {
      if (!this.accessToken) throw new Error("Not connected to Google");
      // GAPI needs the token set explicitly
      gapi.client.setToken({ access_token: this.accessToken });
  }

  async getUpcomingEvents(): Promise<GoogleCalendarEvent[]> {
    await this.ensureToken();
    try {
        const response = await gapi.client.calendar.events.list({
            'calendarId': 'primary',
            'timeMin': (new Date()).toISOString(),
            'showDeleted': false,
            'singleEvents': true,
            'maxResults': 10,
            'orderBy': 'startTime'
        });
        return response.result.items as any[];
    } catch (e) {
        console.error("Calendar fetch failed", e);
        return [];
    }
  }

  async getContacts(): Promise<GoogleContact[]> {
      await this.ensureToken();
      try {
          // @ts-ignore - Types for People API are dynamic
          const response = await gapi.client.people.people.connections.list({
              'resourceName': 'people/me',
              'pageSize': 100,
              'personFields': 'names,emailAddresses,phoneNumbers,organizations'
          });
          return response.result.connections as any[];
      } catch (e) {
          console.error("Contacts fetch failed", e);
          return [];
      }
  }

  async createDraft(to: string, subject: string, body: string) {
      await this.ensureToken();
      
      const message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        'MIME-Version: 1.0',
        '',
        body
      ].join('\n');

      const encodedMessage = btoa(message).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      try {
          await gapi.client.gmail.users.drafts.create({
              'userId': 'me',
              'resource': {
                  'message': {
                      'raw': encodedMessage
                  }
              }
          });
          return true;
      } catch (e) {
          console.error("Draft creation failed", e);
          return false;
      }
  }
}

export const googleService = new GoogleIntegrationService();
