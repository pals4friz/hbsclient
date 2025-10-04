#!/usr/bin/env python3
import PyPDF2
import sys
import os

def extract_and_display_full_text(pdf_path):
    """Extract and display full text from PDF file"""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text()
            
            print(f"\n🔍 FULL TEXT EXTRACTION FROM: {os.path.basename(pdf_path)}")
            print("=" * 80)
            print(text)
            print("=" * 80)
            
            # Analyze structure
            lines = text.split('\n')
            print(f"\n📊 TEXT ANALYSIS:")
            print(f"   Total characters: {len(text)}")
            print(f"   Total lines: {len(lines)}")
            
            # Find firm name occurrences with context
            firm_name = "HARI BABU SARRAF"
            for i, line in enumerate(lines):
                if firm_name in line:
                    print(f"   Firm name found on line {i+1}: '{line.strip()}'")
            
            return text
            
    except Exception as e:
        print(f"Error extracting text: {str(e)}")
        return None

def main():
    # Check one PDF file for detailed analysis
    pdf_file = "/tmp/firm_name_test_ec44ceca-19b8-4908-9c93-683c0772f293.pdf"
    
    if os.path.exists(pdf_file):
        extract_and_display_full_text(pdf_file)
    else:
        print(f"PDF file not found: {pdf_file}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())