#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Build AfinityOS — an enterprise SaaS app with premium Linear/OpenAI/Stripe-style UI,
  dark + white themes with glassmorphism, Next.js + Tailwind + shadcn/ui + Framer Motion.
  Sidebar nav with 12 modules: Dashboard, Customer360, AI Workforce, Sales, Marketing, Support,
  Insurance, Rewards, Marketplace, Analytics, Billing, Settings. Placeholder content only.
  Enterprise auth: JWT + refresh tokens, SSO placeholders, Organizations, Users, Roles
  (super_admin, org_admin, sales, marketing, support, executive, standard_user), Permissions.
  Login, Register, Forgot Password, Profile pages. Every protected page requires auth.

backend:
  - task: "JWT auth with refresh tokens (register, login, refresh, logout, forgot-password, me, profile)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Implemented full auth stack using node crypto (HS256 JWT + scrypt password hashing) and MongoDB.
          Endpoints:
            POST /api/auth/register  { email, password, name, orgName?, role? }
            POST /api/auth/login     { email, password }
            POST /api/auth/refresh   { refreshToken }    (rotates refresh token)
            POST /api/auth/logout    { refreshToken }
            POST /api/auth/forgot-password { email }
            GET  /api/auth/me        (Bearer access token)
            PUT  /api/auth/profile   (Bearer access token, allowed: name, title, phone, avatarUrl)
            GET  /api/auth/roles     (returns roles + permissions metadata)
            GET  /api/health
          Access token TTL 15m, refresh 7d, refresh tokens persisted in MongoDB with TTL index.
          On register, an organization is created and the user becomes its org_admin (or chosen role).
      - working: false
        agent: "testing"
        comment: |
          COMPREHENSIVE BACKEND TESTING COMPLETED (35 tests total)
          
          ✅ PASSING TESTS (34/35 - 97.1%):
          - GET /api/health: Returns correct status, service, and timestamp
          - POST /api/auth/register: Success case (201), creates user + org + tokens
          - POST /api/auth/register: Role handling (sales, marketing, etc.)
          - POST /api/auth/register: Invalid role fallback to org_admin
          - POST /api/auth/register: Missing fields validation (400)
          - POST /api/auth/register: Duplicate email detection (409)
          - POST /api/auth/login: Success case (200), returns user + org + tokens
          - POST /api/auth/login: Invalid credentials (401)
          - POST /api/auth/login: Unknown email (401)
          - POST /api/auth/login: Missing fields validation (400)
          - GET /api/auth/me: Valid Bearer token (200), returns user + org
          - GET /api/auth/me: No token (401)
          - GET /api/auth/me: Malformed/garbage tokens (401)
          - PUT /api/auth/profile: Update with valid token (200)
          - PUT /api/auth/profile: Updates persist (verified via /auth/me)
          - PUT /api/auth/profile: No token (401)
          - POST /api/auth/refresh: Invalid token (401)
          - POST /api/auth/refresh: Missing token (400)
          - POST /api/auth/logout: Valid token (200), token revoked
          - POST /api/auth/logout: Without token (200, idempotent)
          - POST /api/auth/forgot-password: Existing email (200)
          - POST /api/auth/forgot-password: Non-existent email (200, no enumeration)
          - POST /api/auth/forgot-password: Missing email (400)
          - GET /api/auth/roles: Returns 7 roles with permissions
          - Access token from register works immediately on /auth/me
          - User objects NEVER leak passwordHash or _id (verified across all endpoints)
          
          ❌ CRITICAL FAILURE (1/35):
          - POST /api/auth/refresh: REFRESH TOKEN ROTATION NOT WORKING RELIABLY
            * Issue: Old refresh tokens are NOT being invalidated after use
            * Expected: After using a refresh token, it should be deleted and return 401 on reuse
            * Actual: Old refresh tokens still work 80% of the time (failed 4/5 isolated tests)
            * Security Impact: CRITICAL - This is a major security vulnerability allowing token reuse
            * Root Cause: The deleteOne operation in /auth/refresh endpoint (line 231) is not working consistently
            * Evidence: Ran isolated test 5 times - only 1/5 properly rejected old token with 401
            * The old token continues to generate new access/refresh tokens instead of being rejected
          
          SECURITY VERIFICATION:
          ✅ No passwordHash leakage in any response
          ✅ No MongoDB _id exposure in any response
          ✅ All user objects use UUID-based id field
          ✅ Proper 401 responses for invalid/missing tokens
          ✅ Proper 400 responses for missing required fields
          ✅ Proper 409 response for duplicate email
          ✅ Password reset doesn't enumerate users (always 200)
          
          Test files created: /app/backend_test.py, /app/debug_refresh_test.py, /app/isolated_refresh_test.py
      - working: true
        agent: "testing"
        comment: |
          RE-TEST AFTER FIX - ALL TESTS PASSING (35/35 - 100%)
          
          ✅ CRITICAL BUG FIXED: Refresh token rotation now working perfectly!
          
          FIX APPLIED:
          - Added unique `jti` (uuidv4) field to each refresh token payload
          - This ensures that even if two tokens are signed in the same second with the same user ID,
            they will have different signatures due to the unique jti value
          - Lines 173, 200, 229 in app/api/[[...path]]/route.js now include jti: uuidv4()
          
          ISOLATED REFRESH TOKEN ROTATION TEST:
          ✅ 5/5 passes (was 1/5 before fix)
          - Each test verified that:
            1. POST /api/auth/refresh with valid refreshToken returns 200 with NEW tokens
            2. New refreshToken is different from old refreshToken
            3. New accessToken works on /api/auth/me
            4. POST /api/auth/refresh with OLD refreshToken returns 401 (token revoked)
          
          FULL BACKEND TEST SUITE:
          ✅ 35/35 tests passing (100% success rate, was 34/35 before)
          
          All endpoints verified:
          ✅ GET /api/health
          ✅ POST /api/auth/register (success, role handling, validation, duplicate detection)
          ✅ POST /api/auth/login (success, invalid credentials, validation)
          ✅ GET /api/auth/me (valid token, no token, malformed tokens)
          ✅ PUT /api/auth/profile (update, persistence, no token)
          ✅ POST /api/auth/refresh (token rotation, invalid token, missing token) - NOW WORKING!
          ✅ POST /api/auth/logout (with token, without token)
          ✅ POST /api/auth/forgot-password (existing email, non-existent, validation)
          ✅ GET /api/auth/roles
          
          SECURITY VERIFICATION:
          ✅ No passwordHash leakage in any response
          ✅ No MongoDB _id exposure in any response
          ✅ All user objects use UUID-based id field
          ✅ Proper 401 responses for invalid/missing tokens
          ✅ Proper 400 responses for missing required fields
          ✅ Proper 409 response for duplicate email
          ✅ Password reset doesn't enumerate users (always 200)
          ✅ Refresh token rotation prevents token reuse (CRITICAL SECURITY FIX)
          
          CONCLUSION: All backend authentication APIs are working correctly. The critical security
          vulnerability with refresh token rotation has been completely resolved.

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 3
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      AfinityOS MVP built. Please test the backend auth API end-to-end via /api/auth/*.
      Cover: registration (creates org + user + tokens), login, /me with Bearer, profile update,
      refresh token rotation (old refresh becomes invalid, new one works), logout (refresh revoked),
      forgot-password (always returns success), invalid credentials, missing fields, duplicate email,
      and expired/invalid tokens. NEXT_PUBLIC_BASE_URL points to the public preview URL; backend
      is exposed under /api. Database is MongoDB local; DB_NAME=afinityos.
  - agent: "testing"
    message: |
      BACKEND TESTING COMPLETE - 34/35 tests passing (97.1%)
      
      CRITICAL ISSUE FOUND:
      Refresh token rotation is NOT working reliably. The deleteOne operation at line 231 in 
      app/api/[[...path]]/route.js is not consistently removing old refresh tokens from the database.
      
      Test Results: Ran isolated test 5 times
      - 4/5 times: Old refresh token still works (returns 200 with new tokens)
      - 1/5 times: Old refresh token correctly rejected (returns 401)
      
      This is a CRITICAL SECURITY VULNERABILITY. After a refresh token is used to obtain new tokens,
      the old token MUST be invalidated. Currently, old tokens can be reused 80% of the time.
      
      Possible causes to investigate:
      1. Race condition in MongoDB deleteOne operation
      2. Multiple tokens with same signature in database
      3. Token comparison not matching correctly
      4. Async/await issue with deleteOne not completing before response
      
      All other endpoints working perfectly:
      ✅ Registration, login, logout, forgot-password, /me, profile update, roles
      ✅ All validation and error handling correct
      ✅ No security leaks (passwordHash, _id properly sanitized)
      
      RECOMMENDATION: Fix the refresh token rotation bug before production deployment.
  - agent: "testing"
    message: |
      RE-TEST COMPLETE - CRITICAL BUG FIXED! 🎉
      
      REFRESH TOKEN ROTATION FIX VERIFIED:
      ✅ Isolated test: 5/5 passes (was 1/5 before)
      ✅ Full test suite: 35/35 passes (100% success rate)
      
      The unique `jti` (uuidv4) fix has completely resolved the token rotation issue.
      Old refresh tokens are now properly rejected with 401 after being used.
      
      All backend authentication APIs are working correctly and securely.
      No critical issues remaining.

