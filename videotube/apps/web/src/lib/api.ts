import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // Important for cookies (access token, refresh token)
});

// Optionally, interceptors can be added here for token refresh logic
// if the tokens expire and we need to automatically refresh.

export default api;
