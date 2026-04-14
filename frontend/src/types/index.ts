export type Role = 'admin' | 'manager' | 'sales' | 'viewer';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  avatar?: string;
  phone_number?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  status: 'new' | 'active' | 'inactive' | 'lost';
  source?: string;
  assigned_to?: string;
  assigned_user?: User;
  tags?: string[];
  notes?: string;
  avatar?: string;
  deals_count?: number;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  color: string;
  position: number;
  probability: number;
  is_won: boolean;
  is_lost: boolean;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  is_default: boolean;
  stages: PipelineStage[];
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  pipeline_id: string;
  stage_id: string;
  contact_id?: string;
  assigned_to?: string;
  priority: 'low' | 'medium' | 'high';
  close_date?: string;
  notes?: string;
  lost_reason?: string;
  partner_id?: string;
  venue_id?: string;
  event_name?: string;
  event_date?: string;
  ticket_count?: number;
  category?: string;
  created_at: string;
  updated_at: string;
  contact?: Contact;
  assigned_user?: User;
  stage?: { name: string; color: string };
  activities?: Activity[];
  ai_score?: AIScore;
  partner?: Partner;
  venue?: Venue;
}

export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'task' | 'whatsapp';
export type ActivityStatus = 'pending' | 'completed' | 'cancelled';

export interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  description?: string;
  status: ActivityStatus;
  deal_id?: string;
  contact_id?: string;
  partner_id?: string;
  partner_name?: string;
  user_id: string;
  user_name?: string;
  due_date?: string;
  duration?: number;
  created_at: string;
  user?: User;
}

export type CallDirection = 'inbound' | 'outbound';
export type CallStatus = 'initiated' | 'ringing' | 'answered' | 'completed' | 'missed' | 'failed';

export interface CallRecord {
  id: string;
  direction: CallDirection;
  status: CallStatus;
  from_number: string;
  to_number: string;
  duration: number;
  recording_url?: string;
  transcript?: string;
  ai_analysis?: string;
  contact_id?: string;
  deal_id?: string;
  user_id?: string;
  started_at?: string;
  ended_at?: string;
  created_at: string;
  contact?: Contact;
}

export interface WhatsAppMessage {
  id: string;
  contact_id?: string;
  deal_id?: string;
  direction: 'incoming' | 'outgoing';
  from_number: string;
  to_number: string;
  body: string;
  media_url?: string;
  status: string;
  sent_at?: string;
  read_at?: string;
  created_at: string;
}

export interface AIScore {
  id: string;
  entity_type: string;
  entity_id: string;
  score: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  insights?: string[];
  suggestions?: string[];
  generated_at: string;
}

export interface DashboardMetrics {
  total_deals: number;
  total_value: number;
  won_deals: number;
  won_value: number;
  lost_deals: number;
  conversion_rate: number;
  avg_deal_value: number;
  avg_deal_cycle_days: number;
  total_contacts: number;
  new_contacts_today: number;
  total_calls: number;
  total_call_duration: number;
  total_messages: number;
  pipeline_breakdown: PipelineMetric[];
  activity_breakdown: ActivityMetric[];
  revenue_by_month: MonthlyRevenue[];
  top_performers: UserPerformance[];
  ai_insights: string[];
}

export interface PipelineMetric {
  stage_id: string;
  stage_name: string;
  color: string;
  count: number;
  value: number;
}

export interface ActivityMetric {
  type: string;
  count: number;
}

export interface MonthlyRevenue {
  month: string;
  won: number;
  target: number;
}

export interface UserPerformance {
  user_id: string;
  name: string;
  avatar: string;
  deals_won: number;
  revenue: number;
  calls_made: number;
  ai_score: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CSVImportStats {
  inserted: number;
  skipped: number;
}


export interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  user_first_name: string;
  user_last_name: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  description?: string;
  ip_address?: string;
  created_at: string;
}

export interface City {
  id: string;
  name: string;
  country: string;
  created_at: string;
}

export interface Venue {
  id: string;
  name: string;
  address?: string;
  city_id?: string;
  capacity?: number;
  description?: string;
  created_at: string;
  updated_at: string;
  city?: City;
}

export type PartnerStatus = 'active' | 'inactive' | 'prospect';

export interface Partner {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  city_id?: string;
  status: PartnerStatus;
  contract_number?: string;
  contract_date?: string;
  commission_rate: number;
  notes?: string;
  website?: string;
  created_at: string;
  updated_at: string;
  city?: City;
  deals_count?: number;
  total_revenue?: number;
}

export interface PartnerStats {
  partner_id: string;
  partner_name: string;
  total_deals: number;
  won_deals: number;
  lost_deals: number;
  active_deals: number;
  total_revenue: number;
  avg_deal_value: number;
  conversion_rate: number;
  total_tickets: number;
}

export interface PartnerDocument {
  id: string;
  partner_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  uploaded_by?: string;
  uploader_name?: string;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  deal_id: string;
  text: string;
  is_done: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}
