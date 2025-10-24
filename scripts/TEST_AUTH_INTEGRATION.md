# ROuvis Authentication Integration Test Guide

## Overview

This document provides comprehensive guidance for testing the ROuvis authentication system, including automated tests and manual testing procedures.

**Test Coverage:**
- ✅ NextAuth.js API endpoints (providers, session, CSRF)
- ✅ Google OAuth redirect configuration
- ✅ Protected route authentication enforcement
- ✅ Session management and cookie persistence
- ⚠️ OAuth callback flow (requires manual testing)
- ⚠️ Tenant auto-provisioning (requires manual verification)
- ⚠️ Onboarding wizard integration (requires manual testing)
- ⚠️ Database persistence (requires manual verification)

---

## Prerequisites

### Backend Requirements
1. **Backend server running:**
   ```bash
   cd D:\rouvis\backend
   npm run dev
   ```
   Server should be accessible at `http://localhost:3000`

2. **Environment variables configured:**
   ```env
   # Backend .env file
   NEXTAUTH_SECRET=<your-secret>
   NEXTAUTH_URL=http://localhost:3000
   GOOGLE_CLIENT_ID=<your-google-client-id>
   GOOGLE_CLIENT_SECRET=<your-google-client-secret>
   DATABASE_URL=<your-postgres-url>
   ```

3. **Database migrations applied:**
   ```bash
   cd D:\rouvis\backend
   npm run prisma:migrate
   ```

### Web Frontend Requirements
1. **Web server running (optional for API tests):**
   ```bash
   cd D:\rouvis\web
   npm run dev
   ```
   Server should be accessible at `http://localhost:3001` (or configured port)

2. **TypeScript execution tool installed:**
   ```bash
   npm install -g tsx
   ```

---

## Running the Automated Tests

### Basic Execution

```bash
cd D:\rouvis\web
npx tsx scripts/test-auth-integration.ts
```

### With Verbose Logging

```bash
VERBOSE=true npx tsx scripts/test-auth-integration.ts
```

### Custom Backend URL

```bash
BACKEND_URL=http://localhost:3000 npx tsx scripts/test-auth-integration.ts
```

### All Options Combined

```bash
BACKEND_URL=http://localhost:3000 VERBOSE=true npx tsx scripts/test-auth-integration.ts
```

---

## Test Cases Explained

### INT-001: Backend Health Check
**Purpose:** Verify backend server is running and responding.

**Expected Result:**
- Status: 200 OK
- Response body: `{"status": "ok"}`

**If Fails:**
- Check if backend server is running
- Verify no port conflicts
- Check backend logs for startup errors

---

### INT-002: NextAuth Providers Endpoint
**Purpose:** Verify NextAuth.js is configured with Google provider.

**Expected Result:**
- Status: 200 OK
- Response contains `google` provider with `type: "oauth"`

**If Fails:**
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in backend `.env`
- Verify `backend/lib/auth-config.ts` includes GoogleProvider
- Restart backend after env changes

---

### INT-003: CSRF Token Generation
**Purpose:** Verify NextAuth.js CSRF protection is enabled.

**Expected Result:**
- Status: 200 OK
- Response contains `csrfToken` field

**If Fails:**
- Check NextAuth.js is properly initialized
- Verify `NEXTAUTH_SECRET` is set in `.env`

---

### INT-004: Unauthenticated Session
**Purpose:** Verify session endpoint returns empty object when not authenticated.

**Expected Result:**
- Status: 200 OK
- Response body: `{}`

**If Fails:**
- Check NextAuth.js session configuration
- Verify JWT strategy is enabled

---

### INT-005: Google OAuth Redirect
**Purpose:** Verify OAuth flow redirects to Google's consent screen.

**Expected Result:**
- Status: 302/303/307 (redirect)
- Location header contains `accounts.google.com`

**If Fails:**
- Check Google OAuth credentials are valid
- Verify redirect URI is configured in Google Console
- Check `NEXTAUTH_URL` environment variable

**Manual Follow-up:**
1. Copy the redirect URL from test output
2. Visit URL in browser
3. Complete Google OAuth consent
4. Verify redirect back to `callbackUrl`

---

### INT-006: Protected Route Without Auth
**Purpose:** Verify protected routes reject unauthenticated requests.

**Expected Result:**
- Status: 401 Unauthorized

**If Fails:**
- Check `withAuth` middleware in API routes
- Verify auth helpers are correctly implemented
- Check route protection logic

---

### INT-007: Field Validation
**Purpose:** Verify Zod validation on field creation API.

**Expected Result:**
- Status: 400 (validation error) or 401 (auth required)

**If Fails:**
- Check Zod schemas in `backend/app/api/v1/fields/route.ts`
- Verify validation middleware order

---

### INT-008: Mock Auth Flow
**Purpose:** Placeholder for mock authentication in dev environment.

**Current Status:** Not implemented (requires backend mock endpoint)

**Future Enhancement:**
- Add mock auth endpoint for testing
- Allow tests to run authenticated flows without OAuth

---

### INT-009: Tenant Assignment
**Purpose:** Verify tenant is auto-created on first sign-in.

**Testing Method:** Manual verification required

**Steps:**
1. Sign in via Google OAuth (first time for test user)
2. Check database:
   ```sql
   SELECT id, email, tenant_id FROM "User" WHERE email = 'your-test-email@gmail.com';
   SELECT id, name, plan FROM "Tenant" WHERE id = '<tenant_id>';
   SELECT * FROM "AuditLog" WHERE action = 'TENANT_CREATED';
   ```
3. Verify:
   - User has `tenant_id` set
   - Tenant exists with same ID
   - AuditLog entry created

---

### INT-010: Session Persistence
**Purpose:** Verify session cookies persist across requests.

**Expected Result:**
- Status: 200 OK on both requests
- Cookies remain consistent

**If Fails:**
- Check cookie settings in NextAuth.js config
- Verify session strategy is JWT
- Check cookie security settings

---

## Manual Testing Procedures

### Manual Test 1: Complete OAuth Flow

**Objective:** Test end-to-end Google OAuth authentication.

**Steps:**
1. Start backend and web servers
2. Navigate to `http://localhost:3001/ja/login` (adjust port if needed)
3. Click "Googleでログイン" button
4. Complete Google OAuth consent screen
5. Verify redirect to `/onboarding` page
6. Check browser DevTools:
   - Network tab: verify `/api/auth/callback/google` succeeds
   - Application tab → Cookies: verify `next-auth.session-token` exists

**Expected Result:**
- Successful OAuth flow
- Redirect to onboarding page
- Session cookie created

**Evidence to Capture:**
- Screenshot of onboarding page
- Session cookie value
- Network request timeline

---

### Manual Test 2: Tenant Auto-Provisioning

**Objective:** Verify tenant is created on first sign-in.

**Prerequisites:**
- Use a Google account that has never signed in before
- Have database access (Prisma Studio or SQL client)

**Steps:**
1. Complete OAuth flow (Manual Test 1)
2. Open Prisma Studio:
   ```bash
   cd D:\rouvis\backend
   npm run prisma:studio
   ```
3. Navigate to `User` table
4. Find your user by email
5. Note the `tenant_id` value
6. Navigate to `Tenant` table
7. Verify tenant exists with matching ID
8. Navigate to `AuditLog` table
9. Find entry with `action = "TENANT_CREATED"`

**Expected Result:**
- User has `tenant_id` populated
- Tenant exists in Tenant table
- AuditLog entry created

**SQL Verification (Alternative):**
```sql
-- Find user
SELECT id, email, name, tenant_id, role, created_at
FROM "User"
WHERE email = 'your-email@gmail.com';

-- Verify tenant
SELECT id, name, plan, created_at
FROM "Tenant"
WHERE id = '<tenant_id_from_above>';

-- Check audit log
SELECT id, action, resource_type, resource_id, metadata, created_at
FROM "AuditLog"
WHERE action = 'TENANT_CREATED'
AND user_id = '<user_id_from_above>';
```

---

### Manual Test 3: Onboarding Wizard

**Objective:** Test complete onboarding flow and field creation.

**Prerequisites:**
- Authenticated session (complete Manual Test 1)

**Steps:**

#### Step 1: Welcome Screen
1. After OAuth, you should land on `/onboarding`
2. Verify display:
   - Welcome message
   - Benefit cards (chat, weather, knowledge)
   - "次へ" (Next) button
3. Click "次へ" button

#### Step 2: Field Creation (Step 3/3)
Note: Profile step (2/3) is currently skipped in code
1. Verify progress bar shows step 3/3
2. Fill in field details:
   - **圃場名** (Field Name): "テスト田"
   - **面積** (Area): "1.5"
   - **作物** (Crop): "コシヒカリ"
   - **作付日** (Planting Date): Select today's date
3. Click "完了" (Finish) button

#### Expected Result:
1. API call to `POST /api/v1/fields` succeeds
2. Redirect to `/calendar` page
3. Field visible in database

**Verification:**
1. Open browser DevTools → Network tab
2. Find `POST /api/v1/fields` request
3. Verify response status: 201 Created
4. Verify response body contains field ID

**Database Verification:**
```bash
cd D:\rouvis\backend
npm run prisma:studio
```
Navigate to `Field` table and verify:
- Field name matches input
- Area (area_sqm) matches input
- Crop matches input
- user_id matches your user ID
- tenant_id matches your tenant ID

**SQL Verification (Alternative):**
```sql
SELECT id, name, crop, area_sqm, user_id, tenant_id, created_at
FROM "Field"
WHERE user_id = '<your_user_id>'
ORDER BY created_at DESC
LIMIT 1;
```

---

### Manual Test 4: Session Persistence Across Tabs

**Objective:** Verify session persists across browser tabs and navigation.

**Steps:**
1. Complete authentication (Manual Test 1)
2. Navigate to `/calendar` page
3. Open a new tab
4. Navigate to `http://localhost:3001/ja/calendar`
5. Verify you're still authenticated (no redirect to login)
6. Close browser completely
7. Reopen browser
8. Navigate to `http://localhost:3001/ja/calendar`
9. Verify session persisted (or expired based on maxAge)

**Expected Result:**
- Session persists across tabs
- Session persists after browser restart (within 30 days)

---

### Manual Test 5: Protected Route Enforcement

**Objective:** Verify unauthenticated users cannot access protected pages.

**Steps:**
1. Ensure you're logged out (clear cookies or use incognito)
2. Try to access `http://localhost:3001/ja/calendar`
3. Verify redirect to `/login` page
4. Try to access `http://localhost:3001/ja/planner`
5. Verify redirect to `/login` page

**Expected Result:**
- All protected routes redirect to login
- Login page displays correctly

---

### Manual Test 6: Google Calendar Token Storage

**Objective:** Verify Google Calendar OAuth tokens are stored.

**Prerequisites:**
- OAuth scope includes `https://www.googleapis.com/auth/calendar`
- First sign-in (or re-authenticate with consent prompt)

**Steps:**
1. Complete OAuth flow (Manual Test 1)
2. Check database for user:
   ```sql
   SELECT
     id,
     email,
     google_access_token,
     google_refresh_token,
     google_token_expiry
   FROM "User"
   WHERE email = 'your-email@gmail.com';
   ```
3. Verify:
   - `google_access_token` is populated
   - `google_refresh_token` is populated
   - `google_token_expiry` is set to future date

**Expected Result:**
- All Google token fields populated
- Tokens are non-empty strings

**Security Note:**
- Tokens are sensitive! Do not log or expose them.
- In production, consider encrypting tokens at rest.

---

### Manual Test 7: Logout Flow

**Objective:** Test sign-out functionality.

**Steps:**
1. Authenticate (Manual Test 1)
2. Navigate to dashboard
3. Click user menu → "ログアウト" (Logout)
4. Verify redirect to login page
5. Try to access protected route
6. Verify redirect to login

**Expected Result:**
- Session cleared
- Cookies removed
- Cannot access protected routes

---

## Database Schema Verification

Run this SQL query to verify authentication-related schema:

```sql
-- Verify User table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'User'
ORDER BY ordinal_position;

-- Verify Account table (OAuth accounts)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Account'
ORDER BY ordinal_position;

-- Verify Session table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Session'
ORDER BY ordinal_position;

-- Verify Tenant table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Tenant'
ORDER BY ordinal_position;
```

**Expected Schema:**

**User Table:**
- `id` (String, PK)
- `email` (String, Unique)
- `name` (String, Nullable)
- `tenant_id` (String, Nullable, FK → Tenant)
- `role` (String, Default: "farmer")
- `google_access_token` (Text, Nullable)
- `google_refresh_token` (Text, Nullable)
- `google_token_expiry` (DateTime, Nullable)

**Account Table:**
- `id` (String, PK)
- `userId` (String, FK → User)
- `provider` (String)
- `providerAccountId` (String)
- `access_token` (Text, Nullable)
- `refresh_token` (String, Nullable)
- Unique constraint on `[provider, providerAccountId]`

**Session Table:**
- `id` (String, PK)
- `sessionToken` (String, Unique)
- `userId` (String, FK → User)
- `expires` (DateTime)

---

## Troubleshooting Guide

### Issue: Backend Health Check Fails

**Symptoms:**
- `INT-001` test fails
- Connection refused or timeout

**Solutions:**
1. Verify backend is running:
   ```bash
   cd D:\rouvis\backend
   npm run dev
   ```
2. Check port 3000 is not in use:
   ```bash
   netstat -ano | findstr :3000
   ```
3. Check backend logs for errors
4. Verify `DATABASE_URL` is correct

---

### Issue: Google Provider Not Found

**Symptoms:**
- `INT-002` test fails
- Providers endpoint doesn't include Google

**Solutions:**
1. Check `.env` file has:
   ```
   GOOGLE_CLIENT_ID=<valid-id>
   GOOGLE_CLIENT_SECRET=<valid-secret>
   ```
2. Verify `backend/lib/auth-config.ts` imports GoogleProvider
3. Restart backend server after env changes
4. Check Google Console credentials are valid

---

### Issue: OAuth Redirect Fails

**Symptoms:**
- `INT-005` test passes but manual OAuth fails
- "Redirect URI mismatch" error from Google

**Solutions:**
1. Go to Google Cloud Console
2. Navigate to OAuth consent screen
3. Add authorized redirect URI:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
4. Wait 5 minutes for changes to propagate
5. Try OAuth again

---

### Issue: Tenant Not Created

**Symptoms:**
- User has `tenant_id = null` after sign-in
- No entry in Tenant table
- No TENANT_CREATED audit log

**Solutions:**
1. Check backend logs during sign-in
2. Look for errors in `ensureUserHasTenant` function
3. Verify Prisma schema includes Tenant model
4. Check database permissions
5. Try signing out and back in

---

### Issue: Field Creation Fails

**Symptoms:**
- Onboarding wizard hangs on field creation
- `POST /api/v1/fields` returns error
- No field in database

**Solutions:**
1. Check browser DevTools → Network tab for error
2. Common errors:
   - **401 Unauthorized**: Session expired, re-authenticate
   - **400 Bad Request**: Validation error, check field values
   - **500 Internal Server Error**: Check backend logs
3. Verify API endpoint exists:
   ```bash
   ls D:\rouvis\backend\app\api\v1\fields\route.ts
   ```
4. Check Prisma schema includes Field model
5. Verify `withAuth` middleware is working

---

### Issue: Session Not Persisting

**Symptoms:**
- Redirect to login after navigation
- Session cookie not present
- `INT-010` test fails

**Solutions:**
1. Check `NEXTAUTH_SECRET` is set in `.env`
2. Verify `session.strategy = "jwt"` in auth config
3. Check cookie settings in browser (not blocking)
4. Verify `NEXTAUTH_URL` matches actual URL
5. Clear all cookies and try again

---

## Performance Benchmarks

**Target Response Times (p95):**
- Health check: < 50ms
- Providers endpoint: < 100ms
- Session endpoint: < 100ms
- OAuth redirect: < 200ms
- Field creation: < 500ms
- Complete onboarding: < 2s (total)

**Measure with:**
```bash
# Example: Measure session endpoint
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/auth/session
```

**curl-format.txt:**
```
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
```

---

## Security Checklist

Before deploying to production, verify:

- [ ] `NEXTAUTH_SECRET` is strong random string (not default)
- [ ] Google OAuth credentials are for production app
- [ ] Redirect URIs include only production domains
- [ ] HTTPS enforced in production (`NEXTAUTH_URL` uses https://)
- [ ] Session cookies have `secure: true` in production
- [ ] CSRF protection enabled (automatic with NextAuth.js)
- [ ] Rate limiting configured on auth endpoints
- [ ] Google tokens encrypted at rest (future enhancement)
- [ ] Audit logs enabled for all auth events
- [ ] No sensitive data logged in production
- [ ] Database credentials rotated and secured
- [ ] Row-Level Security (RLS) enabled for multi-tenancy

---

## Test Report Template

Copy this template to document your test results:

```markdown
# Authentication Integration Test Report

**Date:** YYYY-MM-DD
**Tester:** [Your Name]
**Environment:** Local Development
**Backend URL:** http://localhost:3000
**Frontend URL:** http://localhost:3001

## Automated Tests

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| INT-001 | Backend Health Check | ✅ PASS | |
| INT-002 | NextAuth Providers | ✅ PASS | |
| INT-003 | CSRF Token | ✅ PASS | |
| INT-004 | Unauthenticated Session | ✅ PASS | |
| INT-005 | OAuth Redirect | ✅ PASS | |
| INT-006 | Protected Route Auth | ✅ PASS | |
| INT-007 | Field Validation | ✅ PASS | |
| INT-010 | Session Persistence | ✅ PASS | |

**Total:** 8 tests
**Passed:** 8
**Failed:** 0

## Manual Tests

### Manual Test 1: Complete OAuth Flow
- **Status:** ✅ PASS / ❌ FAIL
- **Notes:**

### Manual Test 2: Tenant Auto-Provisioning
- **Status:** ✅ PASS / ❌ FAIL
- **User Email:**
- **Tenant ID:**
- **Notes:**

### Manual Test 3: Onboarding Wizard
- **Status:** ✅ PASS / ❌ FAIL
- **Field Created:**
- **Field ID:**
- **Notes:**

### Manual Test 4: Session Persistence
- **Status:** ✅ PASS / ❌ FAIL
- **Notes:**

### Manual Test 5: Protected Route Enforcement
- **Status:** ✅ PASS / ❌ FAIL
- **Notes:**

### Manual Test 6: Google Calendar Token Storage
- **Status:** ✅ PASS / ❌ FAIL
- **Tokens Stored:** Yes / No
- **Notes:**

### Manual Test 7: Logout Flow
- **Status:** ✅ PASS / ❌ FAIL
- **Notes:**

## Issues Found

1. [Issue description]
   - **Severity:** Critical / High / Medium / Low
   - **Steps to Reproduce:**
   - **Expected:**
   - **Actual:**

## Overall Assessment

- **Automated Tests:** ✅ All Pass / ⚠️ Some Failures / ❌ Critical Failures
- **Manual Tests:** ✅ All Pass / ⚠️ Some Failures / ❌ Critical Failures
- **Recommendation:** READY FOR DEPLOYMENT / NEEDS FIXES / BLOCKED

## Next Steps

- [ ] Fix identified issues
- [ ] Re-test failed cases
- [ ] Update documentation
- [ ] Deploy to staging
```

---

## Appendix: Full Test Session Example

```bash
# Terminal 1: Start Backend
cd D:\rouvis\backend
npm run dev

# Terminal 2: Start Web
cd D:\rouvis\web
npm run dev

# Terminal 3: Run Tests
cd D:\rouvis\web
VERBOSE=true npx tsx scripts/test-auth-integration.ts

# Expected Output:
# ╔═══════════════════════════════════════════════════════════════════════════════╗
# ║              ROuvis Fullstack Authentication Integration Test                 ║
# ╚═══════════════════════════════════════════════════════════════════════════════╝
#
# ℹ️  Backend URL: http://localhost:3000
# ℹ️  Mock Mode: Disabled
# ℹ️  Verbose: Enabled
#
# ================================================================================
# TEST: INT-001: Backend Health Check
# ================================================================================
# [2025-10-25T...] [Health] Testing backend health endpoint...
# [2025-10-25T...] [Health] Backend is healthy
# ✅ PASS: INT-001: Backend Health Check (45ms)
#
# [... more tests ...]
#
# ================================================================================
# FULLSTACK INTEGRATION TEST REPORT
# ================================================================================
# Total Tests: 8
# Passed: 8
# Failed: 0
# ✅ READY FOR DEPLOYMENT
```

---

## Contact & Support

For issues or questions:
1. Check troubleshooting guide above
2. Review backend logs: `D:\rouvis\backend\logs\*`
3. Check Prisma Studio: `npm run prisma:studio`
4. Review CLAUDE.md and PLAN.md for architecture details

**Test Suite Maintainer:** Fullstack Integration Tester Agent
**Last Updated:** 2025-10-25
