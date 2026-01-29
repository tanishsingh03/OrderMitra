/**
 * Comprehensive Endpoint Testing Script
 * Tests all major endpoints to ensure everything works together
 */

const BASE_URL = 'http://localhost:6789/api';

// Test results storage
const testResults = {
    passed: [],
    failed: [],
    warnings: []
};

// Helper function to make API calls
async function apiCall(endpoint, method = 'GET', body = null, token = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, options);
        const data = await response.json();
        return { status: response.status, data };
    } catch (error) {
        return { status: 0, error: error.message };
    }
}

// Test helper
function test(name, testFn) {
    return async () => {
        try {
            await testFn();
            testResults.passed.push(name);
            console.log(`✅ ${name}`);
        } catch (error) {
            testResults.failed.push({ name, error: error.message });
            console.error(`❌ ${name}: ${error.message}`);
        }
    };
}

// ============================================
// AUTHENTICATION TESTS
// ============================================

async function testAuthentication() {
    console.log('\n🔐 Testing Authentication...\n');

    // Test 1: Signup (Customer)
    await test('Customer Signup', async () => {
        const response = await apiCall('/signup', 'POST', {
            name: 'Test Customer',
            email: `testcustomer${Date.now()}@test.com`,
            password: 'test123',
            role: 'customer'
        });
        if (!response.data.success) {
            throw new Error(response.data.message || 'Signup failed');
        }
    });

    // Test 2: Login
    let customerToken = null;
    await test('Customer Login', async () => {
        const response = await apiCall('/login', 'POST', {
            email: 'test@test.com', // Use existing test account
            password: 'test123',
            role: 'customer'
        });
        if (response.data.success && response.data.token) {
            customerToken = response.data.token;
        } else {
            throw new Error('Login failed - create test account first');
        }
    });

    // Test 3: Restaurant Login
    let restaurantToken = null;
    await test('Restaurant Login', async () => {
        const response = await apiCall('/login', 'POST', {
            email: 'restaurant@test.com', // Use existing test account
            password: 'test123',
            role: 'restaurant-owner'
        });
        if (response.data.success && response.data.token) {
            restaurantToken = response.data.token;
        } else {
            testResults.warnings.push('Restaurant login skipped - create test account first');
        }
    });

    return { customerToken, restaurantToken };
}

// ============================================
// RESTAURANT TESTS
// ============================================

async function testRestaurantEndpoints(restaurantToken) {
    console.log('\n🍽️  Testing Restaurant Endpoints...\n');

    if (!restaurantToken) {
        console.log('⚠️  Skipping restaurant tests - no token');
        return;
    }

    // Test Restaurant Profile
    await test('Get Restaurant Profile', async () => {
        const response = await apiCall('/restaurant/me', 'GET', null, restaurantToken);
        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to get profile');
        }
        if (!response.data.restaurant) {
            throw new Error('Restaurant data not returned');
        }
    });

    // Test Restaurant Orders
    await test('Get Restaurant Orders', async () => {
        const response = await apiCall('/restaurant/orders', 'GET', null, restaurantToken);
        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to get orders');
        }
    });

    // Test Menu Items
    await test('Get Menu Items', async () => {
        const response = await apiCall('/menu', 'GET', null, restaurantToken);
        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to get menu');
        }
    });
}

// ============================================
// CUSTOMER TESTS
// ============================================

async function testCustomerEndpoints(customerToken) {
    console.log('\n👤 Testing Customer Endpoints...\n');

    if (!customerToken) {
        console.log('⚠️  Skipping customer tests - no token');
        return;
    }

    // Test Get Restaurants
    await test('Get All Restaurants', async () => {
        const response = await apiCall('/restaurants', 'GET');
        if (!response.data.success && !Array.isArray(response.data)) {
            throw new Error('Failed to get restaurants');
        }
    });

    // Test Get My Orders
    await test('Get My Orders', async () => {
        const response = await apiCall('/orders/my', 'GET', null, customerToken);
        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to get orders');
        }
    });

    // Test Get Addresses
    await test('Get Addresses', async () => {
        const response = await apiCall('/addresses', 'GET', null, customerToken);
        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to get addresses');
        }
    });

    // Test Get Wallet
    await test('Get Wallet', async () => {
        const response = await apiCall('/wallet', 'GET', null, customerToken);
        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to get wallet');
        }
    });

    // Test Get Notifications
    await test('Get Notifications', async () => {
        const response = await apiCall('/notifications', 'GET', null, customerToken);
        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to get notifications');
        }
    });
}

// ============================================
// DELIVERY PARTNER TESTS
// ============================================

async function testDeliveryEndpoints() {
    console.log('\n🚴 Testing Delivery Partner Endpoints...\n');

    // Test Delivery Login
    let deliveryToken = null;
    await test('Delivery Partner Login', async () => {
        const response = await apiCall('/delivery/login', 'POST', {
            email: 'delivery@test.com',
            password: 'test123'
        });
        if (response.data.success && response.data.token) {
            deliveryToken = response.data.token;
        } else {
            testResults.warnings.push('Delivery login skipped - create test account first');
        }
    });

    if (deliveryToken) {
        await test('Get Available Orders', async () => {
            const response = await apiCall('/delivery/orders/available', 'GET', null, deliveryToken);
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to get available orders');
            }
        });

        await test('Get My Delivery Orders', async () => {
            const response = await apiCall('/delivery/orders/my', 'GET', null, deliveryToken);
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to get my orders');
            }
        });

        await test('Get Earnings', async () => {
            const response = await apiCall('/delivery/earnings', 'GET', null, deliveryToken);
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to get earnings');
            }
        });
    }
}

// ============================================
// PUBLIC ENDPOINTS TESTS
// ============================================

async function testPublicEndpoints() {
    console.log('\n🌐 Testing Public Endpoints...\n');

    await test('Get Public Restaurants', async () => {
        const response = await apiCall('/public/restaurants', 'GET');
        if (!response.data.success && !Array.isArray(response.data)) {
            throw new Error('Failed to get public restaurants');
        }
    });
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function runAllTests() {
    console.log('🧪 Starting Comprehensive Endpoint Tests...\n');
    console.log('=' .repeat(60));

    try {
        // Test Authentication
        const { customerToken, restaurantToken } = await testAuthentication();

        // Test Public Endpoints
        await testPublicEndpoints();

        // Test Customer Endpoints
        await testCustomerEndpoints(customerToken);

        // Test Restaurant Endpoints
        await testRestaurantEndpoints(restaurantToken);

        // Test Delivery Endpoints
        await testDeliveryEndpoints();

    } catch (error) {
        console.error('❌ Test runner error:', error);
    }

    // Print Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 TEST SUMMARY\n');
    console.log(`✅ Passed: ${testResults.passed.length}`);
    console.log(`❌ Failed: ${testResults.failed.length}`);
    console.log(`⚠️  Warnings: ${testResults.warnings.length}`);

    if (testResults.failed.length > 0) {
        console.log('\n❌ Failed Tests:');
        testResults.failed.forEach(({ name, error }) => {
            console.log(`   - ${name}: ${error}`);
        });
    }

    if (testResults.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        testResults.warnings.forEach(warning => {
            console.log(`   - ${warning}`);
        });
    }

    console.log('\n' + '='.repeat(60));
}

// Run tests if executed directly
if (typeof window === 'undefined') {
    // Node.js environment
    const fetch = require('node-fetch');
    global.fetch = fetch;
    runAllTests().catch(console.error);
} else {
    // Browser environment
    window.runAllTests = runAllTests;
}

