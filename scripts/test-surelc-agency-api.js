const axios = require('axios');

// Credentials for SureLC API
const USERNAME = 'jonathan.kaiser@luminarylife.com';
const PASSWORD = 'uav@e$f!#9K6S8L';

// Try to fetch agency information
async function testAgencyEndpoint() {
  try {
    // Test accessing your agency's producers list
    const url = 'https://surelc.surancebay.com/sbweb/ws/agency/producers';
    
    console.log('Testing agency producers endpoint...');
    
    const response = await axios.get(url, {
      auth: {
        username: USERNAME,
        password: PASSWORD
      }
    });

    console.log(`Success! Status: ${response.status}`);
    console.log(`Found ${response.data.length} producers in your agency`);
    
    if (response.data.length > 0) {
      console.log('First few producers:');
      response.data.slice(0, 3).forEach((producer, index) => {
        console.log(`Producer ${index + 1}:`, JSON.stringify(producer, null, 2));
      });
      
      // If we found producers, try to use their NPNs
      if (response.data.some(p => p.npn)) {
        console.log('\nFound producers with NPNs. Will test these NPNs next.');
        return response.data.filter(p => p.npn).map(p => ({ 
          npn: p.npn, 
          name: p.firstName ? `${p.firstName} ${p.lastName}` : p.name || 'Unknown'
        }));
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error accessing agency endpoint:', error.message);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      if (error.response.data) {
        console.error('Response data:', error.response.data);
      }
    }
    
    return [];
  }
}

// Function to fetch licenses for a specific NPN
async function fetchProducerLicenses(npn, producerName) {
  try {
    const url = `https://surelc.surancebay.com/sbweb/ws/producer/npn/${npn}/licenses`;
    
    console.log(`Fetching licenses for ${producerName} (NPN: ${npn})`);
    
    const response = await axios.get(url, {
      auth: {
        username: USERNAME,
        password: PASSWORD
      }
    });

    console.log(`Success! Status: ${response.status}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching licenses for ${producerName} (NPN: ${npn}):`, error.message);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      if (error.response.data) {
        console.error('Response data:', error.response.data);
      }
    }
    
    return [];
  }
}

async function testAgencyAccess() {
  try {
    // First try to get all producers in the agency
    console.log('--- Testing agency access ---');
    const producers = await testAgencyEndpoint();
    
    // If we found producers with NPNs, test fetching their licenses
    if (producers && producers.length > 0) {
      console.log('\n--- Testing licenses for agency producers ---');
      
      let foundLicense = false;
      
      for (const producer of producers) {
        const licenses = await fetchProducerLicenses(producer.npn, producer.name);
        
        if (licenses && licenses.length > 0) {
          console.log(`SUCCESS! Found ${licenses.length} licenses for ${producer.name} (NPN: ${producer.npn})`);
          console.log('Sample license data:', JSON.stringify(licenses[0], null, 2));
          foundLicense = true;
          break; // Stop after finding one successful producer
        } else {
          console.log(`No licenses found for ${producer.name} (NPN: ${producer.npn})`);
        }
      }
      
      if (!foundLicense) {
        console.log('\nNo licenses found for any agency producers.');
        console.log('This suggests your account may not have license access permissions.');
      }
    }
    
    console.log('\nTesting completed');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testAgencyAccess(); 