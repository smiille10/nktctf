import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// ── Token automatique ──
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nkt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

// ── Auth API ──
export const authAPI = {
  login:               (data)    => api.post('/auth/login', data),
  register:            (data)    => api.post('/auth/register', data),
  me:                  ()        => api.get('/auth/me'),
  verifyEmail:         (token)   => api.get(`/auth/verify-email?token=${token}`),
  updateUsername:      (data)    => api.patch('/auth/update-username', data),
  updatePassword:      (data)    => api.patch('/auth/update-password', data),
  resendVerification:  (email)   => api.post('/auth/resend-verification', { email }),
};

// ── Challenges API ──
export const challengeAPI = {
  getAll:   ()         => api.get('/challenges'),
  getOne:   (id)       => api.get(`/challenges/${id}`),
  submit:   (id, flag) => api.post(`/challenges/${id}/submit`, { flag }),
  download: (id)       => `http://localhost:5000/api/challenges/${id}/download`,
};
export const challengesAPI = challengeAPI;

// ── Admin API ──
export const adminAPI = {
  getStats:        ()         => api.get('/admin/stats'),
  getChallenges:   ()         => api.get('/admin/challenges'),
  createChallenge: (data)     => api.post('/admin/challenges', data),
  updateChallenge: (id, data) => api.put(`/admin/challenges/${id}`, data),
  deleteChallenge: (id)       => api.delete(`/admin/challenges/${id}`),
  toggleChallenge: (id)       => api.patch(`/admin/challenges/${id}/toggle`),
  getUsers:        ()         => api.get('/admin/users'),
  createUser:      (data)     => api.post('/admin/users', data),
  updateUserRole:  (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  deleteUser:      (id)       => api.delete(`/admin/users/${id}`),
  editUser:        (id, data) => api.patch(`/admin/users/${id}`, data),
  getEvents:       ()         => api.get('/admin/events'),
  createEvent:     (data)     => api.post('/admin/events', data),
  updateEvent:     (id, data) => api.put(`/admin/events/${id}`, data),
  deleteEvent:     (id)       => api.delete(`/admin/events/${id}`),
  getTable:        (table)    => api.get(`/admin/db/${table}`),
  // ── Teams ──
  getTeams:        ()         => api.get('/admin/teams'),
  getTeamMembers:  (id)       => api.get(`/admin/teams/${id}/members`),
  getTeamMessages: (id)       => api.get(`/admin/teams/${id}/messages`),
  deleteTeam:      (id)       => api.delete(`/admin/teams/${id}`),
};

// ── Team API ──
export const teamAPI = {
  getMine:     ()             => api.get('/teams/mine'),
  create:      (name)         => api.post('/teams/create', { name }),
  join:        (invite_code)  => api.post('/teams/join', { invite_code }),
  leave:       ()             => api.delete('/teams/leave'),
  kick:        (tid, uid)     => api.delete(`/teams/${tid}/kick/${uid}`),
  getMessages: (tid)          => api.get(`/teams/${tid}/messages`),
  sendMessage: (tid, message) => api.post(`/teams/${tid}/messages`, { message }),
};

// ── Events API ──
export const eventAPI = {
  getAll:   ()         => api.get('/events'),
  getOne:   (id)       => api.get(`/events/${id}`),
  register: (id, data) => api.post(`/events/${id}/register`, data),
};
export const eventsAPI = eventAPI;

// ── Scoreboard API ──
export const scoreboardAPI = {
  getAll: () => api.get('/scoreboard'),
};

// ── Profile API ──
export const profileAPI = {
  getSolved: ()         => api.get('/profile/solved'),
  getPublic: (username) => api.get(`/profile/${username}`),
};