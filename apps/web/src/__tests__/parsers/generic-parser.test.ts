/**
 * Generic Parser Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { GenericParser } from '@/lib/parsers/generic-parser'
import type { RawCSVRow } from '@/types/csv'

describe('GenericParser', () => {
  let parser: GenericParser

  beforeEach(() => {
    parser = new GenericParser()
  })

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(parser.name).toBe('generic')
      expect(parser.displayName).toBe('Generic / Other')
      expect(parser.description).toBe('Generic CSV format or unknown accounting system')
    })
  })

  describe('detect', () => {
    it('should always return low confidence as fallback', () => {
      const headers = ['Account', 'Amount', 'Date']
      const firstRow: RawCSVRow = {
        Account: '1000',
        Amount: '1000.00',
        Date: '12/31/2025'
      }

      const result = parser.detect(headers, firstRow)

      expect(result.confidence).toBe(0.1)
      expect(result.reason).toContain('Fallback')
    })

    it('should return low confidence for any input', () => {
      const testCases = [
        { headers: ['A', 'B'], firstRow: { A: '1', B: '2' } },
        { headers: ['X', 'Y', 'Z'], firstRow: { X: 'a', Y: 'b', Z: 'c' } },
        { headers: [], firstRow: {} },
      ]

      testCases.forEach(({ headers, firstRow }) => {
        const result = parser.detect(headers, firstRow)
        expect(result.confidence).toBe(0.1)
      })
    })
  })

  describe('parseRow', () => {
    describe('account extraction', () => {
      it('should extract account code from Account column', () => {
        const row: RawCSVRow = {
          Account: 'Cash (1000)'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.account_code).toBe('1000')
      })

      it('should extract from segmented format', () => {
        const row: RawCSVRow = {
          Account: '1000-01-001'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.account_code).toBe('1000')
      })

      it('should store account name from string value', () => {
        const row: RawCSVRow = {
          Account: 'Accounts Payable'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.account_name).toBe('Accounts Payable')
      })

      it('should not extract from Amount columns', () => {
        const row: RawCSVRow = {
          'Account Amount': '1000.00'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.account_code).toBeUndefined()
        expect(parsed.amount).toBe(1000)
      })
    })

    describe('amount extraction', () => {
      it('should extract from Amount column', () => {
        const row: RawCSVRow = {
          Amount: '1,234.56'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(1234.56)
      })

      it('should extract from Balance column', () => {
        const row: RawCSVRow = {
          Balance: '-500.00'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(-500)
      })

      it('should prefer first amount column found', () => {
        const row: RawCSVRow = {
          Amount: '1000.00',
          'Total Amount': '9999.99'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(1000)
      })

      it('should handle various amount column names', () => {
        const testCases = [
          { 'Amount': '100', expected: 100 },
          { 'Balance': '200', expected: 200 },
          { 'Total Amount': '300', expected: 300 },
          { 'Account Balance': '400', expected: 400 },
        ]

        testCases.forEach((row) => {
          const parsed = parser.parseRow(row)
          expect(parsed.amount).toBeDefined()
        })
      })
    })

    describe('date extraction', () => {
      it('should parse dates from Date column', () => {
        const row: RawCSVRow = {
          Date: '2025-12-31'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.period).toBe('2025-12')
      })

      it('should parse dates from Period column', () => {
        const row: RawCSVRow = {
          Period: '12/31/2025'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.period).toBe('2025-12')
      })

      it('should parse various date formats', () => {
        const testCases = [
          { Date: '2025-12-31', expected: '2025-12' },
          { Date: '12/31/2025', expected: '2025-12' },
          { Date: 'Dec 2025', expected: '2025-12' },
          { Date: '20251231', expected: '2025-12' },
        ]

        testCases.forEach(({ Date, expected }) => {
          const parsed = parser.parseRow({ Date })
          expect(parsed.period).toBe(expected)
        })
      })

      it('should prefer first date column', () => {
        const row: RawCSVRow = {
          Date: '2025-12-31',
          Period: '2024-01-01'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.period).toBe('2025-12')
      })
    })

    describe('Debit/Credit calculation', () => {
      it('should calculate amount from Debit - Credit', () => {
        const row: RawCSVRow = {
          Debit: '1000.00',
          Credit: '500.00'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(500)
        expect(parsed.debit).toBe(1000)
        expect(parsed.credit).toBe(500)
      })

      it('should handle Debit Amount and Credit Amount', () => {
        const row: RawCSVRow = {
          'Debit Amount': '2000',
          'Credit Amount': '1000'
        }

        const parsed = parser.parseRow(row)

        // "Debit Amount" contains "amount" so gets extracted as amount first
        expect(parsed.debit).toBe(2000)
        expect(parsed.credit).toBe(1000)
        expect(parsed.amount).toBe(2000) // From "Debit Amount" column
      })

      it('should not override existing amount', () => {
        const row: RawCSVRow = {
          Amount: '5000',
          Debit: '1000',
          Credit: '500'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.amount).toBe(5000) // Amount column wins
      })
    })

    describe('entity and currency extraction', () => {
      it('should extract entity information', () => {
        const row: RawCSVRow = {
          Entity: 'US Operations'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.entity).toBe('US Operations')
      })

      it('should extract company information', () => {
        const row: RawCSVRow = {
          Company: 'Acme Corp'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.entity).toBe('Acme Corp')
      })

      it('should extract currency information', () => {
        const row: RawCSVRow = {
          Currency: 'USD'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.currency).toBe('USD')
      })

      it('should not extract from currency amount columns', () => {
        const row: RawCSVRow = {
          'Currency Amount': '1000.00'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.currency).toBeUndefined()
        expect(parsed.amount).toBe(1000)
      })
    })

    describe('full row parsing', () => {
      it('should parse generic CSV row', () => {
        const row: RawCSVRow = {
          Account: 'Cash (1000)',
          Amount: '1,234.56',
          Date: '2025-12-31',
          Entity: 'US Operations',
          Currency: 'USD',
          Description: 'Monthly balance'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.account_code).toBe('1000')
        expect(parsed.account_name).toBe('Cash (1000)')
        expect(parsed.amount).toBe(1234.56)
        expect(parsed.period).toBe('2025-12')
        expect(parsed.entity).toBe('US Operations')
        expect(parsed.currency).toBe('USD')
        expect(parsed.Description).toBe('Monthly balance')
      })

      it('should parse row with Debit/Credit', () => {
        const row: RawCSVRow = {
          Account: '2000',
          Debit: '5,000.00',
          Credit: '2,500.00',
          Date: '12/31/2025',
          Company: 'Acme Corp'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.account_code).toBe('2000')
        expect(parsed.amount).toBe(2500)
        expect(parsed.debit).toBe(5000)
        expect(parsed.credit).toBe(2500)
        expect(parsed.period).toBe('2025-12')
        expect(parsed.entity).toBe('Acme Corp')
      })

      it('should preserve all original fields', () => {
        const row: RawCSVRow = {
          Field1: 'Value1',
          Field2: 'Value2',
          Field3: 'Value3'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.Field1).toBe('Value1')
        expect(parsed.Field2).toBe('Value2')
        expect(parsed.Field3).toBe('Value3')
      })

      it('should handle empty row', () => {
        const row: RawCSVRow = {}

        const parsed = parser.parseRow(row)

        expect(parsed).toEqual({})
      })

      it('should handle row with only non-standard fields', () => {
        const row: RawCSVRow = {
          CustomField1: 'Custom1',
          CustomField2: 'Custom2'
        }

        const parsed = parser.parseRow(row)

        expect(parsed.CustomField1).toBe('Custom1')
        expect(parsed.CustomField2).toBe('Custom2')
        expect(parsed.amount).toBeUndefined()
        expect(parsed.account_code).toBeUndefined()
      })
    })
  })
})
