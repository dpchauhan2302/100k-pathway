// API Configuration Template
// This file will be processed during deployment to inject environment-specific values
window.API_CONFIG = {
    BASE_URL: window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://100k-pathway.com'
};