# ROuvis Auth Integration - Quick Test Guide

## Quick Start (1 Minute Setup)

```bash
# Terminal 1: Start backend
cd D:\rouvis\backend
npm run dev

# Terminal 2: Run auth tests
cd D:\rouvis\web
npm run test:auth
```

---

## Test Commands

```bash
# Basic test
npm run test:auth

# Verbose output
npm run test:auth:verbose

# Custom backend URL
BACKEND_URL=http://localhost:3000 npm run test:auth
```

---

## What Gets Tested Automatically

✅ Backend health check
✅ NextAuth.js providers endpoint
✅ CSRF token generation
✅ Session management (unauthenticated)
✅ Google OAuth redirect configuration
✅ Protected route authentication
✅ API validation (Zod schemas)
✅ Session cookie persistence

---

## Manual Tests Required

These require browser interaction:

1. **Complete OAuth Flow**
   - Visit: http://localhost:3001/ja/login
   - Click "Googleでログイン"
   - Complete Google consent
   - Verify redirect to onboarding

2. **Onboarding Wizard**
   - Step 1: Welcome → Click "次へ"
   - Step 3: Fill field details → Click "完了"
   - Verify redirect to calendar

3. **Database Verification**
   ```bash
   cd D:\rouvis\backend
   npm run prisma:studio
   ```
   Check: User.tenant_id, Tenant table, Field table

---

## Success Criteria

**All tests pass if you see:**
```
✅ READY FOR DEPLOYMENT
All automated tests passed. Complete manual tests before production.
```

**Critical failure if you see:**
```
🚫 BLOCKED
Critical failures detected. Fix before proceeding.
```

---

## Quick Troubleshooting

### Backend not responding
```bash
# Check if running
netstat -ano | findstr :3000

# Restart
cd D:\rouvis\backend
npm run dev
```

### OAuth redirect error
1. Go to Google Cloud Console
2. Add redirect URI: `http://localhost:3000/api/auth/callback/google`
3. Wait 5 minutes
4. Retry

### Tests fail immediately
- Check backend is running
- Verify `.env` variables set
- Run `npm run prisma:migrate` in backend

---

## Test Execution Time

- **Automated tests:** ~2-5 seconds
- **Manual OAuth flow:** ~30 seconds
- **Manual database verification:** ~2 minutes
- **Total:** ~3-4 minutes for complete test suite

---

## Report Template

```markdown
## Test Results - [DATE]

**Automated Tests:** ✅ PASS / ❌ FAIL
**Manual OAuth:** ✅ PASS / ❌ FAIL
**Onboarding:** ✅ PASS / ❌ FAIL
**Database:** ✅ PASS / ❌ FAIL

**Issues Found:**
- [None / List issues]

**Status:** READY / NEEDS FIXES / BLOCKED
```

---

## Full Documentation

For detailed test procedures, see:
- `TEST_AUTH_INTEGRATION.md` - Complete test guide
- `test-auth-integration.ts` - Test implementation

---

## Need Help?

1. Check `TEST_AUTH_INTEGRATION.md` for detailed troubleshooting
2. Review backend logs in `D:\rouvis\backend\logs\`
3. Check Prisma Studio for database state
4. Review CLAUDE.md for architecture context
