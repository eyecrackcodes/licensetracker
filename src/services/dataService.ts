import { database } from "../firebase";
import { ref, set, get, push, remove, update, child } from "firebase/database";
import { fetchProducerLicensesBySSN, fetchProducerLicensesByNPN, convertSureLcLicense, SureLcLicense } from "../utils/sureLcApi";

// Types
export interface Producer {
  id?: string;
  name: string;
  npn: string; // National Producer Number
  ssn?: string; // Social Security Number (for SureLC API)
  location: string;
  email?: string;
  phone?: string;
}

export interface License {
  id?: string;
  state: string;
  type: string; // Life, Health, P&C, etc.
  producerId: string;
  producerName?: string; // For convenience in displaying
  startDate: string;
  expirationDate: string;
  licenseNumber: string;
  status?: "active" | "expired" | "expiring";
}

// Producer operations
export const addProducer = async (producer: Producer): Promise<string> => {
  const newProducerRef = push(ref(database, "producers"));
  const id = newProducerRef.key as string;

  await set(newProducerRef, {
    ...producer,
    id,
  });

  return id;
};

export const getProducers = async (): Promise<Producer[]> => {
  const snapshot = await get(ref(database, "producers"));

  if (!snapshot.exists()) {
    return [];
  }

  const producers: Producer[] = [];
  snapshot.forEach((childSnapshot) => {
    producers.push({
      id: childSnapshot.key,
      ...childSnapshot.val(),
    } as Producer);
  });

  return producers;
};

export const updateProducer = async (
  id: string,
  producer: Partial<Producer>
): Promise<void> => {
  await update(ref(database, `producers/${id}`), producer);
};

export const deleteProducer = async (id: string): Promise<void> => {
  await remove(ref(database, `producers/${id}`));

  // Also delete all licenses for this producer
  const licenses = await getLicenses();
  const producerLicenses = licenses.filter(
    (license) => license.producerId === id
  );

  for (const license of producerLicenses) {
    if (license.id) {
      await deleteLicense(license.id);
    }
  }
};

// License operations
export const addLicense = async (license: License): Promise<string> => {
  const newLicenseRef = push(ref(database, "licenses"));
  const id = newLicenseRef.key as string;

  // Get producer name for convenience
  if (license.producerId) {
    const producerSnapshot = await get(
      ref(database, `producers/${license.producerId}`)
    );
    if (producerSnapshot.exists()) {
      license.producerName = producerSnapshot.val().name;
    }
  }

  // Calculate status based on expiration date
  license.status = calculateLicenseStatus(license.expirationDate);

  await set(newLicenseRef, {
    ...license,
    id,
  });

  return id;
};

export const getLicenses = async (): Promise<License[]> => {
  const snapshot = await get(ref(database, "licenses"));

  if (!snapshot.exists()) {
    return [];
  }

  const licenses: License[] = [];
  snapshot.forEach((childSnapshot) => {
    const license = {
      id: childSnapshot.key,
      ...childSnapshot.val(),
    } as License;

    // Update status based on current date
    license.status = calculateLicenseStatus(license.expirationDate);

    licenses.push(license);
  });

  return licenses;
};

export const updateLicense = async (
  id: string,
  license: Partial<License>
): Promise<void> => {
  // If expiration date is updated, recalculate status
  if (license.expirationDate) {
    license.status = calculateLicenseStatus(license.expirationDate);
  }

  await update(ref(database, `licenses/${id}`), license);
};

export const deleteLicense = async (id: string): Promise<void> => {
  await remove(ref(database, `licenses/${id}`));
};

// Helper functions
export const calculateLicenseStatus = (
  expirationDate: string
): "active" | "expired" | "expiring" => {
  const today = new Date();
  const expDate = new Date(expirationDate);

  if (expDate < today) {
    return "expired";
  }

  // Check if license expires within 30 days
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  if (expDate <= thirtyDaysFromNow) {
    return "expiring";
  }

  return "active";
};

// Dashboard statistics
export const getDashboardStats = async () => {
  const licenses = await getLicenses();
  const producers = await getProducers();

  const expired = licenses.filter(
    (license) => license.status === "expired"
  ).length;
  const expiringSoon = licenses.filter(
    (license) => license.status === "expiring"
  ).length;
  const active = licenses.filter(
    (license) => license.status === "active"
  ).length;

  // Count licenses by location
  const byLocation: Record<string, number> = {};

  for (const license of licenses) {
    const producer = producers.find((p) => p.id === license.producerId);
    if (producer) {
      byLocation[producer.location] = (byLocation[producer.location] || 0) + 1;
    }
  }

  return {
    totalLicenses: licenses.length,
    expired,
    expiringSoon,
    active,
    byLocation,
  };
};

// SureLC License synchronization
export const syncLicensesFromSureLC = async (producerId: string): Promise<{
  updated: number;
  added: number;
  errors: string[];
}> => {
  const result = {
    updated: 0,
    added: 0,
    errors: [] as string[],
  };

  try {
    // Get producer details
    const producerSnap = await get(ref(database, `producers/${producerId}`));
    if (!producerSnap.exists()) {
      result.errors.push(`Producer with ID ${producerId} not found`);
      return result;
    }

    const producer = producerSnap.val() as Producer;
    
    // Check if producer has SSN (preferred) or NPN
    if (!producer.ssn && !producer.npn) {
      result.errors.push(`Producer ${producer.name} does not have SSN or NPN`);
      return result;
    }

    // Try to fetch licenses using SSN first (preferred method based on testing)
    let sureLcLicenses: SureLcLicense[] = [];
    if (producer.ssn) {
      try {
        sureLcLicenses = await fetchProducerLicensesBySSN(producer.ssn);
      } catch (ssnError) {
        console.warn(`Failed to fetch licenses by SSN for ${producer.name}:`, ssnError);
        result.errors.push(`Failed to fetch licenses by SSN: ${ssnError instanceof Error ? ssnError.message : String(ssnError)}`);
        
        // Fall back to NPN if SSN fails and NPN is available
        if (producer.npn) {
          try {
            sureLcLicenses = await fetchProducerLicensesByNPN(producer.npn);
          } catch (npnError) {
            console.error(`Failed to fetch licenses by NPN for ${producer.name}:`, npnError);
            result.errors.push(`Failed to fetch licenses by NPN: ${npnError instanceof Error ? npnError.message : String(npnError)}`);
          }
        }
      }
    } 
    // Try NPN if SSN is not available
    else if (producer.npn) {
      try {
        sureLcLicenses = await fetchProducerLicensesByNPN(producer.npn);
      } catch (npnError) {
        console.error(`Failed to fetch licenses by NPN for ${producer.name}:`, npnError);
        result.errors.push(`Failed to fetch licenses by NPN: ${npnError instanceof Error ? npnError.message : String(npnError)}`);
      }
    }
    
    if (!sureLcLicenses || sureLcLicenses.length === 0) {
      result.errors.push(`No licenses found for producer ${producer.name}`);
      return result;
    }

    // Get existing licenses for this producer
    const licensesSnapshot = await get(ref(database, "licenses"));
    const existingLicenses: Record<string, License> = {};
    
    if (licensesSnapshot.exists()) {
      licensesSnapshot.forEach((childSnapshot) => {
        const license = childSnapshot.val() as License;
        if (license.producerId === producerId) {
          // Create a key using state to match with SureLC licenses
          const key = license.state;
          existingLicenses[key] = {
            ...license,
            id: childSnapshot.key
          };
        }
      });
    }

    // Process each SureLC license
    for (const sureLcLicense of sureLcLicenses) {
      const licenseData = convertSureLcLicense(
        sureLcLicense, 
        producerId, 
        producer.name
      );

      // Check if we already have a license for this state
      const existingLicense = existingLicenses[sureLcLicense.state];

      if (existingLicense) {
        // Update existing license
        await update(ref(database, `licenses/${existingLicense.id}`), licenseData);
        result.updated++;
      } else {
        // Create new license
        const newLicenseRef = push(ref(database, "licenses"));
        const licenseId = newLicenseRef.key as string;
        await set(newLicenseRef, {
          ...licenseData,
          id: licenseId,
        });
        result.added++;
      }
    }

    return result;
  } catch (error) {
    console.error("Error syncing licenses from SureLC:", error);
    result.errors.push(`General error: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
};

// Sync licenses for all producers
export const syncAllProducersLicenses = async (): Promise<{
  producersProcessed: number;
  licensesUpdated: number;
  licensesAdded: number;
  errors: string[];
}> => {
  const result = {
    producersProcessed: 0,
    licensesUpdated: 0,
    licensesAdded: 0,
    errors: [] as string[],
  };

  try {
    // Get all producers with NPNs
    const producersSnapshot = await get(ref(database, "producers"));
    
    if (!producersSnapshot.exists()) {
      result.errors.push("No producers found in database");
      return result;
    }

    // Process each producer
    const producers: Producer[] = [];
    producersSnapshot.forEach((childSnapshot) => {
      producers.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      } as Producer);
    });

    const producersWithNpn = producers.filter(p => p.npn && p.id);
    
    if (producersWithNpn.length === 0) {
      result.errors.push("No producers with NPN found");
      return result;
    }

    // Process each producer
    for (const producer of producersWithNpn) {
      if (!producer.id) continue;
      
      const syncResult = await syncLicensesFromSureLC(producer.id);
      
      result.producersProcessed++;
      result.licensesUpdated += syncResult.updated;
      result.licensesAdded += syncResult.added;
      
      // Add producer-specific errors
      if (syncResult.errors.length > 0) {
        result.errors.push(`Errors for producer ${producer.name}:`);
        result.errors.push(...syncResult.errors.map(err => `  - ${err}`));
      }
    }

    return result;
  } catch (error) {
    console.error("Error syncing all producers:", error);
    result.errors.push(`General error: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
};
