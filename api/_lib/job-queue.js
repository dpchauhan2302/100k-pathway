// ==================== ASYNC JOB QUEUE SYSTEM ====================
// Handles background jobs with retries, dead-letter queue, and observability

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// Job states
const JOB_STATES = {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    DEAD_LETTER: 'DEAD_LETTER',
    CANCELLED: 'CANCELLED'
};

class JobQueue {
    constructor(options = {}) {
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 5000;
        this.pollInterval = options.pollInterval || 1000;
        this.workers = options.workers || 2;
        this.isRunning = false;
        this.handlers = new Map();
    }
    
    // Register job handler
    registerHandler(jobType, handler) {
        if (typeof handler !== 'function') {
            throw new Error('Handler must be a function');
        }
        this.handlers.set(jobType, handler);
    }
    
    // Enqueue new job (idempotent)
    async enqueue(jobType, payload, options = {}) {
        const jobId = options.jobId || crypto.randomUUID();
        const priority = options.priority || 0;
        const scheduledFor = options.scheduledFor || new Date();
        
        try {
            const { data, error } = await supabase
                .from('job_queue')
                .upsert([{
                    id: jobId,
                    job_type: jobType,
                    payload: payload,
                    status: JOB_STATES.PENDING,
                    priority: priority,
                    max_retries: this.maxRetries,
                    retry_count: 0,
                    scheduled_for: scheduledFor,
                    created_at: new Date()
                }], { 
                    onConflict: 'id',
                    ignoreDuplicates: true 
                })
                .select()
                .single();
            
            if (error && error.code !== '23505') { // Ignore duplicate key
                throw error;
            }
            
            return { jobId, status: 'QUEUED' };
        } catch (error) {
            console.error('Failed to enqueue job:', error);
            throw new AppError('Failed to enqueue job', 500, 'JOB_ENQUEUE_FAILED');
        }
    }
    
    // Start job processing workers
    async start() {
        if (this.isRunning) {
            console.warn('Job queue already running');
            return;
        }
        
        this.isRunning = true;
        console.log(`Starting ${this.workers} job queue workers...`);
        
        for (let i = 0; i < this.workers; i++) {
            this.processJobs(i);
        }
    }
    
    // Stop all workers
    async stop() {
        console.log('Stopping job queue...');
        this.isRunning = false;
    }
    
    // Main processing loop
    async processJobs(workerId) {
        while (this.isRunning) {
            try {
                const job = await this.claimNextJob();
                
                if (job) {
                    await this.executeJob(job, workerId);
                } else {
                    // No jobs available, wait before polling again
                    await this.sleep(this.pollInterval);
                }
            } catch (error) {
                console.error(`Worker ${workerId} error:`, error);
                await this.sleep(this.pollInterval);
            }
        }
    }
    
    // Claim next available job atomically
    async claimNextJob() {
        try {
            const { data: jobs, error } = await supabase
                .from('job_queue')
                .select('*')
                .eq('status', JOB_STATES.PENDING)
                .lte('scheduled_for', new Date().toISOString())
                .order('priority', { ascending: false })
                .order('created_at', { ascending: true })
                .limit(1);
            
            if (error || !jobs || jobs.length === 0) {
                return null;
            }
            
            const job = jobs[0];
            
            // Atomically claim the job
            const { data: claimed, error: updateError } = await supabase
                .from('job_queue')
                .update({ 
                    status: JOB_STATES.PROCESSING,
                    started_at: new Date()
                })
                .eq('id', job.id)
                .eq('status', JOB_STATES.PENDING) // Ensure it's still pending
                .select()
                .single();
            
            if (updateError || !claimed) {
                // Another worker claimed it
                return null;
            }
            
            return claimed;
        } catch (error) {
            console.error('Failed to claim job:', error);
            return null;
        }
    }
    
    // Execute individual job
    async executeJob(job, workerId) {
        const handler = this.handlers.get(job.job_type);
        
        if (!handler) {
            console.error(`No handler registered for job type: ${job.job_type}`);
            await this.moveToDeadLetter(job, 'NO_HANDLER');
            return;
        }
        
        console.log(`Worker ${workerId} executing job ${job.id} (${job.job_type})`);
        
        try {
            const result = await handler(job.payload, job);
            
            // Mark as completed
            await supabase
                .from('job_queue')
                .update({
                    status: JOB_STATES.COMPLETED,
                    completed_at: new Date(),
                    result: result
                })
                .eq('id', job.id);
            
            console.log(`Job ${job.id} completed successfully`);
        } catch (error) {
            console.error(`Job ${job.id} failed:`, error);
            await this.handleJobFailure(job, error);
        }
    }
    
    // Handle job failure with retry logic
    async handleJobFailure(job, error) {
        const newRetryCount = (job.retry_count || 0) + 1;
        
        if (newRetryCount >= job.max_retries) {
            // Move to dead letter queue
            await this.moveToDeadLetter(job, error.message);
        } else {
            // Schedule retry with exponential backoff
            const retryDelay = this.retryDelay * Math.pow(2, newRetryCount);
            const scheduledFor = new Date(Date.now() + retryDelay);
            
            await supabase
                .from('job_queue')
                .update({
                    status: JOB_STATES.PENDING,
                    retry_count: newRetryCount,
                    scheduled_for: scheduledFor,
                    last_error: error.message,
                    last_error_at: new Date()
                })
                .eq('id', job.id);
            
            console.log(`Job ${job.id} scheduled for retry ${newRetryCount}/${job.max_retries} at ${scheduledFor}`);
        }
    }
    
    // Move job to dead letter queue
    async moveToDeadLetter(job, reason) {
        await supabase
            .from('job_queue')
            .update({
                status: JOB_STATES.DEAD_LETTER,
                failed_at: new Date(),
                last_error: reason
            })
            .eq('id', job.id);
        
        // Also insert into dead letter table for investigation
        await supabase
            .from('dead_letter_queue')
            .insert([{
                original_job_id: job.id,
                job_type: job.job_type,
                payload: job.payload,
                reason: reason,
                retry_count: job.retry_count,
                created_at: new Date()
            }]);
        
        console.error(`Job ${job.id} moved to dead letter queue: ${reason}`);
    }
    
    // Utility: sleep
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Get queue statistics
    async getStats() {
        const { data: stats } = await supabase
            .from('job_queue')
            .select('status')
            .then(({ data }) => {
                const counts = {};
                data?.forEach(job => {
                    counts[job.status] = (counts[job.status] || 0) + 1;
                });
                return { data: counts };
            });
        
        return stats || {};
    }
}

// Global job queue instance
const jobQueue = new JobQueue({
    maxRetries: 3,
    retryDelay: 5000,
    pollInterval: 1000,
    workers: 2
});

// ==================== JOB HANDLERS ====================

// Email sending job
jobQueue.registerHandler('SEND_EMAIL', async (payload) => {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    await sgMail.send({
        to: payload.to,
        from: payload.from || process.env.EMAIL_FROM,
        subject: payload.subject,
        html: payload.html
    });
    
    return { sent: true, to: payload.to };
});

// Application processing job
jobQueue.registerHandler('PROCESS_APPLICATION', async (payload) => {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY
    );
    
    // Fetch application details
    const { data: application } = await supabase
        .from('applications')
        .select('*')
        .eq('id', payload.applicationId)
        .single();
    
    if (!application) {
        throw new Error('Application not found');
    }
    
    // Auto-update status to UNDER_REVIEW
    await supabase
        .from('applications')
        .update({ status: 'UNDER_REVIEW' })
        .eq('id', payload.applicationId);
    
    // Send notification to admin
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    await sgMail.send({
        to: process.env.ADMIN_EMAIL || 'admin@100k-pathway.com',
        from: process.env.EMAIL_FROM || 'noreply@100k-pathway.com',
        subject: `New Application: ${application.full_name}`,
        html: `
            <h2>New Application Submitted</h2>
            <p><strong>Name:</strong> ${application.full_name}</p>
            <p><strong>Email:</strong> ${application.email}</p>
            <p><strong>Experience Level:</strong> ${application.experience_level}</p>
            <p><strong>Target Role:</strong> ${application.target_role}</p>
            <p><a href="${process.env.APP_URL}/admin/applications/${application.id}">Review Application</a></p>
        `
    });
    
    return { processed: true, applicationId: payload.applicationId, status: 'UNDER_REVIEW' };
});

// Payment processing job
jobQueue.registerHandler('PROCESS_PAYMENT', async (payload) => {
    // Handle payment processing
    // - Create Stripe payment intent
    // - Update transaction status
    // - Send confirmation email
    
    return { processed: true, paymentId: payload.paymentId };
});

// Refund processing job
jobQueue.registerHandler('PROCESS_REFUND', async (payload) => {
    const { createClient } = require('@supabase/supabase-js');
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY
    );
    
    // Get refund and user details
    const { data: refund } = await supabase
        .from('refunds')
        .select(`
            *,
            users (email, full_name)
        `)
        .eq('id', payload.refundId)
        .single();
    
    if (!refund) {
        throw new Error('Refund request not found');
    }
    
    // Send notification to admin for manual review
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    await sgMail.send({
        to: process.env.ADMIN_EMAIL || 'admin@100k-pathway.com',
        from: process.env.EMAIL_FROM || 'noreply@100k-pathway.com',
        subject: `Refund Request: ${refund.users.full_name}`,
        html: `
            <h2>New Refund Request</h2>
            <p><strong>User:</strong> ${refund.users.full_name} (${refund.users.email})</p>
            <p><strong>Reason:</strong> ${refund.reason}</p>
            <p><strong>Requested:</strong> ${new Date(refund.requested_at).toLocaleDateString()}</p>
            <p><a href="${process.env.APP_URL}/admin/refunds/${refund.id}">Review Refund Request</a></p>
        `
    });
    
    // Send acknowledgment to user
    await sgMail.send({
        to: refund.users.email,
        from: process.env.EMAIL_FROM || 'noreply@100k-pathway.com',
        subject: 'Refund Request Received - 100K Pathway',
        html: `
            <h2>Refund Request Received</h2>
            <p>Hi ${refund.users.full_name},</p>
            <p>We've received your refund request and are reviewing it. You'll hear from us within 3-5 business days.</p>
            <p>Refund ID: ${refund.id}</p>
        `
    });
    
    return { refunded: true, refundId: payload.refundId, status: 'PENDING_REVIEW' };
});

module.exports = { jobQueue, JOB_STATES };
