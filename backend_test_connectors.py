#!/usr/bin/env python3
"""
Comprehensive backend test for Connector Layer + AI Tool Registry + Demo Login
Tests all scenarios from the review request.
"""
import requests
import json
import time

BASE_URL = "https://nextjs-crm-2.preview.emergentagent.com/api"

def log_test(section, test_num, description, passed, details=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} | {section}.{test_num} | {description}")
    if details:
        print(f"    Details: {details}")
    if not passed:
        print(f"    ^^^ FAILURE ^^^")
    return passed

def register_fresh_user(suffix=""):
    """Register a fresh user for testing"""
    email = f"test_{int(time.time()*1000)}{suffix}@test.com"
    payload = {
        "email": email,
        "password": "Test@123",
        "name": f"Test User {suffix}",
        "orgName": f"Test Org {suffix}"
    }
    resp = requests.post(f"{BASE_URL}/auth/register", json=payload)
    if resp.status_code != 201:
        print(f"Failed to register user: {resp.status_code} {resp.text}")
        return None
    data = resp.json()
    return {
        "user": data["user"],
        "organization": data["organization"],
        "accessToken": data["accessToken"],
        "refreshToken": data["refreshToken"]
    }

# =================== A. DEMO LOGIN ===================
print("\n" + "="*80)
print("SECTION A: DEMO LOGIN")
print("="*80)

passed_a = []

# A.1: POST /api/auth/demo (no body needed)
resp = requests.post(f"{BASE_URL}/auth/demo")
if resp.status_code == 200:
    data = resp.json()
    has_user = "user" in data and data["user"]["email"] == "demo@afinityos.app" and data["user"]["role"] == "org_admin"
    has_org = "organization" in data and data["organization"]["name"] == "AfinityOS Demo" and data["organization"]["plan"] == "business"
    has_tokens = "accessToken" in data and "refreshToken" in data and "expiresIn" in data
    has_demo = data.get("demo") == True
    has_creds = "credentials" in data and data["credentials"]["email"] == "demo@afinityos.app" and data["credentials"]["password"] == "Demo@123"
    
    all_good = has_user and has_org and has_tokens and has_demo and has_creds
    passed_a.append(log_test("A", 1, "POST /api/auth/demo returns correct structure", all_good,
        f"user.email={data.get('user',{}).get('email')}, user.role={data.get('user',{}).get('role')}, org.name={data.get('organization',{}).get('name')}, org.plan={data.get('organization',{}).get('plan')}, demo={data.get('demo')}, has_creds={has_creds}"))
    
    demo_token = data["accessToken"]
    demo_user_id = data["user"]["id"]
    demo_org_id = data["organization"]["id"]
    
    # A.1b: GET /api/auth/me with demo token
    resp_me = requests.get(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {demo_token}"})
    if resp_me.status_code == 200:
        me_data = resp_me.json()
        same_user = me_data["user"]["id"] == demo_user_id and me_data["user"]["email"] == "demo@afinityos.app"
        passed_a.append(log_test("A", "1b", "GET /api/auth/me with demo token works", same_user,
            f"user.id={me_data['user']['id']}, user.email={me_data['user']['email']}"))
    else:
        passed_a.append(log_test("A", "1b", "GET /api/auth/me with demo token works", False,
            f"Status: {resp_me.status_code}, Body: {resp_me.text}"))
else:
    passed_a.append(log_test("A", 1, "POST /api/auth/demo returns correct structure", False,
        f"Status: {resp.status_code}, Body: {resp.text}"))
    demo_token = None
    demo_user_id = None
    demo_org_id = None

# A.2: Call POST /api/auth/demo again -> idempotent
if demo_token:
    time.sleep(1)  # Wait 1 second to ensure different timestamp
    resp2 = requests.post(f"{BASE_URL}/auth/demo")
    if resp2.status_code == 200:
        data2 = resp2.json()
        same_user_id = data2["user"]["id"] == demo_user_id
        same_org_id = data2["organization"]["id"] == demo_org_id
        # Tokens might be same if generated in same second (access token has no jti), but that's acceptable
        # The important part is same user/org (idempotency)
        passed_a.append(log_test("A", 2, "POST /api/auth/demo is idempotent (same user/org)", 
            same_user_id and same_org_id,
            f"same_user_id={same_user_id}, same_org_id={same_org_id}"))
    else:
        passed_a.append(log_test("A", 2, "POST /api/auth/demo is idempotent", False,
            f"Status: {resp2.status_code}, Body: {resp2.text}"))

# A.3: After demo login, GET /api/customers should show >= 6 seeded customers
if demo_token:
    resp_cust = requests.get(f"{BASE_URL}/customers", headers={"Authorization": f"Bearer {demo_token}"})
    if resp_cust.status_code == 200:
        cust_data = resp_cust.json()
        count = len(cust_data.get("customers", []))
        passed_a.append(log_test("A", 3, "Demo login seeds >= 6 customers", count >= 6,
            f"Customer count: {count}"))
    else:
        passed_a.append(log_test("A", 3, "Demo login seeds >= 6 customers", False,
            f"Status: {resp_cust.status_code}, Body: {resp_cust.text}"))

print(f"\nSection A Summary: {sum(passed_a)}/{len(passed_a)} tests passed")

# =================== B. CONNECTOR REGISTRY ===================
print("\n" + "="*80)
print("SECTION B: CONNECTOR REGISTRY")
print("="*80)

passed_b = []

# Register a fresh org_admin for testing
admin_auth = register_fresh_user("_admin")
if not admin_auth:
    print("CRITICAL: Failed to register admin user. Skipping remaining tests.")
    exit(1)

admin_token = admin_auth["accessToken"]

# B.4: GET /api/connectors
resp = requests.get(f"{BASE_URL}/connectors", headers={"Authorization": f"Bearer {admin_token}"})
if resp.status_code == 200:
    data = resp.json()
    connectors = data.get("connectors", [])
    has_5 = len(connectors) == 5
    
    # Check each connector has required fields
    all_have_fields = all(
        "id" in c and "name" in c and "description" in c and "category" in c and 
        "icon" in c and "envKey" in c and "configured" in c and "toolCount" in c and "tools" in c
        for c in connectors
    )
    
    # Check expected IDs
    ids = {c["id"] for c in connectors}
    expected_ids = {"sales", "marketing", "support", "rewards", "insurance"}
    has_expected_ids = ids == expected_ids
    
    # Check tool counts
    tool_counts = {c["id"]: c["toolCount"] for c in connectors}
    expected_counts = {"sales": 5, "marketing": 5, "support": 4, "rewards": 4, "insurance": 5}
    correct_counts = tool_counts == expected_counts
    
    # Check all configured: false initially
    all_unconfigured = all(c["configured"] == False for c in connectors)
    
    all_good = has_5 and all_have_fields and has_expected_ids and correct_counts and all_unconfigured
    passed_b.append(log_test("B", 4, "GET /api/connectors returns 5 connectors with correct structure", all_good,
        f"count={len(connectors)}, has_fields={all_have_fields}, ids={ids}, tool_counts={tool_counts}, all_unconfigured={all_unconfigured}"))
else:
    passed_b.append(log_test("B", 4, "GET /api/connectors returns 5 connectors", False,
        f"Status: {resp.status_code}, Body: {resp.text}"))

# B.5: GET /api/connectors/sales
resp = requests.get(f"{BASE_URL}/connectors/sales", headers={"Authorization": f"Bearer {admin_token}"})
if resp.status_code == 200:
    data = resp.json()
    has_connector = "connector" in data
    if has_connector:
        c = data["connector"]
        has_manifest = c.get("id") == "sales" and "name" in c and "tools" in c and c.get("toolCount") == 5
        passed_b.append(log_test("B", 5, "GET /api/connectors/sales returns sales manifest", has_manifest,
            f"id={c.get('id')}, toolCount={c.get('toolCount')}"))
    else:
        passed_b.append(log_test("B", 5, "GET /api/connectors/sales returns sales manifest", False,
            "No 'connector' key in response"))
else:
    passed_b.append(log_test("B", 5, "GET /api/connectors/sales returns sales manifest", False,
        f"Status: {resp.status_code}, Body: {resp.text}"))

# B.6: GET /api/connectors/unknown -> 404
resp = requests.get(f"{BASE_URL}/connectors/unknown", headers={"Authorization": f"Bearer {admin_token}"})
passed_b.append(log_test("B", 6, "GET /api/connectors/unknown returns 404", resp.status_code == 404,
    f"Status: {resp.status_code}"))

print(f"\nSection B Summary: {sum(passed_b)}/{len(passed_b)} tests passed")

# =================== C. AI TOOLS ===================
print("\n" + "="*80)
print("SECTION C: AI TOOLS")
print("="*80)

passed_c = []

# C.7: GET /api/ai-tools
resp = requests.get(f"{BASE_URL}/ai-tools")
if resp.status_code == 200:
    data = resp.json()
    tools = data.get("tools", [])
    has_23 = len(tools) == 23
    
    # Check each tool has required fields
    all_have_fields = all(
        "name" in t and "connector" in t and "description" in t and "parameters" in t
        for t in tools
    )
    
    # Check parameters have type: 'object'
    all_have_object_type = all(
        t.get("parameters", {}).get("type") == "object"
        for t in tools
    )
    
    # Check specific tool names exist
    tool_names = {t["name"] for t in tools}
    expected_names = {
        "sales.create_lead", "sales.update_lead", "sales.search_lead", "sales.move_pipeline", "sales.schedule_meeting",
        "marketing.create_campaign", "marketing.send_email", "marketing.send_whatsapp", "marketing.generate_content", "marketing.get_campaign_analytics",
        "support.create_ticket", "support.update_ticket", "support.resolve_ticket", "support.search_knowledge_base",
        "rewards.award_points", "rewards.redeem_points", "rewards.referral_campaign", "rewards.customer_rewards",
        "insurance.generate_quote", "insurance.purchase_policy", "insurance.renew_policy", "insurance.search_policies", "insurance.claims_status"
    }
    has_expected_names = expected_names.issubset(tool_names)
    
    all_good = has_23 and all_have_fields and all_have_object_type and has_expected_names
    passed_c.append(log_test("C", 7, "GET /api/ai-tools returns 23 tools with correct structure", all_good,
        f"count={len(tools)}, has_fields={all_have_fields}, has_object_type={all_have_object_type}, has_expected_names={has_expected_names}"))
else:
    passed_c.append(log_test("C", 7, "GET /api/ai-tools returns 23 tools", False,
        f"Status: {resp.status_code}, Body: {resp.text}"))

print(f"\nSection C Summary: {sum(passed_c)}/{len(passed_c)} tests passed")

# =================== D. TOOL EXECUTION (MOCK MODE) ===================
print("\n" + "="*80)
print("SECTION D: TOOL EXECUTION (MOCK MODE)")
print("="*80)

passed_d = []

# D.8: POST /api/connectors/sales/tools/create_lead
resp = requests.post(f"{BASE_URL}/connectors/sales/tools/create_lead",
    headers={"Authorization": f"Bearer {admin_token}"},
    json={"firstName": "Alex", "lastName": "Lead", "email": "alex@lead.com"})
if resp.status_code == 200:
    data = resp.json()
    result = data.get("result", {})
    is_ok = result.get("ok") == True
    is_mock = result.get("mode") == "mock"
    has_data = "data" in result and "id" in result["data"]
    id_starts_with_lead = result.get("data", {}).get("id", "").startswith("lead_")
    has_status = result.get("data", {}).get("status") == "new"
    has_created_at = "createdAt" in result.get("data", {})
    has_call_id = "callId" in result
    has_duration = "durationMs" in result and isinstance(result["durationMs"], (int, float))
    
    all_good = is_ok and is_mock and has_data and id_starts_with_lead and has_status and has_created_at and has_call_id and has_duration
    passed_d.append(log_test("D", 8, "POST /api/connectors/sales/tools/create_lead (mock)", all_good,
        f"ok={is_ok}, mode={result.get('mode')}, id={result.get('data',{}).get('id')}, status={result.get('data',{}).get('status')}, callId={result.get('callId')}, durationMs={result.get('durationMs')}"))
else:
    passed_d.append(log_test("D", 8, "POST /api/connectors/sales/tools/create_lead (mock)", False,
        f"Status: {resp.status_code}, Body: {resp.text}"))

# D.9: POST /api/connectors/marketing/tools/send_email
resp = requests.post(f"{BASE_URL}/connectors/marketing/tools/send_email",
    headers={"Authorization": f"Bearer {admin_token}"},
    json={"to": ["x@y.com"], "subject": "Hi", "body": "Hello"})
if resp.status_code == 200:
    data = resp.json()
    result = data.get("result", {})
    is_mock = result.get("mode") == "mock"
    msg_id_starts = result.get("data", {}).get("messageId", "").startswith("eml_")
    passed_d.append(log_test("D", 9, "POST /api/connectors/marketing/tools/send_email (mock)", is_mock and msg_id_starts,
        f"mode={result.get('mode')}, messageId={result.get('data',{}).get('messageId')}"))
else:
    passed_d.append(log_test("D", 9, "POST /api/connectors/marketing/tools/send_email (mock)", False,
        f"Status: {resp.status_code}, Body: {resp.text}"))

# D.10: POST /api/connectors/support/tools/create_ticket
resp = requests.post(f"{BASE_URL}/connectors/support/tools/create_ticket",
    headers={"Authorization": f"Bearer {admin_token}"},
    json={"subject": "SSO", "customerEmail": "cust@acme.com"})
if resp.status_code == 200:
    data = resp.json()
    result = data.get("result", {})
    is_mock = result.get("mode") == "mock"
    id_starts = result.get("data", {}).get("id", "").startswith("tkt_")
    ref_starts = result.get("data", {}).get("ref", "").startswith("T-")
    passed_d.append(log_test("D", 10, "POST /api/connectors/support/tools/create_ticket (mock)", is_mock and id_starts and ref_starts,
        f"mode={result.get('mode')}, id={result.get('data',{}).get('id')}, ref={result.get('data',{}).get('ref')}"))
else:
    passed_d.append(log_test("D", 10, "POST /api/connectors/support/tools/create_ticket (mock)", False,
        f"Status: {resp.status_code}, Body: {resp.text}"))

# D.11: POST /api/connectors/rewards/tools/award_points
resp = requests.post(f"{BASE_URL}/connectors/rewards/tools/award_points",
    headers={"Authorization": f"Bearer {admin_token}"},
    json={"customerId": "c1", "points": 100, "reason": "test"})
if resp.status_code == 200:
    data = resp.json()
    result = data.get("result", {})
    is_mock = result.get("mode") == "mock"
    tx_id_starts = result.get("data", {}).get("txId", "").startswith("tx_")
    awarded = result.get("data", {}).get("awarded") == 100
    passed_d.append(log_test("D", 11, "POST /api/connectors/rewards/tools/award_points (mock)", is_mock and tx_id_starts and awarded,
        f"mode={result.get('mode')}, txId={result.get('data',{}).get('txId')}, awarded={result.get('data',{}).get('awarded')}"))
else:
    passed_d.append(log_test("D", 11, "POST /api/connectors/rewards/tools/award_points (mock)", False,
        f"Status: {resp.status_code}, Body: {resp.text}"))

# D.12: POST /api/connectors/insurance/tools/generate_quote
resp = requests.post(f"{BASE_URL}/connectors/insurance/tools/generate_quote",
    headers={"Authorization": f"Bearer {admin_token}"},
    json={"policyType": "cyber_liability", "applicant": {"name": "Acme", "email": "cfo@acme.com"}})
if resp.status_code == 200:
    data = resp.json()
    result = data.get("result", {})
    is_mock = result.get("mode") == "mock"
    quote_id_starts = result.get("data", {}).get("quoteId", "").startswith("q_")
    has_premium = isinstance(result.get("data", {}).get("premium"), (int, float))
    currency = result.get("data", {}).get("currency") == "USD"
    passed_d.append(log_test("D", 12, "POST /api/connectors/insurance/tools/generate_quote (mock)", is_mock and quote_id_starts and has_premium and currency,
        f"mode={result.get('mode')}, quoteId={result.get('data',{}).get('quoteId')}, premium={result.get('data',{}).get('premium')}, currency={result.get('data',{}).get('currency')}"))
else:
    passed_d.append(log_test("D", 12, "POST /api/connectors/insurance/tools/generate_quote (mock)", False,
        f"Status: {resp.status_code}, Body: {resp.text}"))

# D.13: POST /api/connectors/sales/tools/no_such_tool -> 404
resp = requests.post(f"{BASE_URL}/connectors/sales/tools/no_such_tool",
    headers={"Authorization": f"Bearer {admin_token}"},
    json={})
is_404 = resp.status_code == 404 or (resp.status_code == 200 and not resp.json().get("result", {}).get("ok"))
has_error = "error" in resp.json().get("result", {}) or "error" in resp.json()
passed_d.append(log_test("D", 13, "POST /api/connectors/sales/tools/no_such_tool returns 404/error", is_404 and has_error,
    f"Status: {resp.status_code}, Body: {resp.json()}"))

# D.14: Same endpoints without auth -> 401
resp = requests.post(f"{BASE_URL}/connectors/sales/tools/create_lead",
    json={"firstName": "Test", "lastName": "User", "email": "test@test.com"})
passed_d.append(log_test("D", 14, "Tool execution without auth returns 401", resp.status_code == 401,
    f"Status: {resp.status_code}"))

print(f"\nSection D Summary: {sum(passed_d)}/{len(passed_d)} tests passed")

# =================== E. PER-ORG CONFIG ===================
print("\n" + "="*80)
print("SECTION E: PER-ORG CONFIG")
print("="*80)

passed_e = []

# E.15: POST /api/connectors/sales/config (admin)
resp = requests.post(f"{BASE_URL}/connectors/sales/config",
    headers={"Authorization": f"Bearer {admin_token}"},
    json={"baseUrl": "https://demo.crm.local", "apiKey": "sk-test"})
if resp.status_code == 200:
    data = resp.json()
    success = data.get("success") == True
    configured = data.get("configured") == True
    passed_e.append(log_test("E", 15, "POST /api/connectors/sales/config (admin) succeeds", success and configured,
        f"success={success}, configured={configured}"))
else:
    passed_e.append(log_test("E", 15, "POST /api/connectors/sales/config (admin) succeeds", False,
        f"Status: {resp.status_code}, Body: {resp.text}"))

# E.16: GET /api/connectors -> sales.configured = true
resp = requests.get(f"{BASE_URL}/connectors", headers={"Authorization": f"Bearer {admin_token}"})
if resp.status_code == 200:
    data = resp.json()
    connectors = data.get("connectors", [])
    sales = next((c for c in connectors if c["id"] == "sales"), None)
    is_configured = sales and sales.get("configured") == True
    passed_e.append(log_test("E", 16, "GET /api/connectors shows sales.configured = true", is_configured,
        f"sales.configured={sales.get('configured') if sales else 'N/A'}"))
else:
    passed_e.append(log_test("E", 16, "GET /api/connectors shows sales.configured = true", False,
        f"Status: {resp.status_code}, Body: {resp.text}"))

# E.17: POST /api/connectors/sales/test (admin) -> mode: 'live' but ok: false (network failed)
resp = requests.post(f"{BASE_URL}/connectors/sales/test",
    headers={"Authorization": f"Bearer {admin_token}"})
if resp.status_code == 200:
    data = resp.json()
    result = data.get("result", {})
    is_live = result.get("mode") == "live"
    # ok can be false because demo.crm.local is unreachable
    passed_e.append(log_test("E", 17, "POST /api/connectors/sales/test returns mode: 'live'", is_live,
        f"mode={result.get('mode')}, ok={result.get('ok')}"))
else:
    passed_e.append(log_test("E", 17, "POST /api/connectors/sales/test returns mode: 'live'", False,
        f"Status: {resp.status_code}, Body: {resp.text}"))

# E.18: POST /api/connectors/sales/config with non-admin -> 403
# Register a non-admin user
non_admin_auth = register_fresh_user("_sales")
if non_admin_auth:
    # Change role to sales
    # (We can't easily change role without admin access, so we'll just test with a fresh user who is org_admin by default)
    # Let's create a new org and user with sales role
    email = f"sales_{int(time.time()*1000)}@test.com"
    payload = {
        "email": email,
        "password": "Test@123",
        "name": "Sales User",
        "orgName": "Sales Org",
        "role": "sales"
    }
    resp_reg = requests.post(f"{BASE_URL}/auth/register", json=payload)
    if resp_reg.status_code == 201:
        sales_token = resp_reg.json()["accessToken"]
        resp = requests.post(f"{BASE_URL}/connectors/sales/config",
            headers={"Authorization": f"Bearer {sales_token}"},
            json={"baseUrl": "https://demo.crm.local", "apiKey": "sk-test"})
        passed_e.append(log_test("E", 18, "POST /api/connectors/sales/config with non-admin returns 403", resp.status_code == 403,
            f"Status: {resp.status_code}"))
    else:
        passed_e.append(log_test("E", 18, "POST /api/connectors/sales/config with non-admin returns 403", False,
            f"Failed to register sales user: {resp_reg.status_code}"))
else:
    passed_e.append(log_test("E", 18, "POST /api/connectors/sales/config with non-admin returns 403", False,
        "Failed to register non-admin user"))

# E.19: After config, calling create_lead -> mode: 'live' (not mock)
resp = requests.post(f"{BASE_URL}/connectors/sales/tools/create_lead",
    headers={"Authorization": f"Bearer {admin_token}"},
    json={"firstName": "Live", "lastName": "Test", "email": "live@test.com"})
# Accept both 200 and 400 status codes (400 when network fails)
if resp.status_code in [200, 400]:
    data = resp.json()
    result = data.get("result", {})
    is_live = result.get("mode") == "live"
    # ok will be false because demo.crm.local is unreachable (expected)
    passed_e.append(log_test("E", 19, "Tool execution after config uses mode: 'live'", is_live,
        f"mode={result.get('mode')}, ok={result.get('ok')}, status={resp.status_code}"))
else:
    passed_e.append(log_test("E", 19, "Tool execution after config uses mode: 'live'", False,
        f"Status: {resp.status_code}, Body: {resp.text}"))

print(f"\nSection E Summary: {sum(passed_e)}/{len(passed_e)} tests passed")

# =================== F. AUDIT LOG ===================
print("\n" + "="*80)
print("SECTION F: AUDIT LOG")
print("="*80)

passed_f = []

# F.20: GET /api/ai-tools/calls
resp = requests.get(f"{BASE_URL}/ai-tools/calls", headers={"Authorization": f"Bearer {admin_token}"})
if resp.status_code == 200:
    data = resp.json()
    calls = data.get("calls", [])
    has_calls = len(calls) > 0
    
    # Check each call has required fields
    all_have_fields = all(
        "connectorId" in c and "toolName" in c and "ok" in c and "mode" in c and 
        "durationMs" in c and "organizationId" in c and "userId" in c and 
        "params" in c and "result" in c and "timestamp" in c and "actor" in c
        for c in calls
    )
    
    passed_f.append(log_test("F", 20, "GET /api/ai-tools/calls returns audit log", has_calls and all_have_fields,
        f"call_count={len(calls)}, has_fields={all_have_fields}"))
else:
    passed_f.append(log_test("F", 20, "GET /api/ai-tools/calls returns audit log", False,
        f"Status: {resp.status_code}, Body: {resp.text}"))

print(f"\nSection F Summary: {sum(passed_f)}/{len(passed_f)} tests passed")

# =================== G. AI DISPATCHER ===================
print("\n" + "="*80)
print("SECTION G: AI DISPATCHER")
print("="*80)

passed_g = []

# G.21: POST /api/ai-tools/call with rewards.award_points
resp = requests.post(f"{BASE_URL}/ai-tools/call",
    headers={"Authorization": f"Bearer {admin_token}"},
    json={"tool": "rewards.award_points", "params": {"customerId": "c-1", "points": 50, "reason": "ai-test"}})
if resp.status_code == 200:
    data = resp.json()
    result = data.get("result", {})
    is_ok = result.get("ok") == True
    # Mode will be 'live' if configured, 'mock' otherwise
    # Since we only configured sales, rewards should still be mock
    is_mock = result.get("mode") == "mock"
    
    # Check if it appears in audit log
    resp_calls = requests.get(f"{BASE_URL}/ai-tools/calls", headers={"Authorization": f"Bearer {admin_token}"})
    if resp_calls.status_code == 200:
        calls = resp_calls.json().get("calls", [])
        # Find the call with actor.type = 'ai_agent'
        ai_call = next((c for c in calls if c.get("actor", {}).get("type") == "ai_agent" and c.get("toolName") == "award_points"), None)
        in_audit = ai_call is not None
        passed_g.append(log_test("G", 21, "POST /api/ai-tools/call with rewards.award_points", is_ok and is_mock and in_audit,
            f"ok={is_ok}, mode={result.get('mode')}, in_audit={in_audit}"))
    else:
        passed_g.append(log_test("G", 21, "POST /api/ai-tools/call with rewards.award_points", False,
            f"Failed to fetch audit log: {resp_calls.status_code}"))
else:
    passed_g.append(log_test("G", 21, "POST /api/ai-tools/call with rewards.award_points", False,
        f"Status: {resp.status_code}, Body: {resp.text}"))

# G.22: POST /api/ai-tools/call with nonexistent.tool -> 404
resp = requests.post(f"{BASE_URL}/ai-tools/call",
    headers={"Authorization": f"Bearer {admin_token}"},
    json={"tool": "nonexistent.tool"})
is_error = resp.status_code == 404 or (resp.status_code == 200 and not resp.json().get("result", {}).get("ok"))
has_error_msg = "error" in resp.json().get("result", {}) or "error" in resp.json()
error_mentions_connector = "Connector" in str(resp.json()) or "nonexistent" in str(resp.json())
passed_g.append(log_test("G", 22, "POST /api/ai-tools/call with nonexistent.tool returns error", is_error and has_error_msg and error_mentions_connector,
    f"Status: {resp.status_code}, Body: {resp.json()}"))

# G.23: POST /api/ai-tools/call with sales.no_such -> 404
resp = requests.post(f"{BASE_URL}/ai-tools/call",
    headers={"Authorization": f"Bearer {admin_token}"},
    json={"tool": "sales.no_such"})
is_error = resp.status_code == 404 or (resp.status_code == 200 and not resp.json().get("result", {}).get("ok"))
has_error_msg = "error" in resp.json().get("result", {}) or "error" in resp.json()
error_mentions_not_found = "not found" in str(resp.json()).lower()
passed_g.append(log_test("G", 23, "POST /api/ai-tools/call with sales.no_such returns error", is_error and has_error_msg and error_mentions_not_found,
    f"Status: {resp.status_code}, Body: {resp.json()}"))

# G.24: POST /api/ai-tools/call without auth -> 401
resp = requests.post(f"{BASE_URL}/ai-tools/call",
    json={"tool": "rewards.award_points", "params": {"customerId": "c-1", "points": 50, "reason": "test"}})
passed_g.append(log_test("G", 24, "POST /api/ai-tools/call without auth returns 401", resp.status_code == 401,
    f"Status: {resp.status_code}"))

print(f"\nSection G Summary: {sum(passed_g)}/{len(passed_g)} tests passed")

# =================== H. MULTI-TENANT ISOLATION ===================
print("\n" + "="*80)
print("SECTION H: MULTI-TENANT ISOLATION")
print("="*80)

passed_h = []

# H.25: Create Org A and Org B
org_a_auth = register_fresh_user("_orgA")
org_b_auth = register_fresh_user("_orgB")

if org_a_auth and org_b_auth:
    org_a_token = org_a_auth["accessToken"]
    org_b_token = org_b_auth["accessToken"]
    
    # Configure sales for Org A
    resp = requests.post(f"{BASE_URL}/connectors/sales/config",
        headers={"Authorization": f"Bearer {org_a_token}"},
        json={"baseUrl": "https://orgA.crm.local", "apiKey": "sk-orgA"})
    
    # Check Org A sees configured
    resp_a = requests.get(f"{BASE_URL}/connectors", headers={"Authorization": f"Bearer {org_a_token}"})
    if resp_a.status_code == 200:
        connectors_a = resp_a.json().get("connectors", [])
        sales_a = next((c for c in connectors_a if c["id"] == "sales"), None)
        a_configured = sales_a and sales_a.get("configured") == True
    else:
        a_configured = False
    
    # Check Org B sees NOT configured
    resp_b = requests.get(f"{BASE_URL}/connectors", headers={"Authorization": f"Bearer {org_b_token}"})
    if resp_b.status_code == 200:
        connectors_b = resp_b.json().get("connectors", [])
        sales_b = next((c for c in connectors_b if c["id"] == "sales"), None)
        b_not_configured = sales_b and sales_b.get("configured") == False
    else:
        b_not_configured = False
    
    passed_h.append(log_test("H", 25, "Per-org config isolation (Org A configured, Org B not)", a_configured and b_not_configured,
        f"Org A configured={a_configured}, Org B configured={b_not_configured}"))
else:
    passed_h.append(log_test("H", 25, "Per-org config isolation", False,
        "Failed to create Org A or Org B"))

# H.26: Tool calls and audit logs are org-scoped
if org_a_auth and org_b_auth:
    # Make a tool call from Org A
    resp_a_call = requests.post(f"{BASE_URL}/connectors/rewards/tools/award_points",
        headers={"Authorization": f"Bearer {org_a_token}"},
        json={"customerId": "c-orgA", "points": 100, "reason": "orgA-test"})
    
    # Make a tool call from Org B
    resp_b_call = requests.post(f"{BASE_URL}/connectors/rewards/tools/award_points",
        headers={"Authorization": f"Bearer {org_b_token}"},
        json={"customerId": "c-orgB", "points": 200, "reason": "orgB-test"})
    
    # Check Org A's audit log
    resp_a_audit = requests.get(f"{BASE_URL}/ai-tools/calls", headers={"Authorization": f"Bearer {org_a_token}"})
    if resp_a_audit.status_code == 200:
        calls_a = resp_a_audit.json().get("calls", [])
        # All calls should belong to Org A
        all_org_a = all(c.get("organizationId") == org_a_auth["organization"]["id"] for c in calls_a)
        # Should not see Org B's calls
        no_org_b = not any(c.get("organizationId") == org_b_auth["organization"]["id"] for c in calls_a)
    else:
        all_org_a = False
        no_org_b = False
    
    # Check Org B's audit log
    resp_b_audit = requests.get(f"{BASE_URL}/ai-tools/calls", headers={"Authorization": f"Bearer {org_b_token}"})
    if resp_b_audit.status_code == 200:
        calls_b = resp_b_audit.json().get("calls", [])
        # All calls should belong to Org B
        all_org_b = all(c.get("organizationId") == org_b_auth["organization"]["id"] for c in calls_b)
        # Should not see Org A's calls
        no_org_a = not any(c.get("organizationId") == org_a_auth["organization"]["id"] for c in calls_b)
    else:
        all_org_b = False
        no_org_a = False
    
    passed_h.append(log_test("H", 26, "Audit logs are org-scoped", all_org_a and no_org_b and all_org_b and no_org_a,
        f"Org A sees only A={all_org_a and no_org_b}, Org B sees only B={all_org_b and no_org_a}"))
else:
    passed_h.append(log_test("H", 26, "Audit logs are org-scoped", False,
        "Failed to create Org A or Org B"))

print(f"\nSection H Summary: {sum(passed_h)}/{len(passed_h)} tests passed")

# =================== I. REGRESSION ===================
print("\n" + "="*80)
print("SECTION I: REGRESSION (Spot-check 10 prior scenarios)")
print("="*80)

passed_i = []

# I.27: GET /api/gateway/health
resp = requests.get(f"{BASE_URL}/gateway/health")
passed_i.append(log_test("I", 27, "GET /api/gateway/health", resp.status_code == 200 and "status" in resp.json(),
    f"Status: {resp.status_code}"))

# I.28: GET /api/gateway/modules (with auth)
resp = requests.get(f"{BASE_URL}/gateway/modules", headers={"Authorization": f"Bearer {admin_token}"})
passed_i.append(log_test("I", 28, "GET /api/gateway/modules", resp.status_code == 200 and "modules" in resp.json(),
    f"Status: {resp.status_code}"))

# I.29: GET /api/events/types
resp = requests.get(f"{BASE_URL}/events/types")
passed_i.append(log_test("I", 29, "GET /api/events/types", resp.status_code == 200 and "types" in resp.json(),
    f"Status: {resp.status_code}"))

# I.30: GET /api/events (with auth)
resp = requests.get(f"{BASE_URL}/events", headers={"Authorization": f"Bearer {admin_token}"})
passed_i.append(log_test("I", 30, "GET /api/events", resp.status_code == 200 and "events" in resp.json(),
    f"Status: {resp.status_code}"))

# I.31: GET /api/customers (with auth)
resp = requests.get(f"{BASE_URL}/customers", headers={"Authorization": f"Bearer {admin_token}"})
passed_i.append(log_test("I", 31, "GET /api/customers", resp.status_code == 200 and "customers" in resp.json(),
    f"Status: {resp.status_code}"))

# I.32: GET /api/auth/me (with auth)
resp = requests.get(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
passed_i.append(log_test("I", 32, "GET /api/auth/me", resp.status_code == 200 and "user" in resp.json(),
    f"Status: {resp.status_code}"))

# I.33: POST /api/customers (create customer, should emit event)
resp = requests.post(f"{BASE_URL}/customers",
    headers={"Authorization": f"Bearer {admin_token}"},
    json={"firstName": "Regression", "lastName": "Test", "email": f"regression_{int(time.time()*1000)}@test.com"})
if resp.status_code == 201:
    customer_id = resp.json()["customer"]["id"]
    # Check if event was emitted
    time.sleep(0.5)  # Give it a moment
    resp_events = requests.get(f"{BASE_URL}/events?type=customer.created", headers={"Authorization": f"Bearer {admin_token}"})
    if resp_events.status_code == 200:
        events = resp_events.json().get("events", [])
        # Find event for this customer
        event = next((e for e in events if customer_id in str(e.get("payload", {}))), None)
        passed_i.append(log_test("I", 33, "POST /api/customers emits customer.created event", event is not None,
            f"Event found: {event is not None}"))
    else:
        passed_i.append(log_test("I", 33, "POST /api/customers emits customer.created event", False,
            f"Failed to fetch events: {resp_events.status_code}"))
else:
    passed_i.append(log_test("I", 33, "POST /api/customers emits customer.created event", False,
        f"Failed to create customer: {resp.status_code}"))

# I.34: POST /api/auth/register
email = f"regression_{int(time.time()*1000)}@test.com"
resp = requests.post(f"{BASE_URL}/auth/register",
    json={"email": email, "password": "Test@123", "name": "Regression User"})
passed_i.append(log_test("I", 34, "POST /api/auth/register", resp.status_code == 201 and "user" in resp.json(),
    f"Status: {resp.status_code}"))

# I.35: POST /api/auth/login
resp = requests.post(f"{BASE_URL}/auth/login",
    json={"email": email, "password": "Test@123"})
passed_i.append(log_test("I", 35, "POST /api/auth/login", resp.status_code == 200 and "accessToken" in resp.json(),
    f"Status: {resp.status_code}"))

# I.36: GET /api/organization (with auth)
resp = requests.get(f"{BASE_URL}/organization", headers={"Authorization": f"Bearer {admin_token}"})
passed_i.append(log_test("I", 36, "GET /api/organization", resp.status_code == 200 and "organization" in resp.json(),
    f"Status: {resp.status_code}"))

print(f"\nSection I Summary: {sum(passed_i)}/{len(passed_i)} tests passed")

# =================== FINAL SUMMARY ===================
print("\n" + "="*80)
print("FINAL SUMMARY")
print("="*80)

total_passed = sum(passed_a) + sum(passed_b) + sum(passed_c) + sum(passed_d) + sum(passed_e) + sum(passed_f) + sum(passed_g) + sum(passed_h) + sum(passed_i)
total_tests = len(passed_a) + len(passed_b) + len(passed_c) + len(passed_d) + len(passed_e) + len(passed_f) + len(passed_g) + len(passed_h) + len(passed_i)

print(f"\nA. Demo Login: {sum(passed_a)}/{len(passed_a)} passed")
print(f"B. Connector Registry: {sum(passed_b)}/{len(passed_b)} passed")
print(f"C. AI Tools: {sum(passed_c)}/{len(passed_c)} passed")
print(f"D. Tool Execution (Mock): {sum(passed_d)}/{len(passed_d)} passed")
print(f"E. Per-Org Config: {sum(passed_e)}/{len(passed_e)} passed")
print(f"F. Audit Log: {sum(passed_f)}/{len(passed_f)} passed")
print(f"G. AI Dispatcher: {sum(passed_g)}/{len(passed_g)} passed")
print(f"H. Multi-Tenant Isolation: {sum(passed_h)}/{len(passed_h)} passed")
print(f"I. Regression: {sum(passed_i)}/{len(passed_i)} passed")

print(f"\n{'='*80}")
print(f"TOTAL: {total_passed}/{total_tests} tests passed ({total_passed*100//total_tests}%)")
print(f"{'='*80}")

if total_passed == total_tests:
    print("\n🎉 ALL TESTS PASSED! 🎉")
    exit(0)
else:
    print(f"\n⚠️  {total_tests - total_passed} test(s) failed")
    exit(1)
