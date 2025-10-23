export const API_URL = process.env.NODE_ENV === 'production'
  ? process.env.REACT_APP_API_URL || 'https://abaplay-backendv2.onrender.com/api'
  : 'http://localhost:3000/api';

export const SOCKET_URL = process.env.NODE_ENV === 'production'
  ? process.env.REACT_APP_SOCKET_URL || 'https://abaplay-backendv2.onrender.com'
  : 'http://localhost:3000';