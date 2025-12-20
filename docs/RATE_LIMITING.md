# Rate Limiting

This application implements rate limiting for anonymous (non-authenticated) users to prevent abuse while allowing legitimate usage.

## Rate Limits

**Anonymous Users:**
- **5 reconciliations per 1 hour**
- **8 reconciliations per 2 hours**
- **10 reconciliations per 3 hours**

**Authenticated Users:**
- Unlimited reconciliations
- No rate limits applied

## How It Works

### Backend Implementation

1. **Rate Limit Utility** (`src/lib/rate-limit.ts`)
   - In-memory storage tracking requests by IP address
   - Multiple time window validation (1h, 2h, 3h)
   - Automatic cleanup of old entries every 10 minutes
   - Returns structured rate limit information

2. **Client Identification** (`src/lib/get-client-ip.ts`)
   - Extracts client IP from request headers
   - Supports proxy headers (Vercel, Cloudflare, etc.)
   - Falls back to localhost for development

3. **API Protection** (`src/app/api/agent/runs/route.ts`)
   - Checks authentication status
   - Applies rate limits only to anonymous users
   - Returns HTTP 429 with helpful error messages when exceeded
   - Includes rate limit headers in all responses

4. **Status Endpoint** (`src/app/api/rate-limit/route.ts`)
   - GET endpoint to check current rate limit status
   - Returns remaining requests, reset time, and window info
   - Used by frontend to display usage information

### Frontend Implementation

1. **Rate Limit Status Component** (`src/components/rate-limit-status.tsx`)
   - Displays remaining reconciliations for anonymous users
   - Color-coded progress bar (green → yellow → red)
   - Auto-refreshes every 30 seconds
   - Hidden for authenticated users

2. **Auth Banner** (`src/components/auth/auth-banner.tsx`)
   - Shows rate limit status inline
   - Encourages sign-up to remove limits
   - Only visible to anonymous users

3. **Error Handling** (`src/components/orchestrator-console.tsx`)
   - Catches 429 errors from API
   - Displays rate limit exceeded messages
   - Shows helpful sign-in prompt

## Response Headers

All responses from `/api/agent/runs` include these headers:

```
X-RateLimit-Limit: 5          # Maximum requests per window
X-RateLimit-Remaining: 3      # Requests remaining
X-RateLimit-Reset: 1234567890 # Unix timestamp when limit resets
Retry-After: 3600             # Seconds until next request allowed (429 only)
```

## Error Response Format

When rate limit is exceeded (HTTP 429):

```json
{
  "error": "Rate limit exceeded",
  "message": "You've exceeded the limit of 5 reconciliations per 1 hour. Please try again in 45 minutes.",
  "details": {
    "limit": 5,
    "window": "1 hour",
    "retryAfter": 2700,
    "reset": "2025-12-19T15:30:00.000Z"
  },
  "help": [
    "Sign in to remove rate limits and save your reconciliation history",
    "Rate limits reset automatically after the time window expires"
  ]
}
```

## Storage Options

### Current: In-Memory (Default)
- ✅ Simple, no external dependencies
- ✅ Works locally and in development
- ⚠️ Resets on server restart
- ⚠️ Doesn't work across multiple server instances

### Production: Vercel KV (Recommended)
To upgrade to Vercel KV for production:

1. Install Vercel KV:
   ```bash
   cd apps/web
   npm install @vercel/kv
   ```

2. Add to `.env`:
   ```
   KV_REST_API_URL=your-kv-url
   KV_REST_API_TOKEN=your-kv-token
   ```

3. Update `src/lib/rate-limit.ts` to use KV instead of Map

## Testing Rate Limits

### Local Testing

1. Start the dev server:
   ```bash
   cd apps/web
   npm run dev
   ```

2. As an anonymous user:
   - Run 5 reconciliations
   - The 6th attempt should be blocked with HTTP 429

3. Sign in:
   - Rate limits should disappear
   - Unlimited reconciliations allowed

### Check Current Status

```bash
curl http://localhost:3000/api/rate-limit
```

Response:
```json
{
  "authenticated": false,
  "limit": 5,
  "remaining": 3,
  "reset": "2025-12-19T15:00:00.000Z",
  "window": "1 hour"
}
```

## Monitoring

For administrators, you can check rate limit statistics in the console or via a monitoring endpoint (to be implemented).

## Bypassing Rate Limits

Users can bypass rate limits by:
1. **Signing up for an account** (recommended)
2. Creating an account with email/password
3. Logging in with existing credentials

Benefits of signing up:
- Unlimited reconciliations
- Saved column mappings
- Reconciliation history
- Cross-device sync

## Future Enhancements

- [ ] Admin dashboard to view rate limit statistics
- [ ] Configurable limits per user tier
- [ ] Redis/Vercel KV for production scalability
- [ ] Rate limit exemptions for trusted IPs
- [ ] Different limits for different API endpoints
