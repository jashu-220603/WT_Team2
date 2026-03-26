// API Configuration
// This file detects if the app is running locally or on a deployed server

(function() {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // BACKEND URL ON RENDER
    const RENDER_BACKEND_URL = 'https://wt-team2.onrender.com'; 
    
    // Set global API base URL without trailing slash
    window.API_BASE_URL = isLocal ? 'http://localhost:7000' : RENDER_BACKEND_URL.replace(/\/$/, "");
    window.isLocalhost = isLocal;
    
    console.log('API Base URL initialized:', window.API_BASE_URL);
})();
