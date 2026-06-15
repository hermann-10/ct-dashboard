export interface EventConfig {
  slug: string;
  name: string;
  destination: string;
  date: string;
  trackingUrl: string;
  totalClicks: number;
  uniqueVisitors: number;
}

export interface ClickRecord {
  id: number;
  event_slug: string;
  event_name: string;
  ip_hash: string;
  user_agent: string;
  device: string;
  referrer: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  fbclid: string | null;
  fb_ad_id: string | null;
  fb_adset_id: string | null;
  fb_campaign_id: string | null;
  created_at: string;
}

export interface DeviceBreakdown {
  device: string;
  count: number;
}

export interface UtmBreakdown {
  source: string;
  count: number;
}

export interface TimelinePoint {
  date: string;
  count: number;
}

export interface EventTimelineData {
  dates: string[];
  datasets: { slug: string; name: string; data: number[] }[];
  totalPerDay: number[];
}

export interface DashboardStats {
  totalClicks: number;
  uniqueVisitors: number;
  totalEvents: number;
  conversionRate: number;
}
