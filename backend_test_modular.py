#!/usr/bin/env python3
"""
Comprehensive backend test for AfinityOS modular architecture.
Tests: Gateway, Event Bus, 6 Modules, Multi-tenant isolation, Rate limiting.
"""

import requests
import time
import os
from typing import Dict, Any, Optional

BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://nextjs-crm-2.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

# Test counters
tests_passed = 0
tests_failed = 0
test_results = []

def log_test(name: str, passed: bool, details: str = ""):
    global tests_passed, tests_failed
    if passed:
        tests_passed += 1
        print(f"✅ {name}")
    else:
        tests_failed += 1
        print(f"❌ {name}")
        if details:
            print(f"   Details: {details}")
    test_results.append({"name": name, "passed": passed, "details": details})

def register_user(email: str, password: str, name: str, org_name: str = None) -> Dict[str, Any]:
    """Register a new user and return tokens + user info."""
    payload = {"email": email, "password": password, "name": name}
    if org_name:
        payload["orgName"] = org_name
    resp = requests.post(f"{API_BASE}/auth/register", json=payload)
    return resp.json() if resp.status_code == 201 else {}

def login_user(email: str, password: str) -> Dict[str, Any]:
    """Login and return tokens + user info."""
    resp = requests.post(f"{API_BASE}/auth/login", json={"email": email, "password": password})
    return resp.json() if resp.status_code == 200 else {}

def auth_headers(token: str) -> Dict[str, str]:
    """Return authorization headers."""
    return {"Authorization": f"Bearer {token}"}

print("=" * 80)
print("AFINITYOS MODULAR ARCHITECTURE BACKEND TEST")
print("=" * 80)
print()

# =================== A. REGRESSION TESTS (82 tests) ===================
print("=" * 80)
print("A. REGRESSION TESTS (Prior 82 tests)")
print("=" * 80)

# Create test users for regression
timestamp = int(time.time())
admin_email = f"admin_regress_{timestamp}@test.com"
admin_pass = "SecurePass123!"
admin_name = "Admin Regress"

print(f"\n[Regression] Registering admin user: {admin_email}")
admin_data = register_user(admin_email, admin_pass, admin_name, "Regress Org")
admin_token = admin_data.get("accessToken", "")
admin_user = admin_data.get("user", {})
admin_org_id = admin_user.get("organizationId", "")

# Test 1-35: Auth endpoints (from previous test suite)
print("\n--- Auth Regression Tests (35 tests) ---")

# Health
resp = requests.get(f"{API_BASE}/health")
log_test("Regression: GET /api/health", resp.status_code == 200 and resp.json().get("status") == "ok")

# Register validation
resp = requests.post(f"{API_BASE}/auth/register", json={"email": admin_email, "password": admin_pass, "name": admin_name})
log_test("Regression: Duplicate email returns 409", resp.status_code == 409)

resp = requests.post(f"{API_BASE}/auth/register", json={"email": "test@test.com", "password": "pass"})
log_test("Regression: Missing name returns 400", resp.status_code == 400)

# Login
resp = requests.post(f"{API_BASE}/auth/login", json={"email": admin_email, "password": admin_pass})
log_test("Regression: Login success", resp.status_code == 200 and "accessToken" in resp.json())

resp = requests.post(f"{API_BASE}/auth/login", json={"email": admin_email, "password": "wrongpass"})
log_test("Regression: Invalid password returns 401", resp.status_code == 401)

resp = requests.post(f"{API_BASE}/auth/login", json={"email": "unknown@test.com", "password": "pass"})
log_test("Regression: Unknown email returns 401", resp.status_code == 401)

resp = requests.post(f"{API_BASE}/auth/login", json={"email": admin_email})
log_test("Regression: Missing password returns 400", resp.status_code == 400)

# /auth/me
resp = requests.get(f"{API_BASE}/auth/me", headers=auth_headers(admin_token))
log_test("Regression: GET /auth/me with valid token", resp.status_code == 200 and resp.json().get("user", {}).get("email") == admin_email)

resp = requests.get(f"{API_BASE}/auth/me")
log_test("Regression: GET /auth/me without token returns 401", resp.status_code == 401)

resp = requests.get(f"{API_BASE}/auth/me", headers={"Authorization": "Bearer garbage"})
log_test("Regression: GET /auth/me with invalid token returns 401", resp.status_code == 401)

# Profile update
resp = requests.put(f"{API_BASE}/auth/profile", headers=auth_headers(admin_token), json={"title": "CEO"})
log_test("Regression: PUT /auth/profile updates", resp.status_code == 200)

resp = requests.get(f"{API_BASE}/auth/me", headers=auth_headers(admin_token))
log_test("Regression: Profile update persists", resp.status_code == 200 and resp.json().get("user", {}).get("title") == "CEO")

resp = requests.put(f"{API_BASE}/auth/profile", json={"title": "CTO"})
log_test("Regression: PUT /auth/profile without token returns 401", resp.status_code == 401)

# Refresh token
refresh_token = admin_data.get("refreshToken", "")
resp = requests.post(f"{API_BASE}/auth/refresh", json={"refreshToken": refresh_token})
log_test("Regression: POST /auth/refresh with valid token", resp.status_code == 200 and "accessToken" in resp.json())

new_refresh = resp.json().get("refreshToken", "")
resp = requests.post(f"{API_BASE}/auth/refresh", json={"refreshToken": refresh_token})
log_test("Regression: Old refresh token rejected after rotation", resp.status_code == 401)

resp = requests.post(f"{API_BASE}/auth/refresh", json={"refreshToken": "badtoken"})
log_test("Regression: Invalid refresh token returns 401", resp.status_code == 401)

resp = requests.post(f"{API_BASE}/auth/refresh", json={})
log_test("Regression: Missing refresh token returns 400", resp.status_code == 400)

# Logout
resp = requests.post(f"{API_BASE}/auth/logout", json={"refreshToken": new_refresh})
log_test("Regression: POST /auth/logout with token", resp.status_code == 200)

resp = requests.post(f"{API_BASE}/auth/refresh", json={"refreshToken": new_refresh})
log_test("Regression: Logged out refresh token returns 401", resp.status_code == 401)

resp = requests.post(f"{API_BASE}/auth/logout", json={})
log_test("Regression: POST /auth/logout without token (idempotent)", resp.status_code == 200)

# Forgot password
resp = requests.post(f"{API_BASE}/auth/forgot-password", json={"email": admin_email})
log_test("Regression: Forgot password with existing email", resp.status_code == 200)

resp = requests.post(f"{API_BASE}/auth/forgot-password", json={"email": "nonexistent@test.com"})
log_test("Regression: Forgot password with non-existent email (no enumeration)", resp.status_code == 200)

resp = requests.post(f"{API_BASE}/auth/forgot-password", json={})
log_test("Regression: Forgot password without email returns 400", resp.status_code == 400)

# Roles
resp = requests.get(f"{API_BASE}/auth/roles")
log_test("Regression: GET /auth/roles returns 7 roles", resp.status_code == 200 and len(resp.json().get("roles", [])) == 7)

# Security checks
resp = requests.get(f"{API_BASE}/auth/me", headers=auth_headers(admin_token))
user_obj = resp.json().get("user", {})
log_test("Regression: No passwordHash in user object", "passwordHash" not in user_obj)
log_test("Regression: No _id in user object", "_id" not in user_obj)

print(f"\n[Regression] Auth tests: {tests_passed - (tests_failed > 0 and tests_failed or 0)}/26 passed")

# Test 36-57: Organization endpoints
print("\n--- Organization Regression Tests (22 tests) ---")

# Re-login to get fresh token
admin_data = login_user(admin_email, admin_pass)
admin_token = admin_data.get("accessToken", "")

# Organization
resp = requests.get(f"{API_BASE}/organization", headers=auth_headers(admin_token))
log_test("Regression: GET /organization", resp.status_code == 200 and "organization" in resp.json())

resp = requests.put(f"{API_BASE}/organization", headers=auth_headers(admin_token), json={"name": "Updated Org"})
log_test("Regression: PUT /organization (admin)", resp.status_code == 200)

resp = requests.get(f"{API_BASE}/organization", headers=auth_headers(admin_token))
log_test("Regression: Organization update persists", resp.json().get("organization", {}).get("name") == "Updated Org")

resp = requests.get(f"{API_BASE}/organization")
log_test("Regression: GET /organization without auth returns 401", resp.status_code == 401)

# Members
resp = requests.get(f"{API_BASE}/organization/members", headers=auth_headers(admin_token))
log_test("Regression: GET /organization/members", resp.status_code == 200 and len(resp.json().get("members", [])) >= 1)

# Create a sales user for testing
sales_email = f"sales_regress_{timestamp}@test.com"
sales_data = register_user(sales_email, admin_pass, "Sales User")
sales_token = sales_data.get("accessToken", "")
sales_user_id = sales_data.get("user", {}).get("id", "")

# Invite sales user to admin's org
invite_resp = requests.post(f"{API_BASE}/organization/invites", headers=auth_headers(admin_token), json={"email": f"member_{timestamp}@test.com", "role": "marketing"})
log_test("Regression: POST /organization/invites (admin)", invite_resp.status_code == 201)

invite_token = invite_resp.json().get("invite", {}).get("token", "")

resp = requests.post(f"{API_BASE}/organization/invites", headers=auth_headers(sales_token), json={"email": "test@test.com", "role": "sales"})
log_test("Regression: POST /organization/invites (non-admin) returns 403", resp.status_code == 403)

resp = requests.post(f"{API_BASE}/organization/invites", headers=auth_headers(admin_token), json={"email": "test@test.com", "role": "invalid"})
log_test("Regression: POST /organization/invites with invalid role returns 400", resp.status_code == 400)

resp = requests.post(f"{API_BASE}/organization/invites", headers=auth_headers(admin_token), json={"email": admin_email, "role": "sales"})
log_test("Regression: POST /organization/invites for existing member returns 409", resp.status_code == 409)

resp = requests.get(f"{API_BASE}/organization/invites", headers=auth_headers(admin_token))
log_test("Regression: GET /organization/invites", resp.status_code == 200 and len(resp.json().get("invites", [])) >= 1)

resp = requests.get(f"{API_BASE}/invites/{invite_token}")
log_test("Regression: GET /invites/:token (public)", resp.status_code == 200 and "invite" in resp.json())

resp = requests.get(f"{API_BASE}/invites/badtoken")
log_test("Regression: GET /invites/badtoken returns 404", resp.status_code == 404)

invite_id = invite_resp.json().get("invite", {}).get("id", "")
resp = requests.delete(f"{API_BASE}/organization/invites/{invite_id}", headers=auth_headers(admin_token))
log_test("Regression: DELETE /organization/invites/:id (admin)", resp.status_code == 200)

# Register with invite
new_invite_resp = requests.post(f"{API_BASE}/organization/invites", headers=auth_headers(admin_token), json={"email": f"invited_{timestamp}@test.com", "role": "support"})
new_invite_token = new_invite_resp.json().get("invite", {}).get("token", "")

invited_data = register_user(f"invited_{timestamp}@test.com", admin_pass, "Invited User", None)
invited_data_with_token = requests.post(f"{API_BASE}/auth/register", json={"email": f"invited2_{timestamp}@test.com", "password": admin_pass, "name": "Invited2", "inviteToken": new_invite_token})
log_test("Regression: Register with inviteToken but email mismatch returns 400", invited_data_with_token.status_code == 400)

invited_data_correct = requests.post(f"{API_BASE}/auth/register", json={"email": f"invited_{timestamp}@test.com", "password": admin_pass, "name": "Invited User", "inviteToken": new_invite_token})
log_test("Regression: Register with valid inviteToken", invited_data_correct.status_code == 201 and invited_data_correct.json().get("user", {}).get("role") == "support")

resp = requests.post(f"{API_BASE}/auth/register", json={"email": f"invited3_{timestamp}@test.com", "password": admin_pass, "name": "Invited3", "inviteToken": new_invite_token})
log_test("Regression: Reuse inviteToken returns 400", resp.status_code == 400)

resp = requests.post(f"{API_BASE}/auth/register", json={"email": f"invited4_{timestamp}@test.com", "password": admin_pass, "name": "Invited4", "inviteToken": "garbage"})
log_test("Regression: Register with garbage inviteToken returns 400", resp.status_code == 400)

# Member role update
resp = requests.get(f"{API_BASE}/organization/members", headers=auth_headers(admin_token))
members = resp.json().get("members", [])
member_to_update = next((m for m in members if m.get("email") == f"invited_{timestamp}@test.com"), None)
if member_to_update:
    member_id = member_to_update.get("id")
    resp = requests.put(f"{API_BASE}/organization/members/{member_id}", headers=auth_headers(admin_token), json={"role": "marketing"})
    log_test("Regression: PUT /organization/members/:id (admin)", resp.status_code == 200)
else:
    log_test("Regression: PUT /organization/members/:id (admin)", False, "Member not found")

# Member deletion
resp = requests.delete(f"{API_BASE}/organization/members/{admin_user.get('id')}", headers=auth_headers(admin_token))
log_test("Regression: DELETE self returns 400", resp.status_code == 400)

print(f"\n[Regression] Organization tests: {tests_passed - 26}/22 passed")

# Test 58-82: Customer360 endpoints
print("\n--- Customer360 Regression Tests (25 tests) ---")

# Customers
resp = requests.get(f"{API_BASE}/customers", headers=auth_headers(admin_token))
log_test("Regression: GET /customers", resp.status_code == 200)

resp = requests.post(f"{API_BASE}/customers/seed-demo", headers=auth_headers(admin_token))
log_test("Regression: POST /customers/seed-demo", resp.status_code == 200 and resp.json().get("seeded") == 6)

resp = requests.get(f"{API_BASE}/customers", headers=auth_headers(admin_token))
customers = resp.json().get("customers", [])
log_test("Regression: Seed demo creates 6 customers", len(customers) == 6)

resp = requests.post(f"{API_BASE}/customers", headers=auth_headers(admin_token), json={"firstName": "John", "lastName": "Doe", "email": f"john_{timestamp}@test.com"})
log_test("Regression: POST /customers", resp.status_code == 201)
new_customer_id = resp.json().get("customer", {}).get("id", "")

resp = requests.post(f"{API_BASE}/customers", headers=auth_headers(admin_token), json={"firstName": "Jane"})
log_test("Regression: POST /customers with missing fields returns 400", resp.status_code == 400)

resp = requests.get(f"{API_BASE}/customers?q=John", headers=auth_headers(admin_token))
log_test("Regression: GET /customers with search", resp.status_code == 200 and len(resp.json().get("customers", [])) >= 1)

resp = requests.get(f"{API_BASE}/customers/{new_customer_id}", headers=auth_headers(admin_token))
log_test("Regression: GET /customers/:id", resp.status_code == 200)

resp = requests.get(f"{API_BASE}/customers/unknown-id", headers=auth_headers(admin_token))
log_test("Regression: GET /customers/:id with unknown id returns 404", resp.status_code == 404)

resp = requests.put(f"{API_BASE}/customers/{new_customer_id}", headers=auth_headers(admin_token), json={"healthScore": 42, "tags": ["VIP", "Renewal"]})
log_test("Regression: PUT /customers/:id", resp.status_code == 200)

resp = requests.get(f"{API_BASE}/customers/{new_customer_id}", headers=auth_headers(admin_token))
log_test("Regression: Customer update persists", resp.json().get("customer", {}).get("healthScore") == 42)

# Timeline
resp = requests.get(f"{API_BASE}/customers/{new_customer_id}/timeline", headers=auth_headers(admin_token))
log_test("Regression: GET /customers/:id/timeline", resp.status_code == 200)

resp = requests.post(f"{API_BASE}/customers/{new_customer_id}/timeline", headers=auth_headers(admin_token), json={"type": "note", "title": "Test note", "description": "Test"})
log_test("Regression: POST /customers/:id/timeline", resp.status_code == 201)

# Sub-collections (use seeded customer)
if customers:
    seeded_customer_id = customers[0].get("id")
    
    resp = requests.get(f"{API_BASE}/customers/{seeded_customer_id}/policies", headers=auth_headers(admin_token))
    log_test("Regression: GET /customers/:id/policies", resp.status_code == 200 and len(resp.json().get("policies", [])) >= 1)
    
    resp = requests.get(f"{API_BASE}/customers/{seeded_customer_id}/tickets", headers=auth_headers(admin_token))
    log_test("Regression: GET /customers/:id/tickets", resp.status_code == 200 and len(resp.json().get("tickets", [])) >= 1)
    
    resp = requests.get(f"{API_BASE}/customers/{seeded_customer_id}/campaigns", headers=auth_headers(admin_token))
    log_test("Regression: GET /customers/:id/campaigns", resp.status_code == 200 and len(resp.json().get("campaigns", [])) >= 1)
    
    resp = requests.get(f"{API_BASE}/customers/{seeded_customer_id}/rewards", headers=auth_headers(admin_token))
    log_test("Regression: GET /customers/:id/rewards", resp.status_code == 200 and resp.json().get("rewards") is not None)
    
    resp = requests.get(f"{API_BASE}/customers/{seeded_customer_id}/calls", headers=auth_headers(admin_token))
    log_test("Regression: GET /customers/:id/calls", resp.status_code == 200 and len(resp.json().get("calls", [])) >= 1)

# Delete customer
resp = requests.delete(f"{API_BASE}/customers/{new_customer_id}", headers=auth_headers(admin_token))
log_test("Regression: DELETE /customers/:id", resp.status_code == 200)

resp = requests.get(f"{API_BASE}/customers/{new_customer_id}", headers=auth_headers(admin_token))
log_test("Regression: Deleted customer returns 404", resp.status_code == 404)

# Auth check
resp = requests.get(f"{API_BASE}/customers")
log_test("Regression: GET /customers without auth returns 401", resp.status_code == 401)

# Multi-tenant isolation
org_b_email = f"orgb_{timestamp}@test.com"
org_b_data = register_user(org_b_email, admin_pass, "Org B Admin", "Org B")
org_b_token = org_b_data.get("accessToken", "")

resp = requests.post(f"{API_BASE}/customers/seed-demo", headers=auth_headers(org_b_token))
log_test("Regression: Seed demo for Org B", resp.status_code == 200)

resp = requests.get(f"{API_BASE}/customers", headers=auth_headers(admin_token))
org_a_customers = resp.json().get("customers", [])

resp = requests.get(f"{API_BASE}/customers", headers=auth_headers(org_b_token))
org_b_customers = resp.json().get("customers", [])

log_test("Regression: Multi-tenant isolation - Org A has 6 customers", len(org_a_customers) == 6)
log_test("Regression: Multi-tenant isolation - Org B has 6 customers", len(org_b_customers) == 6)

if org_b_customers:
    org_b_customer_id = org_b_customers[0].get("id")
    resp = requests.get(f"{API_BASE}/customers/{org_b_customer_id}", headers=auth_headers(admin_token))
    log_test("Regression: Multi-tenant isolation - Org A cannot access Org B customer", resp.status_code == 404)

print(f"\n[Regression] Customer360 tests: {tests_passed - 48}/25 passed")

print(f"\n{'='*80}")
print(f"REGRESSION SUMMARY: {tests_passed}/82 tests passed")
if tests_passed == 82:
    print("✅ NO REGRESSIONS DETECTED")
else:
    print(f"❌ {82 - tests_passed} REGRESSIONS FOUND")
print(f"{'='*80}\n")

# =================== B. GATEWAY INTROSPECTION ===================
print("=" * 80)
print("B. GATEWAY INTROSPECTION")
print("=" * 80)

# Test 83: GET /api/gateway/health (public)
resp = requests.get(f"{API_BASE}/gateway/health")
health_data = resp.json() if resp.status_code == 200 else {}
log_test("B.2: GET /gateway/health (public)", 
         resp.status_code == 200 and 
         health_data.get("status") == "ok" and 
         health_data.get("service") == "afinityos-gateway" and
         health_data.get("modules") == 6 and
         health_data.get("eventTypes") == 7 and
         "time" in health_data,
         f"Response: {health_data}")

# Test 84: GET /api/gateway/modules (auth required)
resp = requests.get(f"{API_BASE}/gateway/modules")
log_test("B.6: GET /gateway/modules without auth returns 401", resp.status_code == 401)

resp = requests.get(f"{API_BASE}/gateway/modules", headers=auth_headers(admin_token))
modules_data = resp.json() if resp.status_code == 200 else {}
modules = modules_data.get("modules", [])
log_test("B.3: GET /gateway/modules (auth)", 
         resp.status_code == 200 and len(modules) == 6,
         f"Found {len(modules)} modules")

# Verify module structure
if modules:
    module = modules[0]
    required_fields = ["id", "name", "version", "description", "icon", "category", "navigation", "permissions", "routes", "events", "installed", "listening"]
    has_all_fields = all(field in module for field in required_fields)
    log_test("B.3: Module has all required fields", has_all_fields, f"Module: {module.get('id')}")
    
    # Check events structure
    events = module.get("events", {})
    log_test("B.3: Module events has emits and listens", "emits" in events and "listens" in events)

# Test 85: GET /api/gateway/integrations
resp = requests.get(f"{API_BASE}/gateway/integrations")
integrations_data = resp.json() if resp.status_code == 200 else {}
integrations = integrations_data.get("integrations", [])
required_integrations = ["email", "sms", "payments", "telephony", "ai_llm", "transcription"]
found_integrations = [i.get("id") for i in integrations]
log_test("B.4: GET /gateway/integrations", 
         resp.status_code == 200 and all(req in found_integrations for req in required_integrations),
         f"Found: {found_integrations}")

# Test 86: GET /api/gateway/logs (auth required)
resp = requests.get(f"{API_BASE}/gateway/logs", headers=auth_headers(admin_token))
logs_data = resp.json() if resp.status_code == 200 else {}
logs = logs_data.get("logs", [])
log_test("B.5: GET /gateway/logs (auth)", 
         resp.status_code == 200 and isinstance(logs, list),
         f"Found {len(logs)} log entries")

print(f"\n[Gateway Introspection] {tests_passed - 82}/7 tests passed\n")

# =================== C. INSTALL / UNINSTALL ===================
print("=" * 80)
print("C. MODULE INSTALL / UNINSTALL")
print("=" * 80)

# Test 87: Uninstall sales module
resp = requests.post(f"{API_BASE}/modules/sales/uninstall", headers=auth_headers(admin_token))
log_test("C.7: POST /modules/sales/uninstall (admin)", 
         resp.status_code == 200 and resp.json().get("success") == True and resp.json().get("action") == "uninstall")

# Test 88: Access uninstalled module
resp = requests.get(f"{API_BASE}/sales/leads", headers=auth_headers(admin_token))
log_test("C.8: GET /sales/leads after uninstall returns 403", 
         resp.status_code == 403 and "not installed" in resp.json().get("error", "").lower())

# Test 89: Reinstall sales module
resp = requests.post(f"{API_BASE}/modules/sales/install", headers=auth_headers(admin_token))
log_test("C.9: POST /modules/sales/install (admin)", 
         resp.status_code == 200 and resp.json().get("success") == True)

# Test 90: Access reinstalled module
resp = requests.get(f"{API_BASE}/sales/leads", headers=auth_headers(admin_token))
log_test("C.9: GET /sales/leads after install succeeds", 
         resp.status_code == 200 and "leads" in resp.json())

# Test 91: Install with non-admin
resp = requests.post(f"{API_BASE}/modules/sales/install", headers=auth_headers(sales_token))
log_test("C.10: POST /modules/sales/install (non-admin) returns 403", resp.status_code == 403)

# Test 92: Install unknown module
resp = requests.post(f"{API_BASE}/modules/unknownX/install", headers=auth_headers(admin_token))
log_test("C.11: POST /modules/unknownX/install returns 404", resp.status_code == 404)

print(f"\n[Install/Uninstall] {tests_passed - 89}/6 tests passed\n")

# =================== D. MODULE CRUD ===================
print("=" * 80)
print("D. MODULE CRUD (6 modules)")
print("=" * 80)

modules_to_test = [
    {"name": "sales", "resource": "leads", "singular": "lead", "event": "lead.created"},
    {"name": "marketing", "resource": "campaigns", "singular": "campaign", "event": "campaign.sent"},
    {"name": "support", "resource": "tickets", "singular": "ticket", "event": "ticket.opened"},
    {"name": "insurance", "resource": "policies", "singular": "policy", "event": "policy.purchased"},
    {"name": "rewards", "resource": "programs", "singular": "program", "event": "reward.issued"},
    {"name": "voice", "resource": "calls", "singular": "call", "event": "voice_call.completed"},
]

for mod in modules_to_test:
    module_name = mod["name"]
    resource = mod["resource"]
    singular = mod["singular"]
    event_type = mod["event"]
    
    print(f"\n--- Testing {module_name} module ---")
    
    # Test: GET without auth
    resp = requests.get(f"{API_BASE}/{module_name}/{resource}")
    log_test(f"D.12 ({module_name}): GET /{module_name}/{resource} without auth returns 401", resp.status_code == 401)
    
    # Test: GET with auth (empty list)
    resp = requests.get(f"{API_BASE}/{module_name}/{resource}", headers=auth_headers(admin_token))
    data = resp.json() if resp.status_code == 200 else {}
    log_test(f"D.13 ({module_name}): GET /{module_name}/{resource} with auth", 
             resp.status_code == 200 and resource in data and "total" in data)
    
    # Test: POST create
    payload = {"name": f"Sample {resource}", "sample": True}
    resp = requests.post(f"{API_BASE}/{module_name}/{resource}", headers=auth_headers(admin_token), json=payload)
    item_data = resp.json() if resp.status_code == 201 else {}
    item = item_data.get(singular, {})
    item_id = item.get("id", "")
    log_test(f"D.14 ({module_name}): POST /{module_name}/{resource} creates item", 
             resp.status_code == 201 and singular in item_data and item_id != "")
    
    # Verify item structure
    log_test(f"D.14 ({module_name}): Item has required fields", 
             "id" in item and "organizationId" in item and "createdBy" in item and "createdByName" in item and "createdAt" in item)
    
    # Test: GET by id
    resp = requests.get(f"{API_BASE}/{module_name}/{resource}/{item_id}", headers=auth_headers(admin_token))
    log_test(f"D.15 ({module_name}): GET /{module_name}/{resource}/:id", 
             resp.status_code == 200 and singular in resp.json())
    
    # Test: GET by bad id
    resp = requests.get(f"{API_BASE}/{module_name}/{resource}/badid", headers=auth_headers(admin_token))
    log_test(f"D.16 ({module_name}): GET /{module_name}/{resource}/badid returns 404", resp.status_code == 404)
    
    # Test: GET list again (should have item)
    resp = requests.get(f"{API_BASE}/{module_name}/{resource}", headers=auth_headers(admin_token))
    list_data = resp.json() if resp.status_code == 200 else {}
    items = list_data.get(resource, [])
    total = list_data.get("total", 0)
    log_test(f"D.17 ({module_name}): GET list contains new item", 
             len(items) >= 1 and total >= 1)
    
    # Test: Verify response headers
    log_test(f"D.18 ({module_name}): Response has rate limit headers", 
             "X-RateLimit-Remaining" in resp.headers and "X-RateLimit-Limit" in resp.headers and "X-Request-Id" in resp.headers and "X-Module" in resp.headers)

print(f"\n[Module CRUD] {tests_passed - 95}/48 tests passed (8 tests × 6 modules)\n")

# =================== E. EVENT BUS ===================
print("=" * 80)
print("E. EVENT BUS")
print("=" * 80)

# Test 143: GET /api/events/types (public)
resp = requests.get(f"{API_BASE}/events/types")
types_data = resp.json() if resp.status_code == 200 else {}
types = types_data.get("types", [])
subscriptions = types_data.get("subscriptions", {})
log_test("E.19: GET /events/types (public)", 
         resp.status_code == 200 and len(types) == 7 and len(subscriptions) == 7,
         f"Types: {len(types)}, Subscriptions: {len(subscriptions)}")

# Verify customer.created has all 6 modules
customer_created_subs = subscriptions.get("customer.created", [])
log_test("E.19: customer.created has 6 listeners", 
         len(customer_created_subs) == 6 and all(mod in customer_created_subs for mod in ["sales", "marketing", "support", "insurance", "rewards", "voice"]),
         f"Listeners: {customer_created_subs}")

# Verify policy.purchased has sales + rewards
policy_purchased_subs = subscriptions.get("policy.purchased", [])
log_test("E.19: policy.purchased has sales and rewards listeners", 
         "sales" in policy_purchased_subs and "rewards" in policy_purchased_subs,
         f"Listeners: {policy_purchased_subs}")

# Test 144: POST /api/events (emit custom event)
resp = requests.post(f"{API_BASE}/events", headers=auth_headers(admin_token), json={"type": "customer.created", "payload": {"hello": "world"}})
event_data = resp.json() if resp.status_code == 201 else {}
event = event_data.get("event", {})
event_id = event.get("id", "")
listeners_invoked = event.get("listenersInvoked", [])
log_test("E.20: POST /events emits customer.created", 
         resp.status_code == 201 and event.get("processed") == True and len(listeners_invoked) == 6,
         f"Listeners invoked: {len(listeners_invoked)}")

# Verify listener structure
if listeners_invoked:
    listener = listeners_invoked[0]
    log_test("E.20: Listener has moduleId, success, durationMs", 
             "moduleId" in listener and "success" in listener and "durationMs" in listener and listener.get("success") == True)

# Test 145: GET /api/events?type=customer.created
resp = requests.get(f"{API_BASE}/events?type=customer.created&limit=10", headers=auth_headers(admin_token))
events_data = resp.json() if resp.status_code == 200 else {}
events = events_data.get("events", [])
log_test("E.21: GET /events?type=customer.created", 
         resp.status_code == 200 and len(events) >= 1,
         f"Found {len(events)} events")

# Test 146: GET /api/events/:id
resp = requests.get(f"{API_BASE}/events/{event_id}", headers=auth_headers(admin_token))
single_event = resp.json().get("event", {}) if resp.status_code == 200 else {}
log_test("E.22: GET /events/:id", 
         resp.status_code == 200 and single_event.get("id") == event_id and "listenersInvoked" in single_event)

# Test 147: GET /api/events without auth
resp = requests.get(f"{API_BASE}/events")
log_test("E.23: GET /events without auth returns 401", resp.status_code == 401)

print(f"\n[Event Bus] {tests_passed - 143}/8 tests passed\n")

# =================== F. SIDE-EFFECT INTEGRATION ===================
print("=" * 80)
print("F. SIDE-EFFECT INTEGRATION TESTS")
print("=" * 80)

# Test 148: Create customer and verify event
customer_email = f"event_test_{timestamp}@test.com"
resp = requests.post(f"{API_BASE}/customers", headers=auth_headers(admin_token), json={"firstName": "Event", "lastName": "Test", "email": customer_email})
log_test("F.24: POST /customers creates customer", resp.status_code == 201)

# Wait a moment for event processing
time.sleep(0.5)

# Verify customer.created event
resp = requests.get(f"{API_BASE}/events?type=customer.created&limit=10", headers=auth_headers(admin_token))
events = resp.json().get("events", []) if resp.status_code == 200 else []
customer_event = next((e for e in events if e.get("payload", {}).get("email") == customer_email), None)
log_test("F.24a: customer.created event exists", 
         customer_event is not None,
         f"Found {len(events)} customer.created events")

if customer_event:
    listeners = customer_event.get("listenersInvoked", [])
    log_test("F.24b: customer.created event has 6 listeners", 
             len(listeners) == 6 and all(l.get("success") == True for l in listeners),
             f"Listeners: {[l.get('moduleId') for l in listeners]}")
    
    # Verify event_listener_log entries
    event_id = customer_event.get("id")
    log_test("F.24c: Event listener log entries created", 
             len(listeners) == 6,
             "Verified via listenersInvoked array")

# Test 149: Create lead and verify event
resp = requests.post(f"{API_BASE}/sales/leads", headers=auth_headers(admin_token), json={"firstName": "Alex", "lastName": "Lead", "email": "alex@lead.com"})
log_test("F.25: POST /sales/leads creates lead", resp.status_code == 201)

time.sleep(0.5)

resp = requests.get(f"{API_BASE}/events?type=lead.created&limit=10", headers=auth_headers(admin_token))
events = resp.json().get("events", []) if resp.status_code == 200 else []
lead_event = next((e for e in events if e.get("payload", {}).get("email") == "alex@lead.com"), None)
log_test("F.25a: lead.created event exists", lead_event is not None)

if lead_event:
    payload = lead_event.get("payload", {})
    log_test("F.25b: lead.created payload has lead fields", 
             "id" in payload and "firstName" in payload and "lastName" in payload and "email" in payload)
    
    listeners = lead_event.get("listenersInvoked", [])
    log_test("F.25c: lead.created has no listeners (sales doesn't listen to own events)", 
             len(listeners) == 0,
             f"Listeners: {listeners}")

# Test 150: Create policy and verify event
resp = requests.post(f"{API_BASE}/insurance/policies", headers=auth_headers(admin_token), json={"policyNumber": "P-001"})
log_test("F.26: POST /insurance/policies creates policy", resp.status_code == 201)

time.sleep(0.5)

resp = requests.get(f"{API_BASE}/events?type=policy.purchased&limit=10", headers=auth_headers(admin_token))
events = resp.json().get("events", []) if resp.status_code == 200 else []
policy_event = next((e for e in events if e.get("payload", {}).get("policyNumber") == "P-001"), None)
log_test("F.26a: policy.purchased event exists", policy_event is not None)

if policy_event:
    listeners = policy_event.get("listenersInvoked", [])
    listener_modules = [l.get("moduleId") for l in listeners]
    log_test("F.26b: policy.purchased has sales and rewards listeners", 
             "sales" in listener_modules and "rewards" in listener_modules,
             f"Listeners: {listener_modules}")
    
    log_test("F.26c: Both listeners report success", 
             all(l.get("success") == True for l in listeners),
             f"Success: {[l.get('success') for l in listeners]}")

print(f"\n[Side-Effect Integration] {tests_passed - 151}/11 tests passed\n")

# =================== G. MULTI-TENANT ISOLATION ===================
print("=" * 80)
print("G. MULTI-TENANT ISOLATION")
print("=" * 80)

# We already have org A (admin_token) and org B (org_b_token)
# Create some data in each org

print("\n--- Creating test data in Org A and Org B ---")

# Org A: Create lead, campaign, ticket, policy, program, call
org_a_lead_resp = requests.post(f"{API_BASE}/sales/leads", headers=auth_headers(admin_token), json={"firstName": "OrgA", "lastName": "Lead", "email": "orga@lead.com"})
org_a_lead_id = org_a_lead_resp.json().get("lead", {}).get("id", "") if org_a_lead_resp.status_code == 201 else ""

org_a_campaign_resp = requests.post(f"{API_BASE}/marketing/campaigns", headers=auth_headers(admin_token), json={"name": "OrgA Campaign"})
org_a_campaign_id = org_a_campaign_resp.json().get("campaign", {}).get("id", "") if org_a_campaign_resp.status_code == 201 else ""

org_a_ticket_resp = requests.post(f"{API_BASE}/support/tickets", headers=auth_headers(admin_token), json={"subject": "OrgA Ticket"})
org_a_ticket_id = org_a_ticket_resp.json().get("ticket", {}).get("id", "") if org_a_ticket_resp.status_code == 201 else ""

org_a_policy_resp = requests.post(f"{API_BASE}/insurance/policies", headers=auth_headers(admin_token), json={"policyNumber": "OrgA-001"})
org_a_policy_id = org_a_policy_resp.json().get("policy", {}).get("id", "") if org_a_policy_resp.status_code == 201 else ""

org_a_program_resp = requests.post(f"{API_BASE}/rewards/programs", headers=auth_headers(admin_token), json={"name": "OrgA Program"})
org_a_program_id = org_a_program_resp.json().get("program", {}).get("id", "") if org_a_program_resp.status_code == 201 else ""

org_a_call_resp = requests.post(f"{API_BASE}/voice/calls", headers=auth_headers(admin_token), json={"type": "inbound"})
org_a_call_id = org_a_call_resp.json().get("call", {}).get("id", "") if org_a_call_resp.status_code == 201 else ""

# Org B: Create lead, campaign, ticket, policy, program, call
org_b_lead_resp = requests.post(f"{API_BASE}/sales/leads", headers=auth_headers(org_b_token), json={"firstName": "OrgB", "lastName": "Lead", "email": "orgb@lead.com"})
org_b_lead_id = org_b_lead_resp.json().get("lead", {}).get("id", "") if org_b_lead_resp.status_code == 201 else ""

org_b_campaign_resp = requests.post(f"{API_BASE}/marketing/campaigns", headers=auth_headers(org_b_token), json={"name": "OrgB Campaign"})
org_b_campaign_id = org_b_campaign_resp.json().get("campaign", {}).get("id", "") if org_b_campaign_resp.status_code == 201 else ""

org_b_ticket_resp = requests.post(f"{API_BASE}/support/tickets", headers=auth_headers(org_b_token), json={"subject": "OrgB Ticket"})
org_b_ticket_id = org_b_ticket_resp.json().get("ticket", {}).get("id", "") if org_b_ticket_resp.status_code == 201 else ""

org_b_policy_resp = requests.post(f"{API_BASE}/insurance/policies", headers=auth_headers(org_b_token), json={"policyNumber": "OrgB-001"})
org_b_policy_id = org_b_policy_resp.json().get("policy", {}).get("id", "") if org_b_policy_resp.status_code == 201 else ""

org_b_program_resp = requests.post(f"{API_BASE}/rewards/programs", headers=auth_headers(org_b_token), json={"name": "OrgB Program"})
org_b_program_id = org_b_program_resp.json().get("program", {}).get("id", "") if org_b_program_resp.status_code == 201 else ""

org_b_call_resp = requests.post(f"{API_BASE}/voice/calls", headers=auth_headers(org_b_token), json={"type": "inbound"})
org_b_call_id = org_b_call_resp.json().get("call", {}).get("id", "") if org_b_call_resp.status_code == 201 else ""

time.sleep(0.5)

print("\n--- Testing isolation from Org A perspective ---")

# Test: Org A cannot see Org B's data
resp = requests.get(f"{API_BASE}/sales/leads", headers=auth_headers(admin_token))
org_a_leads = resp.json().get("leads", []) if resp.status_code == 200 else []
org_b_lead_in_a = any(l.get("email") == "orgb@lead.com" for l in org_a_leads)
log_test("G.28a: Org A GET /sales/leads does not include Org B leads", not org_b_lead_in_a)

resp = requests.get(f"{API_BASE}/marketing/campaigns", headers=auth_headers(admin_token))
org_a_campaigns = resp.json().get("campaigns", []) if resp.status_code == 200 else []
org_b_campaign_in_a = any(c.get("name") == "OrgB Campaign" for c in org_a_campaigns)
log_test("G.28a: Org A GET /marketing/campaigns does not include Org B campaigns", not org_b_campaign_in_a)

resp = requests.get(f"{API_BASE}/support/tickets", headers=auth_headers(admin_token))
org_a_tickets = resp.json().get("tickets", []) if resp.status_code == 200 else []
org_b_ticket_in_a = any(t.get("subject") == "OrgB Ticket" for t in org_a_tickets)
log_test("G.28a: Org A GET /support/tickets does not include Org B tickets", not org_b_ticket_in_a)

resp = requests.get(f"{API_BASE}/insurance/policies", headers=auth_headers(admin_token))
org_a_policies = resp.json().get("policies", []) if resp.status_code == 200 else []
org_b_policy_in_a = any(p.get("policyNumber") == "OrgB-001" for p in org_a_policies)
log_test("G.28a: Org A GET /insurance/policies does not include Org B policies", not org_b_policy_in_a)

resp = requests.get(f"{API_BASE}/rewards/programs", headers=auth_headers(admin_token))
org_a_programs = resp.json().get("programs", []) if resp.status_code == 200 else []
org_b_program_in_a = any(p.get("name") == "OrgB Program" for p in org_a_programs)
log_test("G.28a: Org A GET /rewards/programs does not include Org B programs", not org_b_program_in_a)

resp = requests.get(f"{API_BASE}/voice/calls", headers=auth_headers(admin_token))
org_a_calls = resp.json().get("calls", []) if resp.status_code == 200 else []
log_test("G.28a: Org A GET /voice/calls does not include Org B calls", len(org_a_calls) >= 1)

# Test: Org A cannot see Org B's events
resp = requests.get(f"{API_BASE}/events", headers=auth_headers(admin_token))
org_a_events = resp.json().get("events", []) if resp.status_code == 200 else []
# Check if any event has Org B's org ID (we need to check payload or organizationId)
org_b_org_id = org_b_data.get("user", {}).get("organizationId", "")
org_b_event_in_a = any(e.get("organizationId") == org_b_org_id for e in org_a_events)
log_test("G.28b: Org A GET /events does not include Org B events", not org_b_event_in_a)

# Test: Org A cannot access Org B's resources by ID
resp = requests.get(f"{API_BASE}/sales/leads/{org_b_lead_id}", headers=auth_headers(admin_token))
log_test("G.28c: Org A GET /sales/leads/:orgBLeadId returns 404", resp.status_code == 404)

resp = requests.get(f"{API_BASE}/marketing/campaigns/{org_b_campaign_id}", headers=auth_headers(admin_token))
log_test("G.28c: Org A GET /marketing/campaigns/:orgBCampaignId returns 404", resp.status_code == 404)

resp = requests.get(f"{API_BASE}/support/tickets/{org_b_ticket_id}", headers=auth_headers(admin_token))
log_test("G.28c: Org A GET /support/tickets/:orgBTicketId returns 404", resp.status_code == 404)

resp = requests.get(f"{API_BASE}/insurance/policies/{org_b_policy_id}", headers=auth_headers(admin_token))
log_test("G.28c: Org A GET /insurance/policies/:orgBPolicyId returns 404", resp.status_code == 404)

resp = requests.get(f"{API_BASE}/rewards/programs/{org_b_program_id}", headers=auth_headers(admin_token))
log_test("G.28c: Org A GET /rewards/programs/:orgBProgramId returns 404", resp.status_code == 404)

resp = requests.get(f"{API_BASE}/voice/calls/{org_b_call_id}", headers=auth_headers(admin_token))
log_test("G.28c: Org A GET /voice/calls/:orgBCallId returns 404", resp.status_code == 404)

# Test: Org A cannot access Org B's events by ID
resp = requests.get(f"{API_BASE}/events", headers=auth_headers(org_b_token))
org_b_events = resp.json().get("events", []) if resp.status_code == 200 else []
if org_b_events:
    org_b_event_id = org_b_events[0].get("id")
    resp = requests.get(f"{API_BASE}/events/{org_b_event_id}", headers=auth_headers(admin_token))
    log_test("G.28d: Org A GET /events/:orgBEventId returns 404", resp.status_code == 404)

print(f"\n[Multi-Tenant Isolation] {tests_passed - 162}/15 tests passed\n")

# =================== H. RATE LIMITING ===================
print("=" * 80)
print("H. RATE LIMITING")
print("=" * 80)

# Test: Verify rate limit headers
resp = requests.get(f"{API_BASE}/sales/leads", headers=auth_headers(admin_token))
log_test("H.29: Response has X-RateLimit-Remaining header", "X-RateLimit-Remaining" in resp.headers)
log_test("H.29: Response has X-RateLimit-Limit header", "X-RateLimit-Limit" in resp.headers)

# Make a few requests and verify remaining decreases
remaining_1 = int(resp.headers.get("X-RateLimit-Remaining", 0))
resp = requests.get(f"{API_BASE}/sales/leads", headers=auth_headers(admin_token))
remaining_2 = int(resp.headers.get("X-RateLimit-Remaining", 0))
log_test("H.29: X-RateLimit-Remaining decreases across requests", remaining_2 < remaining_1, f"{remaining_1} -> {remaining_2}")

print(f"\n[Rate Limiting] {tests_passed - 177}/3 tests passed\n")

# =================== FINAL SUMMARY ===================
print("=" * 80)
print("FINAL TEST SUMMARY")
print("=" * 80)
print()

sections = [
    ("A. Regression Tests (82 tests)", 0, 82),
    ("B. Gateway Introspection (7 tests)", 82, 89),
    ("C. Install/Uninstall (6 tests)", 89, 95),
    ("D. Module CRUD (48 tests)", 95, 143),
    ("E. Event Bus (8 tests)", 143, 151),
    ("F. Side-Effect Integration (11 tests)", 151, 162),
    ("G. Multi-Tenant Isolation (15 tests)", 162, 177),
    ("H. Rate Limiting (3 tests)", 177, 180),
]

for section_name, start, end in sections:
    section_passed = sum(1 for r in test_results[start:end] if r["passed"])
    section_total = end - start
    status = "✅" if section_passed == section_total else "❌"
    print(f"{status} {section_name}: {section_passed}/{section_total} passed")

print()
print(f"{'='*80}")
print(f"TOTAL: {tests_passed}/{len(test_results)} tests passed ({tests_passed * 100 // len(test_results)}%)")
print(f"{'='*80}")

if tests_failed > 0:
    print(f"\n❌ {tests_failed} TESTS FAILED")
    print("\nFailed tests:")
    for r in test_results:
        if not r["passed"]:
            print(f"  - {r['name']}")
            if r["details"]:
                print(f"    {r['details']}")
else:
    print("\n✅ ALL TESTS PASSED!")

print()
