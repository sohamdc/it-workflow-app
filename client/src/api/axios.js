// Central axios instance used by every API call in the app.
// Two jobs: (1) attach the current access token to every request,
// (2) if a request fails with 401 (token expired), silently refresh
// once and retry — the user never notices their 15-minute token expired.

import axios from 'axios';
import { store } from '../store/store';
import { setCredentials, logout } from '../store/authSlice';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // sends the httpOnly refresh cookie automatically
});

// Attach the access token from Redux state to every outgoing request.
api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Track whether we're already refreshing, so simultaneous 401s don't
// trigger multiple refresh calls at once.
let isRefreshing = false;
let refreshSubscribers = [];

function onRefreshed(newToken) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // prevent infinite retry loops

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const res = await axios.post(
            `${import.meta.env.VITE_API_URL}/auth/refresh`,
            {},
            { withCredentials: true }
          );
          const { accessToken, user } = res.data;
          store.dispatch(setCredentials({ accessToken, user }));
          isRefreshing = false;
          onRefreshed(accessToken);
        } catch (refreshError) {
          isRefreshing = false;
          store.dispatch(logout());
          return Promise.reject(refreshError);
        }
      }

      // Wait for the in-flight refresh to finish, then retry this request once.
      return new Promise((resolve) => {
        refreshSubscribers.push((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(api(originalRequest));
        });
      });
    }

    return Promise.reject(error);
  }
);

export default api;