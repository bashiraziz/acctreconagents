/**
 * Costpoint/Deltek Parser Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CostpointParser } from '@/lib/parsers/costpoint-parser'
import type { RawCSVRow } from '@/types/csv'

describe('CostpointParser', () => {
  let parser: CostpointParser

  beforeEach(() => {
    parser = new CostpointParser()
  })

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(parser.name).toBe('costpoint')
      expect(parser.displayName).toBe('Costpoint / Deltek')
      expect(parser.description).toBe('Deltek Costpoint ERP system')
    })
  })

  describe('detect', () => {
    it('should detect Debit and Credit columns with high confidence', () => {
      const headers = ['Account', 'Debit', 'Credit', 'Balance']
      const firstRow: RawCSVRow = {
        Account: '1000',
        Debit: '1000.00',
        Credit: '500.00',
        Balance: '500.00'
      }

      const result = parser.detect(headers, firstRow)

      expect(result.confidence).toBeGreaterThan(0.8)
      expect(result.reason).toContain('Debit and Credit')
    })

    it('should detect Debit Amount and Credit Amount columns', () => {
      const headers = ['Account', 'Debit Amount', 'Credit Amount']
      const firstRow: RawCSVRow = {
        Account: '1000',
        'Debit Amount': '1000.00',
        'Credit Amount': '0'
      }

      const result = parser.detect(headers, firstRow)

      expect(result.confidence).toBeGreaterThan(0.8)
    })

    it('should return partial confidence for only Debit or Credit', () => {
      const headers = ['Account', 'Debit']
      const firstRow: RawCSVRow = {
        Account: '1000',
        Debit: '1000.00'
      }

      const result = parser.detect(headers, firstRow)

      expect(result.confidence).toBeGreaterThan(0)
      expect(result.confidence).toBeLessThan(0.9)
    })

    it('should return zero confidence if no Debit/Credit columns', () => {
      const headers = ['Account', 'Amount']
      const firstRow: RawCSVRow = {
        Account: '1000',
        Amount: '1000.00'
      }

      const result = parser.detect(headers, firstRow)

      expect(result.confidence).toBe(0)
    })
  })

  describe('parseRow', () => {
    describe('Debit/Credit calculation', () => {
      it('should calculate amount as Debit - Credit', () => {
        const row: RawCSVRow = {
          Debit: '1000.00',
          Credit: '500.00'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(500)
      })

      it('should handle negative result (Credit > Debit)', () => {
        const row: RawCSVRow = {
          Debit: '500.00',
          Credit: '1000.00'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(-500)
      })

      it('should handle zero values', () => {
        const testCases = [
          { Debit: '0', Credit: '0', expected: 0 },
          { Debit: '1000', Credit: '0', expected: 1000 },
          { Debit: '0', Credit: '500', expected: -500 },
        ]

        testCases.forEach(({ Debit, Credit, expected }) => {
          const parsed = parser.parseRow({ Debit, Credit })
          expect(parsed.amount).toBe(expected)
        })
      })

      it('should handle empty/null values as zero', () => {
        const row: RawCSVRow = {
          Debit: '1000',
          Credit: ''
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(1000)
      })

      it('should handle Debit Amount and Credit Amount columns', () => {
        const row: RawCSVRow = {
          'Debit Amount': '1,234.56',
          'Credit Amount': '234.56'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(1000)
      })
    })

    describe('subledger Amount column', () => {
      it('should negate subledger Amount for liabilities', () => {
        const row: RawCSVRow = {
          Amount: '52850.00'
        }

        const parsed = parser.parseRow(row)

        // Costpoint subledgers show amounts as positive, but represent liabilities
        expect(parsed.amount).toBe(-52850)
      })

      it('should handle comma-formatted amounts', () => {
        const row: RawCSVRow = {
          Amount: '1,234.56'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(-1234.56)
      })

      it('should not override Debit/Credit calculation', () => {
        const row: RawCSVRow = {
          Debit: '1000',
          Credit: '500',
          Amount: '9999' // Should be ignored when Debit/Credit present
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(500) // Debit - Credit wins
      })
    })

    describe('account code extraction', () => {
      it('should extract account codes', () => {
        const row: RawCSVRow = {
          Account: '1000-01-001'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.account_code).toBe('1000')
      })

      it('should handle GL Account column', () => {
        const row: RawCSVRow = {
          'GL Account': '2000'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.account_code).toBe('2000')
      })
    })

    describe('date parsing', () => {
      it('should parse various date formats', () => {
        const testCases = [
          { Date: '2025-12-31', expected: '2025-12' },
          { Date: '12/31/2025', expected: '2025-12' },
          { Period: '2025-12', expected: '2025-12' },
        ]

        testCases.forEach(({ Date, Period, expected }) => {
          const row = Date ? { Date } : { Period }
          const parsed = parser.parseRow(row)
          expect(parsed.period).toBe(expected)
        })
      })
    })

    describe('full row parsing', () => {
      it('should parse complete Costpoint GL row', () => {
        const row: RawCSVRow = {
          'GL Account': '1000-01-001',
          'Account Name': 'Cash',
          Debit: '10,000.00',
          Credit: '5,000.00',
          Date: '12/31/2025',
          Description: 'Monthly closing'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.account_code).toBe('1000')
        expect(parsed.amount).toBe(5000)
        expect(parsed.period).toBe('2025-12')
        expect(parsed.Description).toBe('Monthly closing')
      })

      it('should parse complete Costpoint subledger row', () => {
        const row: RawCSVRow = {
          Account: '2000',
          'Account Name': 'Accounts Payable',
          Amount: '52,850.00',
          Date: '2025-12-31'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.account_code).toBe('2000')
        expect(parsed.amount).toBe(-52850)
        expect(parsed.period).toBe('2025-12')
      })

      it('should preserve original row data', () => {
        const row: RawCSVRow = {
          Debit: '1000',
          Credit: '500',
          CustomField: 'Custom Value'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.CustomField).toBe('Custom Value')
      })
    })
  })
})
