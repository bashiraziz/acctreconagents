/**
 * Xero Parser Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { XeroParser } from '@/lib/parsers/xero-parser'
import type { RawCSVRow } from '@/types/csv'

describe('XeroParser', () => {
  let parser: XeroParser

  beforeEach(() => {
    parser = new XeroParser()
  })

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(parser.name).toBe('xero')
      expect(parser.displayName).toBe('Xero')
      expect(parser.description).toBe('Xero cloud accounting software')
    })
  })

  describe('detect', () => {
    it('should detect Account Code with Debit and Credit', () => {
      const headers = ['Account Code', 'Account Name', 'Debit', 'Credit']
      const firstRow: RawCSVRow = {
        'Account Code': '200',
        'Account Name': 'Sales',
        Debit: '1000.00',
        Credit: '500.00'
      }

      const result = parser.detect(headers, firstRow)

      expect(result.confidence).toBeGreaterThan(0.8)
      expect(result.reason).toContain('Debit/Credit')
    })

    it('should detect Code column with Debit/Credit', () => {
      const headers = ['Code', 'Debit', 'Credit']
      const firstRow: RawCSVRow = {
        Code: '200',
        Debit: '1000.00',
        Credit: '0'
      }

      const result = parser.detect(headers, firstRow)

      expect(result.confidence).toBeGreaterThan(0.8)
    })

    it('should return partial confidence for Account Code alone', () => {
      const headers = ['Account Code', 'Amount']
      const firstRow: RawCSVRow = {
        'Account Code': '200',
        Amount: '1000.00'
      }

      const result = parser.detect(headers, firstRow)

      expect(result.confidence).toBeGreaterThan(0)
      expect(result.confidence).toBeLessThan(0.9)
    })

    it('should return zero confidence without Account Code', () => {
      const headers = ['Account', 'Amount']
      const firstRow: RawCSVRow = {
        Account: '200',
        Amount: '1000.00'
      }

      const result = parser.detect(headers, firstRow)

      expect(result.confidence).toBe(0)
    })
  })

  describe('parseRow', () => {
    describe('account handling', () => {
      it('should extract Account Code', () => {
        const row: RawCSVRow = {
          'Account Code': '200'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.account_code).toBe('200')
      })

      it('should extract Code column', () => {
        const row: RawCSVRow = {
          Code: '310'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.account_code).toBe('310')
      })

      it('should extract Account Name', () => {
        const row: RawCSVRow = {
          'Account Name': 'Sales Revenue'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.account_name).toBe('Sales Revenue')
      })

      it('should extract Account column as name', () => {
        const row: RawCSVRow = {
          Account: 'Accounts Payable'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.account_name).toBe('Accounts Payable')
      })
    })

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

      it('should handle comma-formatted amounts', () => {
        const row: RawCSVRow = {
          Debit: '1,234.56',
          Credit: '234.56'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(1000)
      })
    })

    describe('Net Movement and Balance', () => {
      it('should extract Net Movement', () => {
        const row: RawCSVRow = {
          'Net Movement': '1,234.56'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(1234.56)
      })

      it('should extract Balance', () => {
        const row: RawCSVRow = {
          Balance: '-500.00'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(-500)
      })

      it('should prefer explicit amount over Debit/Credit', () => {
        const row: RawCSVRow = {
          Debit: '0',
          Credit: '0',
          'Net Movement': '5000.00'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(5000)
      })

      it('should use Amount column when no Debit/Credit', () => {
        const row: RawCSVRow = {
          Amount: '1234.56'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(1234.56)
      })
    })

    describe('Xero date format', () => {
      it('should parse "31 Dec 2025" format', () => {
        const row: RawCSVRow = {
          Date: '31 Dec 2025'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.period).toBe('2025-12')
      })

      it('should parse single-digit day', () => {
        const row: RawCSVRow = {
          Date: '1 Jan 2025'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.period).toBe('2025-01')
      })

      it('should parse various month formats', () => {
        const testCases = [
          { input: '15 Jan 2025', expected: '2025-01' },
          { input: '28 Feb 2025', expected: '2025-02' },
          { input: '31 Mar 2025', expected: '2025-03' },
          { input: '30 Dec 2025', expected: '2025-12' },
        ]

        testCases.forEach(({ input, expected }) => {
          const parsed = parser.parseRow({ Date: input })
          expect(parsed.period).toBe(expected)
        })
      })

      it('should handle Period column', () => {
        const row: RawCSVRow = {
          Period: '15 Dec 2025'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.period).toBe('2025-12')
      })
    })

    describe('tracking categories', () => {
      it('should preserve tracking category data', () => {
        const row: RawCSVRow = {
          'Tracking Category 1': 'Region - North'
        }

        const parsed = parser.parseRow(row)

        expect(parsed['Tracking Category 1']).toBe('Region - North')
      })

      it('should preserve multiple tracking categories', () => {
        const row: RawCSVRow = {
          'Tracking Category 1': 'Region - North',
          'Tracking Category 2': 'Department - Sales'
        }

        const parsed = parser.parseRow(row)

        expect(parsed['Tracking Category 1']).toBe('Region - North')
        expect(parsed['Tracking Category 2']).toBe('Department - Sales')
      })

      it('should preserve category column', () => {
        const row: RawCSVRow = {
          Category: 'Operating'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.Category).toBe('Operating')
      })
    })

    describe('full row parsing', () => {
      it('should parse complete Xero row with Debit/Credit', () => {
        const row: RawCSVRow = {
          'Account Code': '200',
          'Account Name': 'Sales',
          Debit: '1,234.56',
          Credit: '234.56',
          Date: '31 Dec 2025',
          'Tracking Category 1': 'Region - North',
          Description: 'Monthly sales'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.account_code).toBe('200')
        expect(parsed.account_name).toBe('Sales')
        expect(parsed.amount).toBe(1000)
        expect(parsed.period).toBe('2025-12')
        expect(parsed['Tracking Category 1']).toBe('Region - North')
        expect(parsed.Description).toBe('Monthly sales')
      })

      it('should parse Xero row with Net Movement', () => {
        const row: RawCSVRow = {
          Code: '310',
          Account: 'Accounts Receivable',
          'Net Movement': '52,850.00',
          Date: '15 Jan 2025'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.account_code).toBe('310')
        expect(parsed.account_name).toBe('Accounts Receivable')
        expect(parsed.amount).toBe(52850)
        expect(parsed.period).toBe('2025-01')
      })

      it('should preserve original row data', () => {
        const row: RawCSVRow = {
          'Account Code': '200',
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
