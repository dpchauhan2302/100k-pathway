-- ==================== ROW LEVEL SECURITY POLICIES ====================
-- Execute these in Supabase SQL Editor after enabling RLS

-- ==================== USERS TABLE ====================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (auth.uid()::text = id::text);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid()::text = id::text);

-- Service role can do everything (backend)
CREATE POLICY "Service role full access to users"
ON users FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- ==================== ENROLLMENTS TABLE ====================
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- Users can view their own enrollments
CREATE POLICY "Users can view own enrollments"
ON enrollments FOR SELECT
USING (auth.uid()::text = user_id::text);

-- Backend can manage all enrollments
CREATE POLICY "Service role full access to enrollments"
ON enrollments FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- ==================== TRANSACTIONS TABLE ====================
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
ON transactions FOR SELECT
USING (auth.uid()::text = user_id::text);

-- Backend can manage all transactions
CREATE POLICY "Service role full access to transactions"
ON transactions FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- ==================== APPLICATIONS TABLE ====================
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Users can view their own applications
CREATE POLICY "Users can view own applications"
ON applications FOR SELECT
USING (auth.uid()::text = user_id::text);

-- Users can create applications (signup)
CREATE POLICY "Anyone can create applications"
ON applications FOR INSERT
WITH CHECK (true);

-- Backend can manage all applications
CREATE POLICY "Service role full access to applications"
ON applications FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- ==================== SUCCESS FEE AGREEMENTS ====================
ALTER TABLE success_fee_agreements ENABLE ROW LEVEL SECURITY;

-- Users can view their own agreements
CREATE POLICY "Users can view own agreements"
ON success_fee_agreements FOR SELECT
USING (auth.uid()::text = user_id::text);

-- Backend can manage all agreements
CREATE POLICY "Service role full access to agreements"
ON success_fee_agreements FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- ==================== SUCCESS FEE INVOICES ====================
ALTER TABLE success_fee_invoices ENABLE ROW LEVEL SECURITY;

-- Users can view their own invoices
CREATE POLICY "Users can view own invoices"
ON success_fee_invoices FOR SELECT
USING (auth.uid()::text = user_id::text);

-- Backend can manage all invoices
CREATE POLICY "Service role full access to invoices"
ON success_fee_invoices FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- ==================== EMAIL CONFIRMATIONS ====================
ALTER TABLE email_confirmations ENABLE ROW LEVEL SECURITY;

-- Users can view their own confirmations
CREATE POLICY "Users can view own confirmations"
ON email_confirmations FOR SELECT
USING (auth.uid()::text = user_id::text);

-- Backend can manage all confirmations
CREATE POLICY "Service role full access to confirmations"
ON email_confirmations FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- ==================== MENTORSHIP SESSIONS ====================
ALTER TABLE mentorship_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
ON mentorship_sessions FOR SELECT
USING (auth.uid()::text = user_id::text);

-- Backend can manage all sessions
CREATE POLICY "Service role full access to sessions"
ON mentorship_sessions FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- ==================== INTERVIEW OPPORTUNITIES ====================
ALTER TABLE interview_opportunities ENABLE ROW LEVEL SECURITY;

-- Users can view their own interviews
CREATE POLICY "Users can view own interviews"
ON interview_opportunities FOR SELECT
USING (auth.uid()::text = user_id::text);

-- Users can update their decline status
CREATE POLICY "Users can decline interviews"
ON interview_opportunities FOR UPDATE
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- Backend can manage all interviews
CREATE POLICY "Service role full access to interviews"
ON interview_opportunities FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- ==================== PROJECTS TABLE ====================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Users can view their own projects
CREATE POLICY "Users can view own projects"
ON projects FOR SELECT
USING (auth.uid()::text = user_id::text);

-- Users can update their own projects
CREATE POLICY "Users can update own projects"
ON projects FOR UPDATE
USING (auth.uid()::text = user_id::text);

-- Backend can manage all projects
CREATE POLICY "Service role full access to projects"
ON projects FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- ==================== VERIFICATION ====================
-- Test RLS is working (run as authenticated user, should only see own data):
-- SELECT * FROM users; -- Should only return current user
-- SELECT * FROM enrollments; -- Should only return current user's enrollments

-- Test as service role (backend should see everything):
-- Uses SUPABASE_SERVICE_KEY instead of SUPABASE_ANON_KEY
