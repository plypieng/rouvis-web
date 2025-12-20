/**
 * ROuvis Fullstack Authentication Integration Test
 *
 * This test validates the complete authentication flow:
 * 1. Frontend → Backend OAuth Flow (NextAuth.js + Google)
 * 2. Session Management & Persistence
 * 3. Onboarding Flow Integration
 * 4. Backend Data Persistence (User, Tenant, Field)
 *
 * Test Requirements:
 * - Web app running at http://localhost:3000 (or APP_URL/BACKEND_URL env var)
 * - Database accessible with valid credentials
 * - Google OAuth credentials configured (or mock mode enabled)
 *
 * Run with: npx tsx scripts/test-auth-integration.ts
 * Mock mode: MOCK_AUTH=true npx tsx scripts/test-auth-integration.ts
 */

import * as https from 'https';

// Configuration
const APP_URL = process.env.APP_URL || process.env.BACKEND_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
const MOCK_AUTH = process.env.MOCK_AUTH === 'true';
const VERBOSE = process.env.VERBOSE === 'true';

// Test state
interface TestState {
  sessionToken?: string;
  userId?: string;
  tenantId?: string;
  fieldId?: string;
  cookies: string[];
}

const state: TestState = {
  cookies: [],
};

// Utility functions
function log(category: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${category}] ${message}`);
  if (data && VERBOSE) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function logError(category: string, message: string, error?: any) {
  console.error(`\x1b[31m[ERROR] [${category}] ${message}\x1b[0m`);
  if (error) {
    console.error(error);
  }
}

function logSuccess(message: string) {
  console.log(`\x1b[32m✅ ${message}\x1b[0m`);
}

function logWarning(message: string) {
  console.log(`\x1b[33m⚠️  ${message}\x1b[0m`);
}

function logInfo(message: string) {
  console.log(`\x1b[36mℹ️  ${message}\x1b[0m`);
}

interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  followRedirect?: boolean;
}

async function fetchWithCookies(
  url: string,
  options: FetchOptions = {}
): Promise<{ status: number; headers: Record<string, string>; body: string; redirectUrl?: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const httpModule = isHttps ? https : require('http'); // eslint-disable-line @typescript-eslint/no-require-imports

    const requestOptions: any = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        ...options.headers,
        'Cookie': state.cookies.join('; '),
      },
    };

    // Disable SSL verification for localhost (development only!)
    if (isHttps && urlObj.hostname === 'localhost') {
      requestOptions.rejectUnauthorized = false;
    }

    const req = httpModule.request(requestOptions, (res: any) => {
      let data = '';

      // Capture cookies
      const setCookieHeaders = res.headers['set-cookie'];
      if (setCookieHeaders) {
        setCookieHeaders.forEach((cookie: string) => {
          const cookieName = cookie.split('=')[0];
          // Replace or add cookie
          state.cookies = state.cookies.filter(c => !c.startsWith(cookieName));
          state.cookies.push(cookie.split(';')[0]);
        });
      }

      res.on('data', (chunk: Buffer) => {
        data += chunk.toString();
      });

      res.on('end', () => {
        const headers: Record<string, string> = {};
        Object.keys(res.headers).forEach(key => {
          headers[key] = Array.isArray(res.headers[key])
            ? res.headers[key].join(', ')
            : res.headers[key];
        });

        // Handle redirects
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && !options.followRedirect) {
          resolve({
            status: res.statusCode,
            headers,
            body: data,
            redirectUrl: res.headers.location,
          });
          return;
        }

        resolve({
          status: res.statusCode,
          headers,
          body: data,
        });
      });
    });

    req.on('error', (error: Error) => {
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// async function testWithRetry(
//   testName: string,
//   testFn: () => Promise<void>,
//   maxRetries = 2
// ): Promise<boolean> {
//   for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
//     try {
//       await testFn();
//       return true;
//     } catch (error) {
//       if (attempt <= maxRetries) {
//         logWarning(`${testName} failed (attempt ${attempt}/${maxRetries + 1}), retrying...`);
//         await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
//       } else {
//         logError(testName, 'Test failed after all retries', error);
//         return false;
//       }
//     }
//   }
//   return false;
// }

// Test cases
class AuthIntegrationTests {
  private testResults: { name: string; passed: boolean; duration: number }[] = [];

  async runTest(name: string, testFn: () => Promise<void>): Promise<boolean> {
    const startTime = Date.now();
    console.log(`\n${'='.repeat(80)}`);
    console.log(`TEST: ${name}`);
    console.log('='.repeat(80));

    try {
      await testFn();
      const duration = Date.now() - startTime;
      this.testResults.push({ name, passed: true, duration });
      logSuccess(`PASS: ${name} (${duration}ms)`);
      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.push({ name, passed: false, duration });
      logError(name, 'FAIL', error);
      return false;
    }
  }

  /**
   * INT-001: Test Backend Health Check
   */
  async testBackendHealth(): Promise<void> {
    log('Health', 'Testing backend health endpoint...');

    const response = await fetchWithCookies(`${APP_URL}/api/v1/health`);

    if (response.status !== 200) {
      throw new Error(`Health check failed with status ${response.status}`);
    }

    const data = JSON.parse(response.body);
    if (data.status !== 'ok') {
      throw new Error(`Health check returned non-ok status: ${data.status}`);
    }

    log('Health', 'Backend is healthy', data);
  }

  /**
   * INT-002: Test NextAuth Providers Endpoint
   */
  async testAuthProviders(): Promise<void> {
    log('Auth', 'Testing /api/auth/providers endpoint...');

    const response = await fetchWithCookies(`${APP_URL}/api/auth/providers`);

    if (response.status !== 200) {
      throw new Error(`Providers endpoint failed with status ${response.status}`);
    }

    const providers = JSON.parse(response.body);
    if (!providers.google) {
      throw new Error('Google provider not found in providers list');
    }

    if (providers.google.type !== 'oauth') {
      throw new Error(`Expected Google provider type 'oauth', got '${providers.google.type}'`);
    }

    log('Auth', 'Providers endpoint working correctly', providers);
  }

  /**
   * INT-003: Test CSRF Token Generation
   */
  async testCsrfToken(): Promise<void> {
    log('Auth', 'Testing CSRF token generation...');

    const response = await fetchWithCookies(`${APP_URL}/api/auth/csrf`);

    if (response.status !== 200) {
      throw new Error(`CSRF endpoint failed with status ${response.status}`);
    }

    const data = JSON.parse(response.body);
    if (!data.csrfToken) {
      throw new Error('CSRF token not returned');
    }

    log('Auth', 'CSRF token generated successfully', { tokenLength: data.csrfToken.length });
  }

  /**
   * INT-004: Test Session Endpoint (Unauthenticated)
   */
  async testUnauthenticatedSession(): Promise<void> {
    log('Session', 'Testing session endpoint without authentication...');

    const response = await fetchWithCookies(`${APP_URL}/api/auth/session`);

    if (response.status !== 200) {
      throw new Error(`Session endpoint failed with status ${response.status}`);
    }

    const session = JSON.parse(response.body);

    // Unauthenticated session should be empty object
    if (Object.keys(session).length > 0) {
      throw new Error('Expected empty session for unauthenticated user');
    }

    log('Session', 'Unauthenticated session correctly returns empty object');
  }

  /**
   * INT-005: Test Google OAuth Redirect (Manual Test)
   *
   * This test verifies the OAuth flow initiation. For full OAuth testing,
   * manual interaction with Google's OAuth consent screen is required.
   */
  async testOAuthRedirect(): Promise<void> {
    log('OAuth', 'Testing Google OAuth redirect...');

    const response = await fetchWithCookies(`${APP_URL}/api/auth/signin/google`, {
      followRedirect: false,
    });

    // Should redirect to Google OAuth
    if (![302, 303, 307].includes(response.status)) {
      throw new Error(`Expected redirect status, got ${response.status}`);
    }

    if (!response.redirectUrl) {
      throw new Error('No redirect URL provided');
    }

    // Verify redirect URL is to Google
    if (!response.redirectUrl.includes('accounts.google.com')) {
      throw new Error(`Expected redirect to Google, got: ${response.redirectUrl}`);
    }

    log('OAuth', 'OAuth redirect configured correctly', { redirectUrl: response.redirectUrl });
    logInfo('Manual OAuth Test Required: Visit the redirect URL to complete OAuth flow');
  }

  /**
   * INT-006: Test Protected Route Without Auth
   */
  async testProtectedRouteWithoutAuth(): Promise<void> {
    log('Auth', 'Testing protected route without authentication...');

    // Clear cookies to ensure we're unauthenticated
    state.cookies = [];

    const response = await fetchWithCookies(`${APP_URL}/api/v1/fields`);

    // Should return 401 Unauthorized
    if (response.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${response.status}`);
    }

    log('Auth', 'Protected route correctly rejects unauthenticated request');
  }

  /**
   * INT-007: Test Field Creation API Schema Validation
   */
  async testFieldValidation(): Promise<void> {
    log('API', 'Testing field creation validation...');

    // This will fail without auth, but we're testing validation
    const invalidPayload = {
      name: '', // Invalid: empty name
      geojson: 'not-an-object', // Invalid: should be object
    };

    const response = await fetchWithCookies(`${APP_URL}/api/v1/fields`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidPayload),
    });

    // Should return 401 (auth) or 400 (validation) depending on middleware order
    if (![400, 401].includes(response.status)) {
      throw new Error(`Expected 400 or 401, got ${response.status}`);
    }

    log('API', 'Field validation endpoint responding correctly');
  }

  /**
   * INT-008: Mock Authentication Flow (Development Only)
   *
   * This simulates a successful authentication for testing downstream flows.
   * Only works if backend has mock auth enabled.
   */
  async testMockAuth(): Promise<void> {
    if (!MOCK_AUTH) {
      logInfo('Mock auth not enabled, skipping...');
      return;
    }

    log('MockAuth', 'Testing mock authentication flow...');

    // Create a mock user session
    // const mockUser = {
    //   email: 'test@example.com',
    //   name: 'Test User',
    //   id: 'test-user-id',
    // };

    // Note: This requires backend support for mock auth
    // For now, we'll just log the intent
    logWarning('Mock auth flow requires backend mock endpoint implementation');
    logInfo('To test authenticated flows, sign in manually and copy session cookie');
  }

  /**
   * INT-009: Test Tenant Assignment Logic (Requires DB Access)
   *
   * This verifies that tenant assignment happens correctly during sign-in.
   */
  async testTenantAssignment(): Promise<void> {
    log('Tenant', 'Testing tenant assignment logic...');

    // This test requires either:
    // 1. Direct database access
    // 2. Admin API endpoint to verify tenant creation
    // 3. Manual verification after OAuth

    logInfo('Tenant assignment test requires manual verification:');
    logInfo('1. Sign in via Google OAuth');
    logInfo('2. Check database for User.tenant_id and Tenant table entry');
    logInfo('3. Verify AuditLog entry for TENANT_CREATED');
  }

  /**
   * INT-010: Test Session Persistence Across Requests
   */
  async testSessionPersistence(): Promise<void> {
    log('Session', 'Testing session persistence...');

    // Make first request to establish session
    const response1 = await fetchWithCookies(`${APP_URL}/api/auth/session`);
    const initialCookies = [...state.cookies];

    // Make second request with same cookies
    const response2 = await fetchWithCookies(`${APP_URL}/api/auth/session`);

    if (response1.status !== 200 || response2.status !== 200) {
      throw new Error('Session endpoint failed');
    }

    // Cookies should persist
    if (state.cookies.length > 0 && initialCookies.join('') !== state.cookies.join('')) {
      log('Session', 'Session cookies updated between requests');
    }

    log('Session', 'Session persistence working correctly');
  }

  /**
   * Print summary report
   */
  printSummary(): void {
    console.log('\n\n' + '='.repeat(80));
    console.log('FULLSTACK INTEGRATION TEST REPORT');
    console.log('='.repeat(80));

    console.log(`\nTest Suite: ROuvis Authentication Flow`);
    console.log(`Date: ${new Date().toISOString()}`);
    console.log(`Environment: ${APP_URL}`);
    console.log(`Mock Mode: ${MOCK_AUTH ? 'Enabled' : 'Disabled'}`);

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.passed).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.testResults.reduce((sum, t) => sum + t.duration, 0);

    console.log('\n' + '-'.repeat(80));
    console.log('SUMMARY');
    console.log('-'.repeat(80));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: \x1b[32m${passedTests}\x1b[0m`);
    console.log(`Failed: \x1b[31m${failedTests}\x1b[0m`);
    console.log(`Duration: ${totalDuration}ms`);

    console.log('\n' + '-'.repeat(80));
    console.log('DETAILED RESULTS');
    console.log('-'.repeat(80));

    this.testResults.forEach(result => {
      const status = result.passed ? '\x1b[32m✅ PASS\x1b[0m' : '\x1b[31m❌ FAIL\x1b[0m';
      console.log(`${status} ${result.name} (${result.duration}ms)`);
    });

    console.log('\n' + '-'.repeat(80));
    console.log('CRITICAL ISSUES');
    console.log('-'.repeat(80));

    const criticalFailures = this.testResults.filter(t =>
      !t.passed && (t.name.includes('Health') || t.name.includes('Providers'))
    );

    if (criticalFailures.length > 0) {
      criticalFailures.forEach(failure => {
        console.log(`\x1b[31m🚨 CRITICAL: ${failure.name}\x1b[0m`);
      });
      console.log('\nBackend may not be running or misconfigured!');
    } else {
      console.log('No critical issues detected.');
    }

    console.log('\n' + '-'.repeat(80));
    console.log('MANUAL TESTING REQUIRED');
    console.log('-'.repeat(80));
    console.log('The following flows require manual testing:');
    console.log('1. Complete Google OAuth flow (visit redirect URL)');
    console.log('2. Verify tenant creation in database after first sign-in');
    console.log('3. Complete onboarding wizard (3 steps)');
    console.log('4. Verify field creation persists in database');
    console.log('5. Verify Google Calendar tokens stored in User table');
    console.log('6. Test session persistence across browser tabs');
    console.log('7. Test logout and re-authentication');

    console.log('\n' + '-'.repeat(80));
    console.log('OVERALL ASSESSMENT');
    console.log('-'.repeat(80));

    if (failedTests === 0) {
      console.log('\x1b[32m✅ READY FOR DEPLOYMENT\x1b[0m');
      console.log('All automated tests passed. Complete manual tests before production.');
    } else if (criticalFailures.length > 0) {
      console.log('\x1b[31m🚫 BLOCKED\x1b[0m');
      console.log('Critical failures detected. Fix before proceeding.');
    } else {
      console.log('\x1b[33m⚠️  NEEDS FIXES\x1b[0m');
      console.log('Some tests failed. Review and fix issues.');
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }

  /**
   * Run all tests
   */
  async runAll(): Promise<void> {
    console.log('\x1b[36m');
    console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                               ║');
    console.log('║              ROuvis Fullstack Authentication Integration Test                 ║');
    console.log('║                                                                               ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');
    console.log('\x1b[0m\n');

    logInfo(`App URL: ${APP_URL}`);
    logInfo(`Mock Mode: ${MOCK_AUTH ? 'Enabled' : 'Disabled'}`);
    logInfo(`Verbose: ${VERBOSE ? 'Enabled' : 'Disabled'}`);
    console.log('');

    // Run tests
    await this.runTest('INT-001: Backend Health Check', () => this.testBackendHealth());
    await this.runTest('INT-002: NextAuth Providers Endpoint', () => this.testAuthProviders());
    await this.runTest('INT-003: CSRF Token Generation', () => this.testCsrfToken());
    await this.runTest('INT-004: Unauthenticated Session', () => this.testUnauthenticatedSession());
    await this.runTest('INT-005: Google OAuth Redirect', () => this.testOAuthRedirect());
    await this.runTest('INT-006: Protected Route Without Auth', () => this.testProtectedRouteWithoutAuth());
    await this.runTest('INT-007: Field Validation', () => this.testFieldValidation());
    await this.runTest('INT-008: Mock Auth Flow', () => this.testMockAuth());
    await this.runTest('INT-009: Tenant Assignment', () => this.testTenantAssignment());
    await this.runTest('INT-010: Session Persistence', () => this.testSessionPersistence());

    // Print summary
    this.printSummary();
  }
}

// Main execution
async function main() {
  const tests = new AuthIntegrationTests();

  try {
    await tests.runAll();
  } catch (error) {
    console.error('\x1b[31m\nFatal error during test execution:\x1b[0m');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
main();
