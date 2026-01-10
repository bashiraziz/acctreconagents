/**
 * SAP ERP Parser Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { SAPParser } from '@/lib/parsers/sap-parser'
import type { RawCSVRow } from '@/types/csv'

describe('SAPParser', () => {
  let parser: SAPParser

  beforeEach(() => {
    parser = new SAPParser()
  })

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(parser.name).toBe('sap')
      expect(parser.displayName).toBe('SAP ERP')
      expect(parser.description).toBe('SAP ECC and S/4HANA systems')
    })
  })

  describe('detect', () => {
    it('should detect Company Code and GL Account with GC Amount', () => {
      const headers = ['Company Code', 'G/L Account', 'GC Amount', 'Date']
      const firstRow: RawCSVRow = {
        'Company Code': '1000',
        'G/L Account': '100000',
        'GC Amount': '1,234,567.89',
        Date: '20251231'
      }

      const result = parser.detect(headers, firstRow)

      expect(result.confidence).toBeGreaterThan(0.9)
      expect(result.reason).toContain('SAP-specific')
    })

    it('should detect with Co Cd abbreviation', () => {
      const headers = ['Co Cd', 'GL Account', 'Amount in Group Currency']
      const firstRow: RawCSVRow = {
        'Co Cd': '1000',
        'GL Account': '100000',
        'Amount in Group Currency': '1000.00'
      }

      const result = parser.detect(headers, firstRow)

      expect(result.confidence).toBeGreaterThan(0.9)
    })

    it('should detect with partial SAP columns', () => {
      const headers = ['G/L Account', 'Amount']
      const firstRow: RawCSVRow = {
        'G/L Account': '100000',
        Amount: '1000.00'
      }

      const result = parser.detect(headers, firstRow)

      expect(result.confidence).toBeGreaterThan(0.5)
    })

    it('should return partial confidence for generic Account column', () => {
      const headers = ['Account', 'Amount']
      const firstRow: RawCSVRow = {
        Account: '1000',
        Amount: '1000.00'
      }

      const result = parser.detect(headers, firstRow)

      // "Account" matches the SAP hasHeaders check for "account"
      expect(result.confidence).toBeGreaterThan(0.5)
      expect(result.confidence).toBeLessThan(0.9)
    })
  })

  describe('parseRow', () => {
    describe('company code handling', () => {
      it('should extract company code', () => {
        const row: RawCSVRow = {
          'Company Code': '1000'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.company_code).toBe('1000')
      })

      it('should handle Co Cd abbreviation', () => {
        const row: RawCSVRow = {
          'Co Cd': '2000'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.company_code).toBe('2000')
      })
    })

    describe('GL account handling', () => {
      it('should extract GL Account with leading zeros preserved', () => {
        const row: RawCSVRow = {
          'G/L Account': '00100000'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.account_code).toBe('00100000')
      })

      it('should handle various GL Account column names', () => {
        const testCases = [
          { 'G/L Account': '100000' },
          { 'GL Account': '200000' },
          { 'Account': '300000' },
        ]

        testCases.forEach((row) => {
          const parsed = parser.parseRow(row)
          expect(parsed.account_code).toBeDefined()
        })
      })
    })

    describe('multi-currency handling', () => {
      it('should prefer GC Amount over LC Amount', () => {
        const row: RawCSVRow = {
          'Amount in Loc.Cur': '1234.56',
          'GC Amount': '1000.00'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(1000)
      })

      it('should use LC Amount as fallback', () => {
        const row: RawCSVRow = {
          'Amount in Loc.Cur': '1234.56'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(1234.56)
      })

      it('should handle Group Currency Amount variations', () => {
        const testCases = [
          { 'GC Amount': '1000.00', expected: 1000 },
          { 'Group Currency Amount': '2000.00', expected: 2000 },
        ]

        testCases.forEach(({ expected, ...row }) => {
          const parsed = parser.parseRow(row)
          expect(parsed.amount).toBe(expected)
        })
      })

      it('should handle comma-formatted amounts', () => {
        const row: RawCSVRow = {
          'GC Amount': '1,234,567.89'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(1234567.89)
      })
    })

    describe('SAP date formats', () => {
      it('should parse YYYYMMDD format', () => {
        const row: RawCSVRow = {
          'Posting Date': '20251231'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.period).toBe('2025-12')
      })

      it('should parse DD.MM.YYYY format (German)', () => {
        const row: RawCSVRow = {
          'Posting Date': '31.12.2025'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.period).toBe('2025-12')
      })

      it('should handle various date columns', () => {
        const testCases = [
          { 'Posting Date': '20251231', expected: '2025-12' },
          { 'Date': '20250115', expected: '2025-01' },
        ]

        testCases.forEach(({ expected, ...row }) => {
          const parsed = parser.parseRow(row)
          expect(parsed.period).toBe(expected)
        })
      })
    })

    describe('debit/credit indicator', () => {
      it('should negate amount for Credit indicator (S)', () => {
        const row: RawCSVRow = {
          'GC Amount': '1000.00',
          'Debit/Credit': 'S'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(-1000)
      })

      it('should negate amount for Credit indicator (C)', () => {
        const row: RawCSVRow = {
          'GC Amount': '1000.00',
          'D/C': 'C'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(-1000)
      })

      it('should not negate amount for Debit indicator (H)', () => {
        const row: RawCSVRow = {
          'GC Amount': '1000.00',
          'Debit/Credit': 'H'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(1000)
      })

      it('should not double-negate already negative amounts', () => {
        const row: RawCSVRow = {
          'GC Amount': '-1000.00',
          'Debit/Credit': 'S'
        }

        const parsed = parser.parseRow(row)

        // Already negative, S indicator shouldn't affect it
        expect(parsed.amount).toBe(-1000)
      })
    })

    describe('document number', () => {
      it('should store document number', () => {
        const row: RawCSVRow = {
          'Document Number': '1900000123'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.document_number).toBe('1900000123')
      })

      it('should handle Doc No abbreviation', () => {
        const row: RawCSVRow = {
          'Doc No': '456789'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.document_number).toBe('456789')
      })
    })

    describe('full row parsing', () => {
      it('should parse complete SAP row', () => {
        const row: RawCSVRow = {
          'Company Code': '1000',
          'G/L Account': '00100000',
          'GC Amount': '1,234,567.89',
          'Posting Date': '20251231',
          'Document Number': '1900000123',
          'Debit/Credit': 'H',
          'Text': 'Year-end adjustment'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.company_code).toBe('1000')
        expect(parsed.account_code).toBe('00100000')
        expect(parsed.amount).toBe(1234567.89)
        expect(parsed.period).toBe('2025-12')
        expect(parsed.document_number).toBe('1900000123')
        expect(parsed.Text).toBe('Year-end adjustment')
      })

      it('should parse SAP row with credit transaction', () => {
        const row: RawCSVRow = {
          'Company Code': '1000',
          'G/L Account': '20000',
          'Amount in Loc.Cur': '52,850.00',
          'Posting Date': '31.12.2025',
          'D/C': 'S'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.company_code).toBe('1000')
        expect(parsed.account_code).toBe('20000')
        expect(parsed.amount).toBe(-52850)
        expect(parsed.period).toBe('2025-12')
      })

      it('should preserve original row data', () => {
        const row: RawCSVRow = {
          'Company Code': '1000',
          'GC Amount': '1000',
          'CustomField': 'Custom Value'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.CustomField).toBe('Custom Value')
      })
    })
  })
})
