# INFRASTRUCTURE VERIFICATION CHECKLIST

## ✅ Pre-Deployment Testing (Required Before Features)

### 1. DATABASE SCHEMA VERIFICATION

**Run Updated Schema:**
```bash
psql $DATABASE_URL < api/database-schema.sql
```

**Verify Tables Created:**
```sql
-- Check audit tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('audit_log', 'idempotency_keys', 'request_metrics', 'job_queue', 'dead_letter_queue');
```

**Expected Output:**
```
 table_name
------------------
 audit_log
 idempotency_keys
 request_metrics
 job_queue
 dead_letter_queue
```

**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

---

### 2. STARTUP LIFECYCLE VERIFICATION

**Test Deterministic Startup:**
```bash
cd api
node server.js
```

**Expected Output:**
```
=== APPLICATION STARTUP ===
✓ Environment validated
✓ Database connected
✓ Job queue started
✓ Server listening on port 3000
=== STARTUP COMPLETE (234ms) ===
```

**Failure Cases to Test:**
```bash
# Missing environment variable
unset SUPABASE_URL
node server.js
# Should fail with: "Missing required environment variables: SUPABASE_URL"

# Invalid database URL
SUPABASE_URL=invalid node server.js
# Should fail with: "Database connection failed: ..."
```

**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

---

### 3. GRACEFUL SHUTDOWN VERIFICATION

**Test Shutdown Signal Handling:**
```bash
# Start server
node server.js

# In another terminal, send SIGTERM
kill -TERM $(pgrep -f "node server.js")
```

**Expected Output:**
```
=== SHUTDOWN INITIATED (SIGTERM) ===
✓ HTTP server closed
Waiting for 0 active requests...
✓ All requests completed
✓ Job queue stopped
✓ Database connections closed
=== SHUTDOWN COMPLETE ===
```

**Test with Active Requests:**
```bash
# Terminal 1: Start server
node server.js

# Terminal 2: Send slow request
curl http://localhost:3000/api/slow-endpoint &

# Terminal 3: Send shutdown signal immediately
kill -TERM $(pgrep -f "node server.js")

# Should wait for request to complete (max 30s)
```

**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

---

### 4. IDEMPOTENCY VERIFICATION

**Test Duplicate Request Prevention:**
```bash
# Send same idempotency key twice
IDEM_KEY="test-$(date +%s)"

curl -X POST http://localhost:3000/api/submit-application \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEM_KEY" \
  -d '{"name":"Test","email":"test@example.com"}' \
  -v

# Send again with SAME key
curl -X POST http://localhost:3000/api/submit-application \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEM_KEY" \
  -d '{"name":"Test","email":"test@example.com"}' \
  -v
```

**Expected:**
- First request: 200/201 (creates resource)
- Second request: Same response (from cache, no duplicate creation)

**Verify in Database:**
```sql
SELECT COUNT(*) FROM applications WHERE email = 'test@example.com';
-- Should be 1, not 2
```

**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

---

### 5. STATE MACHINE VERIFICATION

**Test Invalid State Transitions:**
```javascript
// In Node REPL or test file
const { EnrollmentStateMachine } = require('./api/server.js');

const enrollment = new EnrollmentStateMachine();
console.log(enrollment.state); // NOT_STARTED

enrollment.transition('ONBOARDING'); // Valid
console.log(enrollment.state); // ONBOARDING

try {
    enrollment.transition('COMPLETED'); // Invalid - should throw
} catch (error) {
    console.log('✓ Invalid transition prevented:', error.message);
}

console.log(enrollment.getHistory());
// Should show: [
//   { state: 'NOT_STARTED', timestamp: ... },
//   { state: 'ONBOARDING', timestamp: ... }
// ]
```

**Expected:**
- Valid transitions succeed
- Invalid transitions throw error
- History is maintained

**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

---

### 6. JOB QUEUE VERIFICATION

**Test Job Enqueue & Processing:**
```javascript
const { jobQueue } = require('./api/job-queue');

// Start queue
await jobQueue.start();

// Enqueue test job
const result = await jobQueue.enqueue('SEND_EMAIL', {
    to: 'test@example.com',
    subject: 'Test',
    html: '<h1>Test Email</h1>'
}, { jobId: 'test-job-123' });

console.log(result); // { jobId: 'test-job-123', status: 'QUEUED' }

// Wait for processing
await new Promise(r => setTimeout(r, 5000));

// Check stats
const stats = await jobQueue.getStats();
console.log(stats); // Should show COMPLETED: 1
```

**Verify in Database:**
```sql
SELECT * FROM job_queue WHERE id = 'test-job-123';
-- status should be 'COMPLETED'
```

**Test Idempotency:**
```javascript
// Send same jobId twice
await jobQueue.enqueue('SEND_EMAIL', {...}, { jobId: 'duplicate-test' });
await jobQueue.enqueue('SEND_EMAIL', {...}, { jobId: 'duplicate-test' });

// Check database - should only have 1 job
```

**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

---

### 7. RETRY & DEAD LETTER QUEUE VERIFICATION

**Test Failed Job Retry:**
```javascript
// Register a failing handler
jobQueue.registerHandler('TEST_FAIL', async (payload) => {
    throw new Error('Simulated failure');
});

// Enqueue job
await jobQueue.enqueue('TEST_FAIL', { test: 'data' }, { 
    jobId: 'fail-test' 
});

// Wait for retries (5s delay per retry)
await new Promise(r => setTimeout(r, 20000));
```

**Verify in Database:**
```sql
-- Check job moved to dead letter queue
SELECT * FROM dead_letter_queue WHERE original_job_id = 'fail-test';

-- Check retry count
SELECT retry_count FROM job_queue WHERE id = 'fail-test';
-- Should be 3 (max retries)
```

**Expected:**
- Job retried 3 times
- After 3rd failure, moved to dead_letter_queue
- Retry delays: ~5s, ~10s, ~20s (exponential backoff)

**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

---

### 8. BUSINESS RULES VERIFICATION

**Test Refund Eligibility Rules:**
```javascript
const { businessRules } = require('./api/business-rules');

// Create test enrollment (day 50 - not eligible)
await supabase.from('enrollments').insert({
    user_id: 'test-user',
    program_start_date: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
    interview_count: 2
});

const result = await businessRules.isRefundEligible('test-user');
console.log(result);
// { eligible: false, reason: 'BEFORE_100_DAYS', currentDay: 50, daysRemaining: 50 }
```

**Test Cases:**
1. Day 50, 2 interviews → Not eligible (before day 100)
2. Day 120, 3 interviews → Eligible
3. Day 120, 6 interviews → Not eligible (interview threshold met)
4. Day 190, 2 interviews → Not eligible (after day 180)

**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

---

### 9. CIRCUIT BREAKER VERIFICATION

**Test Database Circuit Breaker:**
```bash
# Stop database
docker stop postgres  # Or equivalent

# Send request requiring database
curl http://localhost:3000/health

# After 5 failures, circuit should OPEN
# Subsequent requests should fail fast (no 5s timeout)
```

**Expected:**
```json
{
  "status": "degraded",
  "checks": {
    "database": "failed"
  }
}
```

**Restart Database:**
```bash
docker start postgres
curl http://localhost:3000/health
# Circuit should auto-recover after successful request
```

**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

---

### 10. OBSERVABILITY VERIFICATION

**Test Request Tracing:**
```bash
curl -H "X-Request-Id: custom-trace-123" \
     http://localhost:3000/api/some-endpoint
```

**Check Logs:**
```bash
# Should see structured JSON logs
cat logs/app.log | grep "custom-trace-123"
```

**Expected Log Entries:**
```json
{"type":"request","requestId":"custom-trace-123","method":"GET","path":"/api/some-endpoint",...}
{"type":"response","requestId":"custom-trace-123","status":200,"duration":45,...}
```

**Verify Audit Log:**
```sql
SELECT * FROM audit_log WHERE request_id = 'custom-trace-123';
```

**Test Metrics Endpoint:**
```bash
# Login as admin first, get token
TOKEN="your-admin-token"

curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/metrics
```

**Expected Response:**
```json
{
  "totalRequests": 1523,
  "avgDuration": 127,
  "errorRate": 0.023,
  "metrics": [...]
}
```

**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

---

### 11. INPUT VALIDATION VERIFICATION

**Test Malicious Input Handling:**
```bash
# SQL injection attempt
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"test","name":"Robert\"; DROP TABLE users;--"}'

# Expected: Input sanitized, no SQL executed

# XSS attempt
curl -X POST http://localhost:3000/api/submit-application \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(\"XSS\")</script>","email":"test@example.com"}'

# Expected: Script tags removed/escaped

# Oversized payload
dd if=/dev/zero bs=1M count=20 | curl -X POST \
  http://localhost:3000/api/upload \
  -H "Content-Type: application/json" \
  --data-binary @-

# Expected: 413 Payload Too Large (>10KB limit)
```

**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

---

### 12. ERROR HANDLING VERIFICATION

**Test Structured Error Responses:**
```bash
# Validation error
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid","password":"test"}'
```

**Expected Response:**
```json
{
  "error": "Invalid email format",
  "code": "VALIDATION_ERROR",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-17T15:30:00.000Z"
}
```

**Verify:**
- ✓ Never exposes stack traces (production)
- ✓ Includes request ID for tracing
- ✓ Machine-readable error code
- ✓ User-friendly message

**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

---

## 📊 LOAD TESTING (Optional but Recommended)

### Test Under Load

**Install wrk:**
```bash
brew install wrk  # macOS
```

**Run Load Test:**
```bash
# 100 connections, 10 threads, 30 seconds
wrk -t10 -c100 -d30s http://localhost:3000/health

# With POST requests
wrk -t10 -c100 -d30s -s post.lua http://localhost:3000/api/submit-application
```

**Create `post.lua`:**
```lua
wrk.method = "POST"
wrk.headers["Content-Type"] = "application/json"
wrk.headers["Idempotency-Key"] = function()
    return "load-test-" .. math.random(1, 1000000)
end
wrk.body = '{"name":"Load Test","email":"test@example.com"}'
```

**Monitor:**
- Response times should stay <500ms
- Error rate should stay <1%
- No memory leaks (check `top` or `htop`)
- Circuit breakers should NOT open

**Status:** ☐ Not Started | ☐ In Progress | ☐ Complete

---

## ✅ SIGN-OFF CHECKLIST

Before deploying to production, ALL must pass:

- [ ] Database schema updated (5 new tables)
- [ ] Startup completes without errors
- [ ] Shutdown is graceful (waits for requests)
- [ ] Idempotency prevents duplicates
- [ ] State machines reject invalid transitions
- [ ] Job queue processes jobs successfully
- [ ] Failed jobs move to dead letter queue after retries
- [ ] Business rules enforce constraints
- [ ] Circuit breakers open/close correctly
- [ ] All requests have unique IDs
- [ ] Metrics endpoint returns data
- [ ] Malicious inputs are sanitized
- [ ] Errors are structured (no stack traces)
- [ ] Load test passes (optional)

---

## 🚀 READY FOR PRODUCTION

**Once all checks pass:**
1. Update frontend to use idempotency keys
2. Configure monitoring alerts on `/health`
3. Set up log aggregation (e.g., LogDNA, Papertrail)
4. Deploy to staging first
5. Run smoke tests
6. Deploy to production

**The infrastructure is now hardened against:**
- Duplicate operations
- Invalid state transitions
- Job failures
- Malicious inputs
- Partial failures
- Traffic spikes
- Dependency failures

**You can now safely add features.**
