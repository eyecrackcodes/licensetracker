const axios = require('axios');

// Credentials for SureLC API
const USERNAME = 'jonathan.kaiser@luminarylife.com';
const PASSWORD = 'uav@e$f!#9K6S8L';

// Function to test a specific API endpoint
async function testEndpoint(path, description) {
  try {
    const url = `https://surelc.surancebay.com/sbweb/ws${path}`;
    
    console.log(`\nTesting ${description} (${url})...`);
    
    const response = await axios.get(url, {
      auth: {
        username: USERNAME,
        password: PASSWORD
      }
    });

    console.log(`✅ SUCCESS! Status: ${response.status}`);
    
    // Print a sample of the response for debugging
    if (Array.isArray(response.data)) {
      console.log(`Response contains ${response.data.length} items`);
      if (response.data.length > 0) {
        console.log('First item sample:', JSON.stringify(response.data[0], null, 2));
      }
    } else if (typeof response.data === 'object') {
      console.log('Response sample:', JSON.stringify(response.data, null, 2));
    } else {
      console.log('Response:', response.data);
    }
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`❌ ERROR for ${description}:`, error.message);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      if (error.response.data) {
        console.error('Response data:', error.response.data);
      }
    }
    
    return { success: false, error };
  }
}

// Run a battery of tests on various endpoints
async function testVariousEndpoints() {
  console.log('SURELC API ENDPOINT TESTING');
  console.log('==========================');
  console.log(`Using credentials: ${USERNAME} / [PASSWORD HIDDEN]`);
  
  // Test a variety of endpoints
  const endpointsToTest = [
    // Basic endpoints
    { path: '', description: 'API root' },
    { path: '/system/status', description: 'System status' },
    
    // Agency-related endpoints
    { path: '/agency', description: 'Agency information' },
    { path: '/agencies', description: 'Agencies list' },
    
    // Producer endpoints
    { path: '/producers', description: 'All producers' },
    { path: '/producer/id/1', description: 'Producer with ID 1' },
    
    // License endpoints - general
    { path: '/licenses', description: 'All licenses' },
    
    // Try a specific producer's licenses - we know 12345678 exists
    { path: '/producer/npn/12345678/licenses', description: 'Licenses for NPN 12345678' }
  ];
  
  for (const endpoint of endpointsToTest) {
    await testEndpoint(endpoint.path, endpoint.description);
  }
  
  console.log('\nEndpoint testing completed');
}

// Run the tests
testVariousEndpoints(); 