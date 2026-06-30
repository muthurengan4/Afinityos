#!/usr/bin/env python3
"""
Isolated test for refresh token rotation
"""
import requests
import uuid
import os
from dotenv import load_dotenv

load_dotenv('/app/.env')

BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
API_BASE = f"{BASE_URL}/api"

def generate_unique_email():
    return f"isolated_{uuid.uuid4().hex[:8]}@afinityos.test"

def test_refresh_token_rotation():
    """Test POST /api/auth/refresh - token rotation"""
    print("\n=== Testing POST /api/auth/refresh (token rotation) ===")
    
    # Register and get tokens
    email = generate_unique_email()
    reg_payload = {"email": email, "password": "SecurePass123!", "name": "Refresh Test User"}
    
    try:
        reg_resp = requests.post(f"{API_BASE}/auth/register", json=reg_payload, timeout=10)
        if reg_resp.status_code != 201:
            print(f"❌ FAIL: Registration failed: {reg_resp.status_code}")
            return False
        
        reg_data = reg_resp.json()
        old_refresh_token = reg_data['refreshToken']
        print(f"✓ Registered user, got refresh token")
        
        # Use refresh token to get new tokens
        refresh_payload = {"refreshToken": old_refresh_token}
        refresh_resp = requests.post(f"{API_BASE}/auth/refresh", json=refresh_payload, timeout=10)
        
        if refresh_resp.status_code != 200:
            print(f"❌ FAIL: Refresh failed: {refresh_resp.status_code}")
            return False
        
        refresh_data = refresh_resp.json()
        new_refresh_token = refresh_data.get('refreshToken')
        new_access_token = refresh_data.get('accessToken')
        print(f"✓ Refreshed tokens successfully")
        
        if not new_refresh_token or not new_access_token:
            print(f"❌ FAIL: Missing tokens in refresh response")
            return False
        
        # Verify new access token works
        headers = {"Authorization": f"Bearer {new_access_token}"}
        me_resp = requests.get(f"{API_BASE}/auth/me", headers=headers, timeout=10)
        if me_resp.status_code != 200:
            print(f"❌ FAIL: New access token doesn't work")
            return False
        print(f"✓ New access token works")
        
        # Try to use old refresh token (should fail)
        old_refresh_payload = {"refreshToken": old_refresh_token}
        old_refresh_resp = requests.post(f"{API_BASE}/auth/refresh", json=old_refresh_payload, timeout=10)
        
        print(f"✓ Attempting to reuse old refresh token...")
        print(f"  Status: {old_refresh_resp.status_code}")
        print(f"  Response: {old_refresh_resp.json()}")
        
        if old_refresh_resp.status_code == 401:
            print(f"✅ PASS: Token rotation working correctly - old token rejected")
            return True
        else:
            print(f"❌ FAIL: Old refresh token still works (expected 401, got {old_refresh_resp.status_code})")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception: {str(e)}")
        return False

# Run test 5 times to check for consistency
print("="*80)
print("Running refresh token rotation test 5 times")
print("="*80)

results = []
for i in range(5):
    print(f"\n--- Run {i+1}/5 ---")
    result = test_refresh_token_rotation()
    results.append(result)

print("\n" + "="*80)
print("RESULTS")
print("="*80)
passed = sum(results)
print(f"Passed: {passed}/5")
print(f"Failed: {5-passed}/5")

if passed == 5:
    print("\n✅ All tests passed - refresh token rotation is working correctly")
else:
    print(f"\n❌ Some tests failed - there may be an intermittent issue")
