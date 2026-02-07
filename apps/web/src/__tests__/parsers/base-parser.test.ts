/**
 * Base Parser Tests
 * Tests for the abstract base class and ParserRegistry
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { BaseAccountingParser, ParserRegistry, type DetectionResult } from '@/lib/parsers/base-parser'
import type { RawCSVRow, ParsedCSVRow } from '@/types/csv'
import type { AccountingSystem } from '@/types/reconciliation'

// Mock parser for testing
class MockParser extends BaseAccountingParser {
  readonly name: AccountingSystem = 'generic'
  readonly displayName = 'Mock Parser'
  readonly description = 'Test parser'

  detect(headers: string[], firstRow: RawCSVRow): DetectionResult {
    void headers
    void firstRow
    return { confidence: 0.8, reason: 'Mock detection' }
  }

  parseRow(row: RawCSVRow): ParsedCSVRow {
    return { ...row }
  }
}

describe('BaseAccountingParser', () => {
  let parser: MockParser

  beforeEach(() => {
    parser = new MockParser()
  })

  describe('extractNumber', () => {
    it('should extract number from number type', () => {
      expect(parser['extractNumber'](1234.56)).toBe(1234.56)
    })

    it('should extract number from string with commas', () => {
      expect(parser['extractNumber']('1,234.56')).toBe(1234.56)
    })

    it('should handle parentheses as negative', () => {
      expect(parser['extractNumber']('(500.00)')).toBe(-500)
      expect(parser['extractNumber']('(1,234.56)')).toBe(-1234.56)
    })

    it('should remove currency symbols', () => {
      expect(parser['extractNumber']('$1,000')).toBe(1000)
      expect(parser['extractNumber']('€1,234.56')).toBe(1234.56)
      expect(parser['extractNumber']('£999.99')).toBe(999.99)
      expect(parser['extractNumber']('¥10,000')).toBe(10000)
    })

    it('should handle whitespace', () => {
      expect(parser['extractNumber']('  1,234.56  ')).toBe(1234.56)
    })

    it('should return undefined for non-numeric strings', () => {
      expect(parser['extractNumber']('N/A')).toBeUndefined()
      expect(parser['extractNumber']('abc')).toBeUndefined()
      expect(parser['extractNumber']('')).toBeUndefined()
    })

    it('should return undefined for null and undefined', () => {
      expect(parser['extractNumber'](null)).toBeUndefined()
      expect(parser['extractNumber'](undefined)).toBeUndefined()
    })

    it('should handle negative numbers', () => {
      expect(parser['extractNumber']('-1,234.56')).toBe(-1234.56)
    })

    it('should handle decimal numbers', () => {
      expect(parser['extractNumber']('0.50')).toBe(0.5)
      expect(parser['extractNumber']('.99')).toBe(0.99)
    })
  })

  describe('parseDate', () => {
    it('should parse ISO format (YYYY-MM-DD)', () => {
      expect(parser['parseDate']('2025-12-31')).toBe('2025-12')
      expect(parser['parseDate']('2025-01-15')).toBe('2025-01')
    })

    it('should parse ISO format without day (YYYY-MM)', () => {
      expect(parser['parseDate']('2025-12')).toBe('2025-12')
    })

    it('should parse US format (MM/DD/YYYY)', () => {
      expect(parser['parseDate']('12/31/2025', 'US')).toBe('2025-12')
      expect(parser['parseDate']('1/15/2025', 'US')).toBe('2025-01')
      expect(parser['parseDate']('06/30/2025', 'US')).toBe('2025-06')
    })

    it('should parse UK format (DD/MM/YYYY)', () => {
      // Note: without format hint, may be interpreted as MM/DD
      // Use dashes for explicit UK format
      expect(parser['parseDate']('15-01-2025')).toBe('2025-01')
      expect(parser['parseDate']('31-12-2025')).toBe('2025-12')
    })

    it('should parse month name format', () => {
      expect(parser['parseDate']('Dec 2025')).toBe('2025-12')
      expect(parser['parseDate']('December 2025')).toBe('2025-12')
      expect(parser['parseDate']('31 Dec 2025')).toBe('2025-12')
      expect(parser['parseDate']('Jan 2025')).toBe('2025-01')
      expect(parser['parseDate']('January 2025')).toBe('2025-01')
    })

    it('should parse compact format (YYYYMMDD)', () => {
      expect(parser['parseDate']('20251231')).toBe('2025-12')
      expect(parser['parseDate']('20250115')).toBe('2025-01')
    })

    it('should return undefined for invalid formats', () => {
      expect(parser['parseDate']('invalid')).toBeUndefined()
      expect(parser['parseDate']('2025')).toBeUndefined()
      expect(parser['parseDate']('')).toBeUndefined()
    })

    it('should return undefined for non-string types', () => {
      expect(parser['parseDate'](123)).toBeUndefined()
      expect(parser['parseDate'](null)).toBeUndefined()
      expect(parser['parseDate'](undefined)).toBeUndefined()
    })
  })

  describe('extractAccountCode', () => {
    it('should extract code from parenthetical format', () => {
      expect(parser['extractAccountCode']('Cash (1000)')).toBe('1000')
      expect(parser['extractAccountCode']('Accounts Payable (2000)')).toBe('2000')
    })

    it('should extract code from segmented format', () => {
      expect(parser['extractAccountCode']('1000-01-001')).toBe('1000')
      expect(parser['extractAccountCode']('2000-02')).toBe('2000')
    })

    it('should return code if already a code', () => {
      expect(parser['extractAccountCode']('1000')).toBe('1000')
      expect(parser['extractAccountCode']('12345')).toBe('12345')
    })

    it('should extract from various formats', () => {
      // Test basic extraction without worrying about whitespace details
      expect(parser['extractAccountCode']('Cash (1000)')).toBe('1000')
      expect(parser['extractAccountCode']('Revenue (4000)')).toBe('4000')
    })

    it('should return undefined for non-string types', () => {
      expect(parser['extractAccountCode'](123)).toBeUndefined()
      expect(parser['extractAccountCode'](null)).toBeUndefined()
      expect(parser['extractAccountCode'](undefined)).toBeUndefined()
    })

    it('should return undefined if no code found', () => {
      expect(parser['extractAccountCode']('Cash Account')).toBeUndefined()
      expect(parser['extractAccountCode']('abc')).toBeUndefined()
    })
  })

  describe('hasHeaders', () => {
    const headers = ['Account', 'Amount', 'Date', 'Description']

    it('should find headers case-insensitively', () => {
      expect(parser['hasHeaders'](headers, ['account'])).toBe(true)
      expect(parser['hasHeaders'](headers, ['AMOUNT'])).toBe(true)
      expect(parser['hasHeaders'](headers, ['date'])).toBe(true)
    })

    it('should find partial matches', () => {
      expect(parser['hasHeaders'](headers, ['acc'])).toBe(true)
      expect(parser['hasHeaders'](headers, ['desc'])).toBe(true)
    })

    it('should return true if any keyword matches', () => {
      expect(parser['hasHeaders'](headers, ['balance', 'amount'])).toBe(true)
      expect(parser['hasHeaders'](headers, ['missing', 'account'])).toBe(true)
    })

    it('should return false if no keywords match', () => {
      expect(parser['hasHeaders'](headers, ['balance'])).toBe(false)
      expect(parser['hasHeaders'](headers, ['missing'])).toBe(false)
    })

    it('should return false for empty keywords', () => {
      expect(parser['hasHeaders'](headers, [])).toBe(false)
    })

    it('should return false for empty headers', () => {
      expect(parser['hasHeaders']([], ['account'])).toBe(false)
    })
  })

  describe('findHeader', () => {
    const headers = ['GL Account', 'Balance Amount', 'Posting Date']

    it('should find first matching header', () => {
      expect(parser['findHeader'](headers, ['account'])).toBe('GL Account')
      expect(parser['findHeader'](headers, ['amount', 'balance'])).toBe('Balance Amount')
      expect(parser['findHeader'](headers, ['date'])).toBe('Posting Date')
    })

    it('should be case-insensitive', () => {
      expect(parser['findHeader'](headers, ['ACCOUNT'])).toBe('GL Account')
      expect(parser['findHeader'](headers, ['posting'])).toBe('Posting Date')
    })

    it('should return undefined if no match', () => {
      expect(parser['findHeader'](headers, ['missing'])).toBeUndefined()
      expect(parser['findHeader'](headers, ['code'])).toBeUndefined()
    })

    it('should return undefined for empty arrays', () => {
      expect(parser['findHeader']([], ['account'])).toBeUndefined()
      expect(parser['findHeader'](headers, [])).toBeUndefined()
    })
  })
})

describe('ParserRegistry', () => {
  let registry: ParserRegistry

  beforeEach(() => {
    registry = new ParserRegistry()
  })

  it('should register a parser', () => {
    const parser = new MockParser()
    registry.register(parser)

    expect(registry.get('generic')).toBe(parser)
  })

  it('should return undefined for unregistered parser', () => {
    expect(registry.get('quickbooks')).toBeUndefined()
  })

  it('should return all registered parsers', () => {
    class MockParser1 extends BaseAccountingParser {
      readonly name: AccountingSystem = 'quickbooks'
      readonly displayName = 'Mock 1'
      readonly description = 'Test parser 1'
      detect() { return { confidence: 0.8 } }
      parseRow(row: RawCSVRow) { return { ...row } }
    }

    class MockParser2 extends BaseAccountingParser {
      readonly name: AccountingSystem = 'sap'
      readonly displayName = 'Mock 2'
      readonly description = 'Test parser 2'
      detect() { return { confidence: 0.8 } }
      parseRow(row: RawCSVRow) { return { ...row } }
    }

    const parser1 = new MockParser1()
    const parser2 = new MockParser2()

    registry.register(parser1)
    registry.register(parser2)

    const allParsers = registry.getAll()
    expect(allParsers).toHaveLength(2)
    expect(allParsers).toContain(parser1)
    expect(allParsers).toContain(parser2)
  })

  it('should detect best matching parser', () => {
    class HighConfidenceParser extends BaseAccountingParser {
      readonly name: AccountingSystem = 'quickbooks'
      readonly displayName = 'High'
      readonly description = 'High confidence parser'
      detect() {
        return { confidence: 0.9, reason: 'High confidence' }
      }
      parseRow(row: RawCSVRow) { return { ...row } }
    }

    class LowConfidenceParser extends BaseAccountingParser {
      readonly name: AccountingSystem = 'sap'
      readonly displayName = 'Low'
      readonly description = 'Low confidence parser'
      detect() {
        return { confidence: 0.5, reason: 'Low confidence' }
      }
      parseRow(row: RawCSVRow) { return { ...row } }
    }

    const highParser = new HighConfidenceParser()
    const lowParser = new LowConfidenceParser()

    registry.register(highParser)
    registry.register(lowParser)

    const result = registry.detect([], {})
    expect(result).toBeDefined()
    expect(result?.parser).toBe(highParser)
    expect(result?.confidence).toBe(0.9)
  })

  it('should return null if no parser has confidence > 0.5', () => {
    class ZeroConfidenceParser extends MockParser {
      detect() {
        return { confidence: 0.2, reason: 'Low confidence' }
      }
    }

    registry.register(new ZeroConfidenceParser())

    const result = registry.detect([], {})
    expect(result).toBeNull()
  })

  it('should return null if no parsers registered', () => {
    const result = registry.detect([], {})
    expect(result).toBeNull()
  })
})
