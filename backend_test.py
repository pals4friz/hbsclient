#!/usr/bin/env python3
"""
Backend API Testing for HBS Client App - Making Charges Configuration
Testing the Making Charges Configuration API endpoints
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# API Configuration
API_BASE_URL = "https://hbs-client-app.preview.emergentagent.com/api"

class MakingChargesAPITester:
    def __init__(self):
        self.base_url = API_BASE_URL
        self.admin_token = None
        self.test_results = []
        self.created_charge_ids = []
        
    def log_test(self, test_name: str, success: bool, message: str, details: Any = None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "details": details
        }
        self.test_results.append(result)
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None, params: Dict = None) -> tuple:
        """Make HTTP request and return response and success status"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return None, False, f"Unsupported method: {method}"
            
            return response, True, None
        except requests.exceptions.RequestException as e:
            return None, False, str(e)
    
    def test_admin_login(self):
        """Test 1: Admin Authentication"""
        print("\n=== Test 1: Admin Authentication ===")
        
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        
        response, success, error = self.make_request("POST", "/auth/login", data=login_data)
        
        if not success:
            self.log_test("Admin Login", False, f"Request failed: {error}")
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                if "token" in data:
                    self.admin_token = data["token"]
                    self.log_test("Admin Login", True, f"Successfully logged in as admin, token received")
                    return True
                else:
                    self.log_test("Admin Login", False, "No token in response", data)
                    return False
            except json.JSONDecodeError:
                self.log_test("Admin Login", False, "Invalid JSON response", response.text)
                return False
        else:
            self.log_test("Admin Login", False, f"Login failed with status {response.status_code}", response.text)
            return False
    
    def test_create_making_charge_per_gram(self):
        """Test 2: Create Making Charge Rule (per_gram)"""
        print("\n=== Test 2: Create Making Charge Rule (per_gram) ===")
        
        if not self.admin_token:
            self.log_test("Create Making Charge (per_gram)", False, "No admin token available")
            return None
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        charge_data = {
            "purity": "22K",
            "charge_type": "per_gram",
            "charge_amount": 100,
            "min_weight": 0,
            "max_weight": 5,
            "description": "Light weight items"
        }
        
        response, success, error = self.make_request("POST", "/making-charges", data=charge_data, headers=headers)
        
        if not success:
            self.log_test("Create Making Charge (per_gram)", False, f"Request failed: {error}")
            return None
        
        if response.status_code == 200:
            try:
                data = response.json()
                if "id" in data:
                    charge_id = data["id"]
                    self.created_charge_ids.append(charge_id)
                    self.log_test("Create Making Charge (per_gram)", True, f"Successfully created per_gram charge rule, ID: {charge_id}")
                    return charge_id
                else:
                    self.log_test("Create Making Charge (per_gram)", False, "No ID in response", data)
                    return None
            except json.JSONDecodeError:
                self.log_test("Create Making Charge (per_gram)", False, "Invalid JSON response", response.text)
                return None
        else:
            self.log_test("Create Making Charge (per_gram)", False, f"Creation failed with status {response.status_code}", response.text)
            return None
    
    def test_create_making_charge_per_piece(self):
        """Test 3: Create Another Making Charge Rule (per_piece)"""
        print("\n=== Test 3: Create Making Charge Rule (per_piece) ===")
        
        if not self.admin_token:
            self.log_test("Create Making Charge (per_piece)", False, "No admin token available")
            return None
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        charge_data = {
            "purity": "22K",
            "charge_type": "per_piece",
            "charge_amount": 500,
            "min_weight": 5.01,
            "max_weight": 999,
            "description": "Heavy items - fixed charge"
        }
        
        response, success, error = self.make_request("POST", "/making-charges", data=charge_data, headers=headers)
        
        if not success:
            self.log_test("Create Making Charge (per_piece)", False, f"Request failed: {error}")
            return None
        
        if response.status_code == 200:
            try:
                data = response.json()
                if "id" in data:
                    charge_id = data["id"]
                    self.created_charge_ids.append(charge_id)
                    self.log_test("Create Making Charge (per_piece)", True, f"Successfully created per_piece charge rule, ID: {charge_id}")
                    return charge_id
                else:
                    self.log_test("Create Making Charge (per_piece)", False, "No ID in response", data)
                    return None
            except json.JSONDecodeError:
                self.log_test("Create Making Charge (per_piece)", False, "Invalid JSON response", response.text)
                return None
        else:
            self.log_test("Create Making Charge (per_piece)", False, f"Creation failed with status {response.status_code}", response.text)
            return None
    
    def test_get_all_making_charges(self):
        """Test 4: Get All Making Charges (no auth required)"""
        print("\n=== Test 4: Get All Making Charges ===")
        
        response, success, error = self.make_request("GET", "/making-charges")
        
        if not success:
            self.log_test("Get All Making Charges", False, f"Request failed: {error}")
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    charge_count = len(data)
                    # Check if our created charges are in the list
                    found_charges = 0
                    for charge in data:
                        if charge.get("id") in self.created_charge_ids:
                            found_charges += 1
                    
                    self.log_test("Get All Making Charges", True, f"Retrieved {charge_count} making charges, found {found_charges} of our created charges")
                    return True
                else:
                    self.log_test("Get All Making Charges", False, "Response is not a list", data)
                    return False
            except json.JSONDecodeError:
                self.log_test("Get All Making Charges", False, "Invalid JSON response", response.text)
                return False
        else:
            self.log_test("Get All Making Charges", False, f"Request failed with status {response.status_code}", response.text)
            return False
    
    def test_get_making_charge_by_purity_light_weight(self):
        """Test 5a: Get Making Charge by Purity and Weight (light weight - should return per_gram rule)"""
        print("\n=== Test 5a: Get Making Charge by Purity and Weight (light weight) ===")
        
        params = {"weight": 3}
        response, success, error = self.make_request("GET", "/making-charges/22K", params=params)
        
        if not success:
            self.log_test("Get Making Charge (light weight)", False, f"Request failed: {error}")
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data and data.get("charge_type") == "per_gram":
                    self.log_test("Get Making Charge (light weight)", True, f"Correctly returned per_gram rule for 3g weight: {data.get('charge_amount')} per gram")
                    return True
                else:
                    self.log_test("Get Making Charge (light weight)", False, f"Expected per_gram rule but got: {data}")
                    return False
            except json.JSONDecodeError:
                self.log_test("Get Making Charge (light weight)", False, "Invalid JSON response", response.text)
                return False
        else:
            self.log_test("Get Making Charge (light weight)", False, f"Request failed with status {response.status_code}", response.text)
            return False
    
    def test_get_making_charge_by_purity_heavy_weight(self):
        """Test 5b: Get Making Charge by Purity and Weight (heavy weight - should return per_piece rule)"""
        print("\n=== Test 5b: Get Making Charge by Purity and Weight (heavy weight) ===")
        
        params = {"weight": 10}
        response, success, error = self.make_request("GET", "/making-charges/22K", params=params)
        
        if not success:
            self.log_test("Get Making Charge (heavy weight)", False, f"Request failed: {error}")
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data and data.get("charge_type") == "per_piece":
                    self.log_test("Get Making Charge (heavy weight)", True, f"Correctly returned per_piece rule for 10g weight: {data.get('charge_amount')} per piece")
                    return True
                else:
                    self.log_test("Get Making Charge (heavy weight)", False, f"Expected per_piece rule but got: {data}")
                    return False
            except json.JSONDecodeError:
                self.log_test("Get Making Charge (heavy weight)", False, "Invalid JSON response", response.text)
                return False
        else:
            self.log_test("Get Making Charge (heavy weight)", False, f"Request failed with status {response.status_code}", response.text)
            return False
    
    def test_update_making_charge(self):
        """Test 6: Update Making Charge (admin only)"""
        print("\n=== Test 6: Update Making Charge ===")
        
        if not self.admin_token:
            self.log_test("Update Making Charge", False, "No admin token available")
            return False
        
        if not self.created_charge_ids:
            self.log_test("Update Making Charge", False, "No created charges to update")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        charge_id = self.created_charge_ids[0]  # Update the first created charge
        update_data = {
            "charge_amount": 150  # Update charge amount from 100 to 150
        }
        
        response, success, error = self.make_request("PUT", f"/making-charges/{charge_id}", data=update_data, headers=headers)
        
        if not success:
            self.log_test("Update Making Charge", False, f"Request failed: {error}")
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get("charge_amount") == 150:
                    self.log_test("Update Making Charge", True, f"Successfully updated charge amount to 150 for charge ID: {charge_id}")
                    return True
                else:
                    self.log_test("Update Making Charge", False, f"Charge amount not updated correctly: {data}")
                    return False
            except json.JSONDecodeError:
                self.log_test("Update Making Charge", False, "Invalid JSON response", response.text)
                return False
        else:
            self.log_test("Update Making Charge", False, f"Update failed with status {response.status_code}", response.text)
            return False
    
    def test_delete_making_charge(self):
        """Test 7: Delete Making Charge (admin only)"""
        print("\n=== Test 7: Delete Making Charge ===")
        
        if not self.admin_token:
            self.log_test("Delete Making Charge", False, "No admin token available")
            return False
        
        if not self.created_charge_ids:
            self.log_test("Delete Making Charge", False, "No created charges to delete")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        charge_id = self.created_charge_ids[-1]  # Delete the last created charge
        
        response, success, error = self.make_request("DELETE", f"/making-charges/{charge_id}", headers=headers)
        
        if not success:
            self.log_test("Delete Making Charge", False, f"Request failed: {error}")
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get("message") == "Making charge deleted successfully":
                    self.log_test("Delete Making Charge", True, f"Successfully deleted charge ID: {charge_id}")
                    self.created_charge_ids.remove(charge_id)  # Remove from our tracking list
                    return True
                else:
                    self.log_test("Delete Making Charge", False, f"Unexpected response: {data}")
                    return False
            except json.JSONDecodeError:
                self.log_test("Delete Making Charge", False, "Invalid JSON response", response.text)
                return False
        else:
            self.log_test("Delete Making Charge", False, f"Delete failed with status {response.status_code}", response.text)
            return False
    
    def test_unauthorized_access(self):
        """Test 8: Test unauthorized access to admin endpoints"""
        print("\n=== Test 8: Test Unauthorized Access ===")
        
        # Test creating making charge without token
        charge_data = {
            "purity": "18K",
            "charge_type": "per_gram",
            "charge_amount": 80,
            "min_weight": 0,
            "max_weight": 10,
            "description": "Test unauthorized"
        }
        
        response, success, error = self.make_request("POST", "/making-charges", data=charge_data)
        
        if not success:
            self.log_test("Unauthorized Access Test", False, f"Request failed: {error}")
            return False
        
        if response.status_code == 401:
            self.log_test("Unauthorized Access Test", True, "Correctly rejected unauthorized access with 401 status")
            return True
        else:
            self.log_test("Unauthorized Access Test", False, f"Expected 401 but got {response.status_code}", response.text)
            return False
    
    def cleanup_test_data(self):
        """Clean up any remaining test data"""
        print("\n=== Cleanup: Removing Test Data ===")
        
        if not self.admin_token or not self.created_charge_ids:
            print("No cleanup needed")
            return
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        for charge_id in self.created_charge_ids[:]:  # Create a copy to iterate over
            response, success, error = self.make_request("DELETE", f"/making-charges/{charge_id}", headers=headers)
            if success and response.status_code == 200:
                print(f"✅ Cleaned up charge ID: {charge_id}")
                self.created_charge_ids.remove(charge_id)
            else:
                print(f"❌ Failed to cleanup charge ID: {charge_id}")
    
    def run_all_tests(self):
        """Run all making charges API tests"""
        print("🚀 Starting Making Charges Configuration API Tests")
        print(f"API Base URL: {self.base_url}")
        print("=" * 60)
        
        # Test sequence
        tests_passed = 0
        total_tests = 0
        
        # Test 1: Admin Authentication
        total_tests += 1
        if self.test_admin_login():
            tests_passed += 1
        
        # Test 2: Create Making Charge (per_gram)
        total_tests += 1
        if self.test_create_making_charge_per_gram():
            tests_passed += 1
        
        # Test 3: Create Making Charge (per_piece)
        total_tests += 1
        if self.test_create_making_charge_per_piece():
            tests_passed += 1
        
        # Test 4: Get All Making Charges
        total_tests += 1
        if self.test_get_all_making_charges():
            tests_passed += 1
        
        # Test 5a: Get Making Charge by Purity (light weight)
        total_tests += 1
        if self.test_get_making_charge_by_purity_light_weight():
            tests_passed += 1
        
        # Test 5b: Get Making Charge by Purity (heavy weight)
        total_tests += 1
        if self.test_get_making_charge_by_purity_heavy_weight():
            tests_passed += 1
        
        # Test 6: Update Making Charge
        total_tests += 1
        if self.test_update_making_charge():
            tests_passed += 1
        
        # Test 7: Delete Making Charge
        total_tests += 1
        if self.test_delete_making_charge():
            tests_passed += 1
        
        # Test 8: Unauthorized Access
        total_tests += 1
        if self.test_unauthorized_access():
            tests_passed += 1
        
        # Cleanup
        self.cleanup_test_data()
        
        # Summary
        print("\n" + "=" * 60)
        print("🎯 MAKING CHARGES API TEST SUMMARY")
        print("=" * 60)
        
        success_rate = (tests_passed / total_tests) * 100 if total_tests > 0 else 0
        
        print(f"Tests Passed: {tests_passed}/{total_tests} ({success_rate:.1f}%)")
        
        if tests_passed == total_tests:
            print("🎉 ALL TESTS PASSED! Making Charges Configuration API is working correctly.")
        else:
            print("⚠️  Some tests failed. Check the details above.")
        
        print("\nDetailed Results:")
        for result in self.test_results:
            print(f"{result['status']}: {result['test']} - {result['message']}")
        
        return tests_passed == total_tests

if __name__ == "__main__":
    tester = MakingChargesAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)