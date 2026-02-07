/**
 * API Route Tests: /api/uploads
 * Tests for file upload endpoint
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '@/app/api/uploads/route'

// Mock file system operations
vi.mock('node:fs', () => ({
  default: {
    promises: {
      mkdir: vi.fn(),
      writeFile: vi.fn(),
    },
  },
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
  },
}))

describe('/api/uploads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST - File validation', () => {
    it('should reject request without file', async () => {
      const formData = new FormData()
      formData.append('kind', 'supporting')

      const request = new Request('http://localhost:3000/api/uploads', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('bad_request')
      expect(data.message).toBe('Missing file')
    })

    it('should reject file exceeding size limit', async () => {
      const largeBuffer = new Uint8Array(21 * 1024 * 1024) // 21MB
      const largeFile = new File([largeBuffer], 'large.csv', { type: 'text/csv' })

      const formData = new FormData()
      formData.append('file', largeFile)

      const request = new Request('http://localhost:3000/api/uploads', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(413)
      expect(data.error).toBe('payload_too_large')
      expect(data.message).toContain('File too large')
    })

    it('should reject invalid MIME type', async () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      const formData = new FormData()
      formData.append('file', file)

      const request = new Request('http://localhost:3000/api/uploads', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('bad_request')
      expect(data.message).toBe('Invalid file type')
      expect(data.details).toContain('application/pdf')
    })

    it('should reject invalid file extension', async () => {
      const file = new File(['content'], 'test.xlsx', { type: 'text/csv' })

      const formData = new FormData()
      formData.append('file', file)

      const request = new Request('http://localhost:3000/api/uploads', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('bad_request')
      expect(data.message).toBe('Invalid file extension')
    })
  })

  describe('POST - Valid uploads', () => {
    it('should accept valid CSV file', async () => {
      const file = new File(['account,amount\n1000,100'], 'test.csv', { type: 'text/csv' })

      const formData = new FormData()
      formData.append('file', file)

      const request = new Request('http://localhost:3000/api/uploads', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      expect(data.fileName).toMatch(/^\d+-test\.csv$/)
      expect(data.size).toBe(file.size)
      expect(data.kind).toBe('supporting')
      expect(data.storageType).toBe('local') // Falls back to local in test environment
    })

    it('should accept valid TXT file', async () => {
      const file = new File(['account,amount\n1000,100'], 'test.txt', { type: 'text/plain' })

      const formData = new FormData()
      formData.append('file', file)

      const request = new Request('http://localhost:3000/api/uploads', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      expect(data.fileName).toMatch(/^\d+-test\.txt$/)
    })

    it('should accept application/csv MIME type', async () => {
      const file = new File(['account,amount\n1000,100'], 'data.csv', { type: 'application/csv' })

      const formData = new FormData()
      formData.append('file', file)

      const request = new Request('http://localhost:3000/api/uploads', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
    })

    it('should accept application/vnd.ms-excel MIME type', async () => {
      const file = new File(['account,amount\n1000,100'], 'data.csv', {
        type: 'application/vnd.ms-excel'
      })

      const formData = new FormData()
      formData.append('file', file)

      const request = new Request('http://localhost:3000/api/uploads', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
    })

    it('should use default kind value when not provided', async () => {
      const file = new File(['content'], 'test.csv', { type: 'text/csv' })

      const formData = new FormData()
      formData.append('file', file)
      // Don't append 'kind'

      const request = new Request('http://localhost:3000/api/uploads', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.kind).toBe('supporting')
    })

    it('should respect custom kind value', async () => {
      const file = new File(['content'], 'test.csv', { type: 'text/csv' })

      const formData = new FormData()
      formData.append('file', file)
      formData.append('kind', 'gl_balance')

      const request = new Request('http://localhost:3000/api/uploads', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.kind).toBe('gl_balance')
    })
  })

  describe('POST - Filename sanitization', () => {
    it('should sanitize special characters in filename', async () => {
      const file = new File(['content'], 'test file (2024).csv', { type: 'text/csv' })

      const formData = new FormData()
      formData.append('file', file)

      const request = new Request('http://localhost:3000/api/uploads', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Should replace spaces and parentheses with underscores
      expect(data.fileName).toMatch(/^\d+-test_file__2024_\.csv$/)
    })

    it('should preserve dots and hyphens in filename', async () => {
      const file = new File(['content'], 'test-file.v2.csv', { type: 'text/csv' })

      const formData = new FormData()
      formData.append('file', file)

      const request = new Request('http://localhost:3000/api/uploads', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.fileName).toMatch(/^\d+-test-file\.v2\.csv$/)
    })

    it('should add timestamp prefix to filename', async () => {
      const beforeTime = Date.now()
      const file = new File(['content'], 'test.csv', { type: 'text/csv' })

      const formData = new FormData()
      formData.append('file', file)

      const request = new Request('http://localhost:3000/api/uploads', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()
      const afterTime = Date.now()

      const timestamp = parseInt(data.fileName.split('-')[0])
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime)
      expect(timestamp).toBeLessThanOrEqual(afterTime)
    })
  })

  describe('POST - File system operations', () => {
    it('should return file path in response', async () => {
      const file = new File(['content'], 'test.csv', { type: 'text/csv' })

      const formData = new FormData()
      formData.append('file', file)

      const request = new Request('http://localhost:3000/api/uploads', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.path).toContain('.uploads')
      expect(data.path).toContain(data.fileName)
    })
  })

  describe('POST - Error handling', () => {
    it('should include timestamp in error responses', async () => {
      const formData = new FormData()
      formData.append('kind', 'supporting')

      const request = new Request('http://localhost:3000/api/uploads', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.timestamp).toBeDefined()
      expect(new Date(data.timestamp).getTime()).toBeGreaterThan(0)
    })
  })

  describe('POST - Edge cases', () => {
    it('should handle very small CSV file', async () => {
      const file = new File(['a'], 'small.csv', { type: 'text/csv' })

      const formData = new FormData()
      formData.append('file', file)

      const request = new Request('http://localhost:3000/api/uploads', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)

      // Small file should be accepted
      expect(response.status).toBe(200)
    })

    it('should handle file with only extension', async () => {
      const file = new File(['content'], '.csv', { type: 'text/csv' })

      const formData = new FormData()
      formData.append('file', file)

      const request = new Request('http://localhost:3000/api/uploads', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.fileName).toMatch(/^\d+-\.csv$/)
    })

    it('should handle maximum size file', async () => {
      const maxBuffer = new Uint8Array(20 * 1024 * 1024) // Exactly 20MB
      const maxFile = new File([maxBuffer], 'max.csv', { type: 'text/csv' })

      const formData = new FormData()
      formData.append('file', maxFile)

      const request = new Request('http://localhost:3000/api/uploads', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should handle file with unicode characters in name', async () => {
      const file = new File(['content'], 'données-财务-データ.csv', { type: 'text/csv' })

      const formData = new FormData()
      formData.append('file', file)

      const request = new Request('http://localhost:3000/api/uploads', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Unicode characters should be replaced with underscores
      expect(data.fileName).toMatch(/^\d+-.*\.csv$/)
    })
  })
})
