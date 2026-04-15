// ==================== CENTRALIZED BUSINESS RULES ====================
// All business logic lives here. Routes must not contain business logic.
//
// PHASE 2 FIX: Two parallel data stores
// ─────────────────────────────────────
// The original code had BusinessRules querying Supabase while server.js routes
// used LocalApiStore (flat JSON files). These were completely separate databases:
// an application saved through the API would appear in LocalApiStore but not in
// Supabase, so BusinessRules.canSubmitApplication() would always say "allowed"
// because it could never see the application.
//
// Resolution strategy:
//   1. BusinessRules now accepts a store adapter in its constructor.
//   2. When Supabase credentials are present, it uses SupabaseAdapter (real DB).
//   3. When they are absent, it uses LocalStoreAdapter (wraps LocalApiStore).
//   4. Both adapters expose the same interface, so business rules are identical.
//   5. server.js passes its localStore instance into BusinessRules so there is
//      exactly ONE data source at any given time.
//
// This means you can develop and test locally with zero external dependencies,
// and switch to Supabase in production just by setting SUPABASE_URL + SUPABASE_KEY.

const { getConfig } = require('./config');

// ─── Store adapters ────────────────────────────────────────────────────────────

class SupabaseAdapter {
  constructor(supabaseClient) {
    this._db = supabaseClient;
  }

  async getActiveApplication(userId) {
    const { data, error } = await this._db
      .from('applications')
      .select('id, status')
      .eq('user_id', userId)
      .in('status', ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PAYMENT_PENDING'])
      .maybeSingle();
    if (error) throw new Error(`DB error (getActiveApplication): ${error.message}`);
    return data || null;
  }

  async getApprovedApplication(userId) {
    const { data, error } = await this._db
      .from('applications')
      .select('status')
      .eq('user_id', userId)
      .eq('status', 'APPROVED')
      .maybeSingle();
    if (error) throw new Error(`DB error (getApprovedApplication): ${error.message}`);
    return data || null;
  }

  async getActiveEnrollment(userId) {
    const { data, error } = await this._db
      .from('enrollments')
      .select('id, program_start_date, interview_count, plan_type, payment_status')
      .eq('user_id', userId)
      .in('status', ['ACTIVE', 'ONBOARDING'])
      .maybeSingle();
    if (error) throw new Error(`DB error (getActiveEnrollment): ${error.message}`);
    return data || null;
  }

  async getEnrollment(userId) {
    const { data, error } = await this._db
      .from('enrollments')
      .select('program_start_date, interview_count, plan_type, payment_status')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error(`DB error (getEnrollment): ${error.message}`);
    return data || null;
  }

  async getMentorshipSessions(userId) {
    const { data, error } = await this._db
      .from('mentorship_sessions')
      .select('status')
      .eq('user_id', userId);
    if (error) throw new Error(`DB error (getMentorshipSessions): ${error.message}`);
    return data || [];
  }

  async getProjects(userId) {
    const { data, error } = await this._db
      .from('projects')
      .select('status')
      .eq('user_id', userId);
    if (error) throw new Error(`DB error (getProjects): ${error.message}`);
    return data || [];
  }

  async getInterviewsForUser(userId) {
    const { data, error } = await this._db
      .from('interviews')
      .select('status, is_qualifying')
      .eq('user_id', userId);
    if (error) throw new Error(`DB error (getInterviewsForUser): ${error.message}`);
    return data || [];
  }

  async updateInterviewCount(userId, count) {
    const { error } = await this._db
      .from('enrollments')
      .update({ interview_count: count })
      .eq('user_id', userId);
    if (error) throw new Error(`DB error (updateInterviewCount): ${error.message}`);
  }
}

// Wraps LocalApiStore so BusinessRules can operate without Supabase.
// Only implements what BusinessRules actually needs — no-ops return safe defaults
// for features (e.g. mentorship sessions) not tracked in the file store.
class LocalStoreAdapter {
  constructor(localStore) {
    this._store = localStore;
  }

  async getActiveApplication(userId) {
    const all = await this._store.listApplications();
    const activeStatuses = new Set(['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PAYMENT_PENDING']);
    return all.find(a => String(a.user_id) === String(userId) && activeStatuses.has(a.status)) || null;
  }

  async getApprovedApplication(userId) {
    const all = await this._store.listApplications();
    return all.find(a => String(a.user_id) === String(userId) && a.status === 'APPROVED') || null;
  }

  async getActiveEnrollment(userId) {
    // File store doesn't have an enrollments table yet — return null (not enrolled).
    // When you migrate to Supabase this comes for free via SupabaseAdapter.
    return null;
  }

  async getEnrollment(userId) {
    return null;
  }

  async getMentorshipSessions(userId) {
    // Not tracked in file store — return empty (no failures from missing data).
    return [];
  }

  async getProjects(userId) {
    return [];
  }

  async getInterviewsForUser(userId) {
    const interviews = await this._store.listInterviewsForUser({ userId });
    return interviews.map(i => ({
      status: i.outcome === 'REJECTED' ? 'declined' : 'completed',
      is_qualifying: i.outcome !== 'REJECTED'
    }));
  }

  async updateInterviewCount(_userId, _count) {
    // No-op for file store — count is derived on-the-fly from the interviews array.
  }
}

// ─── BusinessRules ─────────────────────────────────────────────────────────────

class BusinessRules {
  // PHASE 2 FIX: Constructor accepts an explicit store rather than always
  // creating a Supabase client. This eliminates the silent null client when
  // SUPABASE_URL / SUPABASE_KEY are not set.
  constructor(storeAdapter) {
    if (!storeAdapter) {
      throw new Error('BusinessRules requires a store adapter. Pass a LocalStoreAdapter or SupabaseAdapter.');
    }
    this._store = storeAdapter;
  }

  // Factory — call this instead of `new BusinessRules()` directly.
  // Picks the right adapter based on whether Supabase credentials are available.
  static create(localStore) {
    const config = getConfig();

    if (config.supabaseUrl && config.supabaseKey) {
      try {
        const { createClient } = require('@supabase/supabase-js');
        const client = createClient(config.supabaseUrl, config.supabaseKey);
        console.log('[BusinessRules] Using Supabase adapter');
        return new BusinessRules(new SupabaseAdapter(client));
      } catch (err) {
        // @supabase/supabase-js not installed — fall through to local store.
        console.warn('[BusinessRules] Supabase client unavailable, falling back to local store:', err.message);
      }
    }

    if (!localStore) {
      throw new Error('BusinessRules.create() requires a localStore when Supabase is not configured');
    }

    console.log('[BusinessRules] Using local file-store adapter (no Supabase credentials)');
    return new BusinessRules(new LocalStoreAdapter(localStore));
  }

  // ==================== APPLICATION RULES ====================

  async canSubmitApplication(userId) {
    const existing = await this._store.getActiveApplication(userId);
    if (existing) {
      return {
        allowed: false,
        reason: 'ACTIVE_APPLICATION_EXISTS',
        message: 'You already have an active application'
      };
    }
    return { allowed: true };
  }

  isApplicationComplete(applicationData) {
    // Sync — no DB needed, just field checks.
    if (!applicationData || typeof applicationData !== 'object') {
      return { complete: false, missing: [], message: 'Invalid application data' };
    }
    const required = ['full_name', 'email', 'phone', 'experience_level', 'goals'];
    // Use .trim() so empty strings ('') are treated the same as missing fields.
    const missing = required.filter(field => !String(applicationData[field] || '').trim());
    if (missing.length > 0) {
      return {
        complete: false,
        missing,
        message: `Missing required fields: ${missing.join(', ')}`
      };
    }
    return { complete: true };
  }

  // ==================== ENROLLMENT RULES ====================

  async canEnroll(userId, planType) {
    const application = await this._store.getApprovedApplication(userId);
    if (!application) {
      return {
        allowed: false,
        reason: 'NO_APPROVED_APPLICATION',
        message: 'No approved application found'
      };
    }

    const enrollment = await this._store.getActiveEnrollment(userId);
    if (enrollment) {
      return {
        allowed: false,
        reason: 'ALREADY_ENROLLED',
        message: 'User is already enrolled'
      };
    }

    return { allowed: true };
  }

  calculateProgramDay(startDate) {
    // Sync — pure math.
    const diffMs = Date.now() - new Date(startDate).getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  // ==================== REFUND RULES ====================

  async isRefundEligible(userId) {
    const enrollment = await this._store.getEnrollment(userId);

    if (!enrollment) {
      return {
        eligible: false,
        reason: 'NO_ENROLLMENT',
        message: 'No active enrollment found'
      };
    }

    const REQUIRED_INTERVIEWS = 5;
    if ((enrollment.interview_count || 0) >= REQUIRED_INTERVIEWS) {
      return {
        eligible: false,
        reason: 'GUARANTEE_FULFILLED',
        message: `Interview guarantee fulfilled (${enrollment.interview_count} interviews). No refund available.`,
        interviewCount: enrollment.interview_count
      };
    }

    const programDay = this.calculateProgramDay(enrollment.program_start_date);
    const ADMIN_FEE = 250;
    const planAmounts = { accelerator: 1299, professional: 1999, elite: 2999 };
    const planAmount = planAmounts[enrollment.plan_type] || 0;

    if (programDay <= 7) {
      return {
        eligible: true,
        reason: 'INITIAL_ONBOARDING',
        message: 'Eligible for 70% refund (Days 1-7)',
        currentDay: programDay,
        refundPercentage: 70,
        refundAmount: Math.max(0, (planAmount * 0.70) - ADMIN_FEE),
        adminFee: ADMIN_FEE
      };
    }

    if (programDay <= 30) {
      return {
        eligible: true,
        reason: 'FOUNDATION_PHASE',
        message: 'Eligible for 40% refund (Days 8-30)',
        currentDay: programDay,
        refundPercentage: 40,
        refundAmount: Math.max(0, (planAmount * 0.40) - ADMIN_FEE),
        adminFee: ADMIN_FEE
      };
    }

    if (programDay <= 100) {
      return {
        eligible: true,
        reason: 'DEVELOPMENT_PHASE',
        message: 'Eligible for 20% refund (Days 31-100)',
        currentDay: programDay,
        refundPercentage: 20,
        refundAmount: Math.max(0, (planAmount * 0.20) - ADMIN_FEE),
        adminFee: ADMIN_FEE
      };
    }

    if (programDay <= 180) {
      const interviewCount = enrollment.interview_count || 0;
      if (interviewCount >= REQUIRED_INTERVIEWS) {
        return {
          eligible: false,
          reason: 'INTERVIEW_THRESHOLD_MET',
          message: `Interview guarantee fulfilled (${interviewCount} qualifying interviews)`,
          currentDay: programDay,
          interviewCount
        };
      }

      const participationCheck = await this.checkParticipationRequirements(userId);
      if (!participationCheck.meetsRequirements) {
        return {
          eligible: false,
          reason: 'PARTICIPATION_REQUIREMENTS_NOT_MET',
          message: 'Refund ineligible: participation requirements not fulfilled',
          currentDay: programDay,
          failedRequirements: participationCheck.failures,
          requirements: {
            attendanceRequired: '90%+',
            applicationsRequired: 50,
            projectsRequired: 'All completed',
            interviewAcceptanceRequired: '100%'
          }
        };
      }

      return {
        eligible: true,
        reason: 'INTERVIEW_PHASE',
        message: 'Eligible for 15% refund (Days 100-180, <5 interviews, requirements met)',
        currentDay: programDay,
        refundPercentage: 15,
        refundAmount: Math.max(0, (planAmount * 0.15) - ADMIN_FEE),
        adminFee: ADMIN_FEE,
        interviewCount,
        interviewsRemaining: REQUIRED_INTERVIEWS - interviewCount,
        participationVerified: true
      };
    }

    return {
      eligible: false,
      reason: 'AFTER_180_DAYS',
      message: 'Refund window closed (full program delivered)',
      currentDay: programDay
    };
  }

  async checkParticipationRequirements(userId) {
    const failures = [];

    // 1. Attendance (90%+ required)
    const sessions = await this._store.getMentorshipSessions(userId);
    if (sessions.length > 0) {
      const attended = sessions.filter(s => s.status === 'completed').length;
      const rate = (attended / sessions.length) * 100;
      if (rate < 90) {
        failures.push({
          requirement: 'Attendance',
          expected: '90%+',
          actual: `${rate.toFixed(1)}%`,
          status: 'FAILED'
        });
      }
    }

    // 2. Projects (all must be completed)
    const projects = await this._store.getProjects(userId);
    if (projects.length > 0) {
      const incomplete = projects.filter(p => p.status !== 'completed').length;
      if (incomplete > 0) {
        failures.push({
          requirement: 'Projects',
          expected: 'All completed',
          actual: `${incomplete} incomplete`,
          status: 'FAILED'
        });
      }
    }

    // 3. Job applications (50+ required — needs manual review, flag it)
    // Not automatically verifiable without a tracking table.

    // 4. Interview acceptance (100% required)
    const interviews = await this._store.getInterviewsForUser(userId);
    if (interviews.length > 0) {
      const declined = interviews.filter(i => i.status === 'declined' || i.status === 'no_show').length;
      if (declined > 0) {
        failures.push({
          requirement: 'Interview participation',
          expected: '100% acceptance',
          actual: `${declined} declined/missed`,
          status: 'FAILED'
        });
      }
    }

    return {
      meetsRequirements: failures.length === 0,
      failures,
      requiresManualReview: true,
      checked: {
        attendance: sessions.length > 0,
        projects: projects.length > 0,
        interviews: true,
        applications: false  // Requires manual verification
      }
    };
  }

  calculateRefundAmount(planType, programDay, interviewCount) {
    const planAmounts = { accelerator: 1299, professional: 1999, elite: 2999 };
    const planAmount = planAmounts[planType] || 0;
    const ADMIN_FEE = 250;

    if (programDay <= 7) return Math.max(0, (planAmount * 0.70) - ADMIN_FEE);
    if (programDay <= 30) return Math.max(0, (planAmount * 0.40) - ADMIN_FEE);
    if (programDay <= 100) return Math.max(0, (planAmount * 0.20) - ADMIN_FEE);
    if (programDay <= 180 && interviewCount < 5) return Math.max(0, (planAmount * 0.15) - ADMIN_FEE);
    return 0;
  }

  // ==================== PAYMENT RULES ====================

  getPlanPricing(planType) {
    const pricing = {
      accelerator: { upfront: 1299, successFee: 0.15, name: 'Accelerator' },
      professional: { upfront: 1999, successFee: 0.12, name: 'Professional' },
      elite: { upfront: 2999, successFee: 0.08, name: 'Elite' }
    };
    if (!pricing[planType]) {
      throw new Error(`Invalid plan type: ${planType}`);
    }
    return pricing[planType];
  }

  calculateSuccessFee(salary, planType) {
    const plan = this.getPlanPricing(planType);
    return Math.round(salary * plan.successFee);
  }

  async isPaymentRequired(userId) {
    const enrollment = await this._store.getEnrollment(userId);
    if (!enrollment) return { required: false };
    return {
      required: enrollment.payment_status !== 'PAID',
      status: enrollment.payment_status
    };
  }

  // ==================== INTERVIEW TRACKING RULES ====================

  isQualifyingInterview(interviewData) {
    // Sync — no DB needed.
    const VALID_TYPES = ['PHONE_SCREEN', 'TECHNICAL', 'BEHAVIORAL', 'ONSITE', 'FINAL'];
    const MIN_DURATION = 30;

    if ((interviewData.duration_minutes || 0) < MIN_DURATION) {
      return {
        qualifying: false,
        reason: 'DURATION_TOO_SHORT',
        message: `Interview must be at least ${MIN_DURATION} minutes`
      };
    }

    if (!VALID_TYPES.includes(interviewData.interview_type)) {
      return {
        qualifying: false,
        reason: 'INVALID_TYPE',
        message: 'Interview type not recognized as qualifying'
      };
    }

    return { qualifying: true };
  }

  async updateInterviewCount(userId) {
    const interviews = await this._store.getInterviewsForUser(userId);
    const count = interviews.filter(i => i.is_qualifying === true).length;
    await this._store.updateInterviewCount(userId, count);
    return count;
  }

  // ==================== TIMELINE RULES ====================

  getMilestoneDeadlines(startDate) {
    // Sync — pure date math.
    const start = new Date(startDate).getTime();
    const days = n => new Date(start + n * 24 * 60 * 60 * 1000);
    return {
      foundationPhaseEnd: days(14),
      buildPhaseEnd: days(49),
      interviewGoal: days(100),
      refundWindowClose: days(180),
      programEnd: days(365)
    };
  }

  // ==================== VALIDATION RULES ====================

  validateApplicationData(data) {
    // Sync — pure validation.
    const errors = [];

    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push({ field: 'email', message: 'Valid email required' });
    }

    if (!data.phone || data.phone.replace(/\D/g, '').length < 10) {
      errors.push({ field: 'phone', message: 'Valid phone number required' });
    }

    const validExperience = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
    if (!validExperience.includes(data.experience_level)) {
      errors.push({ field: 'experience_level', message: 'Invalid experience level' });
    }

    if (!data.goals || data.goals.trim().length < 20) {
      errors.push({ field: 'goals', message: 'Goals must be at least 20 characters' });
    }

    return { valid: errors.length === 0, errors };
  }

  // ==================== STATE TRANSITION RULES ====================

  canTransitionApplicationStatus(currentStatus, newStatus) {
    const validTransitions = {
      DRAFT: ['SUBMITTED', 'CANCELLED'],
      SUBMITTED: ['UNDER_REVIEW', 'CANCELLED'],
      UNDER_REVIEW: ['APPROVED', 'REJECTED', 'NEEDS_INFO'],
      NEEDS_INFO: ['SUBMITTED', 'CANCELLED'],
      APPROVED: ['PAYMENT_PENDING'],
      PAYMENT_PENDING: ['ENROLLED', 'PAYMENT_FAILED'],
      PAYMENT_FAILED: ['PAYMENT_PENDING', 'CANCELLED']
    };
    return (validTransitions[currentStatus] || []).includes(newStatus);
  }
}

module.exports = { BusinessRules, SupabaseAdapter, LocalStoreAdapter };
