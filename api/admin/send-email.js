const nodemailer = require('nodemailer');

// Email templates inline for serverless
const getEmailTemplate = (type, data) => {
  const { fullName, email, plan, experience, timestamp } = data;
  
  const baseStyles = `
    <style>
      body { font-family: 'Inter', -apple-system, sans-serif; background: #0B1120; color: #D1D5DB; line-height: 1.7; margin: 0; padding: 0; }
      .email-container { max-width: 600px; margin: 0 auto; background: #0B1120; }
      .email-header { padding: 40px 30px 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08); }
      .email-logo { font-size: 28px; font-weight: 700; color: #F9FAFB; }
      .email-logo-accent { color: #00B894; margin-left: 4px; font-weight: 800; }
      .email-body { padding: 40px 30px; background: #111827; border-radius: 12px; margin: 20px; border: 1px solid rgba(255,255,255,0.08); }
      .email-title { font-size: 32px; font-weight: 700; color: #FFFFFF; margin-bottom: 16px; text-align: center; }
      .email-subtitle { font-size: 16px; color: #9CA3AF; text-align: center; margin-bottom: 32px; }
      .email-content { font-size: 16px; color: #D1D5DB; }
      .email-highlight { color: #00B894; font-weight: 600; }
      .email-button { display: inline-block; padding: 16px 32px; background: #00B894; color: #0B1120 !important; text-decoration: none; border-radius: 8px; font-weight: 600; }
      .email-footer { padding: 30px; text-align: center; color: #9CA3AF; font-size: 14px; }
      .email-details { margin: 20px 0; padding: 16px; background: rgba(0,184,148,0.08); border-radius: 8px; }
      .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
      .detail-label { color: #9CA3AF; }
      .detail-value { color: #F9FAFB; font-weight: 600; }
    </style>
  `;

  const templates = {
    applicant_confirmation: `<!DOCTYPE html><html><head><meta charset="utf-8">${baseStyles}</head><body>
      <div class="email-container">
        <div class="email-header"><div class="email-logo">100K<span class="email-logo-accent">Pathway</span></div></div>
        <div class="email-body">
          <h1 class="email-title">We Got Your Application</h1>
          <p class="email-subtitle">You're one step closer to $100K+</p>
          <div class="email-content">
            <p>Hey ${fullName ? fullName.split(' ')[0] : 'there'},</p>
            <p>Thanks for applying. We'll review your details and reach out within <span class="email-highlight">24 hours</span>.</p>
            <div class="email-details">
              <div class="detail-row"><span class="detail-label">Plan:</span><span class="detail-value">${plan || 'Standard'}</span></div>
              <div class="detail-row"><span class="detail-label">Experience:</span><span class="detail-value">${experience || 'N/A'}</span></div>
            </div>
            <div style="text-align:center;margin:32px 0;"><a href="https://100k-pathway.com/how-it-works" class="email-button">See How It Works</a></div>
          </div>
        </div>
        <div class="email-footer">&copy; 2025 100K Pathway</div>
      </div>
    </body></html>`,

    payment_welcome: `<!DOCTYPE html><html><head><meta charset="utf-8">${baseStyles}</head><body>
      <div class="email-container">
        <div style="height:6px;background:linear-gradient(90deg,#00B894,#3B82F6,#8B5CF6);"></div>
        <div class="email-header"><div class="email-logo">100K<span class="email-logo-accent">Pathway</span></div></div>
        <div class="email-body">
          <h1 class="email-title">You're Officially In</h1>
          <p class="email-subtitle">Your 100-day journey starts now.</p>
          <div class="email-content">
            <p>Hey ${fullName ? fullName.split(' ')[0] : 'there'},</p>
            <p>Welcome to 100K Pathway. You just made the decision that changes everything.</p>
            <div class="email-details">
              <div class="detail-row"><span class="detail-label">Plan:</span><span class="detail-value" style="color:#00B894;">${plan || 'Standard'}</span></div>
              <div class="detail-row"><span class="detail-label">Experience:</span><span class="detail-value">${experience || 'N/A'}</span></div>
              <div class="detail-row"><span class="detail-label">Enrolled:</span><span class="detail-value">${new Date(timestamp || Date.now()).toLocaleDateString('en-US', {month:'long',day:'numeric',year:'numeric'})}</span></div>
            </div>
            <div style="text-align:center;margin:32px 0;"><a href="https://100k-pathway.com/how-it-works" class="email-button">See Your Roadmap</a></div>
          </div>
        </div>
        <div class="email-footer">&copy; 2025 100K Pathway. Interviews guaranteed.</div>
      </div>
    </body></html>`,

    agreement_invite: `<!DOCTYPE html><html><head><meta charset="utf-8">${baseStyles}</head><body>
      <div class="email-container">
        <div class="email-header"><div class="email-logo">100K<span class="email-logo-accent">Pathway</span></div></div>
        <div class="email-body">
          <h1 class="email-title">One Last Step</h1>
          <p class="email-subtitle">Sign your service agreement</p>
          <div class="email-content">
            <p>Hey ${fullName ? fullName.split(' ')[0] : 'there'},</p>
            <p>Your spot is secured. Sign the agreement to get started.</p>
            <div style="text-align:center;margin:32px 0;"><a href="${data.agreementLink || 'https://100k-pathway.com'}" class="email-button" style="background:#3B82F6;">Review & Sign</a></div>
            <p style="font-size:13px;color:#9CA3AF;text-align:center;">Link expires in 48 hours.</p>
          </div>
        </div>
        <div class="email-footer">&copy; 2025 100K Pathway</div>
      </div>
    </body></html>`,

    interview_scheduled: `<!DOCTYPE html><html><head><meta charset="utf-8">${baseStyles}</head><body>
      <div class="email-container">
        <div style="height:4px;background:linear-gradient(90deg,#00B894,#3B82F6);"></div>
        <div class="email-header"><div class="email-logo">100K<span class="email-logo-accent">Pathway</span></div></div>
        <div class="email-body">
          <h1 class="email-title">Interview Confirmed</h1>
          <p class="email-subtitle">You did it. Now let's crush it.</p>
          <div class="email-content">
            <p>Hey ${fullName ? fullName.split(' ')[0] : 'there'},</p>
            <p><strong style="color:#00B894;">${data.companyName || 'A company'}</strong> wants to talk to you.</p>
            <div class="email-details">
              <div class="detail-row"><span class="detail-label">Role:</span><span class="detail-value">${data.role || 'Software Engineer'}</span></div>
              <div class="detail-row"><span class="detail-label">Date:</span><span class="detail-value">${data.interviewDate || 'TBD'}</span></div>
              <div class="detail-row"><span class="detail-label">Time:</span><span class="detail-value">${data.interviewTime || 'TBD'}</span></div>
              <div class="detail-row"><span class="detail-label">Format:</span><span class="detail-value">${data.interviewType || 'Video'}</span></div>
            </div>
          </div>
        </div>
        <div class="email-footer">&copy; 2025 100K Pathway. Go get that offer.</div>
      </div>
    </body></html>`,

    offer_received: `<!DOCTYPE html><html><head><meta charset="utf-8">${baseStyles}</head><body>
      <div class="email-container">
        <div style="height:6px;background:linear-gradient(90deg,#00B894,#3B82F6,#8B5CF6,#F59E0B);"></div>
        <div class="email-header"><div class="email-logo">100K<span class="email-logo-accent">Pathway</span></div></div>
        <div class="email-body">
          <h1 class="email-title">YOU DID IT</h1>
          <div class="email-content">
            <p>Hey ${fullName ? fullName.split(' ')[0] : 'there'},</p>
            <p>This is the email we've been waiting to send.</p>
            <div style="background:linear-gradient(135deg,rgba(0,184,148,0.15),rgba(59,130,246,0.1));border-radius:16px;padding:32px;margin:28px 0;text-align:center;border:2px solid #00B894;">
              <div style="font-size:14px;color:#9CA3AF;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">Your Offer</div>
              ${data.offerAmount ? `<div style="font-size:42px;font-weight:800;color:#00B894;">${data.offerAmount}</div>` : ''}
              <div style="font-size:20px;font-weight:600;color:#F9FAFB;">${data.offerRole || 'Software Engineer'}</div>
              <div style="font-size:16px;color:#9CA3AF;">at ${data.offerCompany || 'Your New Company'}</div>
            </div>
          </div>
        </div>
        <div class="email-footer">&copy; 2025 100K Pathway. Another success story.</div>
      </div>
    </body></html>`,

    feedback_request: `<!DOCTYPE html><html><head><meta charset="utf-8">${baseStyles}</head><body>
      <div class="email-container">
        <div class="email-header"><div class="email-logo">100K<span class="email-logo-accent">Pathway</span></div></div>
        <div class="email-body">
          <h1 class="email-title">Quick Check-In</h1>
          <p class="email-subtitle">${data.daysSincePlacement || '30 days'} in - how's it going?</p>
          <div class="email-content">
            <p>Hey ${fullName ? fullName.split(' ')[0] : 'there'},</p>
            <p>We hope you're crushing it at your new role.</p>
            <p>Would you share your experience? Your story could help someone else.</p>
            <div style="text-align:center;margin:32px 0;"><a href="${data.reviewLink || 'https://100k-pathway.com/review'}" class="email-button" style="background:#8B5CF6;">Share Your Story</a></div>
          </div>
        </div>
        <div class="email-footer">&copy; 2025 100K Pathway</div>
      </div>
    </body></html>`,

    company_announcement: `<!DOCTYPE html><html><head><meta charset="utf-8">${baseStyles}</head><body>
      <div class="email-container">
        <div style="height:4px;background:#F59E0B;"></div>
        <div class="email-header"><div class="email-logo">100K<span class="email-logo-accent">Pathway</span></div></div>
        <div class="email-body">
          <h1 class="email-title">${data.headline || 'Important Update'}</h1>
          <div class="email-content">
            ${fullName ? `<p>Hey ${fullName.split(' ')[0]},</p>` : ''}
            <div style="font-size:16px;color:#D1D5DB;line-height:1.8;">${data.message || ''}</div>
            ${data.ctaText && data.ctaLink ? `<div style="text-align:center;margin:32px 0;"><a href="${data.ctaLink}" class="email-button">${data.ctaText}</a></div>` : ''}
          </div>
        </div>
        <div class="email-footer">&copy; 2025 100K Pathway</div>
      </div>
    </body></html>`
  };

  return templates[type] || '';
};

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { template, email, fullName, plan, experience, ...extraData } = req.body;
    
    if (!template || !email || !fullName) {
      return res.status(400).json({ error: 'Missing: template, email, fullName' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const subjects = {
      'applicant_confirmation': 'Application Received - 100K Pathway',
      'payment_welcome': 'Welcome to 100K Pathway!',
      'agreement_invite': 'Sign Your Agreement - 100K Pathway',
      'interview_scheduled': 'Interview Scheduled - 100K Pathway',
      'offer_received': 'Congratulations! - 100K Pathway',
      'feedback_request': 'Quick Check-In - 100K Pathway',
      'company_announcement': extraData.headline || 'Update from 100K Pathway'
    };

    const html = getEmailTemplate(template, { fullName, email, plan, experience, timestamp: Date.now(), ...extraData });
    
    if (!html) {
      return res.status(400).json({ error: 'Invalid template' });
    }

    await transporter.sendMail({
      from: `"100K Pathway" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: email,
      subject: subjects[template] || 'Message from 100K Pathway',
      html
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: error.message });
  }
};
