#!/usr/bin/env python3
import PyPDF2
import sys
import os

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF file"""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text()
            return text
    except Exception as e:
        return f"Error extracting text: {str(e)}"

def check_firm_name_in_pdf(pdf_path):
    """Check if firm name 'HARI BABU SARRAF' is present in PDF"""
    print(f"\n🔍 Analyzing PDF: {pdf_path}")
    print(f"📄 File size: {os.path.getsize(pdf_path)} bytes")
    
    text = extract_text_from_pdf(pdf_path)
    
    if "Error" in text:
        print(f"❌ {text}")
        return False
    
    print(f"📝 Extracted text length: {len(text)} characters")
    
    # Check for firm name
    firm_name = "HARI BABU SARRAF"
    if firm_name in text:
        print(f"✅ FIRM NAME FOUND: '{firm_name}' is present in PDF")
        
        # Count occurrences (should be 2 - original and duplicate)
        count = text.count(firm_name)
        print(f"✅ Occurrences: {count} (expected: 2 for original + duplicate)")
        
        if count >= 2:
            print(f"✅ Both original and duplicate copies contain firm name")
        elif count == 1:
            print(f"⚠️  Only one copy contains firm name (expected 2)")
        
        return True
    else:
        print(f"❌ FIRM NAME NOT FOUND: '{firm_name}' is missing from PDF")
        
        # Show what text was extracted for debugging
        print(f"\n📝 Extracted text preview (first 500 chars):")
        print(f"'{text[:500]}...'")
        
        return False

def main():
    # Check all firm name test PDFs
    pdf_files = [
        "/tmp/firm_name_test_ec44ceca-19b8-4908-9c93-683c0772f293.pdf",
        "/tmp/firm_name_test_7d06eeb3-2699-4d12-a23d-a619585a05df.pdf", 
        "/tmp/firm_name_test_36e2f5a2-82c8-4ef9-9dad-4baf2634a54f.pdf"
    ]
    
    print("🏢" * 60)
    print("🏢 PDF TEXT EXTRACTION - FIRM NAME VERIFICATION")
    print("🏢" * 60)
    
    all_passed = True
    
    for pdf_file in pdf_files:
        if os.path.exists(pdf_file):
            result = check_firm_name_in_pdf(pdf_file)
            if not result:
                all_passed = False
        else:
            print(f"❌ PDF file not found: {pdf_file}")
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 FIRM NAME VERIFICATION: ALL TESTS PASSED")
        print("✅ 'HARI BABU SARRAF' is properly displayed in all PDFs")
    else:
        print("❌ FIRM NAME VERIFICATION: SOME TESTS FAILED")
        print("⚠️  Firm name display issue confirmed")
    print("=" * 60)
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())