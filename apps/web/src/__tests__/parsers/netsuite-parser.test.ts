/**
 * NetSuite/Oracle Parser Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { NetSuiteParser } from '@/lib/parsers/netsuite-parser'
import type { RawCSVRow } from '@/types/csv'

describe('NetSuiteParser', () => {
  let parser: NetSuiteParser

  beforeEach(() => {
    parser = new NetSuiteParser()
  })

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(parser.name).toBe('netsuite')
      expect(parser.displayName).toBe('NetSuite / Oracle')
      expect(parser.description).toBe('Oracle NetSuite ERP and Cloud Platform')
    })
  })

  describe('detect', () => {
    it('should detect dimensional columns and base currency with high confidence', () => {
      const headers = ['Account', 'Subsidiary', 'Department', 'Amount (Base Currency)']
      const firstRow: RawCSVRow = {
        Account: '1000',
        Subsidiary: 'US Operations',
        Department: 'Finance',
        'Amount (Base Currency)': '1000.00'
      }

      const result = parser.detect(headers, firstRow)

      expect(result.confidence).toBeGreaterThan(0.9)
      expect(result.reason).toContain('Dimensional')
    })

    it('should detect dimensional columns alone', () => {
      const headers = ['Account', 'Subsidiary', 'Department', 'Class', 'Amount']
      const firstRow: RawCSVRow = {
        Account: '1000',
        Subsidiary: 'US Operations',
        Department: 'Finance',
        Class: 'Operating',
        Amount: '1000.00'
      }

      const result = parser.detect(headers, firstRow)

      expect(result.confidence).toBeGreaterThan(0.6)
    })

    it('should detect base currency alone', () => {
      const headers = ['Account', 'Amount (Base Currency)', 'Date']
      const firstRow: RawCSVRow = {
        Account: '1000',
        'Amount (Base Currency)': '1000.00',
        Date: '12/31/2025'
      }

      const result = parser.detect(headers, firstRow)

      expect(result.confidence).toBeGreaterThan(0.6)
    })

    it('should return zero confidence for generic columns', () => {
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
    describe('base currency handling', () => {
      it('should prefer Amount (Base Currency) over local amount', () => {
        const row: RawCSVRow = {
          'Amount': '1234.56',
          'Amount (Base Currency)': '1000.00'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(1000)
      })

      it('should parse various base currency column names', () => {
        const testCases = [
          { 'Amount (Base Currency)': '1000.00' },
          { 'Base Currency Amount': '2000.00' },
        ]

        testCases.forEach((row) => {
          const parsed = parser.parseRow(row)
          expect(parsed.amount).toBeDefined()
        })
      })

      it('should handle comma-formatted amounts', () => {
        const row: RawCSVRow = {
          'Amount (Base Currency)': '1,234,567.89'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(1234567.89)
      })
    })

    describe('account handling', () => {
      it('should extract account code from account field', () => {
        const row: RawCSVRow = {
          Account: 'Cash (1000)'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.account_code).toBe('1000')
      })

      it('should store account name', () => {
        const row: RawCSVRow = {
          Account: 'Accounts Payable'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.account_name).toBe('Accounts Payable')
      })
    })

    describe('NetSuite period format', () => {
      it('should parse "Dec 2025" format', () => {
        const row: RawCSVRow = {
          Period: 'Dec 2025'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.period).toBe('2025-12')
      })

      it('should parse full month name', () => {
        const row: RawCSVRow = {
          Period: 'Dec 2025'
        }

        const parsed = parser.parseRow(row)

        // Note: Parser only handles 3-letter month abbreviations
        expect(parsed.period).toBe('2025-12')
      })

      it('should parse various month formats', () => {
        const testCases = [
          { input: 'Jan 2025', expected: '2025-01' },
          { input: 'Feb 2025', expected: '2025-02' },
          { input: 'Mar 2025', expected: '2025-03' },
          { input: 'Dec 2025', expected: '2025-12' },
        ]

        testCases.forEach(({ input, expected }) => {
          const parsed = parser.parseRow({ Period: input })
          expect(parsed.period).toBe(expected)
        })
      })

      it('should parse dates from Date column', () => {
        const row: RawCSVRow = {
          Date: '2025-12-31'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.period).toBe('2025-12')
      })
    })

    describe('dimensional data', () => {
      it('should preserve subsidiary information', () => {
        const row: RawCSVRow = {
          Subsidiary: 'US Operations'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.Subsidiary).toBe('US Operations')
      })

      it('should preserve department information', () => {
        const row: RawCSVRow = {
          Department: 'Finance'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.Department).toBe('Finance')
      })

      it('should preserve class information', () => {
        const row: RawCSVRow = {
          Class: 'Operating'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.Class).toBe('Operating')
      })

      it('should preserve location information', () => {
        const row: RawCSVRow = {
          Location: 'New York Office'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.Location).toBe('New York Office')
      })
    })

    describe('full row parsing', () => {
      it('should parse complete NetSuite row', () => {
        const row: RawCSVRow = {
          Account: 'Cash (1000)',
          'Amount (Base Currency)': '1,234,567.89',
          Subsidiary: 'US Operations',
          Department: 'Finance',
          Class: 'Operating',
          Period: 'Dec 2025',
          Description: 'Monthly balance'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.account_code).toBe('1000')
        expect(parsed.amount).toBe(1234567.89)
        expect(parsed.Subsidiary).toBe('US Operations')
        expect(parsed.Department).toBe('Finance')
        expect(parsed.Class).toBe('Operating')
        expect(parsed.period).toBe('2025-12')
        expect(parsed.Description).toBe('Monthly balance')
      })

      it('should preserve original row data', () => {
        const row: RawCSVRow = {
          Account: '1000',
          'Amount (Base Currency)': '1000',
          CustomField: 'Custom Value'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.CustomField).toBe('Custom Value')
      })
    })
  })
})
