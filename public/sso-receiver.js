/*!
 * AfinityOS SSO Receiver — v1
 * Drop this ONE file into your target Emergent app (host it at /sso-receiver.js
 * and add <script src="/sso-receiver.js"></script> to your index.html <head>,
 * OR paste its contents into a top-level layout).
 *
 * WHAT IT DOES:
 *   AfinityOS opens your app at:
 *      https://your-app.example.com/some/path#_afinityos_sso=<base64json>
 *   This snippet:
 *     1. On page load, checks window.location.hash for #_afinityos_sso=...
 *     2. Decodes the payload (JSON with { accessToken, refreshToken, tokenType, ... })
 *     3. Writes the token to localStorage under COMMON keys used by CRA / Next / Vite apps
 *        (accessToken, access_token, token, jwt, authToken)
 *     4. Removes the fragment from the URL (so the token is not visible)
 *     5. If a return path was included, replaces the URL with that path and reloads.
 *
 * SECURITY NOTES:
 *   • The token lives in a URL FRAGMENT so it is never sent to any server.
 *   • The fragment is stripped before the browser stores it in history.
 *   • Only accept payloads issued by 'afinityos' with v: 1.
 *   • Only run on trusted domains you control.
 */
(function () {
  if (typeof window === 'undefined') return;
  var HASH_KEY = '_afinityos_sso=';
  var LEGACY_KEYS = ['accessToken', 'access_token', 'token', 'jwt', 'authToken'];

  function b64urlDecode(str) {
    var b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    try { return atob(b64); } catch (e) { return null; }
  }

  var hash = window.location.hash || '';
  var idx = hash.indexOf(HASH_KEY);
  if (idx === -1) return;

  var encoded = hash.slice(idx + HASH_KEY.length).split('&')[0];
  var raw = b64urlDecode(encoded);
  if (!raw) return;

  var payload;
  try { payload = JSON.parse(raw); } catch (e) { return; }
  if (!payload || payload.issuer !== 'afinityos' || payload.v !== 1) return;
  if (!payload.accessToken) return;

  // Write token under common localStorage keys so any framework picks it up.
  try {
    for (var i = 0; i < LEGACY_KEYS.length; i++) {
      window.localStorage.setItem(LEGACY_KEYS[i], payload.accessToken);
    }
    if (payload.refreshToken) {
      window.localStorage.setItem('refreshToken', payload.refreshToken);
      window.localStorage.setItem('refresh_token', payload.refreshToken);
    }
    window.localStorage.setItem('afinityos_sso_origin', 'true');
    window.localStorage.setItem('afinityos_sso_issued_at', payload.issuedAt || new Date().toISOString());
  } catch (e) {
    console.warn('[AfinityOS SSO] localStorage unavailable', e);
    return;
  }

  // Clean the URL and land on the intended return path.
  var target = (payload.return && payload.return.charAt(0) === '/') ? payload.return : window.location.pathname;
  try {
    window.history.replaceState({}, document.title, target);
  } catch (e) {
    window.location.hash = '';
  }
  // Force a reload so the app sees the freshly-populated localStorage on boot.
  window.location.replace(target);
})();
