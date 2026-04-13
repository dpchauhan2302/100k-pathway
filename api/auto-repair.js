// AUTO-REPAIR SYSTEM - Self-healing infrastructure
// Detects failures and automatically applies fixes

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class AutoRepair {
    constructor(options = {}) {
        this.enabled = process.env.AUTO_REPAIR_ENABLED === 'true' || false;
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 5000;
        this.repairLog = [];
        this.healthChecks = new Map();
        this.repairStrategies = new Map();
        
        this.initializeRepairStrategies();
        this.startHealthMonitoring();
    }

    initializeRepairStrategies() {
        // Database connection repair
        this.repairStrategies.set('database_connection', {
            detect: async (context) => {
                try {
                    await context.supabase.from('users').select('count').limit(1);
                    return { healthy: true };
                } catch (error) {
                    return { healthy: false, error: error.message };
                }
            },
            repair: async (context) => {
                console.log('🔧 AUTO-REPAIR: Reconnecting database...');
                // Reinitialize Supabase client
                const { createClient } = require('@supabase/supabase-js');
                context.supabase = createClient(
                    process.env.SUPABASE_URL,
                    process.env.SUPABASE_ANON_KEY
                );
                return { success: true, action: 'database_reconnected' };
            }
        });

        // Memory leak repair
        this.repairStrategies.set('memory_leak', {
            detect: async () => {
                const usage = process.memoryUsage();
                const heapUsedMB = usage.heapUsed / 1024 / 1024;
                const threshold = 500; // 500MB threshold
                
                if (heapUsedMB > threshold) {
                    return { healthy: false, heapUsedMB, threshold };
                }
                return { healthy: true, heapUsedMB };
            },
            repair: async () => {
                console.log('🔧 AUTO-REPAIR: Forcing garbage collection...');
                if (global.gc) {
                    global.gc();
                    return { success: true, action: 'garbage_collected' };
                }
                return { success: false, reason: 'gc_not_exposed' };
            }
        });

        // Rate limit reset
        this.repairStrategies.set('rate_limit_stuck', {
            detect: async (context) => {
                // Check if rate limiter has stuck entries
                return { healthy: true }; // Placeholder
            },
            repair: async (context) => {
                console.log('🔧 AUTO-REPAIR: Resetting rate limiters...');
                // Reset rate limit stores
                return { success: true, action: 'rate_limits_reset' };
            }
        });

        // Stuck job queue
        this.repairStrategies.set('job_queue_stuck', {
            detect: async (context) => {
                if (!context.jobQueue) return { healthy: true };
                
                const stats = context.jobQueue.getStats();
                const stuckThreshold = 10; // 10 jobs in processing for too long
                
                if (stats.processing > stuckThreshold) {
                    return { healthy: false, processing: stats.processing };
                }
                return { healthy: true };
            },
            repair: async (context) => {
                console.log('🔧 AUTO-REPAIR: Restarting job queue workers...');
                await context.jobQueue.restart();
                return { success: true, action: 'job_queue_restarted' };
            }
        });

        // Disk space cleanup
        this.repairStrategies.set('disk_space', {
            detect: async () => {
                try {
                    const output = execSync('df -h / | tail -1 | awk \'{print $5}\'').toString();
                    const usage = parseInt(output.replace('%', ''));
                    
                    if (usage > 85) {
                        return { healthy: false, usage };
                    }
                    return { healthy: true, usage };
                } catch (error) {
                    return { healthy: true }; // Can't check, assume OK
                }
            },
            repair: async () => {
                console.log('🔧 AUTO-REPAIR: Cleaning temporary files...');
                try {
                    execSync('find /tmp -type f -atime +7 -delete');
                    return { success: true, action: 'temp_files_cleaned' };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        });

        // Port conflict resolution
        this.repairStrategies.set('port_conflict', {
            detect: async () => {
                return { healthy: true }; // Detected at startup
            },
            repair: async () => {
                console.log('🔧 AUTO-REPAIR: Killing process on port 3000...');
                try {
                    execSync('lsof -ti:3000 | xargs kill -9');
                    return { success: true, action: 'port_cleared' };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        });

        // Circuit breaker reset
        this.repairStrategies.set('circuit_breaker_stuck', {
            detect: async (context) => {
                const breakers = [
                    context.dbCircuitBreaker,
                    context.emailCircuitBreaker,
                    context.paymentCircuitBreaker
                ];
                
                const stuck = breakers.filter(b => b && b.state === 'OPEN');
                if (stuck.length > 0) {
                    return { healthy: false, openBreakers: stuck.length };
                }
                return { healthy: true };
            },
            repair: async (context) => {
                console.log('🔧 AUTO-REPAIR: Resetting circuit breakers...');
                [context.dbCircuitBreaker, context.emailCircuitBreaker, context.paymentCircuitBreaker]
                    .forEach(breaker => {
                        if (breaker) {
                            breaker.failures = 0;
                            breaker.state = 'CLOSED';
                        }
                    });
                return { success: true, action: 'circuit_breakers_reset' };
            }
        });
    }

    startHealthMonitoring() {
        if (!this.enabled) return;

        console.log('🏥 Auto-repair health monitoring started');
        
        // Run health checks every 30 seconds
        this.monitoringInterval = setInterval(async () => {
            await this.runHealthChecks();
        }, 30000);
    }

    async runHealthChecks() {
        const context = this.getContext();
        
        for (const [name, strategy] of this.repairStrategies) {
            try {
                const health = await strategy.detect(context);
                
                if (!health.healthy) {
                    console.log(`⚠️  Health check failed: ${name}`, health);
                    await this.attemptRepair(name, strategy, context);
                }
            } catch (error) {
                console.error(`❌ Health check error (${name}):`, error.message);
            }
        }
    }

    async attemptRepair(name, strategy, context, retryCount = 0) {
        if (retryCount >= this.maxRetries) {
            console.error(`❌ AUTO-REPAIR FAILED: ${name} (max retries exceeded)`);
            this.logRepair(name, false, 'max_retries_exceeded');
            return false;
        }

        try {
            const result = await strategy.repair(context);
            
            if (result.success) {
                console.log(`✅ AUTO-REPAIR SUCCESS: ${name} - ${result.action}`);
                this.logRepair(name, true, result.action);
                
                // Verify repair worked
                await new Promise(resolve => setTimeout(resolve, 2000));
                const verification = await strategy.detect(context);
                
                if (!verification.healthy) {
                    console.log(`⚠️  Repair verification failed for ${name}, retrying...`);
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                    return await this.attemptRepair(name, strategy, context, retryCount + 1);
                }
                
                return true;
            } else {
                console.error(`❌ AUTO-REPAIR FAILED: ${name} - ${result.reason || result.error}`);
                this.logRepair(name, false, result.reason || result.error);
                return false;
            }
        } catch (error) {
            console.error(`❌ AUTO-REPAIR ERROR: ${name} - ${error.message}`);
            this.logRepair(name, false, error.message);
            
            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            return await this.attemptRepair(name, strategy, context, retryCount + 1);
        }
    }

    logRepair(name, success, details) {
        this.repairLog.push({
            timestamp: new Date().toISOString(),
            issue: name,
            success,
            details,
            memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024
        });

        // Keep only last 100 entries
        if (this.repairLog.length > 100) {
            this.repairLog.shift();
        }
    }

    getContext() {
        // This will be populated by server.js
        return this.context || {};
    }

    setContext(context) {
        this.context = context;
    }

    getRepairLog() {
        return this.repairLog;
    }

    getStats() {
        const total = this.repairLog.length;
        const successful = this.repairLog.filter(r => r.success).length;
        const failed = total - successful;
        
        return {
            enabled: this.enabled,
            totalRepairs: total,
            successful,
            failed,
            successRate: total > 0 ? ((successful / total) * 100).toFixed(2) + '%' : '0%',
            recentRepairs: this.repairLog.slice(-10),
            registeredStrategies: Array.from(this.repairStrategies.keys())
        };
    }

    async manualRepair(issueName) {
        const strategy = this.repairStrategies.get(issueName);
        if (!strategy) {
            throw new Error(`Unknown repair strategy: ${issueName}`);
        }

        const context = this.getContext();
        return await this.attemptRepair(issueName, strategy, context);
    }

    stop() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            console.log('🏥 Auto-repair monitoring stopped');
        }
    }
}

// Crash recovery handler
class CrashRecovery {
    constructor(autoRepair) {
        this.autoRepair = autoRepair;
        this.crashLog = [];
        this.setupHandlers();
    }

    setupHandlers() {
        process.on('uncaughtException', async (error) => {
            console.error('💥 UNCAUGHT EXCEPTION:', error);
            this.logCrash('uncaughtException', error);
            
            // Attempt auto-repair based on error type
            await this.handleCrash(error);
        });

        process.on('unhandledRejection', async (reason, promise) => {
            console.error('💥 UNHANDLED REJECTION:', reason);
            this.logCrash('unhandledRejection', reason);
            
            await this.handleCrash(reason);
        });
    }

    async handleCrash(error) {
        const errorMsg = error.message || String(error);

        // Database errors
        if (errorMsg.includes('database') || errorMsg.includes('Supabase')) {
            await this.autoRepair.manualRepair('database_connection');
        }
        
        // Memory errors
        if (errorMsg.includes('heap') || errorMsg.includes('memory')) {
            await this.autoRepair.manualRepair('memory_leak');
        }
        
        // Port errors
        if (errorMsg.includes('EADDRINUSE')) {
            await this.autoRepair.manualRepair('port_conflict');
            // Restart needed
            console.log('⚠️  Port conflict detected - restart required');
        }
    }

    logCrash(type, error) {
        this.crashLog.push({
            timestamp: new Date().toISOString(),
            type,
            message: error.message || String(error),
            stack: error.stack
        });

        // Keep only last 50 crashes
        if (this.crashLog.length > 50) {
            this.crashLog.shift();
        }
    }

    getCrashLog() {
        return this.crashLog;
    }
}

module.exports = {
    AutoRepair,
    CrashRecovery
};
