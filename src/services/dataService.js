import { database } from "../firebase.js";
import { ref, set, get, push, remove, update, child } from "firebase/database";

// Helper functions
const calculateLicenseStatus = (expirationDate) => {
  if (!expirationDate) return "unknown";

  const today = new Date();
  const expiry = new Date(expirationDate);

  if (expiry < today) {
    return "expired";
  } else if (expiry < new Date(today.setDate(today.getDate() + 30))) {
    return "expiring";
  } else {
    return "active";
  }
};

// Update the Producer interface
export const Producer = {
  id: null,
  name: "",
  npn: "",
  location: "Austin",
  email: "",
  phone: "",
  active: true, // Add active field with default true
};

// Producer operations
export const getProducers = async () => {
  try {
    const { ref, get, query, orderByChild, limitToFirst } = await import(
      "firebase/database"
    );
    const snapshot = await get(ref(database, "producers"));

    if (snapshot.exists()) {
      const data = snapshot.val();
      const producers = Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
        // Default to active if not specified
        active: data[key].active === undefined ? true : data[key].active,
      }));

      return producers;
    }
    return [];
  } catch (error) {
    console.error("Error fetching producers:", error);
    throw error;
  }
};

export const getProducerById = async (id) => {
  const snapshot = await get(ref(database, `producers/${id}`));

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.key,
    ...snapshot.val(),
  };
};

export const addProducer = async (producer) => {
  const newProducerRef = push(ref(database, "producers"));
  const id = newProducerRef.key;

  await set(newProducerRef, {
    ...producer,
    id,
  });

  return id;
};

export const updateProducer = async (id, updates) => {
  try {
    const { ref, update } = await import("firebase/database");
    const updates_with_path = {};

    // Create updates for each field
    Object.keys(updates).forEach((key) => {
      updates_with_path[`producers/${id}/${key}`] = updates[key];
    });

    return update(ref(database), updates_with_path);
  } catch (error) {
    console.error("Error updating producer:", error);
    throw error;
  }
};

export const deleteProducer = async (id) => {
  // First get all licenses for this producer
  const licenses = await getLicenses();
  const producerLicenses = licenses.filter(
    (license) => license.producerId === id
  );

  // Delete each license
  for (const license of producerLicenses) {
    if (license.id) {
      await deleteLicense(license.id);
    }
  }

  // Then delete the producer
  await remove(ref(database, `producers/${id}`));
  return true;
};

// License operations
export const getLicenses = async () => {
  const snapshot = await get(ref(database, "licenses"));

  if (!snapshot.exists()) {
    return [];
  }

  const licenses = [];
  snapshot.forEach((childSnapshot) => {
    const license = {
      id: childSnapshot.key,
      ...childSnapshot.val(),
    };

    // Update status based on current date
    license.status = calculateLicenseStatus(license.expirationDate);

    licenses.push(license);
  });

  return licenses;
};

export const getLicensesByProducer = async (producerId) => {
  const licenses = await getLicenses();
  return licenses.filter((license) => license.producerId === producerId);
};

export const addLicense = async (license) => {
  const newLicenseRef = push(ref(database, "licenses"));
  const id = newLicenseRef.key;

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

export const updateLicense = async (id, license) => {
  // If expiration date is updated, recalculate status
  if (license.expirationDate) {
    license.status = calculateLicenseStatus(license.expirationDate);
  }

  await update(ref(database, `licenses/${id}`), license);
  return { id, ...license };
};

export const deleteLicense = async (id) => {
  await remove(ref(database, `licenses/${id}`));
  return true;
};

// Dashboard operations
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
  const byLocation = {};

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
    byLocation:
      Object.keys(byLocation).length > 0
        ? byLocation
        : {
            Austin: 0,
            Charlotte: 0,
          },
  };
};
