// Structured logging with Winston
// Correlation IDs, log levels, and JSON output for production observability

const winston = require('winston');

// Custom format for development (human-readable)
const devFormat = winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} ${level}: ${message} ${metaStr}`;
    })
);

// Production format (structured JSON for log aggregation)
const prodFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
    defaultMeta: {
        service: '100k-pathway-api',
        environment: process.env.NODE_ENV || 'development'
    },
    transports: [
        new winston.transports.Console()
    ]
});

// Add request correlation middleware
function correlationMiddleware(req, res, next) {
    // Generate or extract correlation ID
    const correlationId = req.headers['x-correlation-id'] || 
                         req.headers['x-request-id'] || 
                         `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    
    // Create child logger with correlation ID
    req.logger = logger.child({ correlationId });
    
    // Log request
    req.logger.info('Incoming request', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });
    
    // Log response
    const startTime = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        req.logger.info('Request completed', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration
        });
    });
    
    next();
}

// Centralized error logging helper
function logError(error, context = {}) {
    logger.error('Error occurred', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        ...context
    });
}

// Business event logging (audit trail)
function logEvent(eventType, userId, data = {}) {
    logger.info('Business event', {
        eventType,
        userId,
        timestamp: new Date().toISOString(),
        ...data
    });
}

module.exports = {
    logger,
    correlationMiddleware,
    logError,
    logEvent
};
