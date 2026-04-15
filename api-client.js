// ==================== 100 DAYS, $100K API CLIENT ====================
// Handles all frontend → backend communication with idempotency, retries, error handling

class APIClient {
    constructor() {
        // Use configurable API URL from global config or fallback to detection
        this.baseURL = window.API_CONFIG && window.API_CONFIG.BASE_URL || 
            (window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin);
        
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }

    // Generate idempotency key for state-changing operations
    generateIdempotencyKey() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Core request handler with retry logic
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const method = options.method || 'GET';
        
        // Add idempotency key for state-changing operations
        const headers = { ...this.defaultHeaders };
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
            headers['Idempotency-Key'] = options.idempotencyKey || this.generateIdempotencyKey();
        }
        
        // Add auth token if available
        const token = localStorage.getItem('authToken');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            method,
            ...options
        };
        config.headers = {
            ...headers,
            ...(options.headers || {})
        };

        if (options.body !== undefined) {
            config.body = typeof options.body === 'string'
                ? options.body
                : JSON.stringify(options.body);
        }

        // Retry logic (3 attempts for 5xx errors)
        let lastError;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const response = await fetch(url, config);
                const data = await response.json().catch(() => ({}));

                if (response.ok) {
                    return { success: true, data };
                }

                // Don't retry client errors (4xx)
                if (response.status >= 400 && response.status < 500) {
                    return { 
                        success: false, 
                        error: data.error || 'Request failed',
                        code: data.code,
                        status: response.status
                    };
                }

                // Retry server errors (5xx)
                lastError = data.error || 'Server error';
                if (attempt < 3) {
                    await this.sleep(1000 * Math.pow(2, attempt - 1)); // Exponential backoff
                    continue;
                }

            } catch (error) {
                lastError = error.message;
                if (attempt < 3) {
                    await this.sleep(1000 * Math.pow(2, attempt - 1));
                    continue;
                }
            }
        }

        return { success: false, error: lastError || 'Network error' };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ==================== AUTH ENDPOINTS ====================
    
    async signup(email, password, fullName) {
        return await this.request('/api/auth/signup', {
            method: 'POST',
            body: { email, password, full_name: fullName }
        });
    }

    async signin(email, password) {
        const result = await this.request('/api/auth/signin', {
            method: 'POST',
            body: { email, password }
        });
        
        if (result.success && result.data.token) {
            localStorage.setItem('authToken', result.data.token);
            localStorage.setItem('userId', result.data.user.id);
            localStorage.setItem('userName', result.data.user.full_name || '');
            localStorage.setItem('userRole', result.data.user.role || 'user');
            localStorage.setItem('userPlan', result.data.user.plan || 'Standard');
        }
        
        return result;
    }

    async verifyEmail(token) {
        return await this.request(`/api/auth/verify-email?token=${token}`);
    }

    async resendVerification(email) {
        return await this.request('/api/auth/resend-verification', {
            method: 'POST',
            body: { email }
        });
    }

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userId');
        window.location.href = '/auth.html';
    }

    // ==================== APPLICATION ENDPOINTS ====================
    
    async submitApplication(data) {
        return await this.request('/api/applications', {
            method: 'POST',
            body: data
        });
    }

    async getApplications() {
        return await this.request('/api/applications');
    }

    async getApplication(id) {
        return await this.request(`/api/applications/${id}`);
    }

    // ==================== PAYMENT ENDPOINTS ====================
    
    async createPaymentIntent(planType) {
        return await this.request('/api/create-payment-intent', {
            method: 'POST',
            body: { plan_type: planType }
        });
    }

    // ==================== ENROLLMENT ENDPOINTS ====================
    
    async getEnrollmentProgress() {
        return await this.request('/api/enrollment/progress');
    }

    // ==================== INTERVIEW ENDPOINTS ====================
    
    async recordInterview(data) {
        return await this.request('/api/interviews', {
            method: 'POST',
            body: data
        });
    }

    async getInterviews() {
        return await this.request('/api/interviews');
    }

    // ==================== REFUND ENDPOINTS ====================
    
    async requestRefund(reason) {
        return await this.request('/api/refunds/request', {
            method: 'POST',
            body: { reason }
        });
    }

    async getRefundStatus() {
        return await this.request('/api/refunds/status');
    }

    // ==================== CONTACT ENDPOINT ====================
    
    async sendContactMessage(name, email, message) {
        return await this.request('/api/contact', {
            method: 'POST',
            body: { name, email, message }
        });
    }

    // ==================== HELPER METHODS ====================
    
    isAuthenticated() {
        return !!localStorage.getItem('authToken');
    }

    getUserId() {
        return localStorage.getItem('userId');
    }

    // Display error to user
    showError(message, elementId = 'error-message') {
        const errorEl = document.getElementById(elementId);
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            setTimeout(() => {
                errorEl.style.display = 'none';
            }, 5000);
        } else {
            alert(message);
        }
    }

    // Display success message
    showSuccess(message, elementId = 'success-message') {
        const successEl = document.getElementById(elementId);
        if (successEl) {
            successEl.textContent = message;
            successEl.style.display = 'block';
            setTimeout(() => {
                successEl.style.display = 'none';
            }, 5000);
        } else {
            alert(message);
        }
    }
}

// Global instance
window.api = new APIClient();
