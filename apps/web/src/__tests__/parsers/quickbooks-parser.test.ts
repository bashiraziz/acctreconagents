/**
 * QuickBooks Parser Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { QuickBooksParser } from '@/lib/parsers/quickbooks-parser'
import type { RawCSVRow } from '@/types/csv'

describe('QuickBooksParser', () => {
  let parser: QuickBooksParser

  beforeEach(() => {
    parser = new QuickBooksParser()
  })

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(parser.name).toBe('quickbooks')
      expect(parser.displayName).toBe('QuickBooks')
      expect(parser.description).toBe('Intuit QuickBooks Online and Desktop')
    })
  })

  describe('detect', () => {
    it('should detect parenthetical account code format with high confidence', () => {
      const headers = ['Account', 'Amount', 'Date']
      const firstRow: RawCSVRow = {
        Account: 'Accounts Payable (2000)',
        Amount: '52,850.00',
        Date: '12/31/2025'
      }

      const result = parser.detect(headers, firstRow)

      expect(result.confidence).toBeGreaterThan(0.9)
      expect(result.reason).toContain('Parenthetical')
    })

    it('should detect with multiple variations', () => {
      const headers = ['Account', 'Balance']
      const testCases = [
        { Account: 'Cash (1000)' },
        { Account: 'Revenue (4000)' },
        { Account: 'Accounts Receivable (1200)' },
      ]

      testCases.forEach(firstRow => {
        const result = parser.detect(headers, firstRow)
        expect(result.confidence).toBeGreaterThan(0.9)
      })
    })

    it('should return low confidence for non-parenthetical format', () => {
      const headers = ['Account', 'Amount']
      const firstRow: RawCSVRow = {
        Account: 'Cash',
        Amount: '1000'
      }

      const result = parser.detect(headers, firstRow)

      expect(result.confidence).toBeLessThan(0.5)
    })

    it('should return zero confidence if no account column', () => {
      const headers = ['Balance', 'Date']
      const firstRow: RawCSVRow = {
        Balance: '1000',
        Date: '12/31/2025'
      }

      const result = parser.detect(headers, firstRow)

      expect(result.confidence).toBe(0)
    })
  })

  describe('parseRow', () => {
    describe('account code extraction', () => {
      it('should extract account code from parenthetical format', () => {
        const row: RawCSVRow = {
          Account: 'Accounts Payable (2000)'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.account_code).toBe('2000')
        expect(parsed.account_name).toBe('Accounts Payable')
      })

      it('should handle various account formats', () => {
        const testCases = [
          { input: 'Cash (1000)', code: '1000', name: 'Cash' },
          { input: 'Accounts Receivable (1200)', code: '1200', name: 'Accounts Receivable' },
          { input: 'Revenue (4000)', code: '4000', name: 'Revenue' },
          { input: 'Expense (5000)', code: '5000', name: 'Expense' },
        ]

        testCases.forEach(({ input, code, name }) => {
          const parsed = parser.parseRow({ Account: input })
          expect(parsed.account_code).toBe(code)
          expect(parsed.account_name).toBe(name)
        })
      })
    })

    describe('amount parsing', () => {
      it('should parse comma-formatted numbers', () => {
        const row: RawCSVRow = {
          Amount: '1,234.56'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(1234.56)
      })

      it('should handle negative amounts', () => {
        const row: RawCSVRow = {
          Amount: '-52,850.00'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(-52850)
      })

      it('should handle parentheses as negative', () => {
        const row: RawCSVRow = {
          Amount: '(1,234.56)'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(-1234.56)
      })

      it('should parse balance columns', () => {
        const row: RawCSVRow = {
          Balance: '10,000.00'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(10000)
      })
    })

    describe('date parsing', () => {
      it('should parse US date format MM/DD/YYYY', () => {
        const row: RawCSVRow = {
          Date: '12/31/2025'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.period).toBe('2025-12')
      })

      it('should handle single-digit months and days', () => {
        const testCases = [
          { input: '1/15/2025', expected: '2025-01' },
          { input: '6/30/2025', expected: '2025-06' },
          { input: '12/1/2025', expected: '2025-12' },
        ]

        testCases.forEach(({ input, expected }) => {
          const parsed = parser.parseRow({ Date: input })
          expect(parsed.period).toBe(expected)
        })
      })

      it('should parse period columns', () => {
        const row: RawCSVRow = {
          Period: '12/31/2025'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.period).toBe('2025-12')
      })
    })

    describe('full row parsing', () => {
      it('should parse complete QuickBooks row', () => {
        const row: RawCSVRow = {
          Account: 'Accounts Payable (2000)',
          Amount: '-52,850.00',
          Date: '12/31/2025',
          Description: 'Vendor invoices'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.account_code).toBe('2000')
        expect(parsed.account_name).toBe('Accounts Payable')
        expect(parsed.amount).toBe(-52850)
        expect(parsed.period).toBe('2025-12')
        expect(parsed.Description).toBe('Vendor invoices') // Original field preserved
      })

      it('should preserve original row data', () => {
        const row: RawCSVRow = {
          Account: 'Cash (1000)',
          Amount: '1000',
          CustomField: 'Custom Value'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.CustomField).toBe('Custom Value')
      })
    })
  })
})
