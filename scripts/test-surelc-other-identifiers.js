const axios = require('axios');

// Credentials for SureLC API
const USERNAME = 'jonathan.kaiser@luminarylife.com';
const PASSWORD = 'uav@e$f!#9K6S8L';

// Function to test accessing a producer by different identifiers
async function testProducerAccess(method, identifier, description) {
  try {
    const url = `https://surelc.surancebay.com/sbweb/ws/producer/${method}/${identifier}`;
    
    console.log(`\nTesting producer access by ${description}: ${identifier}`);
    console.log(`URL: ${url}`);
    
    const response = await axios.get(url, {
      auth: {
        username: USERNAME,
        password: PASSWORD
      }
    });

    console.log(`✅ SUCCESS! Status: ${response.status}`);
    
    // Print the response data
    console.log('Producer data:', JSON.stringify(response.data, null, 2));
    
    return { success: true, data: response.data, producerId: response.data?.id };
  } catch (error) {
    console.error(`❌ ERROR accessing producer by ${description}:`, error.message);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      if (error.response.data) {
        console.error('Response data:', error.response.data);
      }
    }
    
    return { success: false, error };
  }
}

// Function to test accessing licenses using different producer identifiers
async function testLicensesAccess(method, identifier, description) {
  try {
    const url = `https://surelc.surancebay.com/sbweb/ws/producer/${method}/${identifier}/licenses`;
    
    console.log(`\nTesting licenses access by ${description}: ${identifier}`);
    console.log(`URL: ${url}`);
    
    const response = await axios.get(url, {
      auth: {
        username: USERNAME,
        password: PASSWORD
      }
    });

    console.log(`✅ SUCCESS! Status: ${response.status}`);
    
    // Print the response data
    console.log(`Found ${response.data.length} licenses`);
    if (response.data.length > 0) {
      console.log('First license:', JSON.stringify(response.data[0], null, 2));
    }
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`❌ ERROR accessing licenses by ${description}:`, error.message);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      if (error.response.data) {
        console.error('Response data:', error.response.data);
      }
    }
    
    return { success: false, error };
  }
}

// Test with various identification methods
async function testVariousIdentifiers() {
  console.log('SURELC API ACCESS TESTING - ALTERNATIVE IDENTIFIERS');
  console.log('=================================================');
  
  // Known producer IDs from previous tests where we got 403s
  const producerIds = ['132577', '5246849'];
  
  // Test producer ID access
  console.log('\n--- Testing access by Producer ID ---');
  for (const id of producerIds) {
    const result = await testProducerAccess('id', id, 'Producer ID');
    
    // If we got the producer, try to get their licenses
    if (result.success) {
      await testLicensesAccess('id', id, 'Producer ID');
    }
  }
  
  // Test last 4 of SSN (common identifiers)
  console.log('\n--- Testing access by SSN ---');
  const testSSNs = [
    // Common test SSNs
    '123456789',
    '111111111',
    // Last 4 of SSN with different formats
    'xxx-xx-1234',
    '1234'
  ];
  
  for (const ssn of testSSNs) {
    const result = await testProducerAccess('ssn', ssn, 'SSN');
    
    // If we got the producer, try to get their licenses
    if (result.success) {
      await testLicensesAccess('ssn', ssn, 'SSN');
    }
  }
  
  // Test Producer names (if API supports it)
  console.log('\n--- Testing access by Name ---');
  const testNames = [
    'smith', 
    'jones',
    'johnson'
  ];
  
  for (const name of testNames) {
    const result = await testProducerAccess('name', name, 'Name');
    
    // If we got the producer, try to get their licenses
    if (result.success) {
      await testLicensesAccess('name', name, 'Name');
    }
  }
  
  console.log('\nTesting completed');
}

// Run the tests
testVariousIdentifiers(); 