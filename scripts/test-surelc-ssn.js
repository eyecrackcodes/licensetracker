const axios = require('axios');

// Credentials for SureLC API
const USERNAME = 'jonathan.kaiser@luminarylife.com';
const PASSWORD = 'uav@e$f!#9K6S8L';

// Function to test accessing a producer and licenses by SSN
async function testProducerBySSN(ssn) {
  try {
    const url = `https://surelc.surancebay.com/sbweb/ws/producer/ssn/${ssn}`;
    
    console.log(`\nTesting producer access by SSN: ${ssn}`);
    console.log(`URL: ${url}`);
    
    const response = await axios.get(url, {
      auth: {
        username: USERNAME,
        password: PASSWORD
      }
    });

    console.log(`✅ SUCCESS! Status: ${response.status}`);
    console.log('Producer data:', JSON.stringify(response.data, null, 2));
    
    // Also try to get the licenses for this producer
    try {
      const licensesUrl = `${url}/licenses`;
      console.log(`\nAttempting to get licenses for SSN: ${ssn}`);
      console.log(`URL: ${licensesUrl}`);
      
      const licensesResponse = await axios.get(licensesUrl, {
        auth: {
          username: USERNAME,
          password: PASSWORD
        }
      });
      
      console.log(`✅ SUCCESS! Status: ${licensesResponse.status}`);
      console.log(`Found ${licensesResponse.data.length} licenses`);
      
      if (licensesResponse.data.length > 0) {
        console.log('First license:', JSON.stringify(licensesResponse.data[0], null, 2));
      }
    } catch (licenseError) {
      console.error(`❌ ERROR getting licenses for SSN ${ssn}:`, licenseError.message);
      
      if (licenseError.response) {
        console.error(`Status: ${licenseError.response.status}`);
        console.error('Response data:', licenseError.response.data);
      }
    }
    
    return { success: true, data: response.data };
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.log(`⚠️ FOUND but FORBIDDEN - SSN ${ssn} exists but you don't have access`);
      if (error.response.data) {
        console.log('Response data:', error.response.data);
        
        // Try to get licenses using the producerId
        const match = typeof error.response.data === 'string' && error.response.data.match(/producerId (\d+)/);
        if (match && match[1]) {
          const producerId = match[1];
          console.log(`Found producerId: ${producerId}, trying to access licenses...`);
          
          try {
            const licensesUrl = `https://surelc.surancebay.com/sbweb/ws/producer/id/${producerId}/licenses`;
            const licensesResponse = await axios.get(licensesUrl, {
              auth: {
                username: USERNAME,
                password: PASSWORD
              }
            });
            
            console.log(`✅ SUCCESS with producerId! Status: ${licensesResponse.status}`);
            console.log(`Found ${licensesResponse.data.length} licenses`);
            
            if (licensesResponse.data.length > 0) {
              console.log('First license:', JSON.stringify(licensesResponse.data[0], null, 2));
            }
          } catch (prodIdError) {
            console.error(`❌ ERROR getting licenses with producerId ${producerId}:`, prodIdError.message);
            
            if (prodIdError.response) {
              console.error(`Status: ${prodIdError.response.status}`);
              console.error('Response data:', prodIdError.response.data);
            }
          }
        }
      }
    } else {
      console.error(`❌ ERROR accessing producer by SSN ${ssn}:`, error.message);
      
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error('Response data:', error.response.data);
      }
    }
    
    return { success: false, error };
  }
}

// Test a variety of SSN formats and values
async function testSSNVariations() {
  console.log('SURELC API ACCESS TESTING - SSN VARIATIONS');
  console.log('=========================================');
  
  // Test different SSN formats
  const testSSNs = [
    // Common full SSNs
    '123456789',
    '111111111',
    '222222222',
    '333333333',
    '444444444',
    '555555555',
    
    // Test last 4 variations
    '6789',
    '5678',
    
    // Test common formats 
    '123-45-6789',
    'xxx-xx-6789',
    
    // Test with leading zeros
    '012345678',
    '001234567'
  ];
  
  for (const ssn of testSSNs) {
    await testProducerBySSN(ssn);
  }
  
  console.log('\nSSN testing completed');
}

// Run the tests
testSSNVariations(); 