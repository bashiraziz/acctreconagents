# Sentry Error Tracking Setup Guide

This guide walks through setting up Sentry for error tracking and performance monitoring.

## Prerequisites

- Sentry account (https://sentry.io/)
- Project created in Sentry dashboard

## Installation

```bash
cd apps/web
npm install @sentry/nextjs
```

## Configuration

### 1. Initialize Sentry

Run the Sentry wizard to auto-configure:

```bash
npx @sentry/wizard@latest -i nextjs
```

This will:
- Create `sentry.client.config.ts`
- Create `sentry.server.config.ts`
- Create `sentry.edge.config.ts`
- Update `next.config.js`
- Add environment variables

### 2. Environment Variables

Add to `.env.local`:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=your-auth-token

# Optional: Disable Sentry in development
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
```

### 3. Update Error Boundary

The `ErrorBoundary` component (apps/web/src/components/error-boundary.tsx) has a TODO comment for Sentry integration:

```typescript
componentDidCatch(error: Error, errorInfo: any) {
  console.error('Error Boundary caught an error:', error);
  console.error('Error Info:', errorInfo);

  // Send to Sentry
  if (typeof window !== 'undefined' && window.Sentry) {
    window.Sentry.captureException(error, {
      extra: errorInfo,
    });
  }

  this.setState({ errorInfo });
}
```

### 4. Update Performance Monitoring

The `performance.ts` utility has TODOs for Sentry integration:

```typescript
// In reportError function
if (typeof window !== 'undefined' && window.Sentry) {
  window.Sentry.captureException(error, {
    extra: context,
  });
}

// In trackPerformanceMetric function
if (window.Sentry) {
  window.Sentry.captureEvent({
    type: 'transaction',
    transaction: metricName,
    timestamp: Date.now() / 1000,
    contexts: {
      trace: {
        op: 'performance.metric',
      },
    },
    measurements: {
      duration: { value, unit: 'millisecond' },
    },
  });
}
```

## Features to Configure

### 1. Performance Monitoring

In `sentry.client.config.ts`:

```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1, // 10% of transactions

  // Track specific operations
  integrations: [
    new Sentry.BrowserTracing({
      tracingOrigins: ['localhost', /^\//],
      routingInstrumentation: Sentry.nextRouterInstrumentation(useRouter),
    }),
  ],
});
```

### 2. Release Tracking

Add to `package.json` scripts:

```json
{
  "scripts": {
    "build": "next build && sentry-cli sourcemaps upload --org your-org --project your-project .next"
  }
}
```

### 3. User Context

Track user information in errors:

```typescript
// In auth callback or user session setup
if (session?.user) {
  Sentry.setUser({
    id: session.user.id,
    email: session.user.email,
  });
}

// On logout
Sentry.setUser(null);
```

### 4. Custom Tags

Add context to errors:

```typescript
Sentry.setTag('accounting_system', accountingSystem);
Sentry.setTag('file_type', fileType);
Sentry.setContext('reconciliation', {
  glRows: glBalance.length,
  subledgerRows: subledgerBalance.length,
  variance: totalVariance,
});
```

## Testing

Test Sentry integration:

```typescript
// Throw test error in development
if (process.env.NODE_ENV === 'development') {
  throw new Error('Sentry test error');
}
```

## Best Practices

1. **Sample Rate**: Start with 10% (`tracesSampleRate: 0.1`) and adjust based on volume
2. **Ignore Expected Errors**: Filter out 404s, authentication failures
3. **PII Scrubbing**: Ensure sensitive data is not sent to Sentry
4. **Source Maps**: Always upload source maps for production builds
5. **Alerts**: Configure Sentry alerts for critical errors

## Monitoring Checklist

- [ ] Sentry installed and configured
- [ ] DSN added to environment variables
- [ ] Error boundary integrated
- [ ] Performance monitoring enabled
- [ ] Source maps uploading on build
- [ ] User context tracking
- [ ] Release tracking configured
- [ ] Alerts configured in Sentry dashboard
- [ ] Team notifications set up

## Resources

- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Performance Monitoring Guide](https://docs.sentry.io/platforms/javascript/performance/)
- [Best Practices](https://docs.sentry.io/platforms/javascript/best-practices/)
