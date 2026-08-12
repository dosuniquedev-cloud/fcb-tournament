import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import type { VisitorTelemetry } from '../types';

const TELEMETRY_LOCAL_KEY = 'fcb_telemetry_logs_v1';
const VISITOR_ID_KEY = 'fcb_visitor_uuid_v1';

// Get or generate persistent Visitor ID
export const getVisitorId = (): string => {
  let vId = localStorage.getItem(VISITOR_ID_KEY);
  if (!vId) {
    vId = 'v_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    localStorage.setItem(VISITOR_ID_KEY, vId);
  }
  return vId;
};

// Device & Browser parser
export const parseDeviceDetails = () => {
  const ua = navigator.userAgent;
  let deviceType: 'Mobile' | 'Tablet' | 'Desktop' = 'Desktop';
  
  if (/ipad|tablet/i.test(ua) || (navigator.maxTouchPoints > 1 && /macintosh/i.test(ua))) {
    deviceType = 'Tablet';
  } else if (/mobile|iphone|android|touch/i.test(ua) || window.innerWidth < 768) {
    deviceType = 'Mobile';
  }

  let os = 'Unknown OS';
  if (/win/i.test(ua)) os = 'Windows';
  else if (/mac/i.test(ua)) os = 'macOS';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Unknown Browser';
  if (/edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Google Chrome';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Apple Safari';
  else if (/firefox|fxios/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/opera|opr/i.test(ua)) browser = 'Opera';

  return {
    deviceType,
    os,
    browser,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    language: navigator.language || 'en-US',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    connectionType: (navigator as any).connection?.effectiveType || 'unknown'
  };
};

// Fetch IP & Geolocation
export const getIpAndLocation = async (): Promise<{
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracy: 'gps' | 'ip_api' | 'unknown';
}> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        ip: data.ip,
        city: data.city,
        region: data.region,
        country: data.country_name || data.country,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        locationAccuracy: 'ip_api'
      };
    }
  } catch (err) {
    console.warn("IP Geolocation API skipped/failed:", err);
  }

  return {
    locationAccuracy: 'unknown'
  };
};

// Collect complete telemetry payload
export const createTelemetryRecord = async (
  eventType: 'page_view' | 'form_submission',
  submissionDetails?: VisitorTelemetry['submissionDetails']
): Promise<VisitorTelemetry> => {
  const visitorId = getVisitorId();
  const device = parseDeviceDetails();
  const loc = await getIpAndLocation();

  const record: VisitorTelemetry = {
    id: 'tel_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    visitorId,
    eventType,
    timestamp: new Date().toISOString(),
    ...device,
    ...loc,
    submissionDetails
  };

  return record;
};

// Check if running on local development environment (localhost / 127.0.0.1 / dev mode)
export const isLocalEnvironment = (): boolean => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host.endsWith('.local') ||
    Boolean(import.meta.env.DEV)
  );
};

// Log Telemetry to Firestore + LocalStorage
export const logTelemetry = async (telemetry: VisitorTelemetry) => {
  // EXCLUDE LOCAL DEVELOPMENT — Do not save data for localhost / developer environment
  if (isLocalEnvironment()) {
    console.info("⚡ Telemetry tracking skipped (Local Development Environment detected: " + window.location.hostname + ")");
    return;
  }

  // 1. Save to LocalStorage fallback
  try {
    const raw = localStorage.getItem(TELEMETRY_LOCAL_KEY);
    const existing: VisitorTelemetry[] = raw ? JSON.parse(raw) : [];
    const updated = [telemetry, ...existing.slice(0, 199)]; // Keep latest 200 records locally
    localStorage.setItem(TELEMETRY_LOCAL_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Local telemetry save skipped:", e);
  }

  // 2. Save to Firestore if configured
  if (isFirebaseConfigured && db) {
    try {
      await addDoc(collection(db, 'telemetry_logs'), telemetry);
    } catch (err) {
      console.warn("Firestore telemetry save failed:", err);
    }
  }
};

// Retrieve Telemetry Logs for Admin Panel
export const fetchTelemetryLogs = async (): Promise<VisitorTelemetry[]> => {
  let logs: VisitorTelemetry[] = [];

  // Try Firestore first
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, 'telemetry_logs'), orderBy('timestamp', 'desc'), limit(150));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        logs.push(doc.data() as VisitorTelemetry);
      });
    } catch (err) {
      console.warn("Firestore telemetry fetch fallback to local:", err);
    }
  }

  // Merge with LocalStorage fallback
  try {
    const raw = localStorage.getItem(TELEMETRY_LOCAL_KEY);
    const localLogs: VisitorTelemetry[] = raw ? JSON.parse(raw) : [];
    
    // Deduplicate by ID
    const map = new Map<string, VisitorTelemetry>();
    [...logs, ...localLogs].forEach(item => {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    });

    logs = Array.from(map.values())
      .filter(item => item.ip !== 'localhost' && item.ip !== '127.0.0.1' && item.ip !== '::1')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (e) {
    console.warn("Local telemetry merge skipped:", e);
  }

  return logs;
};
