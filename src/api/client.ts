import axios from 'axios';

// Production backend API URL
export const API_BASE_URL = 'https://silaria.online/api'; 

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

export default apiClient;
