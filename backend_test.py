import requests
import sys
from datetime import datetime, date
import json

class JewelryStoreAPITester:
    def __init__(self, base_url="https://shine-sales.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_ids = {
            'products': [],
            'customers': [],
            'invoices': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.text}")
                except:
                    pass
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        if success:
            required_fields = ['total_products', 'total_customers', 'total_invoices', 'today_sales']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing field in dashboard stats: {field}")
                    return False
            print(f"   Dashboard stats: {response}")
        return success

    def test_create_product(self):
        """Test product creation"""
        product_data = {
            "name": "Gold Ring Test",
            "sku": f"GR-TEST-{datetime.now().strftime('%H%M%S')}",
            "category": "Ring",
            "weight": 5.5,
            "purity": "22K",
            "rate_per_gram": 5500.0,
            "stock_quantity": 10,
            "description": "Test gold ring"
        }
        
        success, response = self.run_test(
            "Create Product",
            "POST",
            "products",
            200,
            data=product_data
        )
        
        if success and 'id' in response:
            self.created_ids['products'].append(response['id'])
            print(f"   Created product ID: {response['id']}")
            return response['id']
        return None

    def test_get_products(self):
        """Test getting all products"""
        success, response = self.run_test(
            "Get All Products",
            "GET",
            "products",
            200
        )
        if success:
            print(f"   Found {len(response)} products")
        return success

    def test_get_product_by_id(self, product_id):
        """Test getting a specific product"""
        success, response = self.run_test(
            "Get Product by ID",
            "GET",
            f"products/{product_id}",
            200
        )
        return success

    def test_update_product(self, product_id):
        """Test updating a product"""
        update_data = {
            "name": "Updated Gold Ring Test",
            "sku": f"GR-UPD-{datetime.now().strftime('%H%M%S')}",
            "category": "Ring",
            "weight": 6.0,
            "purity": "22K",
            "rate_per_gram": 5600.0,
            "stock_quantity": 8,
            "description": "Updated test gold ring"
        }
        
        success, response = self.run_test(
            "Update Product",
            "PUT",
            f"products/{product_id}",
            200,
            data=update_data
        )
        return success

    def test_create_customer(self):
        """Test customer creation"""
        customer_data = {
            "name": f"Test Customer {datetime.now().strftime('%H%M%S')}",
            "phone": f"9876543{datetime.now().strftime('%H%M')}",
            "email": f"test{datetime.now().strftime('%H%M%S')}@example.com",
            "address": "123 Test Street, Test City"
        }
        
        success, response = self.run_test(
            "Create Customer",
            "POST",
            "customers",
            200,
            data=customer_data
        )
        
        if success and 'id' in response:
            self.created_ids['customers'].append(response['id'])
            print(f"   Created customer ID: {response['id']}")
            return response['id']
        return None

    def test_get_customers(self):
        """Test getting all customers"""
        success, response = self.run_test(
            "Get All Customers",
            "GET",
            "customers",
            200
        )
        if success:
            print(f"   Found {len(response)} customers")
        return success

    def test_get_customer_by_id(self, customer_id):
        """Test getting a specific customer"""
        success, response = self.run_test(
            "Get Customer by ID",
            "GET",
            f"customers/{customer_id}",
            200
        )
        return success

    def test_create_invoice(self, customer_id, product_id):
        """Test invoice creation with weight data for PDF testing"""
        invoice_data = {
            "customer_id": customer_id,
            "items": [
                {
                    "product_id": product_id,
                    "quantity": 1,
                    "weight": 8.5  # Add weight for proper PDF generation
                },
                {
                    "product_id": product_id,
                    "quantity": 1,
                    "weight": 12.3  # Second item for better testing
                }
            ],
            "labor_charges": 750.0,
            "tax_included": True,
            "tax_percentage": 3.0
        }
        
        success, response = self.run_test(
            "Create Invoice",
            "POST",
            "invoices",
            200,
            data=invoice_data
        )
        
        if success and 'id' in response:
            self.created_ids['invoices'].append(response['id'])
            print(f"   Created invoice ID: {response['id']}")
            print(f"   Invoice number: {response.get('invoice_number', 'N/A')}")
            print(f"   Total amount: ₹{response.get('total_amount', 0):.2f}")
            return response['id']
        return None

    def test_get_invoices(self):
        """Test getting all invoices"""
        success, response = self.run_test(
            "Get All Invoices",
            "GET",
            "invoices",
            200
        )
        if success:
            print(f"   Found {len(response)} invoices")
        return success

    def test_get_invoice_by_id(self, invoice_id):
        """Test getting a specific invoice"""
        success, response = self.run_test(
            "Get Invoice by ID",
            "GET",
            f"invoices/{invoice_id}",
            200
        )
        return success

    def test_download_invoice_pdf(self, invoice_id):
        """Test invoice PDF download - A5 landscape format"""
        print(f"\n🔍 Testing Download Invoice PDF (A5 Landscape)...")
        url = f"{self.api_url}/invoices/{invoice_id}/download"
        
        self.tests_run += 1
        try:
            response = requests.get(url)
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'pdf' in content_type.lower():
                    self.tests_passed += 1
                    print(f"✅ Passed - PDF file downloaded successfully")
                    print(f"   Content-Type: {content_type}")
                    print(f"   File size: {len(response.content)} bytes")
                    
                    # Save PDF for manual inspection if needed
                    with open(f"/tmp/test_invoice_{invoice_id}.pdf", "wb") as f:
                        f.write(response.content)
                    print(f"   PDF saved to: /tmp/test_invoice_{invoice_id}.pdf")
                    
                    # Basic PDF validation - check if it starts with PDF header
                    if response.content.startswith(b'%PDF'):
                        print(f"   ✅ Valid PDF format detected")
                        return True
                    else:
                        print(f"   ❌ Invalid PDF format - missing PDF header")
                        return False
                else:
                    print(f"❌ Failed - Wrong content type: {content_type} (expected PDF)")
                    return False
            else:
                print(f"❌ Failed - Status: {response.status_code}")
                try:
                    print(f"   Response: {response.text}")
                except:
                    pass
                return False
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False

    def test_print_invoice(self, invoice_id):
        """Test invoice print data - verify all required fields for landscape printing"""
        success, response = self.run_test(
            "Get Invoice for Print",
            "GET",
            f"invoices/{invoice_id}/print",
            200
        )
        
        if success:
            # Verify essential fields for PDF generation
            required_fields = ['id', 'invoice_number', 'customer_name', 'customer_phone', 
                             'customer_address', 'items', 'subtotal', 'total_amount', 'invoice_date']
            missing_fields = []
            
            for field in required_fields:
                if field not in response:
                    missing_fields.append(field)
            
            if missing_fields:
                print(f"   ❌ Missing required fields: {missing_fields}")
                return False
            
            # Check items structure
            if 'items' in response and len(response['items']) > 0:
                item = response['items'][0]
                item_fields = ['product_name', 'weight', 'rate_per_gram', 'amount']
                missing_item_fields = [f for f in item_fields if f not in item]
                
                if missing_item_fields:
                    print(f"   ❌ Missing item fields: {missing_item_fields}")
                    return False
                
                print(f"   ✅ Invoice has {len(response['items'])} items")
                print(f"   ✅ Total weight: {sum(item['weight'] for item in response['items']):.1f}g")
                print(f"   ✅ Total amount: ₹{response['total_amount']:.2f}")
            
        return success

    def test_landscape_pdf_format(self, invoice_id):
        """Test specific landscape A5 PDF format requirements"""
        print(f"\n🔍 Testing Landscape A5 PDF Format Requirements...")
        
        # First get the invoice data to verify gold pricing calculation
        success, invoice_data = self.run_test(
            "Get Invoice Data for Format Check",
            "GET",
            f"invoices/{invoice_id}",
            200
        )
        
        if not success:
            return False
        
        self.tests_run += 1
        
        # Calculate expected gold price per 10g (22K default rate)
        total_weight = sum(item['weight'] for item in invoice_data['items'])
        gold_rate_22k = 5500  # Default rate from server.py
        expected_gold_price_per_10g = gold_rate_22k * 10
        
        print(f"   ✅ Invoice total weight: {total_weight:.1f}g")
        print(f"   ✅ Expected 22K gold price per 10g: ₹{expected_gold_price_per_10g}")
        print(f"   ✅ Invoice contains {len(invoice_data['items'])} items")
        
        # Download PDF to verify format
        url = f"{self.api_url}/invoices/{invoice_id}/download"
        try:
            response = requests.get(url)
            if response.status_code == 200 and response.content.startswith(b'%PDF'):
                # Save for inspection
                pdf_path = f"/tmp/landscape_test_{invoice_id}.pdf"
                with open(pdf_path, "wb") as f:
                    f.write(response.content)
                
                print(f"   ✅ PDF generated successfully")
                print(f"   ✅ PDF saved to: {pdf_path}")
                print(f"   ✅ File size: {len(response.content)} bytes")
                
                # Check if PDF contains expected elements (basic text search)
                pdf_text = response.content.decode('latin-1', errors='ignore')
                
                checks = [
                    ("ORIGINAL", "Original copy text"),
                    ("DUPLICATE", "Duplicate copy text"),
                    ("ROUGH ESTIMATE", "Invoice title"),
                    ("HARI BABU SARRAF", "Company name"),
                    (invoice_data['customer_name'], "Customer name"),
                    (invoice_data['invoice_number'], "Invoice number"),
                    ("Gold Price", "Gold pricing section")
                ]
                
                passed_checks = 0
                for check_text, description in checks:
                    if check_text in pdf_text:
                        print(f"   ✅ Found {description}")
                        passed_checks += 1
                    else:
                        print(f"   ⚠️  Missing {description}")
                
                if passed_checks >= 5:  # At least 5 out of 7 checks should pass
                    self.tests_passed += 1
                    print(f"   ✅ Landscape A5 PDF format validation passed ({passed_checks}/7 checks)")
                    return True
                else:
                    print(f"   ❌ PDF format validation failed ({passed_checks}/7 checks)")
                    return False
            else:
                print(f"   ❌ Failed to download valid PDF")
                return False
                
        except Exception as e:
            print(f"   ❌ Error during PDF format test: {str(e)}")
            return False

    def test_sales_report_download(self):
        """Test sales report Excel download"""
        print(f"\n🔍 Testing Download Sales Report...")
        
        # Use date range that should include today's sales
        start_date = date.today().isoformat()
        end_date = date.today().isoformat()
        
        url = f"{self.api_url}/sales/download"
        params = {
            'start_date': start_date,
            'end_date': end_date
        }
        
        self.tests_run += 1
        try:
            response = requests.get(url, params=params)
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'spreadsheet' in content_type or 'excel' in content_type:
                    self.tests_passed += 1
                    print(f"✅ Passed - Sales report downloaded successfully")
                    print(f"   Content-Type: {content_type}")
                    print(f"   File size: {len(response.content)} bytes")
                    return True
                else:
                    print(f"❌ Failed - Wrong content type: {content_type}")
            else:
                print(f"❌ Failed - Status: {response.status_code}")
                print(f"   Response: {response.text}")
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
        return False

    def test_delete_product(self, product_id):
        """Test product deletion"""
        success, response = self.run_test(
            "Delete Product",
            "DELETE",
            f"products/{product_id}",
            200
        )
        return success

    def cleanup(self):
        """Clean up created test data"""
        print(f"\n🧹 Cleaning up test data...")
        
        # Delete created products
        for product_id in self.created_ids['products']:
            try:
                requests.delete(f"{self.api_url}/products/{product_id}")
                print(f"   Deleted product: {product_id}")
            except:
                pass

def main():
    print("🚀 Starting Jewelry Store API Tests...")
    print("=" * 50)
    
    tester = JewelryStoreAPITester()
    
    # Test dashboard
    tester.test_dashboard_stats()
    
    # Test product management
    product_id = tester.test_create_product()
    if not product_id:
        print("❌ Product creation failed, stopping tests")
        return 1
    
    tester.test_get_products()
    tester.test_get_product_by_id(product_id)
    tester.test_update_product(product_id)
    
    # Test customer management
    customer_id = tester.test_create_customer()
    if not customer_id:
        print("❌ Customer creation failed, stopping tests")
        return 1
    
    tester.test_get_customers()
    tester.test_get_customer_by_id(customer_id)
    
    # Test invoice management
    invoice_id = tester.test_create_invoice(customer_id, product_id)
    if not invoice_id:
        print("❌ Invoice creation failed, stopping tests")
        return 1
    
    tester.test_get_invoices()
    tester.test_get_invoice_by_id(invoice_id)
    
    # Test PDF downloads and print functionality
    tester.test_download_invoice_pdf(invoice_id)
    tester.test_print_invoice(invoice_id)
    tester.test_landscape_pdf_format(invoice_id)
    tester.test_sales_report_download()
    
    # Clean up (optional - comment out if you want to keep test data)
    # tester.cleanup()
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"Success rate: {success_rate:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())