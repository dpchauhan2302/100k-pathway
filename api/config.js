// Environment variable validation
// Ensures all required config is present before server starts

const { logger } = require('./logger');

// Required environment variables (fail if missing)
const REQUIRED_VARS = [
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS'
];

// Optional but recommended (warn if missing)
const RECOMMENDED_VARS = [
    'NODE_ENV',
    'FRONTEND_URL',
    'APP_URL',
    'EMAIL_FROM',
    'LOG_LEVEL'
];

// Sensitive variables that should never have default values
const NO_DEFAULTS_ALLOWED = [
    'SMTP_PASS'
];

function validateEnvironment() {
    const errors = [];
    const warnings = [];
    
    // Check required variables
    for (const varName of REQUIRED_VARS) {
        if (!process.env[varName]) {
            errors.push(`Missing required environment variable: ${varName}`);
        }
    }
    
    // Check for dangerous defaults
    for (const varName of NO_DEFAULTS_ALLOWED) {
        const value = process.env[varName];
        if (value && (
            value.includes('your-secret') ||
            value.includes('change-me') ||
            value.includes('example') ||
            value.includes('test-key') ||
            value === 'secret'
        )) {
            errors.push(`Environment variable ${varName} contains unsafe placeholder value`);
        }
    }
    
    // Check recommended variables
    for (const varName of RECOMMENDED_VARS) {
        if (!process.env[varName]) {
            warnings.push(`Missing recommended environment variable: ${varName}`);
        }
    }
    
    // Validate NODE_ENV
    const validEnvs = ['development', 'staging', 'production'];
    if (process.env.NODE_ENV && !validEnvs.includes(process.env.NODE_ENV)) {
        warnings.push(`Invalid NODE_ENV: ${process.env.NODE_ENV}. Should be one of: ${validEnvs.join(', ')}`);
    }
    
    // Validate URLs
    const urlVars = ['SUPABASE_URL', 'FRONTEND_URL', 'APP_URL'];
    for (const varName of urlVars) {
        const value = process.env[varName];
        if (value && !value.match(/^https?:\/\/.+/)) {
            errors.push(`${varName} must be a valid URL starting with http:// or https://`);
        }
    }
    
    // Report results
    if (warnings.length > 0) {
        logger.warn('Environment configuration warnings', { warnings });
    }
    
    if (errors.length > 0) {
        logger.error('Backend API disabled - missing environment variables', { errors });
        logger.warn('Frontend will deploy successfully. API endpoints will return 503.');
        // Don't throw - allow frontend to deploy
        return false;
    }
    
    logger.info('Environment validation passed', {
        nodeEnv: process.env.NODE_ENV || 'development',
        requiredVars: REQUIRED_VARS.length,
        warnings: warnings.length
    });
    
    return true;
}

// Get configuration with type coercion
function getConfig() {
    return {
        // Environment
        nodeEnv: process.env.NODE_ENV || 'development',
        isDevelopment: process.env.NODE_ENV === 'development',
        isProduction: process.env.NODE_ENV === 'production',
        
        // Server
        port: parseInt(process.env.PORT || '3000', 10),
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8001',
        appUrl: process.env.APP_URL || 'http://localhost:3000',
        
        // Database
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_KEY,
        
        // Authentication
        jwtSecret: process.env.JWT_SECRET,
        jwtExpiry: process.env.JWT_EXPIRY || '7d',
        
        // External services
        stripeSecretKey: process.env.STRIPE_SECRET_KEY,
        sendgridApiKey: process.env.SENDGRID_API_KEY,
        emailFrom: process.env.EMAIL_FROM || 'noreply@100k-pathway.com',
        
        // Chaos engineering
        chaosEnabled: process.env.CHAOS_ENABLED === 'true',
        chaosFailureRate: parseFloat(process.env.CHAOS_FAILURE_RATE || '0.1'),
        
        // Logging
        logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')
    };
}

module.exports = {
    validateEnvironment,
    getConfig
};
