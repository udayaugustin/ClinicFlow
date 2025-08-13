# User Story: Multi-Portal Authentication System

## Story ID: AUTH-001
**Feature:** Separate Authentication Portals for Different User Types
**Priority:** High
**Estimated Effort:** 8-13 days
**Epic:** Authentication & Security Enhancement

---

## Executive Summary

Implement separate login interfaces and authentication flows for different user types to improve security, user experience, and system organization. This will create three distinct authentication portals: Admin Portal (Super Admin/Clinic Admin), Patient Portal (Mobile + MPIN), and Staff Portal (Attender username/password).

---

## User Story

**As a** ClinicFlow system administrator  
**I want** separate login interfaces for different user types  
**So that** each user group has an authentication experience tailored to their needs and security requirements

---

## Acceptance Criteria

### AC1: Patient Mobile Login Portal
- [ ] Patients can access a dedicated login page at `/patient-login`
- [ ] Login requires mobile number (10 digits) and 4-digit MPIN
- [ ] Mobile number field has proper validation and formatting
- [ ] MPIN field shows masked input with number pad on mobile
- [ ] System validates mobile number exists in database
- [ ] System validates MPIN matches stored hash
- [ ] Failed login attempts are tracked (max 3 attempts before 15-minute lockout)
- [ ] Successful login redirects to patient dashboard

### AC2: Staff Login Portal  
- [ ] Attenders can access a dedicated login page at `/staff-login`
- [ ] Login requires username and password
- [ ] Username field accepts alphanumeric characters
- [ ] Password field shows masked input
- [ ] System validates credentials against attender accounts
- [ ] Failed login attempts are tracked
- [ ] Successful login redirects to attender dashboard

### AC3: Admin Portal (Existing Enhanced)
- [ ] Admin login remains at `/login` 
- [ ] Supports both Super Admin and Clinic Admin roles
- [ ] No changes to current authentication flow
- [ ] Clear branding indicates "Administrator Portal"

### AC4: Portal Navigation & Discovery
- [ ] Root path `/` shows portal selection page
- [ ] Three clear options: "Patient Login", "Staff Login", "Administrator Login"
- [ ] Each option has appropriate icon and description
- [ ] Mobile responsive design for portal selection

### AC5: Backend Authentication Separation
- [ ] Separate API endpoints for each portal type
- [ ] `/api/auth/patient/login` - Mobile + MPIN authentication
- [ ] `/api/auth/staff/login` - Username + password for attenders
- [ ] `/api/auth/admin/login` - Existing admin authentication
- [ ] Different session timeout policies (Patient: 30min, Staff: 2hr, Admin: 4hr)
- [ ] Rate limiting per endpoint (Patient: 5/min, Staff: 10/min, Admin: 10/min)

### AC6: MPIN Management
- [ ] Clinic Admin can set/reset patient MPIN
- [ ] MPIN stored as hashed value in database
- [ ] "Forgot MPIN" flow with admin-assisted reset
- [ ] MPIN must be exactly 4 digits
- [ ] MPIN change requires current MPIN verification

### AC7: Security & Audit
- [ ] All login attempts are logged with timestamp, IP, and result
- [ ] Account lockout after repeated failures
- [ ] Different lockout policies per portal type
- [ ] Session invalidation on role change
- [ ] Audit log for MPIN resets

---

## Technical Implementation Details

### Database Schema Changes

```sql
-- Add MPIN field to users table
ALTER TABLE users ADD COLUMN mpin VARCHAR(255);
ALTER TABLE users ADD COLUMN mpin_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN mpin_locked_until TIMESTAMP;
ALTER TABLE users ADD COLUMN last_mpin_change TIMESTAMP;

-- Create login_attempts table for tracking
CREATE TABLE login_attempts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  login_type VARCHAR(20), -- 'patient', 'staff', 'admin'
  ip_address VARCHAR(45),
  success BOOLEAN,
  attempted_at TIMESTAMP DEFAULT NOW(),
  failure_reason VARCHAR(255)
);

-- Add index for mobile number lookup
CREATE INDEX idx_users_phone ON users(phone) WHERE role = 'patient';
```

### API Endpoints

#### Patient Authentication
```typescript
POST /api/auth/patient/login
Request: {
  mobileNumber: string (10 digits)
  mpin: string (4 digits)
}
Response: {
  success: boolean
  user: PatientUser
  token: string
}

POST /api/auth/patient/set-mpin
Request: {
  patientId: number
  newMpin: string (4 digits)
  adminPassword: string // For admin verification
}

POST /api/auth/patient/reset-mpin
Request: {
  mobileNumber: string
  adminId: number
  adminPassword: string
  newMpin: string
}
```

#### Staff Authentication
```typescript
POST /api/auth/staff/login
Request: {
  username: string
  password: string
}
Response: {
  success: boolean
  user: AttenderUser
  token: string
}
```

### Frontend Components Structure

```
client/src/
├── pages/
│   ├── auth/
│   │   ├── portal-selection.tsx      # New landing page
│   │   ├── patient-login.tsx         # Patient mobile + MPIN
│   │   ├── staff-login.tsx           # Attender login
│   │   └── admin-login.tsx           # Existing login renamed
│   └── ...
├── components/
│   ├── auth/
│   │   ├── MobileNumberInput.tsx     # Formatted mobile input
│   │   ├── MPINInput.tsx              # 4-digit PIN input
│   │   ├── PortalCard.tsx             # Portal selection card
│   │   └── LoginForm.tsx              # Reusable form wrapper
│   └── ...
└── hooks/
    ├── use-patient-auth.tsx           # Patient-specific auth
    ├── use-staff-auth.tsx             # Staff-specific auth
    └── use-admin-auth.tsx             # Admin-specific auth
```

### Route Configuration

```typescript
// routes.tsx updates
const routes = [
  { path: '/', component: PortalSelection },
  { path: '/patient-login', component: PatientLogin },
  { path: '/staff-login', component: StaffLogin },
  { path: '/admin-login', component: AdminLogin },
  { path: '/login', redirect: '/admin-login' }, // Backward compatibility
  // ... existing routes
];
```

---

## Implementation Tasks

### Phase 1: Backend Foundation (3 days)
1. Database schema migration for MPIN fields
2. Create login_attempts tracking table
3. Implement patient authentication endpoint
4. Implement staff authentication endpoint
5. Add rate limiting middleware
6. Create MPIN management endpoints
7. Update session management for different timeouts

### Phase 2: Frontend Portal Infrastructure (2 days)
1. Create portal selection landing page
2. Design and implement PortalCard component
3. Set up routing for three login paths
4. Create shared authentication components
5. Implement responsive design for mobile

### Phase 3: Patient Login Implementation (2 days)
1. Build patient login page UI
2. Create MobileNumberInput component with formatting
3. Create MPINInput component with number pad
4. Implement patient authentication hook
5. Add lockout mechanism UI feedback
6. Test mobile responsiveness

### Phase 4: Staff Login Implementation (1 day)
1. Build staff login page UI
2. Implement staff authentication hook
3. Add error handling and feedback
4. Connect to attender dashboard

### Phase 5: Admin Portal Enhancement (1 day)
1. Rebrand existing login as Admin Portal
2. Add portal indication headers
3. Update navigation breadcrumbs
4. Ensure backward compatibility

### Phase 6: MPIN Management (2 days)
1. Create MPIN setup flow for new patients
2. Build admin interface for MPIN reset
3. Implement forgot MPIN workflow
4. Add MPIN change functionality
5. Create audit logging for MPIN operations

### Phase 7: Testing & Polish (2 days)
1. End-to-end testing of all three portals
2. Security testing for lockout mechanisms
3. Load testing for rate limiting
4. Mobile device testing
5. Cross-browser compatibility
6. Performance optimization

---

## Test Scenarios

### Scenario 1: Patient First-Time Login
1. Patient receives MPIN from clinic during registration
2. Navigate to patient portal
3. Enter mobile number
4. Enter 4-digit MPIN
5. Successfully login to dashboard

### Scenario 2: Failed Login Lockout
1. Attempt login with wrong MPIN 3 times
2. Account locks for 15 minutes
3. Show clear lockout message with timer
4. After timeout, allow login again

### Scenario 3: MPIN Reset by Admin
1. Patient forgets MPIN
2. Contacts clinic admin
3. Admin verifies identity
4. Admin resets MPIN through admin portal
5. Patient logs in with new MPIN

### Scenario 4: Portal Navigation
1. User visits root URL
2. Sees three portal options
3. Clicks appropriate portal
4. Redirected to correct login page
5. Browser remembers last used portal

### Scenario 5: Session Timeout Differences
1. Patient session expires after 30 minutes idle
2. Staff session expires after 2 hours idle
3. Admin session expires after 4 hours idle
4. Each shows appropriate timeout warning

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Code reviewed and approved
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests for all auth endpoints
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] Mobile testing completed
- [ ] Performance benchmarks met
- [ ] Deployed to staging environment
- [ ] User acceptance testing passed
- [ ] Migration plan for existing users created

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Existing users don't have MPIN | High | Bulk MPIN generation tool with SMS notification |
| Users confused by multiple portals | Medium | Clear landing page with visual guides |
| Increased support for forgotten MPIN | Medium | Self-service reset via SMS (future phase) |
| Session management complexity | Low | Comprehensive testing and monitoring |

---

## Dependencies

- Existing authentication system must remain functional during migration
- Database backup before schema changes
- Admin training for MPIN management
- User communication plan for portal changes

---

## Success Metrics

- **User Experience**: 90% successful first-attempt logins
- **Security**: Zero unauthorized access incidents
- **Performance**: Login response time <500ms
- **Support**: <5% increase in login-related support tickets
- **Adoption**: 100% user migration within 30 days

---

## Future Enhancements (Out of Scope)

- SMS OTP for MPIN reset
- Biometric authentication for mobile
- Social login integration
- Two-factor authentication
- Remember device functionality
- Progressive web app features

---

## Notes for Developers

1. **MPIN Storage**: Use same hashing algorithm as passwords (scrypt)
2. **Mobile Number**: Store in normalized format (+91XXXXXXXXXX)
3. **Rate Limiting**: Use Redis for distributed rate limiting if scaling
4. **Session Storage**: Consider Redis for session management in production
5. **Audit Logs**: Implement retention policy (90 days default)
6. **Error Messages**: Don't reveal if mobile number exists (security)
7. **MPIN Generation**: Avoid sequential or easily guessable patterns

---

## Approval Sign-offs

- [ ] Product Owner
- [ ] Technical Lead  
- [ ] Security Team
- [ ] UX Designer
- [ ] QA Lead

---

**Created by**: Bob (Scrum Master)  
**Date**: 2025-08-12  
**Version**: 1.0