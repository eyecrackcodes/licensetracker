const axios = require('axios');

// Credentials for SureLC API
const USERNAME = 'jonathan.kaiser@luminarylife.com';
const PASSWORD = 'uav@e$f!#9K6S8L';

// Function to fetch licenses for a specific NPN
async function fetchProducerLicenses(npn) {
  try {
    const url = `https://surelc.surancebay.com/sbweb/ws/producer/npn/${npn}/licenses`;
    
    console.log(`Fetching licenses for NPN: ${npn}`);
    
    const response = await axios.get(url, {
      auth: {
        username: USERNAME,
        password: PASSWORD
      }
    });

    console.log(`Success! Status: ${response.status}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching producer licenses for NPN ${npn}:`, error.message);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      if (error.response.data) {
        console.error(`Response data:`, error.response.data);
      }
    }
    
    return [];
  }
}

// Try to fetch a different resource - just to see if auth works at all
async function testSimpleProducerEndpoint() {
  try {
    const url = `https://surelc.surancebay.com/sbweb/ws/producer/npn`;
    
    console.log(`Testing producer endpoint...`);
    
    const response = await axios.get(url, {
      auth: {
        username: USERNAME,
        password: PASSWORD
      }
    });

    console.log(`Success! Status: ${response.status}`);
    console.log('Response:', response.data);
    return true;
  } catch (error) {
    console.error(`Error accessing producer endpoint:`, error.message);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      if (error.response.data) {
        console.error(`Response data:`, error.response.data);
      }
    }
    
    return false;
  }
}

// Test SureLC producer API with specific NPNs
async function testMultipleNpns() {
  // Test with a more diverse set of NPNs, including common formats
  // Typical NPN formats: 7-8 digits, sometimes with leading zeros
  const npnsToTest = [
    // Original test NPNs
    '18724313', 
    '19956248', 
    '12345678',
    
    // Common NPN formats (7-8 digits)
    '1234567',
    '01234567',
    '00123456',
    
    // Random but valid-looking NPNs
    '17654321',
    '19876543', 
    '20123456',
    '16789012',
    
    // Specific NPNs from NIPR (if known)
    '9876543',
    '8765432'
  ];
  
  let foundLicense = false;
  
  for (const npn of npnsToTest) {
    try {
      console.log(`\nTrying NPN: ${npn}`);
      const licenses = await fetchProducerLicenses(npn);
      
      if (licenses && licenses.length > 0) {
        console.log(`SUCCESS! Found ${licenses.length} licenses for NPN ${npn}`);
        console.log('Sample license data:', JSON.stringify(licenses[0], null, 2));
        foundLicense = true;
        break; // Stop after finding a successful NPN
      } else {
        console.log(`No licenses found for NPN ${npn}`);
      }
    } catch (error) {
      console.log(`Error processing NPN ${npn}`);
    }
  }
  
  if (!foundLicense) {
    console.log("\nNo licenses found for any tested NPNs.");
    console.log("You may need to provide valid NPNs that exist in the SureLC system.");
  }
}

// Main test function
async function runTests() {
  try {
    console.log('Testing SureLC API...');

    // First try the simple producer endpoint
    console.log('\n--- Testing generic producer endpoint ---');
    await testSimpleProducerEndpoint();
    
    // Then try specific NPNs
    console.log('\n--- Testing specific NPNs ---');
    await testMultipleNpns();
    
    console.log('\nAll tests completed');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

runTests(); 