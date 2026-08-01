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
  └── LLM abstraction ───► LLPhant ──────► DeepSeek
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

## LLPhant and DeepSeek implementation

- `App\Contracts\LlmClient` keeps controllers independent of the provider.
- `OpenAiLlmClient` uses LLPhant's OpenAI-compatible chat implementation.
- DeepSeek is configured as the current default provider.
- Raw provider usage is normalized into Apolos's provider-independent budget
  accounting.
- The backend enforces verified-email checks, per-user monthly budgets, and
  endpoint throttles before inference.

## Data sent to AI

The assistant receives recent conversation, bounded canvas structure, selected
passages already present in the study, and up to three explicitly attached
documents. It does not receive YouVersion or DeepSeek credentials. Prompts and
responses should not be presented as professional counseling.

## Production environment

```env
YOUVERSION_APP_KEY=
YOUVERSION_AUTH_URL=https://api.youversion.com
YOUVERSION_REDIRECT_URI=https://apolos.io/api/auth/youversion/callback

LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_TIMEOUT=60
```
