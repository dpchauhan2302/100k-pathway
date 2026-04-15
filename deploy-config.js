#!/usr/bin/env node

/**
 * Deployment Configuration Processor
 * Replaces template values in config files with environment variables
 */

const fs = require('fs');
const path = require('path');

// Read environment variables
const API_BASE_URL = process.env.API_BASE_URL || process.env.APP_URL || 'http://localhost:3000';
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';

if (!STRIPE_PUBLISHABLE_KEY) {
    console.warn('⚠️  STRIPE_PUBLISHABLE_KEY is not set — Stripe payment UI will not function.');
    console.warn('    Set it in your .env file or Vercel environment variables.');
}

// Read the template file
const templatePath = path.join(__dirname, 'public', 'config.template.js');
const outputPath = path.join(__dirname, 'public', 'config.js');

try {
    let configTemplate = fs.readFileSync(templatePath, 'utf8');
    
    // Replace template values with actual environment values
    configTemplate = configTemplate.replace('{{API_BASE_URL}}', API_BASE_URL);
    configTemplate = configTemplate.replace('{{STRIPE_PUBLISHABLE_KEY}}', STRIPE_PUBLISHABLE_KEY);
    
    // Write the processed config file
    fs.writeFileSync(outputPath, configTemplate);
    
    console.log('✓ Configuration file generated successfully');
    console.log(`✓ API Base URL set to: ${API_BASE_URL}`);
    console.log(`✓ Stripe Key set to: ${STRIPE_PUBLISHABLE_KEY.substring(0, 8)}...`);
} catch (error) {
    console.error('✗ Error processing configuration:', error.message);
    process.exit(1);
}