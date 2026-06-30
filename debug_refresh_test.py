#!/usr/bin/env python3
"""
Debug test for refresh token rotation issue
"""
import requests
import uuid
import os
from dotenv import load_dotenv

load_dotenv('/app/.env')

BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
API_BASE = f"{BASE_URL}/api"

def generate_unique_email():
    return f"debug_{uuid.uuid4().hex[:8]}@afinityos.test"

print("="*80)
print("DEBUG: Refresh Token Rotation Test")
print("="*80)

# Step 1: Register
email = generate_unique_email()
reg_payload = {"email": email, "password": "SecurePass123!", "name": "Debug User"}
print(f"\n1. Registering user: {email}")
reg_resp = requests.post(f"{API_BASE}/auth/register", json=reg_payload, timeout=10)
print(f"   Status: {reg_resp.status_code}")

if reg_resp.status_code != 201:
    print("   FAILED: Registration failed")
    exit(1)

reg_data = reg_resp.json()
original_refresh_token = reg_data['refreshToken']
print(f"   Original refresh token (first 50 chars): {original_refresh_token[:50]}...")

# Step 2: Use refresh token to get new tokens
print(f"\n2. Using original refresh token to get new tokens")
refresh_payload = {"refreshToken": original_refresh_token}
refresh_resp1 = requests.post(f"{API_BASE}/auth/refresh", json=refresh_payload, timeout=10)
print(f"   Status: {refresh_resp1.status_code}")

if refresh_resp1.status_code != 200:
    print(f"   FAILED: First refresh failed")
    print(f"   Response: {refresh_resp1.json()}")
    exit(1)

refresh_data1 = refresh_resp1.json()
new_refresh_token = refresh_data1['refreshToken']
print(f"   New refresh token (first 50 chars): {new_refresh_token[:50]}...")
print(f"   Tokens are different: {original_refresh_token != new_refresh_token}")

# Step 3: Try to use the ORIGINAL refresh token again (should fail with 401)
print(f"\n3. Attempting to use ORIGINAL refresh token again (should fail)")
refresh_resp2 = requests.post(f"{API_BASE}/auth/refresh", json=refresh_payload, timeout=10)
print(f"   Status: {refresh_resp2.status_code}")
print(f"   Response: {refresh_resp2.json()}")

if refresh_resp2.status_code == 401:
    print("   ✅ CORRECT: Original token was rejected (rotation working)")
else:
    print(f"   ❌ BUG: Original token still works! Expected 401, got {refresh_resp2.status_code}")
    print("   This is a CRITICAL SECURITY ISSUE - refresh tokens are not being rotated properly")

# Step 4: Verify the NEW refresh token works
print(f"\n4. Verifying NEW refresh token works")
new_refresh_payload = {"refreshToken": new_refresh_token}
refresh_resp3 = requests.post(f"{API_BASE}/auth/refresh", json=new_refresh_payload, timeout=10)
print(f"   Status: {refresh_resp3.status_code}")

if refresh_resp3.status_code == 200:
    print("   ✅ New refresh token works correctly")
else:
    print(f"   ❌ New refresh token failed: {refresh_resp3.status_code}")

print("\n" + "="*80)
