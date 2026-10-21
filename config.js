/* Gather & Glow — runtime configuration
 *
 * AI_MODE:
 *   'demo'      — always use the clearly labelled local demo engine (no network calls)
 *   'auto'      — probe the server proxy; use a real model only if the server reports a key
 *   'live'      — force the proxy path (server must expose /api/ai)
 *
 * AI_ENDPOINT is a RELATIVE path handled by the included Node proxy (server.js).
 * The proxy holds the provider API key in a server-side environment variable, so no
 * secret ever reaches the browser. See README.md → "Connecting a real AI service".
 */
(function () {
  'use strict';
  window.GG_CONFIG = {
    AI_MODE: 'auto', // 'auto' | 'demo' | 'live'
    AI_ENDPOINT: 'api/ai',
    AI_HEALTH_ENDPOINT: 'api/ai/health',
    STORAGE_KEY: 'gather-glow:v1',
    SCHEMA_VERSION: 1,
  };
})();
