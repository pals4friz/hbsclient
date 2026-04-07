#!/usr/bin/env python3
"""
Comprehensive Authentication Testing for HBS Client Jewelry Store App
Multi-User Authentication System Testing
"""

import requests
import json
import sys
from datetime import datetime
import uuid

# Configuration
BASE_URL = "https://hbs-client-app.preview.emergentagent.com/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    PURPLE = '\033[95m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_test_header(test_name):
    print(f"\n{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}{Colors.BOLD}🔐 {test_name}{Colors.END}")
    print(f"{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.END}")

def print_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.END}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.END}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.END}")

def print_info(message):
    print(f"{Colors.CYAN}ℹ️  {message}{Colors.END}")

class AuthenticationTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.admin_token = None
        self.test_user_token = None
        self.test_users = []
        self.test_results = {
            'total_tests': 0,
            'passed_tests': 0,
            'failed_tests': 0,
            'test_details': []
        }

    def log_test_result(self, test_name, passed, details=""):
        self.test_results['total_tests'] += 1
        if passed:
            self.test_results['passed_tests'] += 1
            print_success(f"{test_name}: PASSED")
        else:
            self.test_results['failed_tests'] += 1
            print_error(f"{test_name}: FAILED - {details}")
        
        self.test_results['test_details'].append({
            'test': test_name,
            'passed': passed,
            'details': details
        })

    def test_admin_login_valid_credentials(self):
        """Test admin login with valid credentials"""
        print_test_header("Test 1: Admin Login - Valid Credentials")
        
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/login", json=login_data)
            print_info(f"Request URL: {self.base_url}/auth/login")
            print_info(f"Request Data: {json.dumps(login_data, indent=2)}")
            print_info(f"Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                checks = [
                    ('token' in data, "Response should contain 'token' field"),
                    ('user' in data, "Response should contain 'user' field"),
                    (data['user']['username'] == 'admin', f"Username should be 'admin', got {data['user'].get('username')}"),
                    (data['user']['role'] == 'admin', f"Role should be 'admin', got {data['user'].get('role')}"),
                    (len(data['token']) > 10, f"Token should be substantial, got length {len(data.get('token', ''))}"),
                ]
                
                all_passed = True
                for check, message in checks:
                    if check:
                        print_success(message)
                    else:
                        print_error(message)
                        all_passed = False
                
                if all_passed:
                    self.admin_token = data['token']
                    print_info(f"Admin token stored: {self.admin_token[:20]}...")
                
                self.log_test_result("Admin Login Valid", all_passed)
                return all_passed
            else:
                print_error(f"Login failed: {response.status_code}")
                print_error(f"Response: {response.text}")
                self.log_test_result("Admin Login Valid", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print_error(f"Exception during login: {str(e)}")
            self.log_test_result("Admin Login Valid", False, str(e))
            return False

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        print_test_header("Test 2: Login - Invalid Credentials")
        
        invalid_credentials = [
            {"username": "admin", "password": "wrongpassword"},
            {"username": "nonexistent", "password": "admin123"},
            {"username": "admin", "password": ""},
            {"username": "", "password": "admin123"}
        ]
        
        all_passed = True
        for i, creds in enumerate(invalid_credentials):
            try:
                response = requests.post(f"{self.base_url}/auth/login", json=creds)
                print_info(f"Test {i+1}: {creds['username']}/{creds['password'][:3]}... - Status: {response.status_code}")
                
                if response.status_code == 401:
                    print_success(f"Correctly rejected invalid credentials: {creds['username']}")
                else:
                    print_error(f"Should return 401 for invalid credentials, got {response.status_code}")
                    all_passed = False
                    
            except Exception as e:
                print_error(f"Exception testing invalid credentials: {str(e)}")
                all_passed = False
        
        self.log_test_result("Login Invalid Credentials", all_passed)
        return all_passed

    def test_get_current_user_with_token(self):
        """Test getting current user info with valid token"""
        print_test_header("Test 3: Get Current User - With Valid Token")
        
        if not self.admin_token:
            print_error("No admin token available")
            self.log_test_result("Get Current User Valid", False, "No admin token")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.get(f"{self.base_url}/auth/me", headers=headers)
            print_info(f"Request URL: {self.base_url}/auth/me")
            print_info(f"Headers: Authorization: Bearer {self.admin_token[:20]}...")
            print_info(f"Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                checks = [
                    (data['username'] == 'admin', f"Username should be 'admin', got {data.get('username')}"),
                    (data['role'] == 'admin', f"Role should be 'admin', got {data.get('role')}"),
                    ('id' in data, "Response should contain 'id' field"),
                ]
                
                all_passed = True
                for check, message in checks:
                    if check:
                        print_success(message)
                    else:
                        print_error(message)
                        all_passed = False
                
                print_info(f"User info: {data}")
                self.log_test_result("Get Current User Valid", all_passed)
                return all_passed
            else:
                print_error(f"Failed to get user info: {response.status_code}")
                print_error(f"Response: {response.text}")
                self.log_test_result("Get Current User Valid", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print_error(f"Exception getting user info: {str(e)}")
            self.log_test_result("Get Current User Valid", False, str(e))
            return False

    def test_get_current_user_without_token(self):
        """Test getting current user info without token"""
        print_test_header("Test 4: Get Current User - Without Token")
        
        try:
            response = requests.get(f"{self.base_url}/auth/me")
            print_info(f"Request URL: {self.base_url}/auth/me")
            print_info(f"Headers: None (no Authorization header)")
            print_info(f"Response Status: {response.status_code}")
            
            if response.status_code == 401:
                print_success("Correctly returned 401 for missing token")
                self.log_test_result("Get Current User No Token", True)
                return True
            else:
                print_error(f"Should return 401 for missing token, got {response.status_code}")
                self.log_test_result("Get Current User No Token", False, f"Expected 401, got {response.status_code}")
                return False
                
        except Exception as e:
            print_error(f"Exception testing no token: {str(e)}")
            self.log_test_result("Get Current User No Token", False, str(e))
            return False

    def test_logout(self):
        """Test logout functionality"""
        print_test_header("Test 5: Logout")
        
        if not self.admin_token:
            print_error("No admin token available")
            self.log_test_result("Logout", False, "No admin token")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.post(f"{self.base_url}/auth/logout", headers=headers)
            print_info(f"Request URL: {self.base_url}/auth/logout")
            print_info(f"Headers: Authorization: Bearer {self.admin_token[:20]}...")
            print_info(f"Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if 'message' in data:
                    print_success(f"Logout successful: {data['message']}")
                    
                    # Test that token is now invalid
                    test_response = requests.get(f"{self.base_url}/auth/me", headers=headers)
                    if test_response.status_code == 401:
                        print_success("Token correctly invalidated after logout")
                        self.log_test_result("Logout", True)
                        # Need to login again for subsequent tests
                        self.test_admin_login_valid_credentials()
                        return True
                    else:
                        print_error(f"Token still valid after logout: {test_response.status_code}")
                        self.log_test_result("Logout", False, "Token not invalidated")
                        return False
                else:
                    print_error("Logout response missing message")
                    self.log_test_result("Logout", False, "Missing message in response")
                    return False
            else:
                print_error(f"Logout failed: {response.status_code}")
                print_error(f"Response: {response.text}")
                self.log_test_result("Logout", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print_error(f"Exception during logout: {str(e)}")
            self.log_test_result("Logout", False, str(e))
            return False

    def test_create_user_admin_only(self):
        """Test creating a new user (admin only)"""
        print_test_header("Test 6: Create User - Admin Only")
        
        if not self.admin_token:
            print_error("No admin token available")
            self.log_test_result("Create User Admin", False, "No admin token")
            return False
        
        user_data = {
            "username": f"testuser_{uuid.uuid4().hex[:8]}",
            "password": "testpass123",
            "role": "user",
            "name": "Test User"
        }
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.post(f"{self.base_url}/users", json=user_data, headers=headers)
            print_info(f"Request URL: {self.base_url}/users")
            print_info(f"Request Data: {json.dumps(user_data, indent=2)}")
            print_info(f"Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                checks = [
                    (data['username'] == user_data['username'], f"Username should match: {user_data['username']}"),
                    (data['role'] == user_data['role'], f"Role should match: {user_data['role']}"),
                    (data['name'] == user_data['name'], f"Name should match: {user_data['name']}"),
                    (data['active'] == True, "User should be active by default"),
                    ('id' in data, "Response should contain user ID"),
                    ('created_at' in data, "Response should contain creation timestamp")
                ]
                
                all_passed = True
                for check, message in checks:
                    if check:
                        print_success(message)
                    else:
                        print_error(message)
                        all_passed = False
                
                if all_passed:
                    self.test_users.append({
                        'id': data['id'],
                        'username': user_data['username'],
                        'password': user_data['password']
                    })
                    print_info(f"Test user created: {data['username']} (ID: {data['id']})")
                
                self.log_test_result("Create User Admin", all_passed)
                return all_passed
            else:
                print_error(f"Failed to create user: {response.status_code}")
                print_error(f"Response: {response.text}")
                self.log_test_result("Create User Admin", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print_error(f"Exception creating user: {str(e)}")
            self.log_test_result("Create User Admin", False, str(e))
            return False

    def test_list_users_admin_only(self):
        """Test listing all users (admin only)"""
        print_test_header("Test 7: List Users - Admin Only")
        
        if not self.admin_token:
            print_error("No admin token available")
            self.log_test_result("List Users Admin", False, "No admin token")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.get(f"{self.base_url}/users", headers=headers)
            print_info(f"Request URL: {self.base_url}/users")
            print_info(f"Response Status: {response.status_code}")
            
            if response.status_code == 200:
                users = response.json()
                
                checks = [
                    (isinstance(users, list), "Response should be a list"),
                    (len(users) >= 1, f"Should have at least 1 user (admin), got {len(users)}"),
                ]
                
                all_passed = True
                for check, message in checks:
                    if check:
                        print_success(message)
                    else:
                        print_error(message)
                        all_passed = False
                
                # Check if admin user exists
                admin_found = False
                for user in users:
                    if user.get('username') == 'admin' and user.get('role') == 'admin':
                        admin_found = True
                        print_success("Admin user found in user list")
                        break
                
                if not admin_found:
                    print_error("Admin user not found in user list")
                    all_passed = False
                
                print_info(f"Total users found: {len(users)}")
                for user in users:
                    print_info(f"  • {user.get('username')} ({user.get('role')}) - Active: {user.get('active')}")
                
                self.log_test_result("List Users Admin", all_passed)
                return all_passed
            else:
                print_error(f"Failed to list users: {response.status_code}")
                print_error(f"Response: {response.text}")
                self.log_test_result("List Users Admin", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print_error(f"Exception listing users: {str(e)}")
            self.log_test_result("List Users Admin", False, str(e))
            return False

    def test_update_user_admin_only(self):
        """Test updating a user (admin only)"""
        print_test_header("Test 8: Update User - Admin Only")
        
        if not self.admin_token or not self.test_users:
            print_error("No admin token or test users available")
            self.log_test_result("Update User Admin", False, "No admin token or test users")
            return False
        
        test_user = self.test_users[0]
        user_id = test_user['id']
        
        update_data = {
            "name": "Updated Test User",
            "role": "admin"
        }
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.put(f"{self.base_url}/users/{user_id}", json=update_data, headers=headers)
            print_info(f"Request URL: {self.base_url}/users/{user_id}")
            print_info(f"Request Data: {json.dumps(update_data, indent=2)}")
            print_info(f"Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                checks = [
                    (data['name'] == update_data['name'], f"Name should be updated to '{update_data['name']}'"),
                    (data['role'] == update_data['role'], f"Role should be updated to '{update_data['role']}'"),
                    (data['id'] == user_id, f"User ID should remain the same: {user_id}"),
                    (data['username'] == test_user['username'], f"Username should remain unchanged: {test_user['username']}")
                ]
                
                all_passed = True
                for check, message in checks:
                    if check:
                        print_success(message)
                    else:
                        print_error(message)
                        all_passed = False
                
                print_info(f"User updated: {data['username']} - {data['name']} ({data['role']})")
                self.log_test_result("Update User Admin", all_passed)
                return all_passed
            else:
                print_error(f"Failed to update user: {response.status_code}")
                print_error(f"Response: {response.text}")
                self.log_test_result("Update User Admin", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print_error(f"Exception updating user: {str(e)}")
            self.log_test_result("Update User Admin", False, str(e))
            return False

    def test_delete_user_admin_only(self):
        """Test deleting a user (admin only)"""
        print_test_header("Test 9: Delete User - Admin Only")
        
        if not self.admin_token or not self.test_users:
            print_error("No admin token or test users available")
            self.log_test_result("Delete User Admin", False, "No admin token or test users")
            return False
        
        test_user = self.test_users[0]
        user_id = test_user['id']
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.delete(f"{self.base_url}/users/{user_id}", headers=headers)
            print_info(f"Request URL: {self.base_url}/users/{user_id}")
            print_info(f"Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                if 'message' in data and 'deleted' in data['message'].lower():
                    print_success(f"User deleted successfully: {data['message']}")
                    
                    # Verify user is actually deleted
                    verify_response = requests.get(f"{self.base_url}/users", headers=headers)
                    if verify_response.status_code == 200:
                        users = verify_response.json()
                        user_still_exists = any(u['id'] == user_id for u in users)
                        
                        if not user_still_exists:
                            print_success("User confirmed deleted from user list")
                            self.log_test_result("Delete User Admin", True)
                            return True
                        else:
                            print_error("User still exists in user list after deletion")
                            self.log_test_result("Delete User Admin", False, "User still exists")
                            return False
                    else:
                        print_warning("Could not verify deletion by listing users")
                        self.log_test_result("Delete User Admin", True, "Deletion successful but verification failed")
                        return True
                else:
                    print_error("Delete response missing success message")
                    self.log_test_result("Delete User Admin", False, "Missing success message")
                    return False
            else:
                print_error(f"Failed to delete user: {response.status_code}")
                print_error(f"Response: {response.text}")
                self.log_test_result("Delete User Admin", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print_error(f"Exception deleting user: {str(e)}")
            self.log_test_result("Delete User Admin", False, str(e))
            return False

    def test_non_admin_access_restrictions(self):
        """Test that non-admin users cannot access user management endpoints"""
        print_test_header("Test 10: Non-Admin Access Restrictions")
        
        # First create a regular user and get their token
        if not self.admin_token:
            print_error("No admin token available")
            self.log_test_result("Non-Admin Restrictions", False, "No admin token")
            return False
        
        # Create a regular user
        user_data = {
            "username": f"regularuser_{uuid.uuid4().hex[:8]}",
            "password": "regularpass123",
            "role": "user",
            "name": "Regular User"
        }
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            # Create regular user
            create_response = requests.post(f"{self.base_url}/users", json=user_data, headers=headers)
            if create_response.status_code != 200:
                print_error("Failed to create regular user for testing")
                self.log_test_result("Non-Admin Restrictions", False, "Could not create test user")
                return False
            
            # Login as regular user
            login_response = requests.post(f"{self.base_url}/auth/login", json={
                "username": user_data['username'],
                "password": user_data['password']
            })
            
            if login_response.status_code != 200:
                print_error("Failed to login as regular user")
                self.log_test_result("Non-Admin Restrictions", False, "Could not login as regular user")
                return False
            
            regular_token = login_response.json()['token']
            regular_headers = {"Authorization": f"Bearer {regular_token}"}
            
            print_success(f"Regular user created and logged in: {user_data['username']}")
            
            # Test restricted endpoints
            restricted_tests = [
                ("POST /users", requests.post, f"{self.base_url}/users", {"username": "test", "password": "test"}),
                ("GET /users", requests.get, f"{self.base_url}/users", None),
                ("PUT /users/{id}", requests.put, f"{self.base_url}/users/dummy-id", {"name": "test"}),
                ("DELETE /users/{id}", requests.delete, f"{self.base_url}/users/dummy-id", None)
            ]
            
            all_passed = True
            for test_name, method, url, data in restricted_tests:
                try:
                    if data:
                        response = method(url, json=data, headers=regular_headers)
                    else:
                        response = method(url, headers=regular_headers)
                    
                    if response.status_code == 403:
                        print_success(f"{test_name}: Correctly returned 403 Forbidden")
                    else:
                        print_error(f"{test_name}: Expected 403, got {response.status_code}")
                        all_passed = False
                        
                except Exception as e:
                    print_error(f"{test_name}: Exception - {str(e)}")
                    all_passed = False
            
            # Clean up - delete the regular user
            delete_response = requests.delete(f"{self.base_url}/users/{create_response.json()['id']}", headers=headers)
            if delete_response.status_code == 200:
                print_info("Test regular user cleaned up")
            
            self.log_test_result("Non-Admin Restrictions", all_passed)
            return all_passed
            
        except Exception as e:
            print_error(f"Exception testing non-admin restrictions: {str(e)}")
            self.log_test_result("Non-Admin Restrictions", False, str(e))
            return False

    def run_all_tests(self):
        """Run all authentication tests"""
        print(f"{Colors.PURPLE}{Colors.BOLD}")
        print("🔐 HBS CLIENT JEWELRY STORE - AUTHENTICATION TESTING")
        print("=" * 60)
        print(f"Backend URL: {self.base_url}")
        print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        print(f"{Colors.END}")

        # Run tests in sequence
        tests = [
            self.test_admin_login_valid_credentials,
            self.test_login_invalid_credentials,
            self.test_get_current_user_with_token,
            self.test_get_current_user_without_token,
            self.test_logout,
            self.test_create_user_admin_only,
            self.test_list_users_admin_only,
            self.test_update_user_admin_only,
            self.test_delete_user_admin_only,
            self.test_non_admin_access_restrictions
        ]

        for test in tests:
            try:
                test()
            except Exception as e:
                print_error(f"Unexpected error in {test.__name__}: {str(e)}")
                self.log_test_result(test.__name__, False, f"Unexpected error: {str(e)}")

        # Print final results
        self.print_test_summary()

    def print_test_summary(self):
        """Print comprehensive test summary"""
        print(f"\n{Colors.PURPLE}{Colors.BOLD}{'='*60}{Colors.END}")
        print(f"{Colors.PURPLE}{Colors.BOLD}📊 AUTHENTICATION TESTING SUMMARY{Colors.END}")
        print(f"{Colors.PURPLE}{Colors.BOLD}{'='*60}{Colors.END}")
        
        total = self.test_results['total_tests']
        passed = self.test_results['passed_tests']
        failed = self.test_results['failed_tests']
        success_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"{Colors.WHITE}Total Tests: {total}{Colors.END}")
        print(f"{Colors.GREEN}Passed: {passed}{Colors.END}")
        print(f"{Colors.RED}Failed: {failed}{Colors.END}")
        print(f"{Colors.CYAN}Success Rate: {success_rate:.1f}%{Colors.END}")
        
        print(f"\n{Colors.BOLD}📋 Detailed Results:{Colors.END}")
        for result in self.test_results['test_details']:
            status = f"{Colors.GREEN}✅ PASS" if result['passed'] else f"{Colors.RED}❌ FAIL"
            details = f" - {result['details']}" if result['details'] else ""
            print(f"{status}{Colors.END} {result['test']}{details}")
        
        if self.test_users:
            print(f"\n{Colors.CYAN}👥 Test Users Created: {len(self.test_users)}{Colors.END}")
            for user in self.test_users:
                print(f"   • {user['username']} (ID: {user['id']})")
        
        print(f"\n{Colors.PURPLE}{Colors.BOLD}{'='*60}{Colors.END}")
        
        if failed == 0:
            print(f"{Colors.GREEN}{Colors.BOLD}🎉 ALL AUTHENTICATION TESTS PASSED!{Colors.END}")
        else:
            print(f"{Colors.YELLOW}{Colors.BOLD}⚠️  {failed} TEST(S) FAILED - REVIEW REQUIRED{Colors.END}")
        
        print(f"{Colors.PURPLE}{Colors.BOLD}{'='*60}{Colors.END}")

if __name__ == "__main__":
    tester = AuthenticationTester()
    tester.run_all_tests()