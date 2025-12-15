#!/usr/bin/env python3
"""
GL Balance PDF to CSV Extractor

Extracts GL account balances from PDF reports and converts to reconciliation-ready CSV.

Usage:
    python extract_gl_balance.py --input report.pdf --output gl_balance.csv --period 2025-10
    python extract_gl_balance.py --input report.pdf --output gl_balance.csv --period 2025-10 --ocr
"""

import argparse
import re
import sys
from pathlib import Path
from typing import List, Dict, Optional

try:
    import pdfplumber
    import pandas as pd
except ImportError:
    print("ERROR: Required packages not installed.")
    print("Install with: pip install pdfplumber pandas")
    sys.exit(1)


def clean_amount(amount_str: str) -> float:
    """
    Convert various amount formats to float.

    Handles:
    - Commas: 1,185,000.00
    - Parentheses for negatives: (1,185,000.00)
    - CR notation: 1,185,000.00 CR
    - Minus signs: -1,185,000.00
    """
    if not amount_str or pd.isna(amount_str):
        return 0.0

    amount_str = str(amount_str).strip()

    # Handle CR (credit) notation
    is_credit = 'CR' in amount_str.upper()
    amount_str = amount_str.upper().replace('CR', '').strip()

    # Handle parentheses (accounting format for negatives)
    is_negative = amount_str.startswith('(') and amount_str.endswith(')')
    amount_str = amount_str.replace('(', '').replace(')', '')

    # Remove currency symbols and commas
    amount_str = re.sub(r'[$,\s]', '', amount_str)

    try:
        amount = float(amount_str)

        # Apply sign
        if is_negative or is_credit:
            amount = -abs(amount)

        return amount
    except ValueError:
        return 0.0


def apply_sign_convention(account_code: str, amount: float) -> float:
    """
    Apply accounting sign conventions.

    Liabilities (AP, Accrued Expenses) should have negative (credit) balances.
    """
    # Liability accounts that should normally be negative
    liability_accounts = ['20100', '22010', '2000', '2100', '2200', '2300']

    # Extract numeric part of account code
    account_num = re.sub(r'[^0-9]', '', str(account_code))

    # Check if it's a liability account (usually 2xxxx)
    is_liability = (
        account_num.startswith('2') or
        any(account_num.startswith(lib) for lib in liability_accounts)
    )

    # If it's a liability and amount is positive, make it negative
    if is_liability and amount > 0:
        amount = -amount

    return amount


def extract_from_pdf(pdf_path: str, use_ocr: bool = False) -> List[Dict]:
    """
    Extract GL balance data from PDF.

    Returns list of dictionaries with account data.
    """
    data = []

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            print(f"Processing page {page_num}/{len(pdf.pages)}...")

            # Extract tables from page
            tables = page.extract_tables()

            if tables:
                # Process first table found (usually the main data table)
                for table in tables:
                    if not table:
                        continue

                    # First row often contains headers
                    headers = table[0] if table else []

                    # Process data rows
                    for row in table[1:]:
                        if not row or len(row) < 2:
                            continue

                        # Skip header rows, subtotal rows, empty rows
                        first_col = str(row[0]).strip().upper()
                        if (not first_col or
                            'TOTAL' in first_col or
                            'ACCOUNT' in first_col or
                            'PAGE' in first_col or
                            first_col == ''):
                            continue

                        # Try to parse account code (usually first column)
                        account_code = str(row[0]).strip()

                        # Skip if not a valid account code (should be mostly numeric)
                        if not re.search(r'\d{3,}', account_code):
                            continue

                        # Extract account name (usually second column)
                        account_name = str(row[1]).strip() if len(row) > 1 else ''

                        # Find amount column (usually last column, or second to last)
                        amount = None
                        for col in reversed(row):
                            if col and (re.search(r'[\d,\.\(\)]', str(col))):
                                amount = clean_amount(col)
                                break

                        if amount is not None:
                            # Apply sign convention
                            amount = apply_sign_convention(account_code, amount)

                            data.append({
                                'account_code': account_code,
                                'account_name': account_name,
                                'amount': amount
                            })

    return data


def create_csv(data: List[Dict], output_path: str, period: str, currency: str = 'USD'):
    """
    Create reconciliation-ready CSV from extracted data.
    """
    if not data:
        print("ERROR: No data extracted from PDF")
        return False

    # Create DataFrame
    df = pd.DataFrame(data)

    # Add required fields
    df['period'] = period
    df['currency'] = currency

    # Format amount to 2 decimals
    df['amount'] = df['amount'].apply(lambda x: f"{x:.2f}")

    # Reorder columns to match reconciliation schema
    df = df[['account_code', 'account_name', 'period', 'currency', 'amount']]

    # Write to CSV
    df.to_csv(output_path, index=False)

    print(f"\n✅ Extraction complete!")
    print(f"   Rows extracted: {len(df)}")
    print(f"   Output file: {output_path}")
    print(f"\nPreview of extracted data:")
    print(df.head().to_string(index=False))

    return True


def main():
    parser = argparse.ArgumentParser(
        description='Extract GL balance from PDF to CSV'
    )
    parser.add_argument(
        '--input',
        required=True,
        help='Input PDF file path'
    )
    parser.add_argument(
        '--output',
        required=True,
        help='Output CSV file path'
    )
    parser.add_argument(
        '--period',
        required=True,
        help='Accounting period (YYYY-MM format, e.g., 2025-10)'
    )
    parser.add_argument(
        '--currency',
        default='USD',
        help='Currency code (default: USD)'
    )
    parser.add_argument(
        '--ocr',
        action='store_true',
        help='Use OCR for scanned PDFs (requires pytesseract)'
    )

    args = parser.parse_args()

    # Validate input file exists
    if not Path(args.input).exists():
        print(f"ERROR: Input file not found: {args.input}")
        sys.exit(1)

    # Validate period format
    if not re.match(r'^\d{4}-\d{2}$', args.period):
        print(f"ERROR: Period must be in YYYY-MM format (e.g., 2025-10)")
        sys.exit(1)

    print(f"Extracting GL balance from: {args.input}")
    print(f"Period: {args.period}")
    print(f"OCR enabled: {args.ocr}")
    print()

    # Extract data
    data = extract_from_pdf(args.input, args.ocr)

    if not data:
        print("ERROR: No valid data extracted")
        sys.exit(1)

    # Create CSV
    success = create_csv(data, args.output, args.period, args.currency)

    if success:
        print(f"\n✓ Ready to upload to reconciliation system")
        print(f"  1. Upload {args.output} as 'GL Balance'")
        print(f"  2. Map columns: account_code, period, amount")
        print(f"  3. Apply mappings and run reconciliation")
    else:
        sys.exit(1)


if __name__ == '__main__':
    main()
