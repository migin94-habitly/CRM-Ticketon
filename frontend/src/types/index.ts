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
  created_at: string;
  updated_at: string;
  contact?: Contact;
  assigned_user?: User;
  stage?: { name: string; color: string };
  activities?: Activity[];
  ai_score?: AIScore;
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
  user_id: string;
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
