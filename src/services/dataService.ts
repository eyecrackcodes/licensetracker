import { database } from "../firebase";
import { ref, set, get, push, remove, update, child } from "firebase/database";

// Types
export interface Producer {
  id?: string;
  name: string;
  npn: string; // National Producer Number
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
