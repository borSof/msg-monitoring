import axios from 'axios';

let authToken: string | null = null;

export const api = axios.create();

export function setAuthToken(token: string | null) {
  authToken = token;
}

api.interceptors.request.use(config => {
  if (authToken) {
    config.headers = config.headers || {};
    (config.headers as any)['Authorization'] = `Bearer ${authToken}`;
  }
  return config;
});
