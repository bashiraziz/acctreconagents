#!/usr/bin/env python3
"""
AP Aging PDF to CSV Extractor

Extracts accounts payable aging data from PDF reports and converts to subledger CSV format.

Usage:
    python extract_ap_aging.py --input ap_aging.pdf --output subledger.csv --period 2025-10
"""

import argparse
import re
import sys
from pathlib import Path
from typing import List, Dict
from datetime import datetime

try:
    import pdfplumber
    import pandas as pd
except ImportError:
    print("ERROR: Required packages not installed.")
    print("Install with: pip install pdfplumber pandas")
    sys.exit(1)


def clean_amount(amount_str: str) -> float:
    """Convert amount string to float."""
    if not amount_str or pd.isna(amount_str) or str(amount_str).strip() in ['-', '']:
        return 0.0

    amount_str = str(amount_str).strip()

    # Handle parentheses (negative)
    is_negative = amount_str.startswith('(') and amount_str.endswith(')')
    amount_str = amount_str.replace('(', '').replace(')', '')

    # Remove currency symbols and commas
    amount_str = re.sub(r'[$,\s]', '', amount_str)

    try:
        amount = float(amount_str)
        if is_negative:
            amount = -abs(amount)
        return amount
    except ValueError:
        return 0.0


def parse_date(date_str: str) -> str:
    """
    Parse various date formats to YYYY-MM-DD.

    Handles:
    - 10/15/2025
    - 2025-10-15
    - Oct 15, 2025
    - 15-Oct-2025
    """
    if not date_str or pd.isna(date_str):
        return ''

    date_str = str(date_str).strip()

    # Try common formats
    formats = [
        '%m/%d/%Y',
        '%Y-%m-%d',
        '%m-%d-%Y',
        '%d/%m/%Y',
        '%b %d, %Y',
        '%d-%b-%Y',
        '%B %d, %Y',
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.strftime('%Y-%m-%d')
        except ValueError:
            continue

    return date_str  # Return as-is if no format matches


def determine_aging_bucket(current: float, days_30: float, days_60: float, days_90: float) -> str:
    """Determine which aging bucket has the amount."""
    if current > 0:
        return 'Current'
    elif days_30 > 0:
        return '30 Days'
    elif days_60 > 0:
        return '60 Days'
    elif days_90 > 0:
        return '90+ Days'
    else:
        return 'Current'


def extract_from_pdf(pdf_path: str) -> List[Dict]:
    """Extract AP aging data from PDF."""
    data = []

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            print(f"Processing page {page_num}/{len(pdf.pages)}...")

            tables = page.extract_tables()

            for table in tables:
                if not table:
                    continue

                headers = table[0] if table else []

                # Try to identify column positions
                # Common formats:
                # Vendor | Invoice# | Date | Due Date | Current | 30 Days | 60 Days | 90+ Days
                # Vendor | Invoice# | Date | Amount | Status

                for row in table[1:]:
                    if not row or len(row) < 3:
                        continue

                    # Skip headers and totals
                    first_col = str(row[0]).strip().upper()
                    if (not first_col or
                        'TOTAL' in first_col or
                        'VENDOR' in first_col or
                        'PAGE' in first_col or
                        first_col == ''):
                        continue

                    # Extract vendor (usually first column)
                    vendor = str(row[0]).strip()

                    # Extract invoice number (usually second column)
                    invoice_number = str(row[1]).strip() if len(row) > 1 else ''

                    # Try to find date columns
                    invoice_date = ''
                    due_date = ''
                    for i, col in enumerate(row[2:], start=2):
                        if col and re.search(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', str(col)):
                            if not invoice_date:
                                invoice_date = parse_date(col)
                            elif not due_date:
                                due_date = parse_date(col)
                                break

                    # Extract amounts
                    # Look for aging buckets or single amount
                    amounts = []
                    for col in row:
                        if col and re.search(r'[\d,\.\(\)]', str(col)):
                            amount = clean_amount(col)
                            if amount != 0:
                                amounts.append(amount)

                    # Get total amount (last or sum of aging buckets)
                    if amounts:
                        # If multiple amounts, assume aging buckets
                        if len(amounts) >= 4:
                            # Current, 30, 60, 90+
                            current = abs(amounts[0])
                            days_30 = abs(amounts[1])
                            days_60 = abs(amounts[2])
                            days_90 = abs(amounts[3])
                            total_amount = sum([current, days_30, days_60, days_90])
                            aging_bucket = determine_aging_bucket(current, days_30, days_60, days_90)
                        else:
                            # Single amount
                            total_amount = abs(amounts[-1])
                            aging_bucket = 'Current'

                        # Make negative (liability)
                        total_amount = -abs(total_amount)

                        data.append({
                            'vendor': vendor,
                            'invoice_number': invoice_number,
                            'invoice_date': invoice_date,
                            'due_date': due_date,
                            'aging_bucket': aging_bucket,
                            'amount': total_amount
                        })

    return data


def create_csv(data: List[Dict], output_path: str, period: str, account_code: str = '20100', currency: str = 'USD'):
    """Create reconciliation-ready subledger CSV."""
    if not data:
        print("ERROR: No data extracted from PDF")
        return False

    df = pd.DataFrame(data)

    # Add required fields
    df['account_code'] = account_code
    df['period'] = period
    df['currency'] = currency

    # Format amount to 2 decimals
    df['amount'] = df['amount'].apply(lambda x: f"{x:.2f}")

    # Reorder columns to match reconciliation schema
    df = df[[
        'vendor',
        'invoice_number',
        'invoice_date',
        'due_date',
        'aging_bucket',
        'currency',
        'amount',
        'account_code',
        'period'
    ]]

    # Write to CSV
    df.to_csv(output_path, index=False)

    print(f"\n✅ Extraction complete!")
    print(f"   Invoices extracted: {len(df)}")
    print(f"   Total amount: ${df['amount'].astype(float).sum():,.2f}")
    print(f"   Output file: {output_path}")
    print(f"\nPreview of extracted data:")
    print(df.head().to_string(index=False))

    return True


def main():
    parser = argparse.ArgumentParser(
        description='Extract AP aging from PDF to CSV'
    )
    parser.add_argument('--input', required=True, help='Input PDF file')
    parser.add_argument('--output', required=True, help='Output CSV file')
    parser.add_argument('--period', required=True, help='Period (YYYY-MM)')
    parser.add_argument('--account', default='20100', help='Account code (default: 20100)')
    parser.add_argument('--currency', default='USD', help='Currency (default: USD)')

    args = parser.parse_args()

    if not Path(args.input).exists():
        print(f"ERROR: Input file not found: {args.input}")
        sys.exit(1)

    if not re.match(r'^\d{4}-\d{2}$', args.period):
        print(f"ERROR: Period must be in YYYY-MM format")
        sys.exit(1)

    print(f"Extracting AP aging from: {args.input}")
    print(f"Period: {args.period}")
    print()

    data = extract_from_pdf(args.input)

    if not data:
        print("ERROR: No valid data extracted")
        sys.exit(1)

    success = create_csv(data, args.output, args.period, args.account, args.currency)

    if success:
        print(f"\n✓ Ready to upload to reconciliation system")
        print(f"  1. Upload {args.output} as 'Subledger Balance'")
        print(f"  2. Map columns and apply")
        print(f"  3. Run reconciliation")


if __name__ == '__main__':
    main()
