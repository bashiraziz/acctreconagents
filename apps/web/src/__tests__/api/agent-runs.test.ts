/**
 * API Route Tests: /api/agent/runs
 * Tests for agent execution endpoint with rate limiting and auth
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '@/app/api/agent/runs/route'

// Mock modules
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
}))

vi.mock('@/lib/get-client-ip', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
}))

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))

// Mock global fetch
global.fetch = vi.fn()

import { checkRateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/get-client-ip'
import { auth } from '@/lib/auth'

describe('/api/agent/runs', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks
    vi.mocked(getClientIp).mockReturnValue('127.0.0.1')
    vi.mocked(auth.api.getSession).mockResolvedValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST - Rate limiting', () => {
    it('should allow request within rate limit', async () => {
      vi.mocked(checkRateLimit).mockReturnValue({
        allowed: true,
        limit: 30,
        remaining: 29,
        reset: Date.now() + 3600000,
        window: '1 hour',
      })

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ runId: '123', status: 'success' }),
      } as Response)

      const request = new Request('http://localhost:3000/api/agent/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'reconcile' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.runId).toBe('123')
      expect(response.headers.get('X-RateLimit-Limit')).toBe('30')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('29')
    })

    it('should reject request when rate limit exceeded', async () => {
      vi.mocked(checkRateLimit).mockReturnValue({
        allowed: false,
        limit: 30,
        remaining: 0,
        reset: Date.now() + 1800000,
        retryAfter: 1800,
        window: '1 hour',
      })

      const request = new Request('http://localhost:3000/api/agent/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'reconcile' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('rate_limit_exceeded')
      expect(data.message).toContain('30 reconciliations')
      expect(response.headers.get('Retry-After')).toBe('1800')
    })

    it('should include rate limit headers in error response', async () => {
      vi.mocked(checkRateLimit).mockReturnValue({
        allowed: false,
        limit: 30,
        remaining: 0,
        reset: Date.now() + 3600000,
        retryAfter: 3600,
        window: '1 hour',
      })

      const request = new Request('http://localhost:3000/api/agent/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'reconcile' }),
      })

      const response = await POST(request)

      expect(response.headers.get('X-RateLimit-Limit')).toBe('30')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
      expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy()
      expect(response.headers.get('Retry-After')).toBe('3600')
    })
  })

  describe('POST - Authentication', () => {
    it('should use IP-based identifier for anonymous users', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null)
      vi.mocked(getClientIp).mockReturnValue('192.168.1.100')

      vi.mocked(checkRateLimit).mockReturnValue({
        allowed: true,
        limit: 30,
        remaining: 29,
        reset: Date.now() + 3600000,
        window: '1 hour',
      })

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ runId: '123' }),
      } as Response)

      const request = new Request('http://localhost:3000/api/agent/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'reconcile' }),
      })

      await POST(request)

      expect(checkRateLimit).toHaveBeenCalledWith('ip:192.168.1.100', false)
    })

    it('should use user-based identifier for authenticated users', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
        session: { id: 'session-123', userId: 'user-123', expiresAt: new Date() },
      })

      vi.mocked(checkRateLimit).mockReturnValue({
        allowed: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 3600000,
        window: '1 hour',
      })

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ runId: '123' }),
      } as Response)

      const request = new Request('http://localhost:3000/api/agent/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'reconcile' }),
      })

      await POST(request)

      expect(checkRateLimit).toHaveBeenCalledWith('user:user-123', true)
    })

    it('should handle auth session lookup failures gracefully', async () => {
      vi.mocked(auth.api.getSession).mockRejectedValue(new Error('Auth service down'))
      vi.mocked(getClientIp).mockReturnValue('127.0.0.1')

      vi.mocked(checkRateLimit).mockReturnValue({
        allowed: true,
        limit: 30,
        remaining: 29,
        reset: Date.now() + 3600000,
        window: '1 hour',
      })

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ runId: '123' }),
      } as Response)

      const request = new Request('http://localhost:3000/api/agent/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'reconcile' }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(checkRateLimit).toHaveBeenCalledWith('ip:127.0.0.1', false)
    })

    it('should apply higher rate limits for authenticated users', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
        session: { id: 'session-123', userId: 'user-123', expiresAt: new Date() },
      })

      vi.mocked(checkRateLimit).mockReturnValue({
        allowed: true,
        limit: 60, // Authenticated users get 2x limit
        remaining: 59,
        reset: Date.now() + 3600000,
        window: '1 hour',
      })

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ runId: '123' }),
      } as Response)

      const request = new Request('http://localhost:3000/api/agent/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'reconcile' }),
      })

      const response = await POST(request)

      expect(response.headers.get('X-RateLimit-Limit')).toBe('60')
    })
  })

  describe('POST - Orchestrator communication', () => {
    beforeEach(() => {
      vi.mocked(checkRateLimit).mockReturnValue({
        allowed: true,
        limit: 30,
        remaining: 29,
        reset: Date.now() + 3600000,
        window: '1 hour',
      })
    })

    it('should forward request to orchestrator', async () => {
      const payload = { task: 'reconcile', data: { account: '1000' } }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ runId: '123', status: 'processing' }),
      } as Response)

      const request = new Request('http://localhost:3000/api/agent/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      await POST(request)

      expect(fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:4100/agent/runs',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
    })

    it('should use default orchestrator URL', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ runId: '123' }),
      } as Response)

      const request = new Request('http://localhost:3000/api/agent/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'reconcile' }),
      })

      await POST(request)

      // Should use default URL (http://127.0.0.1:4100) or env ORCHESTRATOR_URL
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/agent/runs'),
        expect.any(Object)
      )
    })

    it('should return orchestrator response', async () => {
      const orchestratorResponse = {
        runId: 'run-456',
        status: 'completed',
        result: { matched: 100, unmatched: 5 },
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => orchestratorResponse,
      } as Response)

      const request = new Request('http://localhost:3000/api/agent/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'reconcile' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toEqual(orchestratorResponse)
    })

    it('should forward orchestrator error responses', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'invalid_request',
          message: 'Missing required field: data',
        }),
      } as Response)

      const request = new Request('http://localhost:3000/api/agent/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'reconcile' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_request')
    })

    it('should include rate limit headers in orchestrator error responses', async () => {
      vi.mocked(checkRateLimit).mockReturnValue({
        allowed: true,
        limit: 30,
        remaining: 10,
        reset: Date.now() + 3600000,
        window: '1 hour',
      })

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ error: 'validation_failed' }),
      } as Response)

      const request = new Request('http://localhost:3000/api/agent/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'reconcile' }),
      })

      const response = await POST(request)

      expect(response.headers.get('X-RateLimit-Limit')).toBe('30')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('10')
    })
  })

  describe('POST - Error handling', () => {
    beforeEach(() => {
      vi.mocked(checkRateLimit).mockReturnValue({
        allowed: true,
        limit: 30,
        remaining: 29,
        reset: Date.now() + 3600000,
        window: '1 hour',
      })
    })

    it('should return 503 when orchestrator is unavailable', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('ECONNREFUSED'))

      const request = new Request('http://localhost:3000/api/agent/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'reconcile' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.error).toBe('service_unavailable')
      expect(data.message).toContain('Agent service is unavailable')
    })

    it('should provide helpful error messages for local development', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('ECONNREFUSED'))

      const request = new Request('http://localhost:3000/api/agent/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'reconcile' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.help).toContainEqual(
        expect.stringContaining('start the orchestrator')
      )
      expect(data.help).toContainEqual(
        expect.stringContaining('ORCHESTRATOR_URL')
      )
    })

    it('should handle network connection errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const request = new Request('http://localhost:3000/api/agent/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'reconcile' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.error).toBe('service_unavailable')
    })

    it('should handle malformed JSON in request', async () => {
      const request = new Request('http://localhost:3000/api/agent/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.error).toBe('service_unavailable')
    })
  })

  describe('POST - Edge cases', () => {
    beforeEach(() => {
      vi.mocked(checkRateLimit).mockReturnValue({
        allowed: true,
        limit: 30,
        remaining: 29,
        reset: Date.now() + 3600000,
        window: '1 hour',
      })
    })

    it('should handle empty request body', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ runId: '123' }),
      } as Response)

      const request = new Request('http://localhost:3000/api/agent/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should handle large payload', async () => {
      const largePayload = {
        task: 'reconcile',
        data: {
          accounts: Array.from({ length: 1000 }, (_, i) => ({
            code: `${1000 + i}`,
            amount: Math.random() * 10000,
          })),
        },
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ runId: '123' }),
      } as Response)

      const request = new Request('http://localhost:3000/api/agent/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(largePayload),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(largePayload),
        })
      )
    })

    it('should handle orchestrator timeout', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Request timeout'))

      const request = new Request('http://localhost:3000/api/agent/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'reconcile' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.error).toBe('service_unavailable')
    })
  })
})
