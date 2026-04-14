const fs = require('fs');
const path = require('path');

/**
 * Apple-level email templates for 100K Pathway
 * Clean, minimalist, professional aesthetic matching website design
 */

const getEmailTemplate = (type, data = {}) => {
  const { fullName, email, phone, plan, experience, timestamp } = data;

  // Base email styles matching website design
  const baseStyles = `
    <style>
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background-color: #0B1120;
        color: #D1D5DB;
        line-height: 1.7;
        margin: 0;
        padding: 0;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background: #0B1120;
      }
      @media only screen and (max-width: 600px) {
        .email-body { padding: 30px 20px !important; }
        .email-title { font-size: 24px !important; }
        .detail-row { flex-direction: column; gap: 4px; }
        .detail-value { text-align: left !important; }
      }
      .email-header {
        padding: 40px 30px 20px;
        text-align: center;
        border-bottom: 1px solid rgba(255,255,255,0.08);
      }
      .email-logo {
        font-size: 28px;
        font-weight: 700;
        color: #F9FAFB;
        margin-bottom: 12px;
        letter-spacing: 0.01em;
      }
      .email-logo-prefix {
        color: #FFFFFF;
      }
      .email-logo-accent {
        color: #00B894;
        margin-left: 4px;
        font-weight: 800;
      }
      .email-body {
        padding: 40px 30px;
        background: #111827;
        border-radius: 12px;
        margin: 20px;
        border: 1px solid rgba(255,255,255,0.08);
      }
      .email-title {
        font-size: 32px;
        font-weight: 700;
        color: #FFFFFF;
        margin-bottom: 16px;
        text-align: center;
        letter-spacing: 0.015em;
        line-height: 1.2;
      }
      .email-subtitle {
        font-size: 16px;
        color: #9CA3AF;
        text-align: center;
        margin-bottom: 32px;
      }
      .email-content {
        font-size: 16px;
        color: #D1D5DB;
        line-height: 1.7;
      }
      .email-section {
        margin: 24px 0;
        padding: 20px;
        background: rgba(17, 24, 39, 0.6);
        border-radius: 8px;
        border-left: 3px solid #00B894;
      }
      .email-highlight {
        color: #00B894;
        font-weight: 600;
      }
      .email-details {
        margin: 20px 0;
        padding: 16px;
        background: rgba(0, 184, 148, 0.08);
        border-radius: 8px;
      }
      .detail-row {
        display: flex;
        justify-content: space-between;
        margin: 8px 0;
        padding: 8px 0;
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }
      .detail-label {
        color: #9CA3AF;
        font-weight: 500;
      }
      .detail-value {
        color: #F9FAFB;
        font-weight: 600;
        text-align: right;
      }
      .email-footer {
        padding: 30px 30px 20px;
        text-align: center;
        color: #9CA3AF;
        font-size: 14px;
        border-top: 1px solid rgba(255,255,255,0.08);
      }
      .email-button {
        display: inline-block;
        padding: 16px 32px;
        background: #00B894;
        color: #0B1120 !important;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 16px;
        margin: 24px 0;
        text-align: center;
        transition: all 0.2s;
        letter-spacing: 0.01em;
      }
      .email-button:hover {
        background: #00a07f;
        transform: translateY(-1px);
      }
      .success-icon {
        width: 64px;
        height: 64px;
        background: rgba(0, 184, 148, 0.15);
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 24px;
        border: 3px solid #00B894;
      }
      .success-icon svg {
        width: 30px;
        height: 30px;
        stroke: #00B894;
      }
      .next-steps {
        margin: 24px 0;
      }
      .step {
        display: flex;
        align-items: flex-start;
        margin: 16px 0;
      }
      .step-number {
        width: 24px;
        height: 24px;
        background: #00B894;
        color: #0B1120;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 700;
        flex-shrink: 0;
        margin-right: 12px;
        margin-top: 2px;
      }
      .step-content {
        flex: 1;
        color: #D1D5DB;
      }
    </style>
  `;

  switch(type) {
    case 'contact_form':
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>New Application - 100K Pathway</title>
            ${baseStyles}
          </head>
          <body>
            <div class="email-container">
              <div class="email-header">
                <div class="email-logo">
                  <span class="email-logo-prefix">100K</span>
                  <span class="email-logo-accent">Pathway</span>
                </div>
                <h1 class="email-title">New Application Received</h1>
                <p class="email-subtitle">We've received a new application from ${fullName}</p>
              </div>
              
              <div class="email-body">
                <div style="text-align: center; margin-bottom: 32px;">
                  <div class="success-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                </div>
                
                <div class="email-content">
                  <p>Hello Team,</p>
                  
                  <p>You've received a new application through the 100K Pathway website. Here are the details:</p>
                  
                  <div class="email-details">
                    <div class="detail-row">
                      <span class="detail-label">Applicant Name:</span>
                      <span class="detail-value">${fullName}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Email:</span>
                      <span class="detail-value">${email}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Phone:</span>
                      <span class="detail-value">${phone}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Plan Interested:</span>
                      <span class="detail-value">${plan}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Experience:</span>
                      <span class="detail-value">${experience}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Submitted:</span>
                      <span class="detail-value">${new Date(timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div class="next-steps">
                    <p><span class="email-highlight">Next Steps:</span></p>
                    
                    <div class="step">
                      <div class="step-number">1</div>
                      <div class="step-content">Review the application details above</div>
                    </div>
                    <div class="step">
                      <div class="step-number">2</div>
                      <div class="step-content">Reach out to the applicant within 24 hours</div>
                    </div>
                    <div class="step">
                      <div class="step-number">3</div>
                      <div class="step-content">Schedule their strategy call</div>
                    </div>
                  </div>
                  
                  <p>We've already sent a confirmation to the applicant letting them know we received their application.</p>
                </div>
              </div>
              
              <div class="email-footer">
                <p>&copy; 2025 100K Pathway. All rights reserved.</p>
                <p>100K Pathway | Helping professionals land $100K+ tech roles in 100 days</p>
              </div>
            </div>
          </body>
        </html>
      `;
    
    case 'applicant_confirmation':
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Application Received - 100K Pathway</title>
            ${baseStyles}
          </head>
          <body>
            <div class="email-container">
              <div class="email-header">
                <div class="email-logo">
                  <span class="email-logo-prefix">100K</span>
                  <span class="email-logo-accent">Pathway</span>
                </div>
              </div>
              
              <div class="email-body">
                <div style="text-align: center; margin-bottom: 24px;">
                  <div class="success-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <h1 class="email-title">We Got Your Application</h1>
                  <p class="email-subtitle">You're one step closer to $100K+</p>
                </div>
                
                <div class="email-content">
                  <p>Hey ${fullName.split(' ')[0]},</p>
                  
                  <p>Thanks for applying. We'll review your details and reach out within <span class="email-highlight">24 hours</span> to schedule a quick strategy call.</p>
                  
                  <!-- What to expect -->
                  <div class="email-section">
                    <p style="font-weight: 600; color: #F9FAFB; margin-bottom: 12px;">What happens next:</p>
                    
                    <div class="next-steps">
                      <div class="step">
                        <div class="step-number">1</div>
                        <div class="step-content">We review your application</div>
                      </div>
                      <div class="step">
                        <div class="step-number">2</div>
                        <div class="step-content">We call you to discuss your goals</div>
                      </div>
                      <div class="step">
                        <div class="step-number">3</div>
                        <div class="step-content">If it's a fit, we start your 100-day countdown</div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="email-details">
                    <div class="detail-row">
                      <span class="detail-label">Interested Plan:</span>
                      <span class="detail-value">${plan}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Experience:</span>
                      <span class="detail-value">${experience}</span>
                    </div>
                  </div>
                  
                  <!-- Social Proof -->
                  <div style="background: rgba(0,184,148,0.08); border-left: 3px solid #00B894; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                    <p style="font-size: 13px; color: #9CA3AF; margin: 0;">Our candidates average <span style="color: #00B894; font-weight: 600;">$135K offers</span>. Fastest placement: <span style="color: #00B894; font-weight: 600;">37 days</span>.</p>
                  </div>
                  
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="https://100k-pathway.com/how-it-works" class="email-button">See How It Works</a>
                  </div>
                  
                  <p style="font-size: 14px; color: #9CA3AF; text-align: center;">Questions? Just reply to this email.</p>
                </div>
              </div>
              
              <div class="email-footer">
                <p style="margin-bottom: 8px;">&copy; 2025 100K Pathway</p>
                <p style="font-size: 12px;">Interviews guaranteed. Or your money back.</p>
              </div>
            </div>
          </body>
        </html>
      `;

    case 'payment_welcome':
      const paidPlanColor = plan.includes('Premium') ? '#8B5CF6' : plan.includes('Standard') ? '#3B82F6' : '#00B894';
      const paidPlanName = plan.includes('Premium') ? 'Premium' : plan.includes('Standard') ? 'Standard' : 'Essential';
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Welcome to 100K Pathway!</title>
            ${baseStyles}
          </head>
          <body>
            <div class="email-container">
              <!-- Hero Banner -->
              <div style="background: linear-gradient(135deg, ${paidPlanColor}22, #0B112099); padding: 40px 30px 30px; text-align: center; border-bottom: 1px solid ${paidPlanColor}44;">
                <div class="email-logo" style="margin-bottom: 20px;">
                  <span class="email-logo-prefix">100K</span>
                  <span class="email-logo-accent">Pathway</span>
                </div>
                <div style="display: inline-block; background: ${paidPlanColor}; color: #fff; padding: 6px 20px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">${paidPlanName} Plan</div>
              </div>
              
              <div class="email-body">
                <div style="text-align: center; margin-bottom: 24px;">
                  <div class="success-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <h1 class="email-title">You're Officially In</h1>
                  <p class="email-subtitle">Your 100-day journey to $100K+ starts now.</p>
                </div>
                
                <div class="email-content">
                  <p>Hey ${fullName.split(' ')[0]},</p>
                  
                  <p>Welcome to 100K Pathway. You just made the decision that changes everything. <span class="email-highlight">No more solo grinding. No more ghosting. No more guessing.</span></p>
                  
                  <!-- Social Proof Quote -->
                  <div style="background: rgba(0,184,148,0.08); border-left: 3px solid #00B894; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                    <p style="font-style: italic; color: #D1D5DB; margin: 0;">"I went from 2 responses in 6 months to 7 interviews in 45 days. Closed at $165K."</p>
                    <p style="font-size: 12px; color: #9CA3AF; margin: 8px 0 0 0;">— Sarah M., Senior Software Engineer</p>
                  </div>
                  
                  <!-- Visual Timeline -->
                  <div style="background: linear-gradient(135deg, rgba(0,184,148,0.1), rgba(59,130,246,0.08)); border-radius: 12px; padding: 24px; margin: 28px 0; border: 1px solid rgba(255,255,255,0.1);">
                    <p style="font-size: 14px; font-weight: 600; color: #F9FAFB; margin-bottom: 20px; text-align: center; text-transform: uppercase; letter-spacing: 1px;">Your Timeline</p>
                    
                    <!-- Progress Bar -->
                    <div style="position: relative; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin: 0 20px 20px;">
                      <div style="position: absolute; left: 0; top: 0; height: 4px; width: 10%; background: linear-gradient(90deg, #00B894, #3B82F6); border-radius: 2px;"></div>
                      <div style="position: absolute; left: 0; top: -6px; width: 16px; height: 16px; background: #00B894; border-radius: 50%; border: 2px solid #0B1120;"></div>
                      <div style="position: absolute; left: 50%; top: -6px; width: 16px; height: 16px; background: rgba(59,130,246,0.3); border-radius: 50%; border: 2px solid rgba(255,255,255,0.2); transform: translateX(-50%);"></div>
                      <div style="position: absolute; right: 0; top: -6px; width: 16px; height: 16px; background: rgba(0,184,148,0.3); border-radius: 50%; border: 2px solid rgba(255,255,255,0.2);"></div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; text-align: center; margin-top: 8px;">
                      <div style="flex: 1;">
                        <div style="font-size: 14px; font-weight: 700; color: #00B894;">${new Date(timestamp + 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                        <div style="font-size: 11px; color: #9CA3AF;">Kickoff Call</div>
                      </div>
                      <div style="flex: 1;">
                        <div style="font-size: 14px; font-weight: 700; color: #3B82F6;">Day 50</div>
                        <div style="font-size: 11px; color: #9CA3AF;">Interview Mode</div>
                      </div>
                      <div style="flex: 1;">
                        <div style="font-size: 14px; font-weight: 700; color: #00B894;">${new Date(timestamp + 86400000 * 100).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                        <div style="font-size: 11px; color: #9CA3AF;">Guarantee Deadline</div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Divider -->
                  <div style="height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent); margin: 32px 0;"></div>
                  
                  <div class="email-section">
                    <p style="font-weight: 600; color: #F9FAFB; margin-bottom: 12px;">Your next steps:</p>
                    
                    <div class="next-steps">
                      <div class="step">
                        <div class="step-number">1</div>
                        <div class="step-content"><strong>Check your inbox</strong> — Kickoff call invite arriving within 24h</div>
                      </div>
                      <div class="step">
                        <div class="step-number">2</div>
                        <div class="step-content"><strong>Prep your resume</strong> — We'll optimize it during kickoff</div>
                      </div>
                      <div class="step">
                        <div class="step-number">3</div>
                        <div class="step-content"><strong>Relax</strong> — We start submitting applications Day 1</div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="email-details">
                    <div class="detail-row">
                      <span class="detail-label">Your Plan:</span>
                      <span class="detail-value" style="color: ${paidPlanColor};">${plan}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Experience Level:</span>
                      <span class="detail-value">${experience}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Enrolled:</span>
                      <span class="detail-value">${new Date(timestamp).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                  
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="https://100k-pathway.com/how-it-works" class="email-button" style="background: ${paidPlanColor};">See Your Roadmap</a>
                  </div>
                  
                  <p style="font-size: 14px; color: #9CA3AF; text-align: center;">Questions? Just reply to this email. We're here.</p>
                </div>
              </div>
              
              <div class="email-footer">
                <p style="margin-bottom: 8px;">&copy; 2025 100K Pathway</p>
                <p style="font-size: 12px;">Interviews guaranteed. Or your money back.</p>
              </div>
            </div>
          </body>
        </html>
      `;

    case 'agreement_invite':
      const agreementPlanColor = plan.includes('Premium') ? '#8B5CF6' : plan.includes('Standard') ? '#3B82F6' : '#00B894';
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Sign Your Agreement - 100K Pathway</title>
            ${baseStyles}
          </head>
          <body>
            <div class="email-container">
              <div class="email-header">
                <div class="email-logo">
                  <span class="email-logo-prefix">100K</span>
                  <span class="email-logo-accent">Pathway</span>
                </div>
              </div>
              
              <div class="email-body">
                <div style="text-align: center; margin-bottom: 24px;">
                  <div style="width: 64px; height: 64px; background: rgba(59,130,246,0.15); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 24px; border: 3px solid #3B82F6;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2" width="30" height="30">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </div>
                  <h1 class="email-title">One Last Step</h1>
                  <p class="email-subtitle">Sign your service agreement to get started</p>
                </div>
                
                <div class="email-content">
                  <p>Hey ${fullName.split(' ')[0]},</p>
                  
                  <p>Your spot is secured. Before we kick off your 100-day journey, we need your signature on the service agreement.</p>
                  
                  <div style="background: rgba(59,130,246,0.08); border-left: 3px solid #3B82F6; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                    <p style="font-size: 14px; color: #D1D5DB; margin: 0;"><strong style="color: #F9FAFB;">What you're signing:</strong> Our mutual commitment — we guarantee interviews, you commit to the process.</p>
                  </div>
                  
                  <div class="email-details">
                    <div class="detail-row">
                      <span class="detail-label">Your Plan:</span>
                      <span class="detail-value" style="color: ${agreementPlanColor};">${plan}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Guarantee:</span>
                      <span class="detail-value">Interviews or money back</span>
                    </div>
                  </div>
                  
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${data.agreementLink || 'https://100k-pathway.com/agreement'}" class="email-button" style="background: #3B82F6;">Review & Sign Agreement</a>
                  </div>
                  
                  <p style="font-size: 13px; color: #9CA3AF; text-align: center;">This link expires in 48 hours. Questions? Just reply.</p>
                </div>
              </div>
              
              <div class="email-footer">
                <p style="margin-bottom: 8px;">&copy; 2025 100K Pathway</p>
                <p style="font-size: 12px;">Interviews guaranteed. Or your money back.</p>
              </div>
            </div>
          </body>
        </html>
      `;

    case 'company_announcement':
      const { subject, headline, message, ctaText, ctaLink, announcementType } = data;
      const typeColors = {
        holiday: '#F59E0B',
        update: '#3B82F6',
        event: '#8B5CF6',
        news: '#00B894'
      };
      const typeIcons = {
        holiday: '<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path>',
        update: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>',
        event: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>',
        news: '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2z"></path><path d="M4 10h2v10H4z"></path>'
      };
      const badgeColor = typeColors[announcementType] || '#00B894';
      const iconPath = typeIcons[announcementType] || typeIcons.news;
      const badgeText = announcementType ? announcementType.charAt(0).toUpperCase() + announcementType.slice(1) : 'Update';
      
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>${subject || 'Update from 100K Pathway'}</title>
            ${baseStyles}
          </head>
          <body>
            <div class="email-container">
              <!-- Colored Top Bar -->
              <div style="height: 4px; background: linear-gradient(90deg, ${badgeColor}, ${badgeColor}88);"></div>
              
              <div class="email-header">
                <div class="email-logo">
                  <span class="email-logo-prefix">100K</span>
                  <span class="email-logo-accent">Pathway</span>
                </div>
              </div>
              
              <div class="email-body">
                <div style="text-align: center; margin-bottom: 24px;">
                  <div style="display: inline-block; background: ${badgeColor}22; color: ${badgeColor}; padding: 6px 16px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="display: inline-block; vertical-align: middle; margin-right: 6px;">${iconPath}</svg>
                    ${badgeText}
                  </div>
                  <h1 class="email-title">${headline || 'Important Update'}</h1>
                </div>
                
                <div class="email-content">
                  ${fullName ? `<p>Hey ${fullName.split(' ')[0]},</p>` : ''}
                  
                  <div style="font-size: 16px; color: #D1D5DB; line-height: 1.8;">
                    ${message || ''}
                  </div>
                  
                  ${ctaText && ctaLink ? `
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${ctaLink}" class="email-button" style="background: ${badgeColor};">${ctaText}</a>
                  </div>
                  ` : ''}
                </div>
              </div>
              
              <div class="email-footer">
                <p style="margin-bottom: 8px;">&copy; 2025 100K Pathway</p>
                <p style="font-size: 12px;">You're receiving this because you're part of the 100K Pathway community.</p>
              </div>
            </div>
          </body>
        </html>
      `;

    case 'interview_scheduled':
      const { companyName, role, interviewDate, interviewTime, interviewType, prepLink } = data;
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Interview Scheduled - 100K Pathway</title>
            ${baseStyles}
          </head>
          <body>
            <div class="email-container">
              <!-- Gradient Top -->
              <div style="height: 4px; background: linear-gradient(90deg, #00B894, #3B82F6);"></div>
              
              <div class="email-header">
                <div class="email-logo">
                  <span class="email-logo-prefix">100K</span>
                  <span class="email-logo-accent">Pathway</span>
                </div>
              </div>
              
              <div class="email-body">
                <div style="text-align: center; margin-bottom: 24px;">
                  <div style="width: 64px; height: 64px; background: rgba(0,184,148,0.15); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 24px; border: 3px solid #00B894;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#00B894" stroke-width="2" width="30" height="30">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                      <path d="M9 16l2 2 4-4"></path>
                    </svg>
                  </div>
                  <h1 class="email-title">Interview Confirmed</h1>
                  <p class="email-subtitle">You did it. Now let's crush it.</p>
                </div>
                
                <div class="email-content">
                  <p>Hey ${fullName.split(' ')[0]},</p>
                  
                  <p>Great news — <strong style="color: #00B894;">${companyName || 'a company'}</strong> wants to talk to you.</p>
                  
                  <div style="background: linear-gradient(135deg, rgba(0,184,148,0.1), rgba(59,130,246,0.08)); border-radius: 12px; padding: 24px; margin: 28px 0; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="text-align: center;">
                      <div style="font-size: 13px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Interview Details</div>
                      <div style="font-size: 24px; font-weight: 700; color: #F9FAFB; margin-bottom: 4px;">${role || 'Software Engineer'}</div>
                      <div style="font-size: 16px; color: #00B894; font-weight: 600;">${companyName || 'Company'}</div>
                    </div>
                    <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 20px 0;"></div>
                    <div style="display: flex; justify-content: space-around; text-align: center;">
                      <div>
                        <div style="font-size: 12px; color: #9CA3AF;">Date</div>
                        <div style="font-size: 16px; font-weight: 600; color: #F9FAFB;">${interviewDate || 'TBD'}</div>
                      </div>
                      <div>
                        <div style="font-size: 12px; color: #9CA3AF;">Time</div>
                        <div style="font-size: 16px; font-weight: 600; color: #F9FAFB;">${interviewTime || 'TBD'}</div>
                      </div>
                      <div>
                        <div style="font-size: 12px; color: #9CA3AF;">Format</div>
                        <div style="font-size: 16px; font-weight: 600; color: #F9FAFB;">${interviewType || 'Video'}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="email-section">
                    <p style="font-weight: 600; color: #F9FAFB; margin-bottom: 12px;">Before your interview:</p>
                    <div class="next-steps">
                      <div class="step">
                        <div class="step-number">1</div>
                        <div class="step-content">Research ${companyName || 'the company'} — know their product, culture, recent news</div>
                      </div>
                      <div class="step">
                        <div class="step-number">2</div>
                        <div class="step-content">Review your resume — be ready to walk through every bullet</div>
                      </div>
                      <div class="step">
                        <div class="step-number">3</div>
                        <div class="step-content">Prepare 3 questions to ask them — shows genuine interest</div>
                      </div>
                    </div>
                  </div>
                  
                  <div style="background: rgba(0,184,148,0.08); border-left: 3px solid #00B894; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                    <p style="font-size: 13px; color: #9CA3AF; margin: 0;">Remember: You got this interview because you're qualified. They already like what they see.</p>
                  </div>
                  
                  ${prepLink ? `
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${prepLink}" class="email-button">View Prep Materials</a>
                  </div>
                  ` : ''}
                  
                  <p style="font-size: 14px; color: #9CA3AF; text-align: center;">Need help preparing? Reply to this email.</p>
                </div>
              </div>
              
              <div class="email-footer">
                <p style="margin-bottom: 8px;">&copy; 2025 100K Pathway</p>
                <p style="font-size: 12px;">Go get that offer.</p>
              </div>
            </div>
          </body>
        </html>
      `;

    case 'offer_received':
      const { offerAmount, offerCompany, offerRole } = data;
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Congratulations! - 100K Pathway</title>
            ${baseStyles}
          </head>
          <body>
            <div class="email-container">
              <!-- Celebration gradient -->
              <div style="height: 6px; background: linear-gradient(90deg, #00B894, #3B82F6, #8B5CF6, #F59E0B);"></div>
              
              <div style="background: linear-gradient(135deg, #00B89422, #3B82F622); padding: 40px 30px; text-align: center;">
                <div class="email-logo" style="margin-bottom: 20px;">
                  <span class="email-logo-prefix">100K</span>
                  <span class="email-logo-accent">Pathway</span>
                </div>
                <div style="font-size: 48px; margin-bottom: 16px;">&#127881;</div>
                <h1 style="font-size: 36px; font-weight: 800; color: #FFFFFF; margin: 0;">YOU DID IT</h1>
              </div>
              
              <div class="email-body">
                <div class="email-content">
                  <p>Hey ${fullName.split(' ')[0]},</p>
                  
                  <p>This is the email we've been waiting to send.</p>
                  
                  <div style="background: linear-gradient(135deg, rgba(0,184,148,0.15), rgba(59,130,246,0.1)); border-radius: 16px; padding: 32px; margin: 28px 0; text-align: center; border: 2px solid #00B894;">
                    <div style="font-size: 14px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px;">Your Offer</div>
                    ${offerAmount ? `<div style="font-size: 42px; font-weight: 800; color: #00B894; margin-bottom: 8px;">${offerAmount}</div>` : ''}
                    <div style="font-size: 20px; font-weight: 600; color: #F9FAFB;">${offerRole || 'Software Engineer'}</div>
                    <div style="font-size: 16px; color: #9CA3AF;">at ${offerCompany || 'Your New Company'}</div>
                  </div>
                  
                  <p>From application to offer. You trusted the process, put in the work, and now you're here.</p>
                  
                  <p style="color: #00B894; font-weight: 600;">This is just the beginning.</p>
                  
                  <div style="height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent); margin: 32px 0;"></div>
                  
                  <div style="background: rgba(255,255,255,0.03); border-radius: 12px; padding: 20px; margin: 24px 0;">
                    <p style="font-weight: 600; color: #F9FAFB; margin-bottom: 12px;">Next steps:</p>
                    <div class="next-steps">
                      <div class="step">
                        <div class="step-number">1</div>
                        <div class="step-content">Review the offer details carefully</div>
                      </div>
                      <div class="step">
                        <div class="step-number">2</div>
                        <div class="step-content">If negotiating, we can help — just reply</div>
                      </div>
                      <div class="step">
                        <div class="step-number">3</div>
                        <div class="step-content">Celebrate. You earned this.</div>
                      </div>
                    </div>
                  </div>
                  
                  <p style="font-size: 14px; color: #9CA3AF; text-align: center;">We're genuinely proud of you. Welcome to the $100K+ club.</p>
                </div>
              </div>
              
              <div class="email-footer">
                <p style="margin-bottom: 8px;">&copy; 2025 100K Pathway</p>
                <p style="font-size: 12px;">Another success story written.</p>
              </div>
            </div>
          </body>
        </html>
      `;

    case 'feedback_request':
      const { daysSincePlacement, reviewLink } = data;
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>How's the new role? - 100K Pathway</title>
            ${baseStyles}
          </head>
          <body>
            <div class="email-container">
              <div class="email-header">
                <div class="email-logo">
                  <span class="email-logo-prefix">100K</span>
                  <span class="email-logo-accent">Pathway</span>
                </div>
              </div>
              
              <div class="email-body">
                <div style="text-align: center; margin-bottom: 24px;">
                  <div style="width: 64px; height: 64px; background: rgba(139,92,246,0.15); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 24px; border: 3px solid #8B5CF6;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" stroke-width="2" width="30" height="30">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </div>
                  <h1 class="email-title">Quick Check-In</h1>
                  <p class="email-subtitle">${daysSincePlacement || '30'} days in — how's it going?</p>
                </div>
                
                <div class="email-content">
                  <p>Hey ${fullName.split(' ')[0]},</p>
                  
                  <p>It's been ${daysSincePlacement || 'about a month'} since you started your new role. We hope you're crushing it.</p>
                  
                  <p>We have a quick favor to ask:</p>
                  
                  <div style="background: linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.08)); border-radius: 12px; padding: 24px; margin: 28px 0; text-align: center; border: 1px solid rgba(139,92,246,0.3);">
                    <p style="font-size: 18px; font-weight: 600; color: #F9FAFB; margin-bottom: 16px;">Would you share your experience?</p>
                    <p style="font-size: 14px; color: #9CA3AF; margin-bottom: 24px;">Your story could help someone else make the same leap you did.</p>
                    <a href="${reviewLink || 'https://100k-pathway.com/review'}" class="email-button" style="background: #8B5CF6;">Share Your Story (2 min)</a>
                  </div>
                  
                  <div style="background: rgba(139,92,246,0.08); border-left: 3px solid #8B5CF6; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                    <p style="font-size: 13px; color: #9CA3AF; margin: 0;">No pressure. But if 100K Pathway made a difference for you, we'd love to hear it — and share it with others considering the same journey.</p>
                  </div>
                  
                  <p style="font-size: 14px; color: #9CA3AF; text-align: center;">Thanks for being part of this. We're rooting for you.</p>
                </div>
              </div>
              
              <div class="email-footer">
                <p style="margin-bottom: 8px;">&copy; 2025 100K Pathway</p>
                <p style="font-size: 12px;">Your success is our success.</p>
              </div>
            </div>
          </body>
        </html>
      `;

    default:
      return '';
  }
};

module.exports = { getEmailTemplate };