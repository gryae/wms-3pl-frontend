import axios from 'axios';
import { useWmsStore } from '@/store/useWmsStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach bearer token
api.interceptors.request.use(
  (config) => {
    const token = useWmsStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Automatic Refresh Token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = useWmsStore.getState().refreshToken;
      if (!refreshToken) {
        useWmsStore.getState().logout();
        return Promise.reject(error);
      }
      
      try {
        // Call refresh endpoint directly using secondary instance to prevent loop
        const resp = await axios.post(`${API_URL}/api/v1/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = resp.data.data;
        
        const user = useWmsStore.getState().user;
        if (user) {
          useWmsStore.getState().setAuth(user, accessToken, newRefreshToken);
        }
        
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        useWmsStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
