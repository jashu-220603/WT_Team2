// API Configuration
// This file detects if the app is running locally or on a deployed server

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// CHANGE THIS URL AFTER DEPLOYING YOUR BACKEND TO RENDER
const RENDER_BACKEND_URL = 'https://wt-team2.onrender.com'; 

window.API_BASE_URL = isLocalhost ? 'http://localhost:7000' : RENDER_BACKEND_URL;

console.log('API Base URL:', window.API_BASE_URL);
