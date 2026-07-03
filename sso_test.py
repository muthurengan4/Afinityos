#!/usr/bin/env python3
"""
SSO Launch Backend Test Suite
Tests the Cross-app SSO Launch (Command Center) endpoints.
"""

import requests
import json
import time
from typing import Dict, Any

# Base URL from .env: NEXT_PUBLIC_BASE_URL
BASE_URL = "https://nextjs-crm-2.preview.emergentagent.com/api"

# Test counters
tests_passed = 0
tests_failed = 0

def log_test(test_name: str, passed: bool, details: str = ""):
    """Log test result"""
    global tests_passed, tests_failed
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {test_name}")
    if details:
        print(f"  Details: {details}")
    if passed:
        tests_passed += 1
    else:
        tests_failed += 1

def get_demo_token() -> Dict[str, Any]:
    """Get demo user token (idempotent)"""
    response = requests.post(f"{BASE_URL}/auth/demo")
    assert response.status_code == 200, f"Demo login failed: {response.status_code}"
    data = response.json()
    return {
        "token": data["accessToken"],
        "user": data["user"],
        "org": data["organization"]
    }

def register_user(email: str, password: str, name: str, role: str = "org_admin") -> Dict[str, Any]:
    """Register a new user"""
    response = requests.post(f"{BASE_URL}/auth/register", json={
        "email": email,
        "password": password,
        "name": name,
        "role": role
    })
    assert response.status_code == 201, f"Registration failed: {response.status_code}"
    data = response.json()
    return {
        "token": data["accessToken"],
        "user": data["user"],
        "org": data["organization"]
    }

def auth_headers(token: str) -> Dict[str, str]:
    """Create auth headers"""
    return {"Authorization": f"Bearer {token}"}

print("=" * 80)
print("SSO LAUNCH BACKEND TEST SUITE")
print("=" * 80)
print()

# ============================================================================
# A) STATUS ENDPOINT
# ============================================================================
print("A) STATUS ENDPOINT TESTS")
print("-" * 80)

# Test A.1: GET /api/sso/status without auth -> 401
try:
    response = requests.get(f"{BASE_URL}/sso/status")
    passed = response.status_code == 401
    log_test("A.1: GET /sso/status without auth -> 401", passed, 
             f"Status: {response.status_code}")
except Exception as e:
    log_test("A.1: GET /sso/status without auth -> 401", False, str(e))

# Test A.2: GET /api/sso/status as demo (org_admin) -> 200 with correct structure
try:
    demo = get_demo_token()
    response = requests.get(f"{BASE_URL}/sso/status", headers=auth_headers(demo["token"]))
    passed = False
    details = f"Status: {response.status_code}"
    
    if response.status_code == 200:
        data = response.json()
        # Check structure
        has_allowed = "allowed" in data and data["allowed"] == True
        has_roles = "roles" in data and set(data["roles"]) == {"super_admin", "org_admin", "executive"}
        has_current_role = "currentRole" in data and data["currentRole"] == "org_admin"
        has_connectors = "connectors" in data and isinstance(data["connectors"], list) and len(data["connectors"]) == 5
        
        if has_allowed and has_roles and has_current_role and has_connectors:
            # Check connector structure
            connector = data["connectors"][0]
            has_connector_fields = all(k in connector for k in ["connectorId", "name", "canLaunch", "configured", "baseUrl", "missing"])
            if has_connector_fields:
                passed = True
                details = f"Status: 200, allowed: true, roles: {data['roles']}, currentRole: {data['currentRole']}, connectors: {len(data['connectors'])}"
            else:
                details = f"Missing connector fields. Got: {list(connector.keys())}"
        else:
            details = f"Missing fields. allowed: {has_allowed}, roles: {has_roles}, currentRole: {has_current_role}, connectors: {has_connectors}"
    
    log_test("A.2: GET /sso/status as demo (org_admin) -> 200 with correct structure", passed, details)
except Exception as e:
    log_test("A.2: GET /sso/status as demo (org_admin) -> 200 with correct structure", False, str(e))

# Test A.3: Register NEW user with role='sales', GET /sso/status -> allowed:false
sales_user = None
try:
    sales_user = register_user(
        f"sales_{int(time.time())}@test.com",
        "Test@123",
        "Sales User",
        "sales"
    )
    response = requests.get(f"{BASE_URL}/sso/status", headers=auth_headers(sales_user["token"]))
    passed = False
    details = f"Status: {response.status_code}"
    
    if response.status_code == 200:
        data = response.json()
        if data.get("allowed") == False and data.get("currentRole") == "sales":
            passed = True
            details = f"Status: 200, allowed: false, currentRole: sales"
        else:
            details = f"Expected allowed:false, currentRole:sales. Got: allowed:{data.get('allowed')}, currentRole:{data.get('currentRole')}"
    
    log_test("A.3: Register NEW user with role='sales' -> allowed:false", passed, details)
except Exception as e:
    log_test("A.3: Register NEW user with role='sales' -> allowed:false", False, str(e))

print()

# ============================================================================
# B) LAUNCH — UNCONFIGURED CONNECTOR
# ============================================================================
print("B) LAUNCH — UNCONFIGURED CONNECTOR")
print("-" * 80)

# Test B.4: Fresh org, POST /api/sso/launch { connectorId: 'sales' } -> 400
try:
    fresh_org = register_user(
        f"fresh_{int(time.time())}@test.com",
        "Test@123",
        "Fresh Org Admin",
        "org_admin"
    )
    response = requests.post(f"{BASE_URL}/sso/launch", 
                            headers=auth_headers(fresh_org["token"]),
                            json={"connectorId": "sales"})
    passed = False
    details = f"Status: {response.status_code}"
    
    if response.status_code == 400:
        data = response.json()
        error = data.get("error", "").lower()
        if "baseurl" in error or "service credentials" in error or "no service" in error:
            passed = True
            details = f"Status: 400, error mentions missing config: {data.get('error')}"
        else:
            details = f"Status: 400 but error doesn't mention config: {data.get('error')}"
    
    log_test("B.4: Fresh org, POST /sso/launch (unconfigured) -> 400", passed, details)
except Exception as e:
    log_test("B.4: Fresh org, POST /sso/launch (unconfigured) -> 400", False, str(e))

print()

# ============================================================================
# C) LAUNCH — WRONG ROLE
# ============================================================================
print("C) LAUNCH — WRONG ROLE")
print("-" * 80)

# Test C.5: Sales user, POST /api/sso/launch -> 403
try:
    # Use the sales_user from A.3
    if sales_user is None:
        log_test("C.5: Sales user, POST /sso/launch -> 403 (wrong role)", False, "sales_user not created in A.3")
    else:
        response = requests.post(f"{BASE_URL}/sso/launch",
                                headers=auth_headers(sales_user["token"]),
                                json={"connectorId": "sales"})
        passed = False
        details = f"Status: {response.status_code}"
        
        if response.status_code == 403:
            data = response.json()
            error = data.get("error", "").lower()
            if "sso" in error or "role" in error or "super_admin" in error or "org_admin" in error or "executive" in error:
                passed = True
                details = f"Status: 403, error mentions allowed roles: {data.get('error')}"
            else:
                details = f"Status: 403 but error doesn't mention roles: {data.get('error')}"
        
        log_test("C.5: Sales user, POST /sso/launch -> 403 (wrong role)", passed, details)
except Exception as e:
    log_test("C.5: Sales user, POST /sso/launch -> 403 (wrong role)", False, str(e))

print()

# ============================================================================
# D) LAUNCH — CONFIGURED + LOGIN FAILS
# ============================================================================
print("D) LAUNCH — CONFIGURED + LOGIN FAILS (LIVE against real CRM)")
print("-" * 80)

# Test D.6: Configure sales connector with bogus creds -> 200
try:
    demo = get_demo_token()
    response = requests.post(f"{BASE_URL}/connectors/sales/config",
                            headers=auth_headers(demo["token"]),
                            json={
                                "baseUrl": "https://crm-automation-ref.preview.emergentagent.com",
                                "serviceEmail": "bogus@example.com",
                                "servicePassword": "WrongPass!"
                            })
    passed = False
    details = f"Status: {response.status_code}"
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success") == True and data.get("configured") == True:
            passed = True
            details = f"Status: 200, success: true, configured: true"
        else:
            details = f"Status: 200 but unexpected response: {data}"
    
    log_test("D.6: Configure sales connector with bogus creds -> 200", passed, details)
except Exception as e:
    log_test("D.6: Configure sales connector with bogus creds -> 200", False, str(e))

# Test D.7: GET /api/sso/status -> sales.canLaunch === true
try:
    response = requests.get(f"{BASE_URL}/sso/status", headers=auth_headers(demo["token"]))
    passed = False
    details = f"Status: {response.status_code}"
    
    if response.status_code == 200:
        data = response.json()
        sales_connector = next((c for c in data["connectors"] if c["connectorId"] == "sales"), None)
        if sales_connector and sales_connector.get("canLaunch") == True:
            passed = True
            details = f"Status: 200, sales.canLaunch: true, sales.configured: {sales_connector.get('configured')}"
        else:
            details = f"sales.canLaunch not true. Got: {sales_connector}"
    
    log_test("D.7: GET /sso/status -> sales.canLaunch === true", passed, details)
except Exception as e:
    log_test("D.7: GET /sso/status -> sales.canLaunch === true", False, str(e))

# Test D.8: POST /api/sso/launch -> 401 (login failed)
try:
    response = requests.post(f"{BASE_URL}/sso/launch",
                            headers=auth_headers(demo["token"]),
                            json={"connectorId": "sales"})
    passed = False
    details = f"Status: {response.status_code}"
    
    if response.status_code == 401:
        data = response.json()
        error = data.get("error", "").lower()
        if "login" in error and "failed" in error:
            passed = True
            details = f"Status: 401, error mentions login failed: {data.get('error')}"
        else:
            details = f"Status: 401 but error doesn't mention login failure: {data.get('error')}"
    
    log_test("D.8: POST /sso/launch (bogus creds) -> 401 (login failed)", passed, details)
except Exception as e:
    log_test("D.8: POST /sso/launch (bogus creds) -> 401 (login failed)", False, str(e))

print()

# ============================================================================
# F) UNKNOWN CONNECTOR
# ============================================================================
print("F) UNKNOWN CONNECTOR")
print("-" * 80)

# Test F.9: POST /api/sso/launch { connectorId: 'not_a_thing' } -> 404
try:
    demo = get_demo_token()
    response = requests.post(f"{BASE_URL}/sso/launch",
                            headers=auth_headers(demo["token"]),
                            json={"connectorId": "not_a_thing"})
    passed = False
    details = f"Status: {response.status_code}"
    
    if response.status_code == 404:
        data = response.json()
        error = data.get("error", "").lower()
        if "not found" in error or "not_a_thing" in error:
            passed = True
            details = f"Status: 404, error: {data.get('error')}"
        else:
            details = f"Status: 404 but error doesn't mention 'not found': {data.get('error')}"
    
    log_test("F.9: POST /sso/launch (unknown connector) -> 404", passed, details)
except Exception as e:
    log_test("F.9: POST /sso/launch (unknown connector) -> 404", False, str(e))

# Test F.10: POST /api/sso/launch {} -> 400
try:
    response = requests.post(f"{BASE_URL}/sso/launch",
                            headers=auth_headers(demo["token"]),
                            json={})
    passed = False
    details = f"Status: {response.status_code}"
    
    if response.status_code == 400:
        data = response.json()
        error = data.get("error", "").lower()
        if "connectorid" in error or "required" in error:
            passed = True
            details = f"Status: 400, error: {data.get('error')}"
        else:
            details = f"Status: 400 but error doesn't mention connectorId: {data.get('error')}"
    
    log_test("F.10: POST /sso/launch (missing connectorId) -> 400", passed, details)
except Exception as e:
    log_test("F.10: POST /sso/launch (missing connectorId) -> 400", False, str(e))

print()

# ============================================================================
# G) AUDIT LOG
# ============================================================================
print("G) AUDIT LOG")
print("-" * 80)

# Test G.11: GET /api/sso/launches -> 200 with array
# Note: Audit rows are only written on SUCCESSFUL logins (after loginAndGetToken returns a token)
# Since our test creds are bogus, the audit log may be empty - that is CORRECT
try:
    demo = get_demo_token()
    response = requests.get(f"{BASE_URL}/sso/launches", headers=auth_headers(demo["token"]))
    passed = False
    details = f"Status: {response.status_code}"
    
    if response.status_code == 200:
        data = response.json()
        if "launches" in data and isinstance(data["launches"], list):
            passed = True
            details = f"Status: 200, launches array length: {len(data['launches'])} (may be 0 since no successful logins)"
        else:
            details = f"Status: 200 but missing 'launches' array: {data}"
    
    log_test("G.11: GET /sso/launches -> 200 with array", passed, details)
except Exception as e:
    log_test("G.11: GET /sso/launches -> 200 with array", False, str(e))

print()

# ============================================================================
# H) MULTI-TENANT ISOLATION
# ============================================================================
print("H) MULTI-TENANT ISOLATION")
print("-" * 80)

# Test H.12: Create Org A + Org B, configure each, attempt launch, verify isolation
try:
    # Create Org A
    org_a = register_user(
        f"orga_{int(time.time())}@test.com",
        "Test@123",
        "Org A Admin",
        "org_admin"
    )
    
    # Create Org B
    time.sleep(0.1)  # Ensure different timestamp
    org_b = register_user(
        f"orgb_{int(time.time())}@test.com",
        "Test@123",
        "Org B Admin",
        "org_admin"
    )
    
    # Configure sales connector for Org A with bogus creds
    requests.post(f"{BASE_URL}/connectors/sales/config",
                 headers=auth_headers(org_a["token"]),
                 json={
                     "baseUrl": "https://crm-automation-ref.preview.emergentagent.com",
                     "serviceEmail": "orga@example.com",
                     "servicePassword": "WrongA!"
                 })
    
    # Configure sales connector for Org B with bogus creds
    requests.post(f"{BASE_URL}/connectors/sales/config",
                 headers=auth_headers(org_b["token"]),
                 json={
                     "baseUrl": "https://crm-automation-ref.preview.emergentagent.com",
                     "serviceEmail": "orgb@example.com",
                     "servicePassword": "WrongB!"
                 })
    
    # Attempt launch from Org A (will fail with 401 but that's expected)
    requests.post(f"{BASE_URL}/sso/launch",
                 headers=auth_headers(org_a["token"]),
                 json={"connectorId": "sales"})
    
    # Attempt launch from Org B (will fail with 401 but that's expected)
    requests.post(f"{BASE_URL}/sso/launch",
                 headers=auth_headers(org_b["token"]),
                 json={"connectorId": "sales"})
    
    # Get launches for Org A
    response_a = requests.get(f"{BASE_URL}/sso/launches", headers=auth_headers(org_a["token"]))
    
    # Get launches for Org B
    response_b = requests.get(f"{BASE_URL}/sso/launches", headers=auth_headers(org_b["token"]))
    
    passed = False
    details = ""
    
    if response_a.status_code == 200 and response_b.status_code == 200:
        launches_a = response_a.json().get("launches", [])
        launches_b = response_b.json().get("launches", [])
        
        # Since audit is only written on successful login, both should be empty
        # But if they're not empty, they should not overlap
        org_a_ids = {l.get("organizationId") for l in launches_a}
        org_b_ids = {l.get("organizationId") for l in launches_b}
        
        # Check that Org A's launches don't contain Org B's org ID and vice versa
        isolation_ok = (org_a["org"]["id"] not in org_b_ids) and (org_b["org"]["id"] not in org_a_ids)
        
        if isolation_ok:
            passed = True
            details = f"Org A launches: {len(launches_a)}, Org B launches: {len(launches_b)}, no cross-org leakage"
        else:
            details = f"Cross-org leakage detected! Org A IDs: {org_a_ids}, Org B IDs: {org_b_ids}"
    else:
        details = f"Failed to get launches. Org A status: {response_a.status_code}, Org B status: {response_b.status_code}"
    
    log_test("H.12: Multi-tenant isolation (Org A cannot see Org B launches)", passed, details)
except Exception as e:
    log_test("H.12: Multi-tenant isolation (Org A cannot see Org B launches)", False, str(e))

print()

# ============================================================================
# I) REGRESSION SMOKE TESTS
# ============================================================================
print("I) REGRESSION SMOKE TESTS")
print("-" * 80)

# Test I.1: GET /api/gateway/health -> 200
try:
    response = requests.get(f"{BASE_URL}/gateway/health")
    passed = response.status_code == 200
    log_test("I.1: GET /gateway/health -> 200", passed, f"Status: {response.status_code}")
except Exception as e:
    log_test("I.1: GET /gateway/health -> 200", False, str(e))

# Test I.2: GET /api/connectors -> 200
try:
    demo = get_demo_token()
    response = requests.get(f"{BASE_URL}/connectors", headers=auth_headers(demo["token"]))
    passed = response.status_code == 200
    log_test("I.2: GET /connectors -> 200", passed, f"Status: {response.status_code}")
except Exception as e:
    log_test("I.2: GET /connectors -> 200", False, str(e))

# Test I.3: GET /api/discovery/reports -> 200
try:
    response = requests.get(f"{BASE_URL}/discovery/reports", headers=auth_headers(demo["token"]))
    passed = response.status_code == 200
    log_test("I.3: GET /discovery/reports -> 200", passed, f"Status: {response.status_code}")
except Exception as e:
    log_test("I.3: GET /discovery/reports -> 200", False, str(e))

# Test I.4: GET /api/ai-tools -> 200
try:
    response = requests.get(f"{BASE_URL}/ai-tools")
    passed = response.status_code == 200
    log_test("I.4: GET /ai-tools -> 200", passed, f"Status: {response.status_code}")
except Exception as e:
    log_test("I.4: GET /ai-tools -> 200", False, str(e))

# Test I.5: POST /api/auth/demo idempotent
try:
    response1 = requests.post(f"{BASE_URL}/auth/demo")
    response2 = requests.post(f"{BASE_URL}/auth/demo")
    passed = False
    
    if response1.status_code == 200 and response2.status_code == 200:
        user1 = response1.json()["user"]["id"]
        user2 = response2.json()["user"]["id"]
        if user1 == user2:
            passed = True
            details = f"Same user ID on both calls: {user1}"
        else:
            details = f"Different user IDs: {user1} vs {user2}"
    else:
        details = f"Status codes: {response1.status_code}, {response2.status_code}"
    
    log_test("I.5: POST /auth/demo idempotent", passed, details)
except Exception as e:
    log_test("I.5: POST /auth/demo idempotent", False, str(e))

print()

# ============================================================================
# SUMMARY
# ============================================================================
print("=" * 80)
print("TEST SUMMARY")
print("=" * 80)
print(f"Total Tests: {tests_passed + tests_failed}")
print(f"✅ Passed: {tests_passed}")
print(f"❌ Failed: {tests_failed}")
print(f"Success Rate: {(tests_passed / (tests_passed + tests_failed) * 100):.1f}%")
print("=" * 80)

if tests_failed > 0:
    exit(1)
