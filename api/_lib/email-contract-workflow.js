// ==================== EMAIL & CONTRACT WORKFLOW ====================
// Handles post-payment email confirmations and contract signing

const { createClient } = require('@supabase/supabase-js');
const sgMail = require('@sendgrid/mail');
const crypto = require('crypto');

class EmailContractWorkflow {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_KEY
        );
        
        if (process.env.SENDGRID_API_KEY) {
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        }
    }
    
    // Step 1: Send payment received email with contract offer
    async sendPaymentReceivedEmail(userId, planType, transactionId) {
        try {
            // Get user details
            const { data: user } = await this.supabase
                .from('users')
                .select('email, full_name')
                .eq('id', userId)
                .single();
            
            if (!user) {
                throw new Error('User not found');
            }
            
            // Generate confirmation token
            const confirmationToken = crypto.randomBytes(32).toString('hex');
            const confirmationUrl = `${process.env.APP_URL || 'https://100k-pathway.com'}/confirm-contract?token=${confirmationToken}`;
            
            // Store email confirmation
            await this.supabase.from('email_confirmations').insert({
                user_id: userId,
                email_type: 'payment_received',
                confirmation_required: true,
                confirmation_token: confirmationToken,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                metadata: {
                    plan_type: planType,
                    transaction_id: transactionId
                }
            });
            
            // Email content
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #0070f3;">Payment Received - Welcome to 100K Pathway!</h1>
                    
                    <p>Hi ${user.full_name},</p>
                    
                    <p>Great news! Your payment for the <strong>${this.getPlanName(planType)}</strong> plan has been confirmed.</p>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h2 style="margin-top: 0;">Next Steps:</h2>
                        <ol>
                            <li><strong>Confirm Your Participation</strong> - Click the button below to proceed</li>
                            <li><strong>Review & Sign Agreement</strong> - We'll send your service agreement</li>
                            <li><strong>Schedule Kickoff Call</strong> - Meet your mentor and get started</li>
                        </ol>
                    </div>
                    
                    <p>Before we begin, we need your confirmation that you're ready to start the program:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${confirmationUrl}" 
                           style="background: #0070f3; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                            Yes, I Want Your Services
                        </a>
                    </div>
                    
                    <p style="font-size: 14px; color: #666;">
                        This link expires in 7 days. If you don't confirm, your enrollment will be placed on hold.
                    </p>
                    
                    <p>Questions? Reply to this email or call us at (555) 100-PATH</p>
                    
                    <p>Best regards,<br>
                    The 100K Pathway Team</p>
                </div>
            `;
            
            // Send email
            if (process.env.SENDGRID_API_KEY) {
                await sgMail.send({
                    to: user.email,
                    from: process.env.FROM_EMAIL || 'hello@100k-pathway.com',
                    subject: 'Payment Received - Confirm Your Enrollment',
                    html: emailHtml
                });
            }
            
            console.log(`Payment received email sent to user ${userId}`);
            return { success: true, confirmationToken };
            
        } catch (error) {
            console.error('Error sending payment email:', error);
            throw error;
        }
    }
    
    // Step 2: Handle confirmation click
    async handleConfirmation(confirmationToken, ipAddress) {
        try {
            // Verify token
            const { data: confirmation } = await this.supabase
                .from('email_confirmations')
                .select('*')
                .eq('confirmation_token', confirmationToken)
                .single();
            
            if (!confirmation) {
                return { success: false, error: 'Invalid confirmation token' };
            }
            
            if (confirmation.confirmed_date) {
                return { success: false, error: 'Already confirmed' };
            }
            
            if (new Date() > new Date(confirmation.expires_at)) {
                return { success: false, error: 'Confirmation link expired' };
            }
            
            // Mark as confirmed
            await this.supabase
                .from('email_confirmations')
                .update({
                    confirmed_date: new Date(),
                    confirmation_ip: ipAddress
                })
                .eq('id', confirmation.id);
            
            // Send agreement
            await this.sendAgreement(confirmation.user_id, confirmation.metadata);
            
            return { success: true, userId: confirmation.user_id };
            
        } catch (error) {
            console.error('Error handling confirmation:', error);
            throw error;
        }
    }
    
    // Step 3: Send service agreement for signature
    async sendAgreement(userId, metadata) {
        try {
            const { data: user } = await this.supabase
                .from('users')
                .select('email, full_name')
                .eq('id', userId)
                .single();
            
            const planType = metadata.plan_type;
            const feePercentage = this.getFeePercentage(planType);
            
            // Create agreement record
            const { data: agreement } = await this.supabase
                .from('success_fee_agreements')
                .insert({
                    user_id: userId,
                    plan_type: planType,
                    fee_percentage: feePercentage,
                    agreement_sent_date: new Date(),
                    agreement_status: 'sent'
                })
                .select()
                .single();
            
            // Generate signature URL
            const signatureToken = crypto.randomBytes(32).toString('hex');
            const signatureUrl = `${process.env.APP_URL || 'https://100k-pathway.com'}/sign-agreement?token=${signatureToken}&agreement_id=${agreement.id}`;
            
            // Store signature token in metadata
            await this.supabase
                .from('success_fee_agreements')
                .update({
                    agreement_pdf_url: signatureUrl // Temporary, will be replaced with actual PDF
                })
                .eq('id', agreement.id);
            
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #0070f3;">Service Agreement - Ready to Sign</h1>
                    
                    <p>Hi ${user.full_name},</p>
                    
                    <p>Thank you for confirming! Your service agreement is ready for review and signature.</p>
                    
                    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                        <strong>Agreement Summary:</strong>
                        <ul>
                            <li>Plan: ${this.getPlanName(planType)}</li>
                            <li>Success Fee: ${feePercentage * 100}% of first-year base salary (only if you accept $100K+ offer)</li>
                            <li>Interview Guarantee: 5+ qualifying interviews in 100 days</li>
                            <li>Refund Policy: Pro-rata refunds available (see full terms)</li>
                        </ul>
                    </div>
                    
                    <p><strong>What You're Agreeing To:</strong></p>
                    <ul>
                        <li>Complete program participation (90%+ attendance required)</li>
                        <li>Submit all portfolio projects on time</li>
                        <li>Apply to minimum 50 jobs through our system</li>
                        <li>Accept and attend all interview opportunities provided</li>
                        <li>Pay success fee within 30 days of accepting $100K+ offer</li>
                    </ul>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${signatureUrl}" 
                           style="background: #10b981; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                            Review & Sign Agreement
                        </a>
                    </div>
                    
                    <p style="font-size: 14px; color: #666;">
                        Please review the full terms carefully. Your electronic signature is legally binding.
                    </p>
                    
                    <p>Questions? Contact us before signing.</p>
                    
                    <p>Best regards,<br>
                    The 100K Pathway Team</p>
                </div>
            `;
            
            if (process.env.SENDGRID_API_KEY) {
                await sgMail.send({
                    to: user.email,
                    from: process.env.FROM_EMAIL || 'hello@100k-pathway.com',
                    subject: 'Service Agreement - Please Review & Sign',
                    html: emailHtml
                });
            }
            
            console.log(`Agreement sent to user ${userId}`);
            return { success: true, agreementId: agreement.id };
            
        } catch (error) {
            console.error('Error sending agreement:', error);
            throw error;
        }
    }
    
    // Step 4: Record agreement signature
    async recordSignature(agreementId, ipAddress) {
        try {
            await this.supabase
                .from('success_fee_agreements')
                .update({
                    agreement_signed_date: new Date(),
                    agreement_status: 'signed',
                    signature_ip: ipAddress
                })
                .eq('id', agreementId);
            
            // Get user and send welcome email
            const { data: agreement } = await this.supabase
                .from('success_fee_agreements')
                .select('user_id, plan_type')
                .eq('id', agreementId)
                .single();
            
            await this.sendWelcomeEmail(agreement.user_id, agreement.plan_type);
            
            return { success: true };
            
        } catch (error) {
            console.error('Error recording signature:', error);
            throw error;
        }
    }
    
    // Helper: Send welcome email after signature
    async sendWelcomeEmail(userId, planType) {
        const { data: user } = await this.supabase
            .from('users')
            .select('email, full_name')
            .eq('id', userId)
            .single();
        
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #10b981;">🎉 Welcome to 100K Pathway!</h1>
                
                <p>Hi ${user.full_name},</p>
                
                <p>Your agreement is signed and you're officially enrolled! Here's what happens next:</p>
                
                <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="margin-top: 0;">Next 48 Hours:</h2>
                    <ol>
                        <li>Mentor assignment (you'll receive an intro email)</li>
                        <li>Platform access credentials</li>
                        <li>Kickoff call scheduling link</li>
                        <li>Week 1 roadmap and first project brief</li>
                    </ol>
                </div>
                
                <p><strong>Important:</strong> Check your email for separate messages containing your login credentials and mentor introduction.</p>
                
                <p>Your 100-day journey starts now. Let's get you to $100K+!</p>
                
                <p>Best regards,<br>
                The 100K Pathway Team</p>
            </div>
        `;
        
        if (process.env.SENDGRID_API_KEY) {
            await sgMail.send({
                to: user.email,
                from: process.env.FROM_EMAIL || 'hello@100k-pathway.com',
                subject: '🎉 Welcome to 100K Pathway - You\'re In!',
                html: emailHtml
            });
        }
    }
    
    // Helper methods
    getPlanName(planType) {
        const names = {
            'accelerator': 'Accelerator',
            'professional': 'Professional',
            'elite': 'Elite'
        };
        return names[planType] || planType;
    }
    
    getFeePercentage(planType) {
        const fees = {
            'accelerator': 0.15,
            'professional': 0.12,
            'elite': 0.10
        };
        return fees[planType] || 0.15;
    }
}

module.exports = { EmailContractWorkflow };
