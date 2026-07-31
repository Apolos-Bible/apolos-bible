# Technical architecture

## Experience boundary

```text
React/Tauri creator studio
  ├── licensed Bible selector and reader
  ├── collaborative Yjs study canvas
  └── canvas-aware /apolos conversation
            │
            ▼
Laravel API (all credentials remain here)
  ├── YouVersion proxy ──► catalog / indexes / passages
  │     ├── validation
  │     ├── successful-response cache
  │     └── publisher attribution passthrough
  ├── YouVersion OAuth ──► PKCE / OIDC / Data Exchange
  └── LLM abstraction ───► Gloo OAuth2 ──► Completions V2
        ├── short-lived token cache
        ├── verified-email gate
        ├── per-user budget
        └── throttling and safe failure
```

## YouVersion implementation

- Browser calls only Apolos endpoints.
- Backend sends `X-YVP-App-Key` to YouVersion.
- Licensed Bible lists are fetched per language and paginated.
- Metadata and passage responses use separate cache TTLs.
- Failed, malformed, or rate-limited upstream responses are not cached.
- OAuth uses Authorization Code + PKCE and single-use cached state.
- ID token verification checks RS256 signature, issuer, audience, nonce, and
  required identity claims against YouVersion JWKS.
- Data Exchange currently requests `highlights`; user tokens are encrypted at
  rest.

## Gloo implementation

- Backend exchanges Client ID and Client Secret at
  `POST /oauth2/token` using scope `api/access`.
- Bearer tokens are cached for `expires_in - 60` seconds.
- AI requests use `POST /ai/v2/chat/completions`.
- A revoked cached token receives one forced refresh after HTTP 401.
- The model is catalogued as `gloo/gpt-5-mini`; production can choose it via
  `LLM_PROVIDER=gloo` or through the existing model selector.
- Gloo usage fields are normalized into Apolos's provider-independent usage and
  budget accounting.
- Optional theological tradition is accepted only from Gloo's documented
  `evangelical`, `catholic`, and `mainline` values.

## Data sent to AI

The assistant receives recent conversation, bounded canvas structure, selected
passages already present in the study, and up to three explicitly attached
documents. It does not receive YouVersion or Gloo credentials. Prompts and
responses should not be presented as professional counseling.

## Production environment

```env
YOUVERSION_APP_KEY=
YOUVERSION_AUTH_URL=https://api.youversion.com
YOUVERSION_REDIRECT_URI=https://apolos.io/api/auth/youversion/callback

GLOO_CLIENT_ID=
GLOO_CLIENT_SECRET=
GLOO_BASE_URL=https://platform.ai.gloo.com
GLOO_MODEL=gloo-openai-gpt-5-mini
GLOO_TRADITION=
GLOO_TIMEOUT=60

LLM_PROVIDER=gloo
```

