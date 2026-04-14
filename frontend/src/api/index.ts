import api from './client';
import type {
  User, Contact, Pipeline, Deal, Activity, CallRecord,
  WhatsAppMessage, DashboardMetrics, PaginatedResponse, APIResponse,
  City, Venue, Partner, CSVImportStats, PartnerDocument,
} from '../types';

export const authAPI = {
  login: (email: string, password: string) =>
    api.post<{ token: string; expires_at: number; user: User }>('/auth/login', { email, password }),
  me: () => api.get<APIResponse<User>>('/auth/me'),
};

export const usersAPI = {
  list: () => api.get<APIResponse<User[]>>('/users'),
  create: (data: Partial<User> & { password: string }) => api.post<APIResponse>('/users', data),
  update: (id: string, data: Partial<User>) => api.put<APIResponse>(`/users/${id}`, data),
};

export const contactsAPI = {
  list: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<Contact>>('/contacts', { params }),
  get: (id: string) => api.get<APIResponse<Contact>>(`/contacts/${id}`),
  create: (data: Partial<Contact>) => api.post<APIResponse>('/contacts', data),
  update: (id: string, data: Partial<Contact>) => api.put<APIResponse>(`/contacts/${id}`, data),
  delete: (id: string) => api.delete<APIResponse>(`/contacts/${id}`),
  activities: (id: string) => api.get<APIResponse<Activity[]>>(`/contacts/${id}/activities`),
  calls: (id: string) => api.get<APIResponse<CallRecord[]>>(`/contacts/${id}/calls`),
  messages: (id: string) => api.get<APIResponse<WhatsAppMessage[]>>(`/contacts/${id}/messages`),
  exportCSV: () => api.get('/contacts/export', { responseType: 'blob' }),
  importCSV: (file: File) => {
    const form = new FormData(); form.append('file', file);
    return api.post<APIResponse<CSVImportStats>>('/contacts/import', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const pipelinesAPI = {
  list: () => api.get<APIResponse<Pipeline[]>>('/pipelines'),
  get: (id: string) => api.get<APIResponse<Pipeline>>(`/pipelines/${id}`),
  create: (data: Partial<Pipeline>) => api.post<APIResponse>('/pipelines', data),
  update: (id: string, data: Partial<Pipeline>) => api.put<APIResponse>(`/pipelines/${id}`, data),
  delete: (id: string) => api.delete<APIResponse>(`/pipelines/${id}`),
  addStage: (pipelineId: string, data: object) =>
    api.post<APIResponse>(`/pipelines/${pipelineId}/stages`, data),
  updateStage: (pipelineId: string, stageId: string, data: object) =>
    api.put<APIResponse>(`/pipelines/${pipelineId}/stages/${stageId}`, data),
  deleteStage: (pipelineId: string, stageId: string) =>
    api.delete<APIResponse>(`/pipelines/${pipelineId}/stages/${stageId}`),
};

export const dealsAPI = {
  list: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<Deal>>('/deals', { params }),
  get: (id: string) => api.get<APIResponse<Deal>>(`/deals/${id}`),
  create: (data: Partial<Deal>) => api.post<APIResponse>('/deals', data),
  update: (id: string, data: Partial<Deal>) => api.put<APIResponse>(`/deals/${id}`, data),
  move: (id: string, stageId: string) => api.patch<APIResponse>(`/deals/${id}/move`, { stage_id: stageId }),
  delete: (id: string) => api.delete<APIResponse>(`/deals/${id}`),
  activities: (id: string) => api.get<APIResponse<Activity[]>>(`/deals/${id}/activities`),
  createActivity: (dealId: string, data: Partial<Activity>) =>
    api.post<APIResponse>(`/deals/${dealId}/activities`, data),
  exportCSV: () => api.get('/deals/export', { responseType: 'blob' }),
  importCSV: (file: File) => {
    const form = new FormData(); form.append('file', file);
    return api.post<APIResponse<CSVImportStats>>('/deals/import', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const activitiesAPI = {
  list: (params?: Record<string, unknown>) =>
    api.get<APIResponse<Activity[]>>('/activities', { params }),
  create: (data: Partial<Activity>) => api.post<APIResponse>('/activities', data),
  update: (id: string, data: Partial<Activity>) => api.put<APIResponse>(`/activities/${id}`, data),
  delete: (id: string) => api.delete<APIResponse>(`/activities/${id}`),
};

export const telephonyAPI = {
  listCalls: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<CallRecord>>('/telephony/calls', { params }),
  initiateCall: (toNumber: string, contactId?: string, dealId?: string) =>
    api.post<APIResponse>('/telephony/calls', { to_number: toNumber, contact_id: contactId, deal_id: dealId }),
  getCall: (id: string) => api.get<APIResponse<CallRecord>>(`/telephony/calls/${id}`),
  getRecordingURL: (id: string) =>
    api.get<APIResponse<{ url: string; expires_in: number }>>(`/telephony/calls/${id}/recording`),
  updateCall: (id: string, data: object) => api.patch<APIResponse>(`/telephony/calls/${id}`, data),
};

export const whatsappAPI = {
  conversations: () => api.get<APIResponse>('/whatsapp/conversations'),
  messages: (params?: Record<string, unknown>) =>
    api.get<APIResponse<WhatsAppMessage[]>>('/whatsapp/messages', { params }),
  send: (data: { to_number: string; body: string; contact_id?: string; deal_id?: string }) =>
    api.post<APIResponse>('/whatsapp/messages', data),
  markRead: (id: string) => api.patch<APIResponse>(`/whatsapp/messages/${id}/read`, {}),
};

export const auditLogAPI = {
  list: () => api.get<APIResponse>('/audit-log'),
};

export const citiesAPI = {
  list: () => api.get<APIResponse<City[]>>('/cities'),
  create: (data: Partial<City>) => api.post<APIResponse>('/cities', data),
  update: (id: string, data: Partial<City>) => api.put<APIResponse>(`/cities/${id}`, data),
  delete: (id: string) => api.delete<APIResponse>(`/cities/${id}`),
};

export const venuesAPI = {
  list: (params?: Record<string, unknown>) =>
    api.get<APIResponse<Venue[]>>('/venues', { params }),
  create: (data: Partial<Venue>) => api.post<APIResponse>('/venues', data),
  update: (id: string, data: Partial<Venue>) => api.put<APIResponse>(`/venues/${id}`, data),
  delete: (id: string) => api.delete<APIResponse>(`/venues/${id}`),
  exportCSV: () => api.get('/venues/export', { responseType: 'blob' }),
  importCSV: (file: File) => {
    const form = new FormData(); form.append('file', file);
    return api.post<APIResponse<CSVImportStats>>('/venues/import', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const partnersAPI = {
  list: (params?: Record<string, unknown>) =>
    api.get<APIResponse<Partner[]>>('/partners', { params }),
  get: (id: string) => api.get<APIResponse<Partner>>(`/partners/${id}`),
  create: (data: Partial<Partner>) => api.post<APIResponse>('/partners', data),
  update: (id: string, data: Partial<Partner>) => api.put<APIResponse>(`/partners/${id}`, data),
  delete: (id: string) => api.delete<APIResponse>(`/partners/${id}`),
  getStats: (id: string) => api.get<APIResponse>(`/partners/${id}/stats`),
  getActivities: (id: string) => api.get<APIResponse<Activity[]>>(`/partners/${id}/activities`),
  exportCSV: () => api.get('/partners/export', { responseType: 'blob' }),
  importCSV: (file: File) => {
    const form = new FormData(); form.append('file', file);
    return api.post<APIResponse<CSVImportStats>>('/partners/import', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const partnerDocumentsAPI = {
  list: (partnerId: string) =>
    api.get<APIResponse<PartnerDocument[]>>(`/partners/${partnerId}/documents`),
  upload: (partnerId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<APIResponse<PartnerDocument>>(
      `/partners/${partnerId}/documents`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },
  download: (partnerId: string, docId: string) =>
    api.get(`/partners/${partnerId}/documents/${docId}`, { responseType: 'blob' }),
  delete: (partnerId: string, docId: string) =>
    api.delete<APIResponse>(`/partners/${partnerId}/documents/${docId}`),
};

export const checklistAPI = {
  list: (dealId: string) => api.get<APIResponse>(`/deals/${dealId}/checklist`),
  create: (dealId: string, text: string) =>
    api.post<APIResponse>(`/deals/${dealId}/checklist`, { text }),
  toggle: (dealId: string, itemId: string) =>
    api.patch<APIResponse>(`/deals/${dealId}/checklist/${itemId}/toggle`, {}),
  update: (dealId: string, itemId: string, text: string) =>
    api.put<APIResponse>(`/deals/${dealId}/checklist/${itemId}`, { text }),
  delete: (dealId: string, itemId: string) =>
    api.delete<APIResponse>(`/deals/${dealId}/checklist/${itemId}`),
};

export const analyticsAPI = {
  dashboard: (period?: string) =>
    api.get<APIResponse<DashboardMetrics>>('/analytics/dashboard', { params: { period } }),
  forecast: () => api.get<APIResponse>('/analytics/forecast'),
  analyzeDeal: (id: string) => api.get<APIResponse>(`/analytics/deals/${id}`),
  analyzeCall: (id: string) => api.get<APIResponse>(`/analytics/calls/${id}`),
};

export type SettingsCategory = 'telephony' | 'whatsapp' | 'ai';

export const settingsAPI = {
  get: (category: SettingsCategory) =>
    api.get<APIResponse<Record<string, string>>>(`/settings/${category}`),
  save: (category: SettingsCategory, data: Record<string, string>) =>
    api.put<APIResponse>(`/settings/${category}`, data),
  test: (category: SettingsCategory) =>
    api.post<{ success: boolean; message: string }>(`/settings/${category}/test`, {}),
};
