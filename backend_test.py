#!/usr/bin/env python3
"""
Comprehensive backend API tests for AfinityOS authentication system.
Tests all auth endpoints under /api prefix.
"""
import requests
import uuid
import time
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/.env')

BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
API_BASE = f"{BASE_URL}/api"

# Test results tracking
test_results = []
failed_tests = []

def log_test(name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = f"{status}: {name}"
    if details:
        result += f"\n   Details: {details}"
    print(result)
    test_results.append({"name": name, "passed": passed, "details": details})
    if not passed:
        failed_tests.append({"name": name, "details": details})

def generate_unique_email():
    """Generate unique email for testing"""
    return f"test_{uuid.uuid4().hex[:8]}@afinityos.test"

def test_health():
    """Test GET /api/health"""
    print("\n=== Testing GET /api/health ===")
    try:
        resp = requests.get(f"{API_BASE}/health", timeout=10)
        data = resp.json()
        
        if resp.status_code == 200:
            if 'status' in data and data['status'] == 'ok' and 'service' in data and 'time' in data:
                log_test("GET /api/health", True, f"Response: {data}")
                return True
            else:
                log_test("GET /api/health", False, f"Missing required fields. Got: {data}")
                return False
        else:
            log_test("GET /api/health", False, f"Status {resp.status_code}, body: {data}")
            return False
    except Exception as e:
        log_test("GET /api/health", False, f"Exception: {str(e)}")
        return False

def test_register_success():
    """Test POST /api/auth/register - success case"""
    print("\n=== Testing POST /api/auth/register (success) ===")
    email = generate_unique_email()
    payload = {
        "email": email,
        "password": "SecurePass123!",
        "name": "Test User",
        "orgName": "Test Organization"
    }
    
    try:
        resp = requests.post(f"{API_BASE}/auth/register", json=payload, timeout=10)
        data = resp.json()
        
        if resp.status_code == 201:
            # Check required fields
            required = ['user', 'organization', 'accessToken', 'refreshToken', 'expiresIn']
            missing = [f for f in required if f not in data]
            if missing:
                log_test("POST /api/auth/register (success)", False, f"Missing fields: {missing}")
                return None
            
            # Check user object
            user = data['user']
            if 'passwordHash' in user:
                log_test("POST /api/auth/register (success)", False, "User object contains passwordHash (security leak)")
                return None
            if '_id' in user:
                log_test("POST /api/auth/register (success)", False, "User object contains _id (should use id)")
                return None
            if 'id' not in user:
                log_test("POST /api/auth/register (success)", False, "User object missing id field")
                return None
            
            # Check organization
            org = data['organization']
            if user.get('organizationId') != org.get('id'):
                log_test("POST /api/auth/register (success)", False, f"User orgId {user.get('organizationId')} != org id {org.get('id')}")
                return None
            
            # Check role (should default to org_admin if not provided)
            if user.get('role') != 'org_admin':
                log_test("POST /api/auth/register (success)", False, f"Expected role 'org_admin', got '{user.get('role')}'")
                return None
            
            log_test("POST /api/auth/register (success)", True, f"User created: {user.get('email')}, role: {user.get('role')}")
            return data
        else:
            log_test("POST /api/auth/register (success)", False, f"Status {resp.status_code}, body: {data}")
            return None
    except Exception as e:
        log_test("POST /api/auth/register (success)", False, f"Exception: {str(e)}")
        return None

def test_register_with_role():
    """Test POST /api/auth/register with specific role"""
    print("\n=== Testing POST /api/auth/register (with role) ===")
    email = generate_unique_email()
    payload = {
        "email": email,
        "password": "SecurePass123!",
        "name": "Sales User",
        "role": "sales"
    }
    
    try:
        resp = requests.post(f"{API_BASE}/auth/register", json=payload, timeout=10)
        data = resp.json()
        
        if resp.status_code == 201:
            user = data.get('user', {})
            if user.get('role') == 'sales':
                log_test("POST /api/auth/register (with role)", True, f"User created with role: {user.get('role')}")
                return True
            else:
                log_test("POST /api/auth/register (with role)", False, f"Expected role 'sales', got '{user.get('role')}'")
                return False
        else:
            log_test("POST /api/auth/register (with role)", False, f"Status {resp.status_code}, body: {data}")
            return False
    except Exception as e:
        log_test("POST /api/auth/register (with role)", False, f"Exception: {str(e)}")
        return False

def test_register_invalid_role():
    """Test POST /api/auth/register with invalid role (should default to org_admin)"""
    print("\n=== Testing POST /api/auth/register (invalid role) ===")
    email = generate_unique_email()
    payload = {
        "email": email,
        "password": "SecurePass123!",
        "name": "Invalid Role User",
        "role": "invalid_role_xyz"
    }
    
    try:
        resp = requests.post(f"{API_BASE}/auth/register", json=payload, timeout=10)
        data = resp.json()
        
        if resp.status_code == 201:
            user = data.get('user', {})
            if user.get('role') == 'org_admin':
                log_test("POST /api/auth/register (invalid role fallback)", True, f"Invalid role correctly defaulted to org_admin")
                return True
            else:
                log_test("POST /api/auth/register (invalid role fallback)", False, f"Expected fallback to 'org_admin', got '{user.get('role')}'")
                return False
        else:
            log_test("POST /api/auth/register (invalid role fallback)", False, f"Status {resp.status_code}, body: {data}")
            return False
    except Exception as e:
        log_test("POST /api/auth/register (invalid role fallback)", False, f"Exception: {str(e)}")
        return False

def test_register_missing_fields():
    """Test POST /api/auth/register - missing required fields"""
    print("\n=== Testing POST /api/auth/register (missing fields) ===")
    
    test_cases = [
        ({}, "all fields missing"),
        ({"email": "test@test.com"}, "missing password and name"),
        ({"password": "pass123"}, "missing email and name"),
        ({"name": "Test"}, "missing email and password"),
        ({"email": "test@test.com", "password": "pass123"}, "missing name"),
    ]
    
    all_passed = True
    for payload, description in test_cases:
        try:
            resp = requests.post(f"{API_BASE}/auth/register", json=payload, timeout=10)
            if resp.status_code == 400:
                log_test(f"POST /api/auth/register ({description})", True, f"Correctly returned 400")
            else:
                log_test(f"POST /api/auth/register ({description})", False, f"Expected 400, got {resp.status_code}")
                all_passed = False
        except Exception as e:
            log_test(f"POST /api/auth/register ({description})", False, f"Exception: {str(e)}")
            all_passed = False
    
    return all_passed

def test_register_duplicate_email():
    """Test POST /api/auth/register - duplicate email"""
    print("\n=== Testing POST /api/auth/register (duplicate email) ===")
    email = generate_unique_email()
    payload = {
        "email": email,
        "password": "SecurePass123!",
        "name": "Test User"
    }
    
    try:
        # First registration
        resp1 = requests.post(f"{API_BASE}/auth/register", json=payload, timeout=10)
        if resp1.status_code != 201:
            log_test("POST /api/auth/register (duplicate email)", False, f"First registration failed: {resp1.status_code}")
            return False
        
        # Second registration with same email
        resp2 = requests.post(f"{API_BASE}/auth/register", json=payload, timeout=10)
        if resp2.status_code == 409:
            log_test("POST /api/auth/register (duplicate email)", True, f"Correctly returned 409 for duplicate email")
            return True
        else:
            log_test("POST /api/auth/register (duplicate email)", False, f"Expected 409, got {resp2.status_code}")
            return False
    except Exception as e:
        log_test("POST /api/auth/register (duplicate email)", False, f"Exception: {str(e)}")
        return False

def test_login_success():
    """Test POST /api/auth/login - success case"""
    print("\n=== Testing POST /api/auth/login (success) ===")
    email = generate_unique_email()
    password = "SecurePass123!"
    
    # First register
    reg_payload = {"email": email, "password": password, "name": "Login Test User"}
    try:
        reg_resp = requests.post(f"{API_BASE}/auth/register", json=reg_payload, timeout=10)
        if reg_resp.status_code != 201:
            log_test("POST /api/auth/login (success)", False, f"Registration failed: {reg_resp.status_code}")
            return None
        
        # Now login
        login_payload = {"email": email, "password": password}
        login_resp = requests.post(f"{API_BASE}/auth/login", json=login_payload, timeout=10)
        data = login_resp.json()
        
        if login_resp.status_code == 200:
            required = ['user', 'organization', 'accessToken', 'refreshToken', 'expiresIn']
            missing = [f for f in required if f not in data]
            if missing:
                log_test("POST /api/auth/login (success)", False, f"Missing fields: {missing}")
                return None
            
            user = data['user']
            if 'passwordHash' in user or '_id' in user:
                log_test("POST /api/auth/login (success)", False, "User object leaks sensitive data")
                return None
            
            log_test("POST /api/auth/login (success)", True, f"Login successful for {email}")
            return data
        else:
            log_test("POST /api/auth/login (success)", False, f"Status {login_resp.status_code}, body: {data}")
            return None
    except Exception as e:
        log_test("POST /api/auth/login (success)", False, f"Exception: {str(e)}")
        return None

def test_login_invalid_credentials():
    """Test POST /api/auth/login - invalid credentials"""
    print("\n=== Testing POST /api/auth/login (invalid credentials) ===")
    email = generate_unique_email()
    password = "SecurePass123!"
    
    # Register user
    reg_payload = {"email": email, "password": password, "name": "Invalid Creds Test"}
    try:
        reg_resp = requests.post(f"{API_BASE}/auth/register", json=reg_payload, timeout=10)
        if reg_resp.status_code != 201:
            log_test("POST /api/auth/login (invalid credentials)", False, f"Registration failed")
            return False
        
        # Try login with wrong password
        login_payload = {"email": email, "password": "WrongPassword123!"}
        login_resp = requests.post(f"{API_BASE}/auth/login", json=login_payload, timeout=10)
        
        if login_resp.status_code == 401:
            log_test("POST /api/auth/login (invalid credentials)", True, "Correctly returned 401 for wrong password")
            return True
        else:
            log_test("POST /api/auth/login (invalid credentials)", False, f"Expected 401, got {login_resp.status_code}")
            return False
    except Exception as e:
        log_test("POST /api/auth/login (invalid credentials)", False, f"Exception: {str(e)}")
        return False

def test_login_unknown_email():
    """Test POST /api/auth/login - unknown email"""
    print("\n=== Testing POST /api/auth/login (unknown email) ===")
    email = generate_unique_email()  # Not registered
    payload = {"email": email, "password": "SomePassword123!"}
    
    try:
        resp = requests.post(f"{API_BASE}/auth/login", json=payload, timeout=10)
        if resp.status_code == 401:
            log_test("POST /api/auth/login (unknown email)", True, "Correctly returned 401 for unknown email")
            return True
        else:
            log_test("POST /api/auth/login (unknown email)", False, f"Expected 401, got {resp.status_code}")
            return False
    except Exception as e:
        log_test("POST /api/auth/login (unknown email)", False, f"Exception: {str(e)}")
        return False

def test_login_missing_fields():
    """Test POST /api/auth/login - missing fields"""
    print("\n=== Testing POST /api/auth/login (missing fields) ===")
    
    test_cases = [
        ({}, "all fields missing"),
        ({"email": "test@test.com"}, "missing password"),
        ({"password": "pass123"}, "missing email"),
    ]
    
    all_passed = True
    for payload, description in test_cases:
        try:
            resp = requests.post(f"{API_BASE}/auth/login", json=payload, timeout=10)
            if resp.status_code == 400:
                log_test(f"POST /api/auth/login ({description})", True, f"Correctly returned 400")
            else:
                log_test(f"POST /api/auth/login ({description})", False, f"Expected 400, got {resp.status_code}")
                all_passed = False
        except Exception as e:
            log_test(f"POST /api/auth/login ({description})", False, f"Exception: {str(e)}")
            all_passed = False
    
    return all_passed

def test_auth_me_valid_token():
    """Test GET /api/auth/me with valid token"""
    print("\n=== Testing GET /api/auth/me (valid token) ===")
    
    # Register and get token
    reg_data = test_register_success()
    if not reg_data:
        log_test("GET /api/auth/me (valid token)", False, "Failed to register user for test")
        return None
    
    access_token = reg_data['accessToken']
    headers = {"Authorization": f"Bearer {access_token}"}
    
    try:
        resp = requests.get(f"{API_BASE}/auth/me", headers=headers, timeout=10)
        data = resp.json()
        
        if resp.status_code == 200:
            if 'user' not in data or 'organization' not in data:
                log_test("GET /api/auth/me (valid token)", False, f"Missing user or organization in response")
                return None
            
            user = data['user']
            if 'passwordHash' in user or '_id' in user:
                log_test("GET /api/auth/me (valid token)", False, "User object leaks sensitive data")
                return None
            
            log_test("GET /api/auth/me (valid token)", True, f"Successfully retrieved user: {user.get('email')}")
            return data
        else:
            log_test("GET /api/auth/me (valid token)", False, f"Status {resp.status_code}, body: {data}")
            return None
    except Exception as e:
        log_test("GET /api/auth/me (valid token)", False, f"Exception: {str(e)}")
        return None

def test_auth_me_no_token():
    """Test GET /api/auth/me without token"""
    print("\n=== Testing GET /api/auth/me (no token) ===")
    
    try:
        resp = requests.get(f"{API_BASE}/auth/me", timeout=10)
        if resp.status_code == 401:
            log_test("GET /api/auth/me (no token)", True, "Correctly returned 401 without token")
            return True
        else:
            log_test("GET /api/auth/me (no token)", False, f"Expected 401, got {resp.status_code}")
            return False
    except Exception as e:
        log_test("GET /api/auth/me (no token)", False, f"Exception: {str(e)}")
        return False

def test_auth_me_malformed_token():
    """Test GET /api/auth/me with malformed token"""
    print("\n=== Testing GET /api/auth/me (malformed token) ===")
    
    malformed_tokens = [
        "garbage_token",
        "Bearer.invalid.token",
        "not.a.jwt",
    ]
    
    all_passed = True
    for token in malformed_tokens:
        headers = {"Authorization": f"Bearer {token}"}
        try:
            resp = requests.get(f"{API_BASE}/auth/me", headers=headers, timeout=10)
            if resp.status_code == 401:
                log_test(f"GET /api/auth/me (malformed token: {token[:20]}...)", True, "Correctly returned 401")
            else:
                log_test(f"GET /api/auth/me (malformed token: {token[:20]}...)", False, f"Expected 401, got {resp.status_code}")
                all_passed = False
        except Exception as e:
            log_test(f"GET /api/auth/me (malformed token)", False, f"Exception: {str(e)}")
            all_passed = False
    
    return all_passed

def test_profile_update():
    """Test PUT /api/auth/profile with valid token"""
    print("\n=== Testing PUT /api/auth/profile (valid token) ===")
    
    # Register and get token
    reg_data = test_register_success()
    if not reg_data:
        log_test("PUT /api/auth/profile (valid token)", False, "Failed to register user for test")
        return False
    
    access_token = reg_data['accessToken']
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # Update profile
    update_payload = {
        "name": "Updated Name",
        "title": "Senior Engineer",
        "phone": "+1234567890",
        "avatarUrl": "https://example.com/avatar.jpg"
    }
    
    try:
        resp = requests.put(f"{API_BASE}/auth/profile", json=update_payload, headers=headers, timeout=10)
        data = resp.json()
        
        if resp.status_code == 200:
            user = data.get('user', {})
            
            # Verify updates
            if (user.get('name') == update_payload['name'] and
                user.get('title') == update_payload['title'] and
                user.get('phone') == update_payload['phone'] and
                user.get('avatarUrl') == update_payload['avatarUrl']):
                
                # Verify persistence by calling /auth/me
                me_resp = requests.get(f"{API_BASE}/auth/me", headers=headers, timeout=10)
                me_data = me_resp.json()
                me_user = me_data.get('user', {})
                
                if (me_user.get('name') == update_payload['name'] and
                    me_user.get('title') == update_payload['title'] and
                    me_user.get('phone') == update_payload['phone'] and
                    me_user.get('avatarUrl') == update_payload['avatarUrl']):
                    log_test("PUT /api/auth/profile (valid token)", True, "Profile updated and persisted successfully")
                    return True
                else:
                    log_test("PUT /api/auth/profile (valid token)", False, "Profile updates not persisted")
                    return False
            else:
                log_test("PUT /api/auth/profile (valid token)", False, f"Profile not updated correctly. Got: {user}")
                return False
        else:
            log_test("PUT /api/auth/profile (valid token)", False, f"Status {resp.status_code}, body: {data}")
            return False
    except Exception as e:
        log_test("PUT /api/auth/profile (valid token)", False, f"Exception: {str(e)}")
        return False

def test_profile_update_no_token():
    """Test PUT /api/auth/profile without token"""
    print("\n=== Testing PUT /api/auth/profile (no token) ===")
    
    payload = {"name": "Should Fail"}
    try:
        resp = requests.put(f"{API_BASE}/auth/profile", json=payload, timeout=10)
        if resp.status_code == 401:
            log_test("PUT /api/auth/profile (no token)", True, "Correctly returned 401 without token")
            return True
        else:
            log_test("PUT /api/auth/profile (no token)", False, f"Expected 401, got {resp.status_code}")
            return False
    except Exception as e:
        log_test("PUT /api/auth/profile (no token)", False, f"Exception: {str(e)}")
        return False

def test_refresh_token_rotation():
    """Test POST /api/auth/refresh - token rotation"""
    print("\n=== Testing POST /api/auth/refresh (token rotation) ===")
    
    # Register and get tokens
    email = generate_unique_email()
    reg_payload = {"email": email, "password": "SecurePass123!", "name": "Refresh Test User"}
    
    try:
        reg_resp = requests.post(f"{API_BASE}/auth/register", json=reg_payload, timeout=10)
        if reg_resp.status_code != 201:
            log_test("POST /api/auth/refresh (token rotation)", False, "Registration failed")
            return False
        
        reg_data = reg_resp.json()
        old_refresh_token = reg_data['refreshToken']
        
        # Use refresh token to get new tokens
        refresh_payload = {"refreshToken": old_refresh_token}
        refresh_resp = requests.post(f"{API_BASE}/auth/refresh", json=refresh_payload, timeout=10)
        
        if refresh_resp.status_code != 200:
            log_test("POST /api/auth/refresh (token rotation)", False, f"Refresh failed: {refresh_resp.status_code}")
            return False
        
        refresh_data = refresh_resp.json()
        new_refresh_token = refresh_data.get('refreshToken')
        new_access_token = refresh_data.get('accessToken')
        
        if not new_refresh_token or not new_access_token:
            log_test("POST /api/auth/refresh (token rotation)", False, "Missing tokens in refresh response")
            return False
        
        # Verify new access token works
        headers = {"Authorization": f"Bearer {new_access_token}"}
        me_resp = requests.get(f"{API_BASE}/auth/me", headers=headers, timeout=10)
        if me_resp.status_code != 200:
            log_test("POST /api/auth/refresh (token rotation)", False, "New access token doesn't work")
            return False
        
        # Try to use old refresh token (should fail)
        old_refresh_payload = {"refreshToken": old_refresh_token}
        old_refresh_resp = requests.post(f"{API_BASE}/auth/refresh", json=old_refresh_payload, timeout=10)
        
        if old_refresh_resp.status_code == 401:
            log_test("POST /api/auth/refresh (token rotation)", True, "Token rotation working correctly - old token rejected")
            return True
        else:
            log_test("POST /api/auth/refresh (token rotation)", False, f"Old refresh token still works (expected 401, got {old_refresh_resp.status_code})")
            return False
    except Exception as e:
        log_test("POST /api/auth/refresh (token rotation)", False, f"Exception: {str(e)}")
        return False

def test_refresh_invalid_token():
    """Test POST /api/auth/refresh with invalid token"""
    print("\n=== Testing POST /api/auth/refresh (invalid token) ===")
    
    payload = {"refreshToken": "invalid_garbage_token"}
    try:
        resp = requests.post(f"{API_BASE}/auth/refresh", json=payload, timeout=10)
        if resp.status_code == 401:
            log_test("POST /api/auth/refresh (invalid token)", True, "Correctly returned 401 for invalid token")
            return True
        else:
            log_test("POST /api/auth/refresh (invalid token)", False, f"Expected 401, got {resp.status_code}")
            return False
    except Exception as e:
        log_test("POST /api/auth/refresh (invalid token)", False, f"Exception: {str(e)}")
        return False

def test_refresh_missing_token():
    """Test POST /api/auth/refresh without token"""
    print("\n=== Testing POST /api/auth/refresh (missing token) ===")
    
    payload = {}
    try:
        resp = requests.post(f"{API_BASE}/auth/refresh", json=payload, timeout=10)
        if resp.status_code == 400:
            log_test("POST /api/auth/refresh (missing token)", True, "Correctly returned 400 for missing token")
            return True
        else:
            log_test("POST /api/auth/refresh (missing token)", False, f"Expected 400, got {resp.status_code}")
            return False
    except Exception as e:
        log_test("POST /api/auth/refresh (missing token)", False, f"Exception: {str(e)}")
        return False

def test_logout():
    """Test POST /api/auth/logout"""
    print("\n=== Testing POST /api/auth/logout ===")
    
    # Register and get tokens
    email = generate_unique_email()
    reg_payload = {"email": email, "password": "SecurePass123!", "name": "Logout Test User"}
    
    try:
        reg_resp = requests.post(f"{API_BASE}/auth/register", json=reg_payload, timeout=10)
        if reg_resp.status_code != 201:
            log_test("POST /api/auth/logout", False, "Registration failed")
            return False
        
        reg_data = reg_resp.json()
        refresh_token = reg_data['refreshToken']
        
        # Logout
        logout_payload = {"refreshToken": refresh_token}
        logout_resp = requests.post(f"{API_BASE}/auth/logout", json=logout_payload, timeout=10)
        
        if logout_resp.status_code != 200:
            log_test("POST /api/auth/logout", False, f"Logout failed: {logout_resp.status_code}")
            return False
        
        logout_data = logout_resp.json()
        if not logout_data.get('success'):
            log_test("POST /api/auth/logout", False, "Logout response missing success field")
            return False
        
        # Try to use refresh token after logout (should fail)
        refresh_payload = {"refreshToken": refresh_token}
        refresh_resp = requests.post(f"{API_BASE}/auth/refresh", json=refresh_payload, timeout=10)
        
        if refresh_resp.status_code == 401:
            log_test("POST /api/auth/logout", True, "Logout successful - refresh token revoked")
            return True
        else:
            log_test("POST /api/auth/logout", False, f"Refresh token still works after logout (expected 401, got {refresh_resp.status_code})")
            return False
    except Exception as e:
        log_test("POST /api/auth/logout", False, f"Exception: {str(e)}")
        return False

def test_logout_without_token():
    """Test POST /api/auth/logout without token (idempotent)"""
    print("\n=== Testing POST /api/auth/logout (without token) ===")
    
    payload = {}
    try:
        resp = requests.post(f"{API_BASE}/auth/logout", json=payload, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success'):
                log_test("POST /api/auth/logout (without token)", True, "Correctly returned 200 (idempotent)")
                return True
            else:
                log_test("POST /api/auth/logout (without token)", False, "Missing success field")
                return False
        else:
            log_test("POST /api/auth/logout (without token)", False, f"Expected 200, got {resp.status_code}")
            return False
    except Exception as e:
        log_test("POST /api/auth/logout (without token)", False, f"Exception: {str(e)}")
        return False

def test_forgot_password_existing_email():
    """Test POST /api/auth/forgot-password with existing email"""
    print("\n=== Testing POST /api/auth/forgot-password (existing email) ===")
    
    # Register user first
    email = generate_unique_email()
    reg_payload = {"email": email, "password": "SecurePass123!", "name": "Forgot Password Test"}
    
    try:
        reg_resp = requests.post(f"{API_BASE}/auth/register", json=reg_payload, timeout=10)
        if reg_resp.status_code != 201:
            log_test("POST /api/auth/forgot-password (existing email)", False, "Registration failed")
            return False
        
        # Request password reset
        forgot_payload = {"email": email}
        forgot_resp = requests.post(f"{API_BASE}/auth/forgot-password", json=forgot_payload, timeout=10)
        
        if forgot_resp.status_code == 200:
            data = forgot_resp.json()
            if data.get('success') and 'message' in data:
                log_test("POST /api/auth/forgot-password (existing email)", True, f"Response: {data.get('message')}")
                return True
            else:
                log_test("POST /api/auth/forgot-password (existing email)", False, f"Missing success or message. Got: {data}")
                return False
        else:
            log_test("POST /api/auth/forgot-password (existing email)", False, f"Expected 200, got {forgot_resp.status_code}")
            return False
    except Exception as e:
        log_test("POST /api/auth/forgot-password (existing email)", False, f"Exception: {str(e)}")
        return False

def test_forgot_password_nonexistent_email():
    """Test POST /api/auth/forgot-password with non-existent email (no enumeration)"""
    print("\n=== Testing POST /api/auth/forgot-password (non-existent email) ===")
    
    email = generate_unique_email()  # Not registered
    payload = {"email": email}
    
    try:
        resp = requests.post(f"{API_BASE}/auth/forgot-password", json=payload, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success'):
                log_test("POST /api/auth/forgot-password (non-existent email)", True, "Correctly returned 200 (no enumeration)")
                return True
            else:
                log_test("POST /api/auth/forgot-password (non-existent email)", False, f"Missing success field. Got: {data}")
                return False
        else:
            log_test("POST /api/auth/forgot-password (non-existent email)", False, f"Expected 200, got {resp.status_code}")
            return False
    except Exception as e:
        log_test("POST /api/auth/forgot-password (non-existent email)", False, f"Exception: {str(e)}")
        return False

def test_forgot_password_missing_email():
    """Test POST /api/auth/forgot-password without email"""
    print("\n=== Testing POST /api/auth/forgot-password (missing email) ===")
    
    payload = {}
    try:
        resp = requests.post(f"{API_BASE}/auth/forgot-password", json=payload, timeout=10)
        if resp.status_code == 400:
            log_test("POST /api/auth/forgot-password (missing email)", True, "Correctly returned 400")
            return True
        else:
            log_test("POST /api/auth/forgot-password (missing email)", False, f"Expected 400, got {resp.status_code}")
            return False
    except Exception as e:
        log_test("POST /api/auth/forgot-password (missing email)", False, f"Exception: {str(e)}")
        return False

def test_auth_roles():
    """Test GET /api/auth/roles"""
    print("\n=== Testing GET /api/auth/roles ===")
    
    try:
        resp = requests.get(f"{API_BASE}/auth/roles", timeout=10)
        data = resp.json()
        
        if resp.status_code == 200:
            if 'roles' not in data or 'permissions' not in data:
                log_test("GET /api/auth/roles", False, "Missing roles or permissions in response")
                return False
            
            roles = data['roles']
            permissions = data['permissions']
            
            expected_roles = ['super_admin', 'org_admin', 'sales', 'marketing', 'support', 'executive', 'standard_user']
            if len(roles) != 7 or not all(r in roles for r in expected_roles):
                log_test("GET /api/auth/roles", False, f"Expected 7 roles, got {len(roles)}: {roles}")
                return False
            
            # Check permissions structure
            if not isinstance(permissions, dict):
                log_test("GET /api/auth/roles", False, "Permissions should be a dict")
                return False
            
            log_test("GET /api/auth/roles", True, f"Returned {len(roles)} roles with permissions")
            return True
        else:
            log_test("GET /api/auth/roles", False, f"Status {resp.status_code}, body: {data}")
            return False
    except Exception as e:
        log_test("GET /api/auth/roles", False, f"Exception: {str(e)}")
        return False

def test_access_token_from_register():
    """Test that access token from register works immediately on /auth/me"""
    print("\n=== Testing access token from register works on /auth/me ===")
    
    email = generate_unique_email()
    reg_payload = {"email": email, "password": "SecurePass123!", "name": "Token Test User"}
    
    try:
        reg_resp = requests.post(f"{API_BASE}/auth/register", json=reg_payload, timeout=10)
        if reg_resp.status_code != 201:
            log_test("Access token from register works on /auth/me", False, "Registration failed")
            return False
        
        reg_data = reg_resp.json()
        access_token = reg_data['accessToken']
        
        # Immediately use access token
        headers = {"Authorization": f"Bearer {access_token}"}
        me_resp = requests.get(f"{API_BASE}/auth/me", headers=headers, timeout=10)
        
        if me_resp.status_code == 200:
            me_data = me_resp.json()
            if me_data.get('user', {}).get('email') == email:
                log_test("Access token from register works on /auth/me", True, "Access token works immediately")
                return True
            else:
                log_test("Access token from register works on /auth/me", False, "Email mismatch")
                return False
        else:
            log_test("Access token from register works on /auth/me", False, f"Expected 200, got {me_resp.status_code}")
            return False
    except Exception as e:
        log_test("Access token from register works on /auth/me", False, f"Exception: {str(e)}")
        return False

def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    total = len(test_results)
    passed = sum(1 for t in test_results if t['passed'])
    failed = total - passed
    
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {passed} ✅")
    print(f"Failed: {failed} ❌")
    print(f"Success Rate: {(passed/total*100):.1f}%")
    
    if failed_tests:
        print("\n" + "="*80)
        print("FAILED TESTS DETAILS")
        print("="*80)
        for test in failed_tests:
            print(f"\n❌ {test['name']}")
            print(f"   {test['details']}")
    
    print("\n" + "="*80)

def test_demo_login():
    """Test POST /api/auth/demo - idempotent demo login"""
    print("\n=== Testing POST /api/auth/demo ===")
    
    try:
        resp1 = requests.post(f"{API_BASE}/auth/demo", timeout=10)
        data1 = resp1.json()
        
        if resp1.status_code != 200:
            log_test("POST /api/auth/demo", False, f"Status {resp1.status_code}, body: {data1}")
            return None
        
        # Check required fields
        required = ['user', 'organization', 'accessToken', 'refreshToken']
        missing = [f for f in required if f not in data1]
        if missing:
            log_test("POST /api/auth/demo", False, f"Missing fields: {missing}")
            return None
        
        # Call again to verify idempotency
        resp2 = requests.post(f"{API_BASE}/auth/demo", timeout=10)
        data2 = resp2.json()
        
        if data1['user']['id'] != data2['user']['id']:
            log_test("POST /api/auth/demo", False, "Demo login not idempotent - different user IDs")
            return None
        
        log_test("POST /api/auth/demo", True, f"Demo user: {data1['user']['email']}, idempotent: ✓")
        return data1
    except Exception as e:
        log_test("POST /api/auth/demo", False, f"Exception: {str(e)}")
        return None

def test_discovery_reports_with_auth():
    """Test GET /api/discovery/reports with auth"""
    print("\n=== Testing GET /api/discovery/reports (with auth) ===")
    
    # Get auth token
    demo_data = test_demo_login()
    if not demo_data:
        log_test("GET /api/discovery/reports (with auth)", False, "Failed to get demo token")
        return None
    
    headers = {"Authorization": f"Bearer {demo_data['accessToken']}"}
    
    try:
        resp = requests.get(f"{API_BASE}/discovery/reports", headers=headers, timeout=10)
        data = resp.json()
        
        if resp.status_code != 200:
            log_test("GET /api/discovery/reports (with auth)", False, f"Status {resp.status_code}, body: {data}")
            return None
        
        # Check structure
        if 'reports' not in data or 'prebaked' not in data:
            log_test("GET /api/discovery/reports (with auth)", False, f"Missing reports or prebaked. Got: {data.keys()}")
            return None
        
        # Check prebaked reports
        prebaked = data['prebaked']
        if not isinstance(prebaked, list) or len(prebaked) != 3:
            log_test("GET /api/discovery/reports (with auth)", False, f"Expected 3 prebaked reports, got {len(prebaked)}")
            return None
        
        # Verify prebaked structure
        for report in prebaked:
            required_fields = ['id', 'baseUrl', 'framework', 'authMechanism', 'discoveredEndpoints']
            missing = [f for f in required_fields if f not in report]
            if missing:
                log_test("GET /api/discovery/reports (with auth)", False, f"Prebaked report missing fields: {missing}")
                return None
        
        log_test("GET /api/discovery/reports (with auth)", True, f"Reports: {len(data['reports'])}, Prebaked: {len(prebaked)}")
        return data
    except Exception as e:
        log_test("GET /api/discovery/reports (with auth)", False, f"Exception: {str(e)}")
        return None

def test_discovery_reports_without_auth():
    """Test GET /api/discovery/reports without auth"""
    print("\n=== Testing GET /api/discovery/reports (without auth) ===")
    
    try:
        resp = requests.get(f"{API_BASE}/discovery/reports", timeout=10)
        if resp.status_code == 401:
            log_test("GET /api/discovery/reports (without auth)", True, "Correctly returned 401")
            return True
        else:
            log_test("GET /api/discovery/reports (without auth)", False, f"Expected 401, got {resp.status_code}")
            return False
    except Exception as e:
        log_test("GET /api/discovery/reports (without auth)", False, f"Exception: {str(e)}")
        return False

def test_discovery_prebaked():
    """Test GET /api/discovery/prebaked"""
    print("\n=== Testing GET /api/discovery/prebaked ===")
    
    try:
        resp = requests.get(f"{API_BASE}/discovery/prebaked", timeout=10)
        data = resp.json()
        
        if resp.status_code != 200:
            log_test("GET /api/discovery/prebaked", False, f"Status {resp.status_code}, body: {data}")
            return False
        
        if 'reports' not in data or len(data['reports']) != 3:
            log_test("GET /api/discovery/prebaked", False, f"Expected 3 reports, got {len(data.get('reports', []))}")
            return False
        
        log_test("GET /api/discovery/prebaked", True, f"Returned {len(data['reports'])} prebaked reports")
        return True
    except Exception as e:
        log_test("GET /api/discovery/prebaked", False, f"Exception: {str(e)}")
        return False

def test_discovery_scan_valid():
    """Test POST /api/discovery/scan with valid URL"""
    print("\n=== Testing POST /api/discovery/scan (valid URL) ===")
    
    # Get auth token
    demo_data = test_demo_login()
    if not demo_data:
        log_test("POST /api/discovery/scan (valid URL)", False, "Failed to get demo token")
        return None
    
    headers = {"Authorization": f"Bearer {demo_data['accessToken']}"}
    payload = {
        "url": "https://point-vault.preview.emergentagent.com",
        "label": "Point Vault Test Scan"
    }
    
    try:
        print("   Note: Scan may take 30-60 seconds...")
        resp = requests.post(f"{API_BASE}/discovery/scan", json=payload, headers=headers, timeout=120)
        data = resp.json()
        
        if resp.status_code != 200:
            log_test("POST /api/discovery/scan (valid URL)", False, f"Status {resp.status_code}, body: {data}")
            return None
        
        if 'report' not in data:
            log_test("POST /api/discovery/scan (valid URL)", False, f"Missing report in response. Got: {data.keys()}")
            return None
        
        report = data['report']
        
        # Verify report structure
        required_fields = ['id', 'baseUrl', 'framework', 'authMechanism', 'endpoints', 'rawProbeCount']
        missing = [f for f in required_fields if f not in report]
        if missing:
            log_test("POST /api/discovery/scan (valid URL)", False, f"Report missing fields: {missing}")
            return None
        
        # Verify baseUrl matches
        if report['baseUrl'] != "https://point-vault.preview.emergentagent.com":
            log_test("POST /api/discovery/scan (valid URL)", False, f"BaseUrl mismatch: {report['baseUrl']}")
            return None
        
        # Verify framework and authMechanism are strings
        if not isinstance(report['framework'], str) or not isinstance(report['authMechanism'], str):
            log_test("POST /api/discovery/scan (valid URL)", False, "Framework or authMechanism not strings")
            return None
        
        # Verify endpoints is an array
        if not isinstance(report['endpoints'], list):
            log_test("POST /api/discovery/scan (valid URL)", False, "Endpoints not an array")
            return None
        
        # Verify rawProbeCount > 0
        if report['rawProbeCount'] <= 0:
            log_test("POST /api/discovery/scan (valid URL)", False, f"rawProbeCount should be > 0, got {report['rawProbeCount']}")
            return None
        
        # Verify id is a UUID
        try:
            uuid.UUID(report['id'])
        except:
            log_test("POST /api/discovery/scan (valid URL)", False, f"ID is not a valid UUID: {report['id']}")
            return None
        
        log_test("POST /api/discovery/scan (valid URL)", True, 
                f"Scan complete: {report['framework']}, {len(report['endpoints'])} endpoints, {report['rawProbeCount']} probes")
        return report
    except Exception as e:
        log_test("POST /api/discovery/scan (valid URL)", False, f"Exception: {str(e)}")
        return None

def test_discovery_scan_persisted():
    """Test that scanned report appears in GET /api/discovery/reports"""
    print("\n=== Testing discovery scan persistence ===")
    
    # Get auth token
    demo_data = test_demo_login()
    if not demo_data:
        log_test("Discovery scan persistence", False, "Failed to get demo token")
        return False
    
    headers = {"Authorization": f"Bearer {demo_data['accessToken']}"}
    
    try:
        # Get reports
        resp = requests.get(f"{API_BASE}/discovery/reports", headers=headers, timeout=10)
        data = resp.json()
        
        if resp.status_code != 200:
            log_test("Discovery scan persistence", False, f"Failed to get reports: {resp.status_code}")
            return False
        
        # Check if we have any saved reports
        reports = data.get('reports', [])
        if len(reports) > 0:
            # Find Point Vault scan
            point_vault_scans = [r for r in reports if 'point-vault' in r.get('baseUrl', '').lower()]
            if point_vault_scans:
                log_test("Discovery scan persistence", True, f"Found {len(point_vault_scans)} Point Vault scan(s) in saved reports")
                return True
            else:
                log_test("Discovery scan persistence", False, "No Point Vault scans found in saved reports")
                return False
        else:
            log_test("Discovery scan persistence", False, "No saved reports found")
            return False
    except Exception as e:
        log_test("Discovery scan persistence", False, f"Exception: {str(e)}")
        return False

def test_discovery_scan_missing_url():
    """Test POST /api/discovery/scan without URL"""
    print("\n=== Testing POST /api/discovery/scan (missing URL) ===")
    
    # Get auth token
    demo_data = test_demo_login()
    if not demo_data:
        log_test("POST /api/discovery/scan (missing URL)", False, "Failed to get demo token")
        return False
    
    headers = {"Authorization": f"Bearer {demo_data['accessToken']}"}
    payload = {"label": "Test"}
    
    try:
        resp = requests.post(f"{API_BASE}/discovery/scan", json=payload, headers=headers, timeout=10)
        if resp.status_code == 400:
            data = resp.json()
            if 'url required' in data.get('error', '').lower():
                log_test("POST /api/discovery/scan (missing URL)", True, "Correctly returned 400 with 'url required'")
                return True
            else:
                log_test("POST /api/discovery/scan (missing URL)", False, f"Got 400 but wrong error: {data}")
                return False
        else:
            log_test("POST /api/discovery/scan (missing URL)", False, f"Expected 400, got {resp.status_code}")
            return False
    except Exception as e:
        log_test("POST /api/discovery/scan (missing URL)", False, f"Exception: {str(e)}")
        return False

def test_discovery_multitenant_isolation():
    """Test multi-tenant isolation for discovery reports"""
    print("\n=== Testing discovery multi-tenant isolation ===")
    
    # Get Org A token (demo)
    demo_data = test_demo_login()
    if not demo_data:
        log_test("Discovery multi-tenant isolation", False, "Failed to get demo token")
        return False
    
    org_a_headers = {"Authorization": f"Bearer {demo_data['accessToken']}"}
    
    # Register Org B user
    org_b_email = generate_unique_email()
    org_b_payload = {
        "email": org_b_email,
        "password": "SecurePass123!",
        "name": "Org B User",
        "orgName": "Organization B"
    }
    
    try:
        reg_resp = requests.post(f"{API_BASE}/auth/register", json=org_b_payload, timeout=10)
        if reg_resp.status_code != 201:
            log_test("Discovery multi-tenant isolation", False, f"Org B registration failed: {reg_resp.status_code}")
            return False
        
        org_b_data = reg_resp.json()
        org_b_headers = {"Authorization": f"Bearer {org_b_data['accessToken']}"}
        
        # Get Org A reports
        org_a_resp = requests.get(f"{API_BASE}/discovery/reports", headers=org_a_headers, timeout=10)
        org_a_reports = org_a_resp.json().get('reports', [])
        
        # Get Org B reports
        org_b_resp = requests.get(f"{API_BASE}/discovery/reports", headers=org_b_headers, timeout=10)
        org_b_reports = org_b_resp.json().get('reports', [])
        
        # Org B should not see Org A's saved scans
        if len(org_a_reports) > 0:
            # Check if any Org A report IDs appear in Org B's reports
            org_a_ids = {r['id'] for r in org_a_reports}
            org_b_ids = {r['id'] for r in org_b_reports}
            
            overlap = org_a_ids & org_b_ids
            if overlap:
                log_test("Discovery multi-tenant isolation", False, f"Org B can see Org A's reports: {overlap}")
                return False
            else:
                log_test("Discovery multi-tenant isolation", True, f"Org A: {len(org_a_reports)} reports, Org B: {len(org_b_reports)} reports, no overlap")
                return True
        else:
            log_test("Discovery multi-tenant isolation", True, "Org A has no saved reports, Org B isolation verified")
            return True
    except Exception as e:
        log_test("Discovery multi-tenant isolation", False, f"Exception: {str(e)}")
        return False

def test_connector_config_jwt_credentials():
    """Test POST /api/connectors/sales/config with JWT credentials"""
    print("\n=== Testing POST /api/connectors/sales/config (JWT credentials) ===")
    
    # Get admin token
    demo_data = test_demo_login()
    if not demo_data:
        log_test("POST /api/connectors/sales/config (JWT credentials)", False, "Failed to get demo token")
        return False
    
    headers = {"Authorization": f"Bearer {demo_data['accessToken']}"}
    payload = {
        "baseUrl": "https://crm-automation-ref.preview.emergentagent.com",
        "serviceEmail": "nonexistent@example.com",
        "servicePassword": "WrongPassword123"
    }
    
    try:
        resp = requests.post(f"{API_BASE}/connectors/sales/config", json=payload, headers=headers, timeout=10)
        data = resp.json()
        
        if resp.status_code != 200:
            log_test("POST /api/connectors/sales/config (JWT credentials)", False, f"Status {resp.status_code}, body: {data}")
            return False
        
        if not data.get('success') or not data.get('configured'):
            log_test("POST /api/connectors/sales/config (JWT credentials)", False, f"Expected success and configured. Got: {data}")
            return False
        
        log_test("POST /api/connectors/sales/config (JWT credentials)", True, "Sales connector configured with JWT credentials")
        return True
    except Exception as e:
        log_test("POST /api/connectors/sales/config (JWT credentials)", False, f"Exception: {str(e)}")
        return False

def test_connector_configured_status():
    """Test GET /api/connectors shows sales as configured"""
    print("\n=== Testing GET /api/connectors (sales configured) ===")
    
    # Get auth token
    demo_data = test_demo_login()
    if not demo_data:
        log_test("GET /api/connectors (sales configured)", False, "Failed to get demo token")
        return False
    
    headers = {"Authorization": f"Bearer {demo_data['accessToken']}"}
    
    try:
        resp = requests.get(f"{API_BASE}/connectors", headers=headers, timeout=10)
        data = resp.json()
        
        if resp.status_code != 200:
            log_test("GET /api/connectors (sales configured)", False, f"Status {resp.status_code}, body: {data}")
            return False
        
        connectors = data.get('connectors', [])
        sales_connector = next((c for c in connectors if c['id'] == 'sales'), None)
        
        if not sales_connector:
            log_test("GET /api/connectors (sales configured)", False, "Sales connector not found")
            return False
        
        if not sales_connector.get('configured'):
            log_test("GET /api/connectors (sales configured)", False, f"Sales connector not configured: {sales_connector}")
            return False
        
        log_test("GET /api/connectors (sales configured)", True, "Sales connector shows as configured")
        return True
    except Exception as e:
        log_test("GET /api/connectors (sales configured)", False, f"Exception: {str(e)}")
        return False

def test_connector_jwt_login_failure():
    """Test connector tool call with wrong JWT credentials"""
    print("\n=== Testing connector JWT login failure ===")
    
    # Get auth token
    demo_data = test_demo_login()
    if not demo_data:
        log_test("Connector JWT login failure", False, "Failed to get demo token")
        return False
    
    headers = {"Authorization": f"Bearer {demo_data['accessToken']}"}
    
    # First, reconfigure with JWT credentials (clearing any apiKey)
    config_payload = {
        "baseUrl": "https://crm-automation-ref.preview.emergentagent.com",
        "serviceEmail": "nonexistent@example.com",
        "servicePassword": "WrongPassword123",
        "apiKey": None  # Clear any existing apiKey
    }
    requests.post(f"{API_BASE}/connectors/sales/config", json=config_payload, headers=headers, timeout=10)
    
    payload = {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com"
    }
    
    try:
        resp = requests.post(f"{API_BASE}/connectors/sales/tools/create_lead", json=payload, headers=headers, timeout=15)
        data = resp.json()
        
        if resp.status_code != 200:
            log_test("Connector JWT login failure", False, f"Expected 200, got {resp.status_code}, body: {data}")
            return False
        
        result = data.get('result', {})
        
        # Check mode is 'live'
        if result.get('mode') != 'live':
            log_test("Connector JWT login failure", False, f"Expected mode='live', got '{result.get('mode')}'")
            return False
        
        # Check ok is false
        if result.get('ok') != False:
            log_test("Connector JWT login failure", False, f"Expected ok=false, got {result.get('ok')}")
            return False
        
        # Check status is 401
        if result.get('status') != 401:
            log_test("Connector JWT login failure", False, f"Expected status=401, got {result.get('status')}")
            return False
        
        # Check error message mentions login failure
        error = result.get('error', '').lower()
        if 'login failed' not in error and 'service credentials' not in error:
            log_test("Connector JWT login failure", False, f"Error should mention 'login failed' or 'service credentials'. Got: {result.get('error')}")
            return False
        
        log_test("Connector JWT login failure", True, f"JWT login correctly failed with 401: {result.get('error')}")
        return True
    except Exception as e:
        log_test("Connector JWT login failure", False, f"Exception: {str(e)}")
        return False

def test_connector_config_api_key():
    """Test POST /api/connectors/sales/config with API key"""
    print("\n=== Testing POST /api/connectors/sales/config (API key) ===")
    
    # Get admin token
    demo_data = test_demo_login()
    if not demo_data:
        log_test("POST /api/connectors/sales/config (API key)", False, "Failed to get demo token")
        return False
    
    headers = {"Authorization": f"Bearer {demo_data['accessToken']}"}
    payload = {
        "apiKey": "static-key-123"
    }
    
    try:
        resp = requests.post(f"{API_BASE}/connectors/sales/config", json=payload, headers=headers, timeout=10)
        data = resp.json()
        
        if resp.status_code != 200:
            log_test("POST /api/connectors/sales/config (API key)", False, f"Status {resp.status_code}, body: {data}")
            return False
        
        if not data.get('success'):
            log_test("POST /api/connectors/sales/config (API key)", False, f"Expected success. Got: {data}")
            return False
        
        log_test("POST /api/connectors/sales/config (API key)", True, "Sales connector reconfigured with API key")
        return True
    except Exception as e:
        log_test("POST /api/connectors/sales/config (API key)", False, f"Exception: {str(e)}")
        return False

def test_connector_api_key_mode():
    """Test connector tool call with API key (should run in live mode)"""
    print("\n=== Testing connector with API key (live mode) ===")
    
    # Get auth token
    demo_data = test_demo_login()
    if not demo_data:
        log_test("Connector with API key (live mode)", False, "Failed to get demo token")
        return False
    
    headers = {"Authorization": f"Bearer {demo_data['accessToken']}"}
    payload = {
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane.smith@example.com"
    }
    
    try:
        resp = requests.post(f"{API_BASE}/connectors/sales/tools/create_lead", json=payload, headers=headers, timeout=15)
        data = resp.json()
        
        if resp.status_code != 200:
            log_test("Connector with API key (live mode)", False, f"Expected 200, got {resp.status_code}, body: {data}")
            return False
        
        result = data.get('result', {})
        
        # Check mode is 'live'
        if result.get('mode') != 'live':
            log_test("Connector with API key (live mode)", False, f"Expected mode='live', got '{result.get('mode')}'")
            return False
        
        # Should NOT have 'login failed' error
        error = result.get('error', '').lower()
        if 'login failed' in error:
            log_test("Connector with API key (live mode)", False, f"Should not have 'login failed' error with API key. Got: {result.get('error')}")
            return False
        
        log_test("Connector with API key (live mode)", True, f"Tool ran in live mode with API key (ok={result.get('ok')}, status={result.get('status')})")
        return True
    except Exception as e:
        log_test("Connector with API key (live mode)", False, f"Exception: {str(e)}")
        return False

def test_ai_tools_calls_audit():
    """Test GET /api/ai-tools/calls shows both connector calls"""
    print("\n=== Testing GET /api/ai-tools/calls (audit log) ===")
    
    # Get auth token
    demo_data = test_demo_login()
    if not demo_data:
        log_test("GET /api/ai-tools/calls (audit log)", False, "Failed to get demo token")
        return False
    
    headers = {"Authorization": f"Bearer {demo_data['accessToken']}"}
    
    try:
        resp = requests.get(f"{API_BASE}/ai-tools/calls", headers=headers, timeout=10)
        data = resp.json()
        
        if resp.status_code != 200:
            log_test("GET /api/ai-tools/calls (audit log)", False, f"Status {resp.status_code}, body: {data}")
            return False
        
        calls = data.get('calls', [])
        
        # Find sales connector calls
        sales_calls = [c for c in calls if c.get('connectorId') == 'sales' and c.get('toolName') == 'create_lead']
        
        if len(sales_calls) < 2:
            log_test("GET /api/ai-tools/calls (audit log)", False, f"Expected at least 2 sales calls, found {len(sales_calls)}")
            return False
        
        # Check that both calls have mode='live'
        live_calls = [c for c in sales_calls if c.get('mode') == 'live']
        if len(live_calls) < 2:
            log_test("GET /api/ai-tools/calls (audit log)", False, f"Expected at least 2 live mode calls, found {len(live_calls)}")
            return False
        
        log_test("GET /api/ai-tools/calls (audit log)", True, f"Found {len(sales_calls)} sales calls, {len(live_calls)} in live mode")
        return True
    except Exception as e:
        log_test("GET /api/ai-tools/calls (audit log)", False, f"Exception: {str(e)}")
        return False

def test_regression_smoke():
    """Test regression smoke tests"""
    print("\n=== Testing regression smoke tests ===")
    
    # Get auth token
    demo_data = test_demo_login()
    if not demo_data:
        log_test("Regression smoke tests", False, "Failed to get demo token")
        return False
    
    headers = {"Authorization": f"Bearer {demo_data['accessToken']}"}
    
    endpoints = [
        ("/gateway/health", "GET"),
        ("/connectors", "GET"),
        ("/events/types", "GET"),
        ("/customers", "GET"),
    ]
    
    all_passed = True
    for path, method in endpoints:
        try:
            if method == "GET":
                resp = requests.get(f"{API_BASE}{path}", headers=headers, timeout=10)
            else:
                resp = requests.post(f"{API_BASE}{path}", headers=headers, timeout=10)
            
            if resp.status_code == 200:
                log_test(f"Regression: {method} {path}", True, "200 OK")
            else:
                log_test(f"Regression: {method} {path}", False, f"Expected 200, got {resp.status_code}")
                all_passed = False
        except Exception as e:
            log_test(f"Regression: {method} {path}", False, f"Exception: {str(e)}")
            all_passed = False
    
    return all_passed

def main():
    """Run all tests"""
    print("="*80)
    print("AfinityOS Backend API Test Suite")
    print(f"Testing against: {API_BASE}")
    print("="*80)
    
    # Run all tests
    test_health()
    test_register_success()
    test_register_with_role()
    test_register_invalid_role()
    test_register_missing_fields()
    test_register_duplicate_email()
    test_login_success()
    test_login_invalid_credentials()
    test_login_unknown_email()
    test_login_missing_fields()
    test_auth_me_valid_token()
    test_auth_me_no_token()
    test_auth_me_malformed_token()
    test_profile_update()
    test_profile_update_no_token()
    test_refresh_token_rotation()
    test_refresh_invalid_token()
    test_refresh_missing_token()
    test_logout()
    test_logout_without_token()
    test_forgot_password_existing_email()
    test_forgot_password_nonexistent_email()
    test_forgot_password_missing_email()
    test_auth_roles()
    test_access_token_from_register()
    
    # Integration Discovery Engine tests
    print("\n" + "="*80)
    print("INTEGRATION DISCOVERY ENGINE TESTS")
    print("="*80)
    test_demo_login()
    test_discovery_reports_with_auth()
    test_discovery_reports_without_auth()
    test_discovery_prebaked()
    test_discovery_scan_valid()
    test_discovery_scan_persisted()
    test_discovery_scan_missing_url()
    test_discovery_multitenant_isolation()
    
    # BaseConnector JWT login caching tests
    print("\n" + "="*80)
    print("BASE-CONNECTOR JWT LOGIN CACHING TESTS")
    print("="*80)
    test_connector_config_jwt_credentials()
    test_connector_configured_status()
    test_connector_jwt_login_failure()
    test_connector_config_api_key()
    test_connector_api_key_mode()
    test_ai_tools_calls_audit()
    
    # Regression tests
    print("\n" + "="*80)
    print("REGRESSION SMOKE TESTS")
    print("="*80)
    test_regression_smoke()
    
    # Print summary
    print_summary()
    
    # Exit with appropriate code
    if failed_tests:
        exit(1)
    else:
        exit(0)

if __name__ == "__main__":
    main()
