// ==================== CENTRALIZED BUSINESS RULES ====================
// All business logic in one place - NO business rules in controllers/routes

const { createClient } = require('@supabase/supabase-js');

class BusinessRules {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_KEY
        );
    }
    
    // ==================== APPLICATION RULES ====================
    
    async canSubmitApplication(userId) {
        // Rule: User can only have one active application
        const { data: existing } = await this.supabase
            .from('applications')
            .select('id, status')
            .eq('user_id', userId)
            .in('status', ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PAYMENT_PENDING'])
            .single();
        
        if (existing) {
            return { 
                allowed: false, 
                reason: 'ACTIVE_APPLICATION_EXISTS',
                message: 'You already have an active application'
            };
        }
        
        return { allowed: true };
    }
    
    async isApplicationComplete(applicationData) {
        // Rule: Required fields for submission
        const required = ['full_name', 'email', 'phone', 'experience_level', 'goals'];
        const missing = required.filter(field => !applicationData[field]);
        
        if (missing.length > 0) {
            return {
                complete: false,
                missing: missing,
                message: `Missing required fields: ${missing.join(', ')}`
            };
        }
        
        return { complete: true };
    }
    
    // ==================== ENROLLMENT RULES ====================
    
    async canEnroll(userId, planType) {
        // Rule: User must have approved application
        const { data: application } = await this.supabase
            .from('applications')
            .select('status')
            .eq('user_id', userId)
            .eq('status', 'APPROVED')
            .single();
        
        if (!application) {
            return {
                allowed: false,
                reason: 'NO_APPROVED_APPLICATION',
                message: 'No approved application found'
            };
        }
        
        // Rule: User must not already be enrolled
        const { data: enrollment } = await this.supabase
            .from('enrollments')
            .select('id')
            .eq('user_id', userId)
            .in('status', ['ACTIVE', 'ONBOARDING'])
            .single();
        
        if (enrollment) {
            return {
                allowed: false,
                reason: 'ALREADY_ENROLLED',
                message: 'User is already enrolled'
            };
        }
        
        return { allowed: true };
    }
    
    async calculateProgramDay(startDate) {
        // Rule: Program day calculation
        const now = new Date();
        const start = new Date(startDate);
        const diffMs = now - start;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        return Math.max(0, diffDays);
    }
    
    // ==================== REFUND RULES ====================
    
    async isRefundEligible(userId) {
        const { data: enrollment } = await this.supabase
            .from('enrollments')
            .select('program_start_date, interview_count, plan_type')
            .eq('user_id', userId)
            .single();
        
        if (!enrollment) {
            return { 
                eligible: false, 
                reason: 'NO_ENROLLMENT',
                message: 'No active enrollment found'
            };
        }
        
        // CRITICAL: If 5+ interviews received, NO REFUND AT ANY STAGE
        const REQUIRED_INTERVIEWS = 5;
        if (enrollment.interview_count >= REQUIRED_INTERVIEWS) {
            return {
                eligible: false,
                reason: 'GUARANTEE_FULFILLED',
                message: `Interview guarantee fulfilled (${enrollment.interview_count} interviews). No refund available.`,
                interviewCount: enrollment.interview_count
            };
        }
        
        const programDay = await this.calculateProgramDay(enrollment.program_start_date);
        const ADMIN_FEE = 250;
        
        // Get plan amount
        const planAmounts = {
            'accelerator': 1299,
            'professional': 1999,
            'elite': 2999
        };
        const planAmount = planAmounts[enrollment.plan_type] || 0;
        
        // Days 1-7: 70% refund minus admin fee (initial onboarding only)
        if (programDay <= 7) {
            const refundAmount = Math.max(0, (planAmount * 0.70) - ADMIN_FEE);
            return {
                eligible: true,
                reason: 'INITIAL_ONBOARDING',
                message: 'Eligible for 70% refund (Days 1-7)',
                currentDay: programDay,
                refundPercentage: 70,
                refundAmount: refundAmount,
                adminFee: ADMIN_FEE
            };
        }
        
        // Days 8-30: 40% refund minus admin fee (foundation phase active)
        if (programDay <= 30) {
            const refundAmount = Math.max(0, (planAmount * 0.40) - ADMIN_FEE);
            return {
                eligible: true,
                reason: 'FOUNDATION_PHASE',
                message: 'Eligible for 40% refund (Days 8-30)',
                currentDay: programDay,
                refundPercentage: 40,
                refundAmount: refundAmount,
                adminFee: ADMIN_FEE
            };
        }
        
        // Days 31-100: 20% refund minus admin fee (development phase)
        if (programDay <= 100) {
            const refundAmount = Math.max(0, (planAmount * 0.20) - ADMIN_FEE);
            return {
                eligible: true,
                reason: 'DEVELOPMENT_PHASE',
                message: 'Eligible for 20% refund (Days 31-100)',
                currentDay: programDay,
                refundPercentage: 20,
                refundAmount: refundAmount,
                adminFee: ADMIN_FEE
            };
        }
        
        // Days 101-180: Outcome-based (15% if <5 interviews AND 90%+ attendance)
        if (programDay <= 180) {
            const REQUIRED_INTERVIEWS = 5;
            if (enrollment.interview_count >= REQUIRED_INTERVIEWS) {
                return {
                    eligible: false,
                    reason: 'INTERVIEW_THRESHOLD_MET',
                    message: `Interview guarantee fulfilled (${enrollment.interview_count} qualifying interviews)`,
                    currentDay: programDay,
                    interviewCount: enrollment.interview_count
                };
            }
            
            // Check participation requirements
            const participationCheck = await this.checkParticipationRequirements(userId);
            
            if (!participationCheck.meetsRequirements) {
                return {
                    eligible: false,
                    reason: 'PARTICIPATION_REQUIREMENTS_NOT_MET',
                    message: 'Refund ineligible: Participation requirements not fulfilled',
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
            
            const refundAmount = Math.max(0, (planAmount * 0.15) - ADMIN_FEE);
            return {
                eligible: true,
                reason: 'INTERVIEW_PHASE',
                message: 'Eligible for 15% refund (Days 100-180, <5 interviews, requirements met)',
                currentDay: programDay,
                refundPercentage: 15,
                refundAmount: refundAmount,
                adminFee: ADMIN_FEE,
                interviewCount: enrollment.interview_count,
                interviewsRemaining: REQUIRED_INTERVIEWS - enrollment.interview_count,
                participationVerified: true
            };
        }
        
        // After day 180: No refund
        return {
            eligible: false,
            reason: 'AFTER_180_DAYS',
            message: 'Refund window closed (full program delivered)',
            currentDay: programDay
        };
    }
    
    // Check participation requirements for refund eligibility
    async checkParticipationRequirements(userId) {
        const failures = [];
        
        // Get enrollment and participation data
        const { data: enrollment } = await this.supabase
            .from('enrollments')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        // 1. Check attendance (90%+ required)
        const { data: sessions } = await this.supabase
            .from('mentorship_sessions')
            .select('status')
            .eq('user_id', userId);
        
        if (sessions && sessions.length > 0) {
            const attended = sessions.filter(s => s.status === 'completed').length;
            const attendanceRate = (attended / sessions.length) * 100;
            
            if (attendanceRate < 90) {
                failures.push({
                    requirement: 'Attendance',
                    expected: '90%+',
                    actual: `${attendanceRate.toFixed(1)}%`,
                    status: 'FAILED'
                });
            }
        }
        
        // 2. Check projects completion (all required)
        const { data: projects } = await this.supabase
            .from('projects')
            .select('status')
            .eq('user_id', userId);
        
        if (projects) {
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
        
        // 3. Check job applications (50+ required)
        // Note: This would need an applications tracking table
        // For now, we'll add it to the failure list as a manual review item
        
        // 4. Check interview acceptance rate (100% required)
        const { data: interviewsOffered } = await this.supabase
            .from('interviews')
            .select('status')
            .eq('user_id', userId)
            .in('status', ['scheduled', 'completed', 'declined', 'no_show']);
        
        if (interviewsOffered && interviewsOffered.length > 0) {
            const declined = interviewsOffered.filter(i => i.status === 'declined' || i.status === 'no_show').length;
            if (declined > 0) {
                failures.push({
                    requirement: 'Interview Participation',
                    expected: '100% acceptance',
                    actual: `${declined} declined/missed`,
                    status: 'FAILED'
                });
            }
        }
        
        return {
            meetsRequirements: failures.length === 0,
            failures: failures,
            requiresManualReview: true, // Always require admin review for refunds
            checked: {
                attendance: true,
                projects: true,
                interviews: true,
                applications: false // Needs manual verification
            }
        };
    }
    
    // Calculate refund amount based on current program day
    calculateRefundAmount(planType, programDay, interviewCount) {
        const planAmounts = {
            'accelerator': 1299,
            'professional': 1999,
            'elite': 2999
        };
        const planAmount = planAmounts[planType] || 0;
        const ADMIN_FEE = 250;
        
        if (programDay <= 7) {
            return Math.max(0, (planAmount * 0.70) - ADMIN_FEE);
        } else if (programDay <= 30) {
            return Math.max(0, (planAmount * 0.40) - ADMIN_FEE);
        } else if (programDay <= 100) {
            return Math.max(0, (planAmount * 0.20) - ADMIN_FEE);
        } else if (programDay <= 180 && interviewCount < 5) {
            return Math.max(0, (planAmount * 0.15) - ADMIN_FEE);
        }
        return 0;
    }
    
    // ==================== PAYMENT RULES ====================
    
    getPlanPricing(planType) {
        const pricing = {
            'accelerator': { upfront: 1299, successFee: 0.15, name: 'Accelerator' },
            'professional': { upfront: 1999, successFee: 0.12, name: 'Professional' },
            'elite': { upfront: 2999, successFee: 0.08, name: 'Elite' }
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
        // Rule: Payment required if enrollment approved but not paid
        const { data: enrollment } = await this.supabase
            .from('enrollments')
            .select('payment_status')
            .eq('user_id', userId)
            .single();
        
        if (!enrollment) {
            return { required: false };
        }
        
        return {
            required: enrollment.payment_status !== 'PAID',
            status: enrollment.payment_status
        };
    }
    
    // ==================== INTERVIEW TRACKING RULES ====================
    
    async isQualifyingInterview(interviewData) {
        // Rule: Qualifying interview criteria
        const required = {
            minDuration: 30, // minutes
            validTypes: ['PHONE_SCREEN', 'TECHNICAL', 'BEHAVIORAL', 'ONSITE', 'FINAL'],
            minStage: 1
        };
        
        if (interviewData.duration_minutes < required.minDuration) {
            return {
                qualifying: false,
                reason: 'DURATION_TOO_SHORT',
                message: `Interview must be at least ${required.minDuration} minutes`
            };
        }
        
        if (!required.validTypes.includes(interviewData.interview_type)) {
            return {
                qualifying: false,
                reason: 'INVALID_TYPE',
                message: 'Interview type not recognized as qualifying'
            };
        }
        
        return { qualifying: true };
    }
    
    async updateInterviewCount(userId) {
        // Recalculate interview count based on qualifying interviews
        const { data: interviews } = await this.supabase
            .from('interviews')
            .select('id')
            .eq('user_id', userId)
            .eq('is_qualifying', true);
        
        const count = interviews?.length || 0;
        
        await this.supabase
            .from('enrollments')
            .update({ interview_count: count })
            .eq('user_id', userId);
        
        return count;
    }
    
    // ==================== TIMELINE RULES ====================
    
    async getMilestoneDeadlines(startDate) {
        const start = new Date(startDate);
        
        return {
            foundationPhaseEnd: new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000), // Day 14
            buildPhaseEnd: new Date(start.getTime() + 49 * 24 * 60 * 60 * 1000), // Day 49
            interviewGoal: new Date(start.getTime() + 100 * 24 * 60 * 60 * 1000), // Day 100
            refundWindowClose: new Date(start.getTime() + 180 * 24 * 60 * 60 * 1000), // Day 180
            programEnd: new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000) // Day 365
        };
    }
    
    // ==================== VALIDATION RULES ====================
    
    validateApplicationData(data) {
        const errors = [];
        
        // Email validation
        if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            errors.push({ field: 'email', message: 'Valid email required' });
        }
        
        // Phone validation
        if (!data.phone || data.phone.replace(/\D/g, '').length < 10) {
            errors.push({ field: 'phone', message: 'Valid phone number required' });
        }
        
        // Experience level validation
        const validExperience = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
        if (!validExperience.includes(data.experience_level)) {
            errors.push({ field: 'experience_level', message: 'Invalid experience level' });
        }
        
        // Goals validation
        if (!data.goals || data.goals.trim().length < 20) {
            errors.push({ field: 'goals', message: 'Goals must be at least 20 characters' });
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    // ==================== STATE TRANSITION RULES ====================
    
    canTransitionApplicationStatus(currentStatus, newStatus) {
        const validTransitions = {
            'DRAFT': ['SUBMITTED', 'CANCELLED'],
            'SUBMITTED': ['UNDER_REVIEW', 'CANCELLED'],
            'UNDER_REVIEW': ['APPROVED', 'REJECTED', 'NEEDS_INFO'],
            'NEEDS_INFO': ['SUBMITTED', 'CANCELLED'],
            'APPROVED': ['PAYMENT_PENDING'],
            'PAYMENT_PENDING': ['ENROLLED', 'PAYMENT_FAILED'],
            'PAYMENT_FAILED': ['PAYMENT_PENDING', 'CANCELLED']
        };
        
        const allowed = validTransitions[currentStatus] || [];
        return allowed.includes(newStatus);
    }
}

// Singleton instance
const businessRules = new BusinessRules();

module.exports = { businessRules, BusinessRules };
