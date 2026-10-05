import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(c => {
  const t = localStorage.getItem('token');
  if (t) c.headers.Authorization = 'Bearer ' + t;
  return c;
});

api.interceptors.response.use(
  r => r,
  e => {
    const url = e.config?.url || '';
    const authCall = url.startsWith('/auth/login') || url.startsWith('/auth/register');
    const dead = e.response?.status === 401 || e.response?.data?.code === 'ACCOUNT_DEACTIVATED';
    if (dead && !authCall && localStorage.getItem('token')) {
      localStorage.clear();
      location.href = '/login';
    }
    return Promise.reject(e);
  }
);

export const errMsg = e => e.response?.data?.message || 'Something went wrong. Please check connection and try again.';

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

export const setSession = ({ token, user }) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

// Where each role lands after sign-in. The server enforces access; this sets the default landing page.
export const homeFor = role => (role === 'candidate' ? '/app/portal/dashboard' : '/app');

export default api;
