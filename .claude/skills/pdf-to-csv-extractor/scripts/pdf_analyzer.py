#!/usr/bin/env python3
"""
PDF Analyzer - Preview and analyze PDF structure before extraction

Helps identify PDF type, table structure, and data quality before extraction.

Usage:
    python pdf_analyzer.py --input report.pdf
    python pdf_analyzer.py --input report.pdf --page 1
"""

import argparse
import sys
from pathlib import Path
from typing import List, Dict

try:
    import pdfplumber
    import pandas as pd
except ImportError:
    print("ERROR: Required packages not installed.")
    print("Install with: pip install pdfplumber pandas")
    sys.exit(1)


def detect_report_type(text: str, tables: List) -> str:
    """
    Detect the type of financial report based on content.
    """
    text_upper = text.upper()

    # Check for specific report types
    if 'AGING' in text_upper and ('PAYABLE' in text_upper or 'A/P' in text_upper):
        return 'AP Aging Report'
    elif 'TRIAL BALANCE' in text_upper:
        return 'Trial Balance'
    elif 'GENERAL LEDGER' in text_upper or 'G/L' in text_upper:
        if 'TRANSACTION' in text_upper or 'JOURNAL' in text_upper:
            return 'GL Transaction Journal'
        else:
            return 'GL Balance Report'
    elif 'BALANCE SHEET' in text_upper:
        return 'Balance Sheet'
    elif 'INCOME STATEMENT' in text_upper or 'P&L' in text_upper:
        return 'Income Statement'
    elif 'SUBLEDGER' in text_upper:
        return 'Subledger Detail Report'
    else:
        # Try to infer from table structure
        if tables:
            first_table = tables[0]
            if first_table and len(first_table) > 0:
                header = ' '.join([str(cell).upper() for cell in first_table[0] if cell])
                if 'VENDOR' in header and 'INVOICE' in header:
                    return 'AP Aging or Subledger Report'
                elif 'ACCOUNT' in header and ('DEBIT' in header or 'CREDIT' in header):
                    return 'GL Transaction or Trial Balance'
                elif 'ACCOUNT' in header and 'BALANCE' in header:
                    return 'GL Balance Report'

    return 'Unknown Report Type'


def analyze_table_structure(table) -> Dict:
    """
    Analyze table structure and return insights.
    """
    if not table or len(table) == 0:
        return {'valid': False}

    headers = table[0] if table else []
    data_rows = table[1:] if len(table) > 1 else []

    # Count valid data rows
    valid_rows = 0
    for row in data_rows:
        if row and any(cell for cell in row if cell):
            valid_rows += 1

    return {
        'valid': True,
        'columns': len(headers),
        'headers': [str(h).strip() if h else '' for h in headers],
        'data_rows': valid_rows,
        'total_rows': len(table)
    }


def check_text_extractability(page) -> Dict:
    """
    Check if PDF has extractable text or if OCR is needed.
    """
    text = page.extract_text()
    chars = page.chars

    has_text = bool(text and text.strip())
    has_chars = bool(chars and len(chars) > 0)

    return {
        'has_extractable_text': has_text,
        'has_characters': has_chars,
        'needs_ocr': not has_text,
        'character_count': len(chars) if chars else 0
    }


def preview_data(table, max_rows: int = 5):
    """
    Show preview of extracted table data.
    """
    if not table or len(table) == 0:
        print("  No data to preview")
        return

    # Create DataFrame for nice display
    try:
        df = pd.DataFrame(table[1:], columns=table[0])
        print(f"\n  Preview (first {max_rows} rows):")
        print("  " + df.head(max_rows).to_string(index=False).replace('\n', '\n  '))
    except Exception as e:
        print(f"  Could not create preview: {e}")
        print(f"  Raw table has {len(table)} rows")


def analyze_pdf(pdf_path: str, page_num: int = None):
    """
    Analyze PDF and provide detailed report.
    """
    print(f"\n{'='*70}")
    print(f"PDF ANALYSIS REPORT")
    print(f"{'='*70}")
    print(f"\nFile: {pdf_path}")

    with pdfplumber.open(pdf_path) as pdf:
        print(f"Total pages: {len(pdf.pages)}")

        # Analyze specific page or all pages
        pages_to_analyze = [pdf.pages[page_num - 1]] if page_num else pdf.pages

        for idx, page in enumerate(pages_to_analyze, start=1):
            actual_page_num = page_num if page_num else idx

            print(f"\n{'-'*70}")
            print(f"PAGE {actual_page_num}")
            print(f"{'-'*70}")

            # Check text extractability
            text_info = check_text_extractability(page)
            print(f"\n📄 Text Extraction:")
            print(f"  Extractable text: {'✅ Yes' if text_info['has_extractable_text'] else '❌ No (OCR needed)'}")
            print(f"  Character count: {text_info['character_count']}")

            # Extract full text
            text = page.extract_text()
            if text:
                # Detect report type
                tables = page.extract_tables()
                report_type = detect_report_type(text, tables)
                print(f"\n📊 Report Type: {report_type}")

                # Show text preview
                text_preview = text[:500].strip()
                print(f"\n📝 Text Preview:")
                print(f"  {text_preview[:200]}...")

            # Analyze tables
            tables = page.extract_tables()
            print(f"\n📋 Tables Found: {len(tables)}")

            for table_idx, table in enumerate(tables, 1):
                print(f"\n  Table {table_idx}:")
                structure = analyze_table_structure(table)

                if structure['valid']:
                    print(f"    Columns: {structure['columns']}")
                    print(f"    Headers: {', '.join(structure['headers'][:5])}{'...' if len(structure['headers']) > 5 else ''}")
                    print(f"    Data rows: {structure['data_rows']}")

                    # Preview data
                    preview_data(table, max_rows=3)
                else:
                    print(f"    Invalid or empty table")

        # Recommendations
        print(f"\n{'-'*70}")
        print(f"RECOMMENDATIONS")
        print(f"{'-'*70}")

        if not text_info['has_extractable_text']:
            print("\n⚠️  This PDF appears to be scanned or image-based.")
            print("   Recommendation: Use --ocr flag with extraction scripts")
            print("   Requires: pytesseract and Tesseract OCR engine")
        else:
            print("\n✅ This PDF has extractable text.")
            print("   Recommendation: Use standard extraction (pdfplumber)")

        if 'AP Aging' in report_type:
            print(f"\n📌 For {report_type}:")
            print("   Use: extract_ap_aging.py")
            print("   Output: subledger_balance.csv")
        elif 'GL Balance' in report_type:
            print(f"\n📌 For {report_type}:")
            print("   Use: extract_gl_balance.py")
            print("   Output: gl_balance.csv")
        elif 'Transaction' in report_type or 'Journal' in report_type:
            print(f"\n📌 For {report_type}:")
            print("   Use: extract_transactions.py")
            print("   Output: transactions.csv")

        print(f"\n{'='*70}\n")


def main():
    parser = argparse.ArgumentParser(
        description='Analyze PDF structure and detect report type'
    )
    parser.add_argument(
        '--input',
        required=True,
        help='Input PDF file path'
    )
    parser.add_argument(
        '--page',
        type=int,
        help='Analyze specific page only (default: all pages)'
    )

    args = parser.parse_args()

    if not Path(args.input).exists():
        print(f"ERROR: Input file not found: {args.input}")
        sys.exit(1)

    analyze_pdf(args.input, args.page)


if __name__ == '__main__':
    main()
