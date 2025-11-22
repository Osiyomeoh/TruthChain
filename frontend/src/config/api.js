// API Configuration
// Automatically uses production URL in production builds, localhost in development

const isProduction = import.meta.env.PROD;

export const API_BASE = isProduction 
  ? 'https://truthchain-drow.onrender.com/v1'
  : 'http://localhost:3000/v1';

export default API_BASE;

