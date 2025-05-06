import axios from 'axios';

// Credentials for SureLC API
const USERNAME = process.env.SURELC_USERNAME || 'jonathan.kaiser@luminarylife.com';
const PASSWORD = process.env.SURELC_PASSWORD || 'uav@e$f!#9K6S8L';

// Interface for license data returned from SureLC API
export interface SureLcLicense {
  licenseId: number;
  state: string;
  licenseNumber: string;
  status: string;
  effectiveDate: string;
  expirationDate: string;
  type?: string; // May not be included in API response, but useful for our app
}

// Interface for producer data in SureLC
export interface SureLcProducer {
  id: string | number;
  npn?: string;
  ssn?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  // Other fields as needed
}

/**
 * Fetches license data for a producer from SureLC API by SSN
 * This method works better than NPN-based fetching based on testing
 * @param ssn Social Security Number of the producer (no dashes)
 * @returns Array of license objects
 */
export const fetchProducerLicensesBySSN = async (ssn: string): Promise<SureLcLicense[]> => {
  try {
    const url = `https://surelc.surancebay.com/sbweb/ws/producer/ssn/${ssn}/licenses`;
    
    const response = await axios.get(url, {
      auth: {
        username: USERNAME,
        password: PASSWORD
      }
    });

    if (response.status === 200) {
      return response.data;
    } else {
      console.error(`Error fetching licenses: ${response.status} - ${response.statusText}`);
      return [];
    }
  } catch (error) {
    // Check for specific error types to give more useful information
    if (axios.isAxiosError(error) && error.response) {
      // 403 means producer exists but access is restricted
      if (error.response.status === 403) {
        const match = typeof error.response.data === 'string' && 
                    error.response.data.match(/producerId (\d+)/);
        if (match && match[1]) {
          console.warn(`Producer with SSN ${ssn} exists (ID: ${match[1]}) but your account doesn't have permission to access their licenses`);
        }
      }
      // 412 means producer exists but is not associated with your agency
      else if (error.response.status === 412) {
        console.warn(`Producer with SSN ${ssn} exists but is not associated with your agency`);
      }
      // 404 means producer doesn't exist
      else if (error.response.status === 404) {
        console.warn(`Producer with SSN ${ssn} not found in SureLC`);
      }
    }
    
    console.error('Error fetching producer licenses from SureLC:', error);
    throw error;
  }
};

/**
 * Fetches license data for a producer from SureLC API by NPN
 * Note: Based on testing, this method may not work as expected due to permission issues
 * @param npn National Producer Number of the producer
 * @returns Array of license objects
 */
export const fetchProducerLicensesByNPN = async (npn: string): Promise<SureLcLicense[]> => {
  try {
    const url = `https://surelc.surancebay.com/sbweb/ws/producer/npn/${npn}/licenses`;
    
    const response = await axios.get(url, {
      auth: {
        username: USERNAME,
        password: PASSWORD
      }
    });

    if (response.status === 200) {
      return response.data;
    } else {
      console.error(`Error fetching licenses: ${response.status} - ${response.statusText}`);
      return [];
    }
  } catch (error) {
    console.error(`Error fetching producer licenses by NPN ${npn}:`, error);
    throw error;
  }
};

/**
 * Converts a SureLC license to our application's license format
 * @param sureLcLicense License data from SureLC API
 * @param producerId ID of the producer in our database
 * @param producerName Name of the producer in our database
 * @returns License object in our application format
 */
export const convertSureLcLicense = (
  sureLcLicense: SureLcLicense, 
  producerId: string,
  producerName: string
) => {
  return {
    producerId,
    producerName,
    state: sureLcLicense.state,
    licenseNumber: sureLcLicense.licenseNumber,
    status: sureLcLicense.status.toLowerCase() === 'active' ? 'active' : 
           sureLcLicense.status.toLowerCase() === 'expired' ? 'expired' : 'expiring',
    startDate: sureLcLicense.effectiveDate,
    expirationDate: sureLcLicense.expirationDate,
    type: sureLcLicense.type || 'Life and Health',
  };
};

export default {
  fetchProducerLicensesBySSN,
  fetchProducerLicensesByNPN,
  convertSureLcLicense
}; 