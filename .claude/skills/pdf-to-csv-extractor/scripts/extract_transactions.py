#!/usr/bin/env python3
"""
GL Transactions PDF to CSV Extractor

Extracts transaction journal data from PDF reports and converts to reconciliation CSV format.

Usage:
    python extract_transactions.py --input journal.pdf --output transactions.csv --period 2025-10
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


def extract_from_pdf(pdf_path: str) -> List[Dict]:
    """Extract transaction data from PDF."""
    data = []

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            print(f"Processing page {page_num}/{len(pdf.pages)}...")

            tables = page.extract_tables()

            for table in tables:
                if not table:
                    continue

                headers = table[0] if table else []

                # Common transaction journal formats:
                # Date | Account | Account Name | Debit | Credit | Description
                # Date | Account | Description | Amount | DR/CR

                for row in table[1:]:
                    if not row or len(row) < 3:
                        continue

                    # Skip headers and totals
                    first_col = str(row[0]).strip().upper()
                    if (not first_col or
                        'TOTAL' in first_col or
                        'DATE' in first_col or
                        'PAGE' in first_col or
                        first_col == ''):
                        continue

                    # Extract date (usually first column)
                    booked_at = ''
                    if re.search(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', str(row[0])):
                        booked_at = parse_date(row[0])

                    # Extract account code
                    account_code = ''
                    for i, col in enumerate(row):
                        if col and re.search(r'\d{4,}', str(col)):
                            account_code = str(col).strip()
                            break

                    if not account_code:
                        continue

                    # Extract narrative/description
                    narrative = ''
                    for col in row:
                        if col and len(str(col).strip()) > 10 and not re.match(r'^[\d,\.\(\)\-\s]+$', str(col)):
                            narrative = str(col).strip()
                            break

                    # Extract debit and credit amounts
                    debit = 0.0
                    credit = 0.0
                    amount = 0.0

                    # Look for two amount columns (debit/credit) or single amount with DR/CR indicator
                    amounts = []
                    for col in row:
                        if col and re.search(r'[\d,\.\(\)]', str(col)):
                            amt = clean_amount(col)
                            if amt != 0:
                                amounts.append(amt)

                    # Check for DR/CR indicator
                    row_text = ' '.join([str(col) for col in row if col]).upper()
                    has_dr_indicator = 'DR' in row_text or 'DEBIT' in row_text
                    has_cr_indicator = 'CR' in row_text or 'CREDIT' in row_text

                    if len(amounts) >= 2:
                        # Two amounts: likely debit and credit columns
                        debit = abs(amounts[0])
                        credit = abs(amounts[1])
                        amount = debit - credit
                    elif len(amounts) == 1:
                        # Single amount with DR/CR indicator
                        if has_dr_indicator:
                            debit = abs(amounts[0])
                            amount = debit
                        elif has_cr_indicator:
                            credit = abs(amounts[0])
                            amount = -credit
                        else:
                            # Assume it's a net amount
                            amount = amounts[0]
                            if amount > 0:
                                debit = amount
                            else:
                                credit = abs(amount)

                    data.append({
                        'account_code': account_code,
                        'booked_at': booked_at,
                        'debit': debit,
                        'credit': credit,
                        'amount': amount,
                        'narrative': narrative
                    })

    return data


def create_csv(data: List[Dict], output_path: str, period: str):
    """Create reconciliation-ready transactions CSV."""
    if not data:
        print("ERROR: No data extracted from PDF")
        return False

    df = pd.DataFrame(data)

    # Add source_period field
    df['source_period'] = period

    # Format amounts to 2 decimals
    df['debit'] = df['debit'].apply(lambda x: f"{x:.2f}")
    df['credit'] = df['credit'].apply(lambda x: f"{x:.2f}")
    df['amount'] = df['amount'].apply(lambda x: f"{x:.2f}")

    # Reorder columns to match reconciliation schema
    df = df[[
        'account_code',
        'booked_at',
        'debit',
        'credit',
        'amount',
        'narrative',
        'source_period'
    ]]

    # Write to CSV
    df.to_csv(output_path, index=False)

    print(f"\n✅ Extraction complete!")
    print(f"   Transactions extracted: {len(df)}")
    print(f"   Total debits: ${df['debit'].astype(float).sum():,.2f}")
    print(f"   Total credits: ${df['credit'].astype(float).sum():,.2f}")
    print(f"   Output file: {output_path}")
    print(f"\nPreview of extracted data:")
    print(df.head().to_string(index=False))

    return True


def main():
    parser = argparse.ArgumentParser(
        description='Extract GL transactions from PDF to CSV'
    )
    parser.add_argument('--input', required=True, help='Input PDF file')
    parser.add_argument('--output', required=True, help='Output CSV file')
    parser.add_argument('--period', required=True, help='Period (YYYY-MM)')

    args = parser.parse_args()

    if not Path(args.input).exists():
        print(f"ERROR: Input file not found: {args.input}")
        sys.exit(1)

    if not re.match(r'^\d{4}-\d{2}$', args.period):
        print(f"ERROR: Period must be in YYYY-MM format")
        sys.exit(1)

    print(f"Extracting GL transactions from: {args.input}")
    print(f"Period: {args.period}")
    print()

    data = extract_from_pdf(args.input)

    if not data:
        print("ERROR: No valid data extracted")
        sys.exit(1)

    success = create_csv(data, args.output, args.period)

    if success:
        print(f"\n✓ Ready to upload to reconciliation system")
        print(f"  1. Upload {args.output} as 'Transactions'")
        print(f"  2. Map columns and apply")
        print(f"  3. Use for variance investigation")


if __name__ == '__main__':
    main()
