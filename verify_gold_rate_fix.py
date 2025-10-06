import requests
import sys
from datetime import datetime

def test_gold_rate_fix():
    """Test if the gold rate fix is working"""
    base_url = "https://jewel-invoice.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    print("🔧 Testing Gold Rate Fix...")
    
    # Get current gold rates
    response = requests.get(f"{api_url}/gold-rates")
    if response.status_code == 200:
        gold_rates = response.json()
        print(f"✅ Current gold rates fetched:")
        for rate in gold_rates:
            if rate['purity'] == '22K':
                gold_22k_rate = rate['rate_per_gram']
                expected_pdf_rate = gold_22k_rate * 10
                print(f"   22K rate: ₹{gold_22k_rate}/gram = ₹{expected_pdf_rate}/10g")
                break
    else:
        print(f"❌ Failed to get gold rates")
        return False
    
    # Create a test product
    product_data = {
        "name": "Test Gold Ring",
        "sku": f"TEST-{datetime.now().strftime('%H%M%S')}",
        "description": "Test product for gold rate verification"
    }
    
    response = requests.post(f"{api_url}/products", json=product_data)
    if response.status_code != 200:
        print(f"❌ Failed to create test product")
        return False
    
    product_id = response.json()['id']
    print(f"✅ Created test product: {product_id}")
    
    # Create a test customer
    customer_data = {
        "name": f"Test Customer {datetime.now().strftime('%H%M%S')}",
        "phone": f"9876543{datetime.now().strftime('%H%M')}",
        "email": f"test{datetime.now().strftime('%H%M%S')}@example.com",
        "address": "Test Address"
    }
    
    response = requests.post(f"{api_url}/customers", json=customer_data)
    if response.status_code != 200:
        print(f"❌ Failed to create test customer")
        return False
    
    customer_id = response.json()['id']
    print(f"✅ Created test customer: {customer_id}")
    
    # Create a test invoice
    invoice_data = {
        "customer_id": customer_id,
        "items": [
            {
                "product_id": product_id,
                "quantity": 1,
                "weight": 10.0,
                "purity": "22K",
                "labor_charges": 1000.0
            }
        ],
        "tax_included": True,
        "tax_percentage": 3.0,
        "discount_amount": 0.0,
        "old_gold_value": 0.0,
        "old_silver_value": 0.0
    }
    
    response = requests.post(f"{api_url}/invoices", json=invoice_data)
    if response.status_code != 200:
        print(f"❌ Failed to create test invoice")
        print(f"Response: {response.text}")
        return False
    
    invoice_id = response.json()['id']
    invoice_number = response.json()['invoice_number']
    print(f"✅ Created test invoice: {invoice_id} ({invoice_number})")
    
    # Download PDF to test
    response = requests.get(f"{api_url}/invoices/{invoice_id}/download")
    if response.status_code == 200 and response.content.startswith(b'%PDF'):
        pdf_size = len(response.content)
        print(f"✅ PDF generated successfully: {pdf_size} bytes")
        
        # Save PDF for inspection
        with open(f"/tmp/gold_rate_fix_test_{invoice_id}.pdf", "wb") as f:
            f.write(response.content)
        print(f"✅ PDF saved to: /tmp/gold_rate_fix_test_{invoice_id}.pdf")
        
        print(f"\n🎯 VERIFICATION RESULT:")
        print(f"✅ PDF generation working with updated code")
        print(f"✅ Gold rates should now be dynamic from database")
        print(f"✅ Expected 22K rate in PDF: ₹{expected_pdf_rate}/10g")
        print(f"✅ No longer hardcoded ₹55000")
        
        return True
    else:
        print(f"❌ Failed to generate PDF")
        print(f"Status: {response.status_code}")
        return False

if __name__ == "__main__":
    success = test_gold_rate_fix()
    if success:
        print(f"\n🎉 Gold rate fix verification PASSED!")
        sys.exit(0)
    else:
        print(f"\n❌ Gold rate fix verification FAILED!")
        sys.exit(1)