require('dotenv').config();
const nodemailer = require('nodemailer');
const { createTransport } = nodemailer;
const { getEmailTemplate } = require('./email-templates');

/**
 * 100% Self-Hosted Email Service
 * No external dependencies - uses your own domain SMTP
 * Works with any email provider (Gmail, Outlook, custom domain)
 */
// Maximum number of messages held in the retry queue.
// If SMTP is down for an extended period, messages beyond this cap are dropped
// and logged rather than accumulating in memory indefinitely.
const MAX_QUEUE_SIZE = 100;

class EmailService {
  constructor() {
    this.emailQueue = [];
    this.isProcessing = false;

    // Fail fast if SMTP credentials are missing so misconfiguration is caught
    // at startup rather than silently at send time.
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error(
        'EmailService requires SMTP_USER and SMTP_PASS environment variables. ' +
        'Set them in your .env file before instantiating EmailService.'
      );
    }

    // Self-hosted SMTP configuration
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false, // Use TLS
      auth: {
        user: process.env.SMTP_USER || process.env.FROM_EMAIL,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD
      },
      // Connection pool for better performance
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      // Retry failed connections
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      // Authentication headers for deliverability
      tls: {
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2'
      }
    };
    
    // Default email headers for spam prevention
    this.defaultHeaders = {
      'X-Mailer': '100K Pathway System',
      'X-Priority': '3',
      'X-MSMail-Priority': 'Normal',
      'Importance': 'Normal',
      'List-Unsubscribe': `<mailto:unsubscribe@100k-pathway.com>`,
      'Precedence': 'bulk'
    };
    
    this.transporter = createTransport(smtpConfig);
    console.log('Email service: Self-hosted SMTP configured');
    console.log(`Using: ${smtpConfig.host}:${smtpConfig.port}`);
  }

  /**
   * Send email with retry logic
   */
  async sendEmail(mailOptions) {
    try {
      // Merge default headers with custom ones
      const enhancedOptions = {
        ...mailOptions,
        headers: {
          ...this.defaultHeaders,
          ...mailOptions.headers
        },
        // Add proper sender formatting
        from: mailOptions.from || {
          name: '100K Pathway',
          address: process.env.FROM_EMAIL || 'noreply@100k-pathway.com'
        },
        // Add reply-to if not specified
        replyTo: mailOptions.replyTo || process.env.FROM_EMAIL || 'hello@100k-pathway.com',
        // Text version for better deliverability
        text: mailOptions.text || this.htmlToText(mailOptions.html)
      };
      
      const result = await this.transporter.sendMail(enhancedOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email send failed:', error);
      // Add to retry queue, but cap size to prevent unbounded memory growth
      // when SMTP is down for an extended period.
      if (this.emailQueue.length < MAX_QUEUE_SIZE) {
        this.emailQueue.push({ mailOptions, retries: 0, maxRetries: 3 });
        this.processQueue();
      } else {
        console.error(`[EMAIL] Retry queue full (${MAX_QUEUE_SIZE}). Dropping message to: ${mailOptions.to}`);
      }
      throw error;
    }
  }
  
  /**
   * Convert HTML to plain text for email clients that don't support HTML
   */
  htmlToText(html) {
    if (!html) return '';
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Process email queue with retry logic
   */
  async processQueue() {
    if (this.isProcessing || this.emailQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.emailQueue.length > 0) {
      const item = this.emailQueue.shift();
      
      try {
        await this.sendEmail(item.mailOptions);
        console.log('✅ Queued email sent successfully');
      } catch (error) {
        item.retries++;
        if (item.retries < item.maxRetries) {
          // Re-queue with exponential backoff
          setTimeout(() => {
            this.emailQueue.push(item);
          }, Math.pow(2, item.retries) * 1000);
          console.log(`⏳ Email retry ${item.retries}/${item.maxRetries}`);
        } else {
          console.error('❌ Email failed after max retries:', error);
        }
      }
    }
    
    this.isProcessing = false;
  }

  /**
   * Send contact form notification to team
   */
  async sendContactFormNotification(formData) {
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@100k-pathway.com',
      to: process.env.TEAM_EMAIL || 'team@100k-pathway.com',
      subject: `New Application from ${formData.fullName}`,
      html: getEmailTemplate('contact_form', {
        ...formData,
        timestamp: Date.now()
      })
    };

    return await this.sendEmail(mailOptions);
  }

  /**
   * Send confirmation email to applicant
   */
  async sendApplicantConfirmation(formData) {
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@100k-pathway.com',
      to: formData.email,
      subject: 'Application Received - 100K Pathway',
      html: getEmailTemplate('applicant_confirmation', {
        ...formData,
        timestamp: Date.now()
      })
    };

    return await this.sendEmail(mailOptions);
  }

  /**
   * Send welcome email after payment
   */
  async sendPaymentWelcome(formData) {
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@100k-pathway.com',
      to: formData.email,
      subject: 'Welcome to 100K Pathway!',
      html: getEmailTemplate('payment_welcome', {
        ...formData,
        timestamp: Date.now()
      })
    };

    return await this.sendEmail(mailOptions);
  }

  /**
   * Test email connectivity
   */
  async testConnection() {
    try {
      await this.transporter.verify();
      return { 
        success: true, 
        message: 'Self-hosted email is ready',
        host: process.env.SMTP_HOST || 'smtp.gmail.com'
      };
    } catch (error) {
      return { 
        success: false, 
        message: 'Email service failed - check SMTP credentials', 
        error: error.message
      };
    }
  }
}

module.exports = EmailService;