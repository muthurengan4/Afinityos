#!/usr/bin/env python3
"""
Test demo login idempotency in detail
"""
import requests
import time

BASE_URL = "https://nextjs-crm-2.preview.emergentagent.com/api"

print("Testing demo login idempotency...")

# First call
print("\n1. First POST /api/auth/demo")
resp1 = requests.post(f"{BASE_URL}/auth/demo")
data1 = resp1.json()
print(f"   Status: {resp1.status_code}")
print(f"   User ID: {data1['user']['id']}")
print(f"   Org ID: {data1['organization']['id']}")
print(f"   Access Token (first 20 chars): {data1['accessToken'][:20]}...")
print(f"   Refresh Token (first 20 chars): {data1['refreshToken'][:20]}...")

time.sleep(1)

# Second call
print("\n2. Second POST /api/auth/demo")
resp2 = requests.post(f"{BASE_URL}/auth/demo")
data2 = resp2.json()
print(f"   Status: {resp2.status_code}")
print(f"   User ID: {data2['user']['id']}")
print(f"   Org ID: {data2['organization']['id']}")
print(f"   Access Token (first 20 chars): {data2['accessToken'][:20]}...")
print(f"   Refresh Token (first 20 chars): {data2['refreshToken'][:20]}...")

print("\n3. Comparison:")
print(f"   Same User ID: {data1['user']['id'] == data2['user']['id']}")
print(f"   Same Org ID: {data1['organization']['id'] == data2['organization']['id']}")
print(f"   Same Access Token: {data1['accessToken'] == data2['accessToken']}")
print(f"   Same Refresh Token: {data1['refreshToken'] == data2['refreshToken']}")

print("\n4. Analysis:")
if data1['user']['id'] == data2['user']['id'] and data1['organization']['id'] == data2['organization']['id']:
    print("   ✅ Idempotency PASS: Same user and org returned")
    if data1['accessToken'] != data2['accessToken']:
        print("   ✅ Security PASS: New tokens issued each time")
    else:
        print("   ⚠️  Security CONCERN: Same tokens returned (should issue new tokens)")
else:
    print("   ❌ Idempotency FAIL: Different user or org returned")
