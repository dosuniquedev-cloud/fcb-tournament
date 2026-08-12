export type PlayingPosition = 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward';

export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

export interface VisitorTelemetry {
  id: string;
  visitorId: string;
  eventType: 'page_view' | 'form_submission';
  timestamp: string;
  deviceType: 'Mobile' | 'Tablet' | 'Desktop';
  os: string;
  browser: string;
  screenResolution: string;
  viewportSize: string;
  language: string;
  timezone: string;
  connectionType?: string;
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracy?: 'gps' | 'ip_api' | 'unknown';
  submissionDetails?: {
    name?: string;
    phone?: string;
    position?: string;
    ticketId?: string;
    utrNumber?: string;
    hasScreenshot?: boolean;
  };
}

export interface PlayerRegistration {
  id: string;
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  phone: string;
  position: PlayingPosition;
  utrNumber: string;
  screenshotUrl: string; // Base64 or Firebase Storage URL
  status: RegistrationStatus;
  ticketId: string;
  createdAt: string;
  telemetry?: VisitorTelemetry;
}

export interface TournamentConfig {
  maxSlots: number;
  entryFee: number;
  tournamentDate: string;
  venue: string;
  upiId: string;
  upiName: string;
  adminEmail: string;
}
