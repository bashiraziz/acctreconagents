/**
 * Transform Data Tests
 * Tests for data transformation and validation logic
 */

import { describe, it, expect } from 'vitest'
import { applyMapping, transformBalances } from '@/lib/transformData'
import type { RawCSVRow, ParsedCSVRow } from '@/types/csv'
import type { ColumnMapping, UploadedFile } from '@/types/reconciliation'

describe('transformData', () => {
  describe('applyMapping', () => {
    it('should map columns correctly', () => {
      const rows: RawCSVRow[] = [
        { 'Account': '1000', 'Balance': '1234.56', 'Period': '2025-12' }
      ]
      const mapping: ColumnMapping = {
        account_code: 'Account',
        amount: 'Balance',
        period: 'Period'
      }

      const result = applyMapping(rows, mapping)

      expect(result).toHaveLength(1)
      expect(result[0].account_code).toBe('1000')
      expect(result[0].amount).toBe(1234.56)
      expect(result[0].period).toBe('2025-12')
    })

    it('should inject metadata when provided', () => {
      const rows: RawCSVRow[] = [
        { 'Amount': '1000' }
      ]
      const mapping: ColumnMapping = {
        amount: 'Amount'
      }
      const metadata = {
        accountCode: '2000',
        period: '2025-12',
        currency: 'USD'
      }

      const result = applyMapping(rows, mapping, metadata)

      expect(result[0].account_code).toBe('2000')
      expect(result[0].period).toBe('2025-12')
      expect(result[0].currency).toBe('USD')
      expect(result[0].amount).toBe(1000)
    })

    it('should handle reverseSign metadata', () => {
      const rows: RawCSVRow[] = [
        { 'Amount': '1234.56' }
      ]
      const mapping: ColumnMapping = {
        amount: 'Amount'
      }
      const metadata = { reverseSign: true }

      const result = applyMapping(rows, mapping, metadata)

      expect(result[0].amount).toBe(-1234.56)
    })

    it('should convert account codes to strings', () => {
      const rows: RawCSVRow[] = [
        { 'Account': 1000 }
      ]
      const mapping: ColumnMapping = {
        account_code: 'Account'
      }

      const result = applyMapping(rows, mapping)

      expect(typeof result[0].account_code).toBe('string')
      expect(result[0].account_code).toBe('1000')
    })

    it('should parse comma-formatted amounts', () => {
      const rows: RawCSVRow[] = [
        { 'Amount': '1,234,567.89' }
      ]
      const mapping: ColumnMapping = {
        amount: 'Amount'
      }

      const result = applyMapping(rows, mapping)

      expect(result[0].amount).toBe(1234567.89)
    })

    it('should handle debit and credit columns', () => {
      const rows: RawCSVRow[] = [
        { 'Debit': '1,000.00', 'Credit': '500.00' }
      ]
      const mapping: ColumnMapping = {
        debit: 'Debit',
        credit: 'Credit'
      }

      const result = applyMapping(rows, mapping)

      expect(result[0].debit).toBe(1000)
      expect(result[0].credit).toBe(500)
    })

    it('should apply system-specific parsing', () => {
      const rows: RawCSVRow[] = [
        { 'Account': '1000', 'Amount': '-1234.56' }
      ]
      const mapping: ColumnMapping = {
        account_code: 'Account',
        amount: 'Amount'
      }

      const result = applyMapping(rows, mapping, undefined, 'quickbooks')

      // Parser is called, though result is same for simple negative
      expect(result[0].account_code).toBe('1000')
      expect(result[0].amount).toBe(-1234.56)
    })

    it('should preserve metadata over empty mapped values', () => {
      const rows: RawCSVRow[] = [
        { 'Account': '', 'Amount': '1000' }
      ]
      const mapping: ColumnMapping = {
        account_code: 'Account',
        amount: 'Amount'
      }
      const metadata = {
        accountCode: '2000',
        period: '2025-12'
      }

      const result = applyMapping(rows, mapping, metadata)

      expect(result[0].account_code).toBe('2000') // Metadata wins over empty value
      expect(result[0].period).toBe('2025-12')
    })

    it('should handle multiple rows', () => {
      const rows: RawCSVRow[] = [
        { 'Account': '1000', 'Amount': '100' },
        { 'Account': '2000', 'Amount': '200' },
        { 'Account': '3000', 'Amount': '300' }
      ]
      const mapping: ColumnMapping = {
        account_code: 'Account',
        amount: 'Amount'
      }

      const result = applyMapping(rows, mapping)

      expect(result).toHaveLength(3)
      expect(result[0].account_code).toBe('1000')
      expect(result[1].account_code).toBe('2000')
      expect(result[2].account_code).toBe('3000')
    })

    it('should handle unmapped columns gracefully', () => {
      const rows: RawCSVRow[] = [
        { 'Account': '1000', 'Description': 'Cash account' }
      ]
      const mapping: ColumnMapping = {
        account_code: 'Account'
        // Description is not mapped
      }

      const result = applyMapping(rows, mapping)

      expect(result[0].account_code).toBe('1000')
      expect(result[0].Description).toBeUndefined() // Unmapped columns not included
    })
  })

  describe('transformBalances', () => {
    it('should transform valid balance data', () => {
      const file: UploadedFile = {
        name: 'test.csv',
        fileType: 'gl_balance',
        headers: ['Account', 'Amount'],
        rows: [
          { 'Account': '1000', 'Amount': '1234.56' },
          { 'Account': '2000', 'Amount': '5678.90' }
        ],
        rowCount: 2,
        columnCount: 2,
        accountingSystem: 'generic',
        metadata: {
          period: '2025-12',
          currency: 'USD'
        }
      }
      const mapping: ColumnMapping = {
        account_code: 'Account',
        amount: 'Amount'
      }

      const result = transformBalances(file, mapping)

      expect(result.errors).toHaveLength(0)
      expect(result.data).toHaveLength(2)
      expect(result.data[0].account_code).toBe('1000')
      expect(result.data[0].amount).toBe(1234.56)
      expect(result.data[0].period).toBe('2025-12')
      expect(result.data[0].currency).toBe('USD')
    })

    it('should return empty data for null file', () => {
      const mapping: ColumnMapping = {
        account_code: 'Account',
        amount: 'Amount'
      }

      const result = transformBalances(null, mapping)

      expect(result.data).toHaveLength(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate required fields', () => {
      const file: UploadedFile = {
        name: 'test.csv',
        fileType: 'gl_balance',
        headers: ['Amount'],
        rows: [
          { 'Amount': '1234.56' } // Missing account_code
        ],
        rowCount: 1,
        columnCount: 1,
        accountingSystem: 'generic'
      }
      const mapping: ColumnMapping = {
        amount: 'Amount'
        // account_code not mapped
      }

      const result = transformBalances(file, mapping)

      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('account_code')
    })

    it('should handle comma-formatted amounts in validation', () => {
      const file: UploadedFile = {
        name: 'test.csv',
        fileType: 'gl_balance',
        headers: ['Account', 'Amount'],
        rows: [
          { 'Account': '1000', 'Amount': '1,234,567.89' }
        ],
        rowCount: 1,
        columnCount: 2,
        accountingSystem: 'generic',
        metadata: {
          period: '2025-12',
          currency: 'USD'
        }
      }
      const mapping: ColumnMapping = {
        account_code: 'Account',
        amount: 'Amount'
      }

      const result = transformBalances(file, mapping)

      expect(result.errors).toHaveLength(0)
      expect(result.data[0].amount).toBe(1234567.89)
    })

    it('should integrate with accounting system parser', () => {
      const file: UploadedFile = {
        name: 'test.csv',
        fileType: 'gl_balance',
        headers: ['Account', 'Amount'],
        rows: [
          { 'Account': '1000', 'Amount': '(1,234.56)' } // Parentheses = negative
        ],
        rowCount: 1,
        columnCount: 2,
        accountingSystem: 'quickbooks', // Use QuickBooks parser
        metadata: {
          period: '2025-12',
          currency: 'USD'
        }
      }
      const mapping: ColumnMapping = {
        account_code: 'Account',
        amount: 'Amount'
      }

      const result = transformBalances(file, mapping)

      expect(result.errors).toHaveLength(0)
      expect(result.data).toHaveLength(1)
      // QuickBooks parser handles parentheses as negative
      expect(result.data[0].amount).toBe(-1234.56)
      expect(result.data[0].account_code).toBe('1000')
    })

    it('should handle invalid data types gracefully', () => {
      const file: UploadedFile = {
        name: 'test.csv',
        fileType: 'gl_balance',
        headers: ['Account', 'Amount'],
        rows: [
          { 'Account': '1000', 'Amount': 'invalid' }
        ],
        rowCount: 1,
        columnCount: 2,
        accountingSystem: 'generic',
        metadata: {
          period: '2025-12',
          currency: 'USD'
        }
      }
      const mapping: ColumnMapping = {
        account_code: 'Account',
        amount: 'Amount'
      }

      const result = transformBalances(file, mapping)

      // Should have validation errors for invalid amount
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should apply reverseSign from metadata', () => {
      const file: UploadedFile = {
        name: 'test.csv',
        fileType: 'gl_balance',
        headers: ['Account', 'Amount'],
        rows: [
          { 'Account': '1000', 'Amount': '1234.56' }
        ],
        rowCount: 1,
        columnCount: 2,
        accountingSystem: 'generic',
        metadata: {
          period: '2025-12',
          currency: 'USD',
          reverseSign: true
        }
      }
      const mapping: ColumnMapping = {
        account_code: 'Account',
        amount: 'Amount'
      }

      const result = transformBalances(file, mapping)

      expect(result.errors).toHaveLength(0)
      expect(result.data[0].amount).toBe(-1234.56)
    })
  })
})
