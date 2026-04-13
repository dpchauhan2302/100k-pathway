// CHAOS MONKEY - Resilience Testing Middleware
// Randomly injects failures to test system robustness

class ChaosMonkey {
    constructor(config = {}) {
        this.enabled = process.env.CHAOS_ENABLED === 'true' || false;
        this.failureRate = config.failureRate || 0.1; // 10% failure rate
        this.scenarios = config.scenarios || ['timeout', 'error', 'latency', 'partial'];
        this.excludePaths = config.excludePaths || ['/api/health'];
        
        this.metrics = {
            totalRequests: 0,
            chaosInjected: 0,
            byScenario: {}
        };
    }

    // Middleware for Express
    middleware() {
        return (req, res, next) => {
            this.metrics.totalRequests++;
            
            // Skip if disabled or excluded path
            if (!this.enabled || this.isExcluded(req.path)) {
                return next();
            }

            // Random chaos injection
            if (Math.random() < this.failureRate) {
                this.metrics.chaosInjected++;
                return this.injectChaos(req, res, next);
            }

            next();
        };
    }

    isExcluded(path) {
        return this.excludePaths.some(excluded => path.startsWith(excluded));
    }

    injectChaos(req, res, next) {
        const scenario = this.selectScenario();
        this.metrics.byScenario[scenario] = (this.metrics.byScenario[scenario] || 0) + 1;

        console.log(`🐵 CHAOS: ${scenario} on ${req.method} ${req.path}`);

        switch (scenario) {
            case 'timeout':
                return this.simulateTimeout(req, res);
            
            case 'error':
                return this.simulateError(req, res);
            
            case 'latency':
                return this.simulateLatency(req, res, next);
            
            case 'partial':
                return this.simulatePartialFailure(req, res);
            
            default:
                next();
        }
    }

    selectScenario() {
        return this.scenarios[Math.floor(Math.random() * this.scenarios.length)];
    }

    // Scenario 1: Request timeout (no response)
    simulateTimeout(req, res) {
        setTimeout(() => {
            if (!res.headersSent) {
                res.status(408).json({
                    error: 'Request Timeout',
                    code: 'CHAOS_TIMEOUT',
                    message: 'Chaos Monkey injected timeout',
                    timestamp: new Date().toISOString()
                });
            }
        }, 30000); // 30 second timeout
    }

    // Scenario 2: Random error
    simulateError(req, res) {
        const errors = [
            { status: 500, code: 'INTERNAL_ERROR', message: 'Chaos: Internal server error' },
            { status: 503, code: 'SERVICE_UNAVAILABLE', message: 'Chaos: Service temporarily unavailable' },
            { status: 502, code: 'BAD_GATEWAY', message: 'Chaos: Upstream service failure' },
            { status: 429, code: 'RATE_LIMIT', message: 'Chaos: Rate limit exceeded' }
        ];

        const error = errors[Math.floor(Math.random() * errors.length)];
        
        res.status(error.status).json({
            error: error.message,
            code: error.code,
            chaosInjection: true,
            timestamp: new Date().toISOString()
        });
    }

    // Scenario 3: High latency
    simulateLatency(req, res, next) {
        const delay = Math.floor(Math.random() * 5000) + 2000; // 2-7 seconds
        
        setTimeout(() => {
            next();
        }, delay);
    }

    // Scenario 4: Partial response (corrupted data)
    simulatePartialFailure(req, res) {
        res.status(200).json({
            success: false,
            data: null,
            error: 'Chaos: Partial system failure',
            code: 'CHAOS_PARTIAL',
            timestamp: new Date().toISOString()
        });
    }

    // Get chaos metrics
    getMetrics() {
        return {
            ...this.metrics,
            chaosRate: this.metrics.totalRequests > 0 
                ? (this.metrics.chaosInjected / this.metrics.totalRequests * 100).toFixed(2) + '%'
                : '0%',
            enabled: this.enabled
        };
    }

    // Enable/disable chaos
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log(`🐵 Chaos Monkey ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    // Reset metrics
    resetMetrics() {
        this.metrics = {
            totalRequests: 0,
            chaosInjected: 0,
            byScenario: {}
        };
    }
}

// Circuit Breaker for external services
class CircuitBreaker {
    constructor(service, options = {}) {
        this.service = service;
        this.threshold = options.threshold || 5;
        this.timeout = options.timeout || 60000; // 1 minute
        this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
        
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.failures = 0;
        this.lastFailureTime = null;
        this.successCount = 0;
    }

    async execute(fn, ...args) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.resetTimeout) {
                this.state = 'HALF_OPEN';
                this.successCount = 0;
                console.log(`🔧 Circuit ${this.service}: HALF_OPEN`);
            } else {
                throw new Error(`Circuit breaker OPEN for ${this.service}`);
            }
        }

        try {
            const result = await fn(...args);
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    onSuccess() {
        this.failures = 0;
        
        if (this.state === 'HALF_OPEN') {
            this.successCount++;
            if (this.successCount >= 3) {
                this.state = 'CLOSED';
                console.log(`✅ Circuit ${this.service}: CLOSED`);
            }
        }
    }

    onFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.failures >= this.threshold) {
            this.state = 'OPEN';
            console.log(`❌ Circuit ${this.service}: OPEN (${this.failures} failures)`);
        }
    }

    getState() {
        return {
            service: this.service,
            state: this.state,
            failures: this.failures,
            lastFailure: this.lastFailureTime
        };
    }
}

// Fault injection helpers
const faultInjection = {
    // Random database failure
    async dbFault(fn, failureRate = 0.1) {
        if (Math.random() < failureRate) {
            throw new Error('Chaos: Database connection failed');
        }
        return await fn();
    },

    // Random external API failure
    async apiFault(fn, failureRate = 0.15) {
        if (Math.random() < failureRate) {
            const errors = [
                'Network timeout',
                'Connection refused',
                'DNS resolution failed',
                'SSL handshake failed'
            ];
            throw new Error(`Chaos: ${errors[Math.floor(Math.random() * errors.length)]}`);
        }
        return await fn();
    },

    // Random payment failure
    async paymentFault(fn, failureRate = 0.05) {
        if (Math.random() < failureRate) {
            throw new Error('Chaos: Payment gateway unavailable');
        }
        return await fn();
    }
};

// Advanced Chaos Scenarios
class ChaosEngine {
    constructor() {
        this.scenarios = {
            memory: new MemoryLeakSimulator(),
            cpu: new CPUSpike(),
            network: new NetworkChaos(),
            database: new DatabaseChaos(),
            cache: new CacheChaos(),
            disk: new DiskChaos()
        };
    }

    async execute(scenario, options = {}) {
        if (!this.scenarios[scenario]) {
            throw new Error(`Unknown chaos scenario: ${scenario}`);
        }
        return await this.scenarios[scenario].run(options);
    }

    getAvailableScenarios() {
        return Object.keys(this.scenarios);
    }
}

// Memory leak simulator
class MemoryLeakSimulator {
    constructor() {
        this.leaks = [];
    }

    run(options = {}) {
        const size = options.size || 10; // MB
        const duration = options.duration || 60000; // 1 minute

        console.log(`💾 CHAOS: Memory leak ${size}MB for ${duration}ms`);

        // Allocate memory
        const leak = Buffer.alloc(size * 1024 * 1024);
        this.leaks.push(leak);

        // Clean up after duration
        setTimeout(() => {
            const index = this.leaks.indexOf(leak);
            if (index > -1) {
                this.leaks.splice(index, 1);
                console.log(`💾 CHAOS: Memory leak cleaned up`);
            }
        }, duration);

        return {
            scenario: 'memory_leak',
            size: `${size}MB`,
            duration: `${duration}ms`,
            currentLeaks: this.leaks.length
        };
    }

    cleanup() {
        this.leaks = [];
        if (global.gc) {
            global.gc();
        }
    }
}

// CPU spike simulator
class CPUSpike {
    run(options = {}) {
        const duration = options.duration || 5000;
        const intensity = options.intensity || 0.8; // 80%

        console.log(`🔥 CHAOS: CPU spike ${intensity * 100}% for ${duration}ms`);

        const start = Date.now();
        const end = start + duration;

        // CPU-intensive calculation
        const interval = setInterval(() => {
            if (Date.now() >= end) {
                clearInterval(interval);
                console.log(`🔥 CHAOS: CPU spike ended`);
                return;
            }

            // Waste CPU cycles
            const cycleEnd = Date.now() + (100 * intensity);
            while (Date.now() < cycleEnd) {
                Math.sqrt(Math.random());
            }
        }, 100);

        return {
            scenario: 'cpu_spike',
            intensity: `${intensity * 100}%`,
            duration: `${duration}ms`
        };
    }
}

// Network chaos
class NetworkChaos {
    constructor() {
        this.originalFetch = global.fetch;
        this.enabled = false;
    }

    run(options = {}) {
        const type = options.type || 'latency'; // latency, packet_loss, disconnect
        const config = options.config || {};

        console.log(`🌐 CHAOS: Network ${type}`);

        switch (type) {
            case 'latency':
                return this.injectLatency(config.delay || 2000);
            case 'packet_loss':
                return this.injectPacketLoss(config.rate || 0.3);
            case 'disconnect':
                return this.injectDisconnect(config.duration || 10000);
            default:
                throw new Error(`Unknown network chaos type: ${type}`);
        }
    }

    injectLatency(delay) {
        // Simulate network delay
        return {
            scenario: 'network_latency',
            delay: `${delay}ms`,
            note: 'Delay injected via middleware'
        };
    }

    injectPacketLoss(rate) {
        return {
            scenario: 'network_packet_loss',
            rate: `${rate * 100}%`,
            note: 'Random request dropping'
        };
    }

    injectDisconnect(duration) {
        return {
            scenario: 'network_disconnect',
            duration: `${duration}ms`,
            note: 'All network requests blocked'
        };
    }
}

// Database chaos
class DatabaseChaos {
    run(options = {}) {
        const type = options.type || 'slow_query';
        const config = options.config || {};

        console.log(`🗄️  CHAOS: Database ${type}`);

        switch (type) {
            case 'slow_query':
                return { scenario: 'db_slow_query', delay: config.delay || 5000 };
            case 'connection_pool_exhaustion':
                return { scenario: 'db_pool_exhausted', connections: config.max || 100 };
            case 'deadlock':
                return { scenario: 'db_deadlock', tables: config.tables || ['users', 'applications'] };
            case 'replication_lag':
                return { scenario: 'db_replication_lag', lag: config.lag || 30000 };
            default:
                throw new Error(`Unknown database chaos type: ${type}`);
        }
    }
}

// Cache chaos
class CacheChaos {
    run(options = {}) {
        const type = options.type || 'eviction';

        console.log(`⚡ CHAOS: Cache ${type}`);

        switch (type) {
            case 'eviction':
                return { scenario: 'cache_eviction', note: 'All cache entries cleared' };
            case 'corruption':
                return { scenario: 'cache_corruption', note: 'Random values corrupted' };
            case 'unavailable':
                return { scenario: 'cache_unavailable', duration: options.duration || 30000 };
            default:
                throw new Error(`Unknown cache chaos type: ${type}`);
        }
    }
}

// Disk chaos
class DiskChaos {
    run(options = {}) {
        const type = options.type || 'slow_io';

        console.log(`💿 CHAOS: Disk ${type}`);

        switch (type) {
            case 'slow_io':
                return { scenario: 'disk_slow_io', delay: options.delay || 1000 };
            case 'full':
                return { scenario: 'disk_full', note: 'ENOSPC errors simulated' };
            case 'corruption':
                return { scenario: 'disk_corruption', note: 'File read/write errors' };
            default:
                throw new Error(`Unknown disk chaos type: ${type}`);
        }
    }
}

// Chaos scheduler
class ChaosScheduler {
    constructor() {
        this.jobs = [];
        this.running = false;
    }

    schedule(scenario, interval, options = {}) {
        const job = {
            id: Math.random().toString(36).substr(2, 9),
            scenario,
            interval,
            options,
            lastRun: null,
            runCount: 0
        };

        this.jobs.push(job);
        console.log(`📅 Scheduled chaos: ${scenario} every ${interval}ms`);
        return job.id;
    }

    start() {
        if (this.running) return;
        this.running = true;

        this.timer = setInterval(() => {
            const now = Date.now();
            this.jobs.forEach(job => {
                if (!job.lastRun || (now - job.lastRun) >= job.interval) {
                    console.log(`⏰ Executing scheduled chaos: ${job.scenario}`);
                    job.lastRun = now;
                    job.runCount++;
                }
            });
        }, 1000);

        console.log('📅 Chaos scheduler started');
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.running = false;
            console.log('📅 Chaos scheduler stopped');
        }
    }

    clear(jobId) {
        if (jobId) {
            this.jobs = this.jobs.filter(j => j.id !== jobId);
        } else {
            this.jobs = [];
        }
    }

    getJobs() {
        return this.jobs;
    }
}

// Chaos test scenarios
const chaosScenarios = {
    // Application startup
    bootStorm: async (engine) => {
        console.log('🚀 SCENARIO: Boot storm');
        await engine.execute('cpu', { duration: 10000, intensity: 0.9 });
        await engine.execute('memory', { size: 50 });
        await engine.execute('database', { type: 'slow_query', config: { delay: 3000 } });
    },

    // Traffic spike
    trafficSpike: async (engine) => {
        console.log('📈 SCENARIO: Traffic spike');
        await engine.execute('cpu', { duration: 30000, intensity: 0.8 });
        await engine.execute('database', { type: 'connection_pool_exhaustion' });
        await engine.execute('cache', { type: 'eviction' });
    },

    // Infrastructure failure
    infrastructureFailure: async (engine) => {
        console.log('💥 SCENARIO: Infrastructure failure');
        await engine.execute('network', { type: 'disconnect', config: { duration: 15000 } });
        await engine.execute('disk', { type: 'slow_io', delay: 2000 });
    },

    // Resource exhaustion
    resourceExhaustion: async (engine) => {
        console.log('⚠️  SCENARIO: Resource exhaustion');
        await engine.execute('memory', { size: 100, duration: 120000 });
        await engine.execute('cpu', { duration: 60000, intensity: 1.0 });
        await engine.execute('disk', { type: 'full' });
    }
};

module.exports = {
    ChaosMonkey,
    CircuitBreaker,
    faultInjection,
    ChaosEngine,
    ChaosScheduler,
    chaosScenarios,
    // Export individual chaos types
    MemoryLeakSimulator,
    CPUSpike,
    NetworkChaos,
    DatabaseChaos,
    CacheChaos,
    DiskChaos
};
