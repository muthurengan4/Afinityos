/**
 * Cross-app SSO launch helpers.
 *
 * FLOW:
 *   1. Admin/CEO clicks "Open Sales dashboard" in AfinityOS.
 *   2. AfinityOS backend calls the connector's saved service credentials
 *      against the target's POST /api/auth/login and receives a JWT.
 *   3. AfinityOS returns a launchUrl of the form:
 *        `${baseUrl}${returnPath}#_afinityos_sso=<base64url(json({...tokens}))>`
 *      Tokens live in the URL FRAGMENT (never sent to any server), so this is
 *      safe against server-side logging + reverse proxies.
 *   4. The target app must have the /public/sso-receiver.js snippet loaded
 *      (or equivalent logic). The snippet parses the fragment, stores the
 *      token in localStorage under common keys, removes the fragment, and
 *      reloads. The user lands on the returnPath already logged in.
 */

// Only these three roles may launch an SSO impersonation.
export const SSO_ROLES = ['super_admin', 'org_admin', 'executive'];

export function isSsoAllowed(user) {
  return !!user && SSO_ROLES.includes(user.role);
}

/** base64url encode an arbitrary JSON payload. */
function b64url(str) {
  const b64 = Buffer.from(str, 'utf8').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Build a launch URL that a receiver snippet on the target host can consume.
 * @param {string} baseUrl  e.g. https://crm-automation-ref.preview.emergentagent.com
 * @param {object} tokens   { accessToken, refreshToken?, tokenType?, user? }
 * @param {string} returnPath  Path on the target app to land on after handoff. Default '/'.
 * @param {object} meta     { issuer, orgId, connectorId, expiresAt, ... }
 */
export function buildLaunchUrl(baseUrl, tokens, returnPath = '/', meta = {}) {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const path = returnPath.startsWith('/') ? returnPath : `/${returnPath}`;
  const payload = {
    v: 1,
    issuer: 'afinityos',
    accessToken: tokens.accessToken || tokens.access_token || null,
    refreshToken: tokens.refreshToken || tokens.refresh_token || null,
    tokenType: tokens.tokenType || tokens.token_type || 'Bearer',
    return: path,
    issuedAt: new Date().toISOString(),
    ...meta,
  };
  const encoded = b64url(JSON.stringify(payload));
  return `${cleanBase}${path}#_afinityos_sso=${encoded}`;
}
