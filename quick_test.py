#!/usr/bin/env python3
"""Quick test for remaining issues"""

import requests
import time
import os

BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://nextjs-crm-2.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

timestamp = int(time.time())

# Test 1: Insurance policy creation
print("Test 1: Insurance policy creation")
email = f"test_ins_{timestamp}@test.com"
resp = requests.post(f"{API_BASE}/auth/register", json={"email": email, "password": "Test123!", "name": "Test"})
token = resp.json().get("accessToken", "")
resp = requests.post(f"{API_BASE}/insurance/policies", headers={"Authorization": f"Bearer {token}"}, json={"policyNumber": "P-001"})
print(f"  Status: {resp.status_code}")
data = resp.json()
print(f"  Response keys: {list(data.keys())}")
if "policy" in data:
    print("  ✅ Returns 'policy' key (not 'policie')")
    policy_id = data["policy"]["id"]
    
    # Test GET by ID
    resp = requests.get(f"{API_BASE}/insurance/policies/{policy_id}", headers={"Authorization": f"Bearer {token}"})
    print(f"  GET by ID status: {resp.status_code}")
    if resp.status_code == 200 and "policy" in resp.json():
        print("  ✅ GET by ID works")
    else:
        print(f"  ❌ GET by ID failed: {resp.json()}")
else:
    print(f"  ❌ Wrong response: {data}")

# Test 2: Event types subscriptions
print("\nTest 2: Event types subscriptions")
resp = requests.get(f"{API_BASE}/events/types")
data = resp.json()
subs = data.get("subscriptions", {})
print(f"  Total subscription keys: {len(subs)}")
print(f"  Subscriptions: {list(subs.keys())}")
if len(subs) >= 2:
    print("  ✅ Has subscriptions")
    print(f"  customer.created listeners: {subs.get('customer.created', [])}")
    print(f"  policy.purchased listeners: {subs.get('policy.purchased', [])}")
else:
    print("  ❌ Missing subscriptions")

# Test 3: Multi-tenant isolation for insurance
print("\nTest 3: Multi-tenant isolation for insurance")
org_a_email = f"orga_ins_{timestamp}@test.com"
org_b_email = f"orgb_ins_{timestamp}@test.com"

resp_a = requests.post(f"{API_BASE}/auth/register", json={"email": org_a_email, "password": "Test123!", "name": "Org A"})
token_a = resp_a.json().get("accessToken", "")

resp_b = requests.post(f"{API_BASE}/auth/register", json={"email": org_b_email, "password": "Test123!", "name": "Org B"})
token_b = resp_b.json().get("accessToken", "")

# Create policy in Org B
resp = requests.post(f"{API_BASE}/insurance/policies", headers={"Authorization": f"Bearer {token_b}"}, json={"policyNumber": "ORG-B-001"})
org_b_policy_id = resp.json().get("policy", {}).get("id", "")

# Try to access from Org A
resp = requests.get(f"{API_BASE}/insurance/policies/{org_b_policy_id}", headers={"Authorization": f"Bearer {token_a}"})
print(f"  Org A accessing Org B policy: {resp.status_code}")
if resp.status_code == 404:
    print("  ✅ Properly isolated (404)")
else:
    print(f"  ❌ Not isolated: {resp.json()}")

# Test 4: Non-admin install attempt
print("\nTest 4: Non-admin install attempt")
sales_email = f"sales_{timestamp}@test.com"
resp = requests.post(f"{API_BASE}/auth/register", json={"email": sales_email, "password": "Test123!", "name": "Sales", "role": "sales"})
sales_token = resp.json().get("accessToken", "")
resp = requests.post(f"{API_BASE}/modules/marketing/install", headers={"Authorization": f"Bearer {sales_token}"})
print(f"  Status: {resp.status_code}")
if resp.status_code == 403:
    print("  ✅ Non-admin blocked (403)")
else:
    print(f"  ❌ Should be 403: {resp.json()}")

print("\nDone!")
