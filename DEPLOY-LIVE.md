# How to Deploy Your 100K Pathway Website Live

## Option 1: Deploy to Vercel (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Import your GitHub repository: `https://github.com/dpvishwa/K100Pathway.git`
5. Configure the project with these settings:
   - Build Command: (leave empty - static site)
   - Output Directory: (leave empty - ./)
   - Install Command: (leave empty)
6. Add Environment Variables:
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_KEY=your_supabase_service_role_key
   STRIPE_SECRET_KEY=sk_live_your_stripe_key_here
   SENDGRID_API_KEY=SG.your_sendgrid_key_here
   JWT_SECRET=your_jwt_secret_here
   APP_URL=https://your-domain.vercel.app
   FROM_EMAIL=hello@your-domain.com
   ADMIN_EMAIL=admin@your-domain.com
   ```

## Option 2: Deploy to Netlify

1. Go to [netlify.com](https://netlify.com)
2. Sign up or log in to your account
3. Drag and drop your project folder to Netlify
4. Configure build settings:
   - Publish directory: /
   - Build command: (leave empty)
5. Add Environment Variables in Site Settings > Build & Deploy > Environment

## Option 3: Test Locally First

If you want to test before going live:

1. Install Python (comes pre-installed on Mac)
2. Run in your project directory:
   ```bash
   python3 -m http.server 3000
   ```
3. Visit http://localhost:3000 in your browser

## After Deployment

1. Update your domain DNS records if using a custom domain
2. Test all forms and payment flows
3. Verify SSL certificate is active
4. Check mobile responsiveness
5. Test all links and navigation

Your website will be live at the URL provided by your chosen hosting platform!