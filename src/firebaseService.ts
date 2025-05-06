import { db } from "./firebase";
import {
  ref,
  set,
  push,
  update,
  remove,
  get,
  query,
  orderByChild,
  equalTo,
  onValue,
  DataSnapshot,
} from "firebase/database";

// Data models
type Producer = {
  id: string;
  npn: string;
  firstName: string;
  lastName: string;
  email: string;
  callCenterLocation: "Austin" | "Dallas";
  employmentStatus: "Active" | "Terminated";
  hireDate: string; // ISO date
};

type License = {
  id: string;
  producerId: string;
  licenseNumber: string;
  state: string; // two-letter code
  linesOfAuthority: string[];
  status: "Active" | "Pending" | "Expired" | "Revoked";
  issueDate: string; // ISO date
  expirationDate: string; // ISO date
};

// Producer functions
export const addProducer = async (producer: Omit<Producer, "id">) => {
  const producerRef = push(ref(db, "producers"));
  const id = producerRef.key!;
  await set(producerRef, { ...producer, id });
  return id;
};

export const updateProducer = async (
  id: string,
  updates: Partial<Producer>
) => {
  await update(ref(db, `producers/${id}`), updates);
};

export const deleteProducer = async (id: string) => {
  await remove(ref(db, `producers/${id}`));
};

export const getProducers = async (): Promise<Producer[]> => {
  const snapshot = await get(ref(db, "producers"));
  const data = snapshot.val();
  return data ? Object.values(data) : [];
};

// License functions
export const addLicense = async (license: Omit<License, "id">) => {
  const licenseRef = push(ref(db, "licenses"));
  const id = licenseRef.key!;
  await set(licenseRef, { ...license, id });
  return id;
};

export const updateLicense = async (id: string, updates: Partial<License>) => {
  await update(ref(db, `licenses/${id}`), updates);
};

export const deleteLicense = async (id: string) => {
  await remove(ref(db, `licenses/${id}`));
};

export const getLicenses = async (): Promise<License[]> => {
  const snapshot = await get(ref(db, "licenses"));
  const data = snapshot.val();
  return data ? Object.values(data) : [];
};

// Query licenses by status
export const getLicensesByStatus = async (
  status: License["status"]
): Promise<License[]> => {
  const q = query(ref(db, "licenses"), orderByChild("status"), equalTo(status));
  const snapshot = await get(q);
  const data = snapshot.val();
  return data ? Object.values(data) : [];
};

// Query licenses by state
export const getLicensesByState = async (state: string): Promise<License[]> => {
  const q = query(ref(db, "licenses"), orderByChild("state"), equalTo(state));
  const snapshot = await get(q);
  const data = snapshot.val();
  return data ? Object.values(data) : [];
};

// Query licenses expiring soon (within days)
export const getLicensesExpiringSoon = async (
  days: number
): Promise<License[]> => {
  const licenses = await getLicenses();
  const now = new Date();
  const soon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return licenses.filter((l) => {
    const exp = new Date(l.expirationDate);
    return exp > now && exp <= soon && l.status === "Active";
  });
};

// Query expired licenses
export const getExpiredLicenses = async (): Promise<License[]> => {
  const licenses = await getLicenses();
  const now = new Date();
  return licenses.filter(
    (l) => new Date(l.expirationDate) < now && l.status !== "Revoked"
  );
};

// Real-time listeners
export const onProducersChange = (
  callback: (producers: Producer[]) => void
) => {
  return onValue(ref(db, "producers"), (snapshot: DataSnapshot) => {
    const data = snapshot.val();
    callback(data ? Object.values(data) : []);
  });
};

export const onLicensesChange = (callback: (licenses: License[]) => void) => {
  return onValue(ref(db, "licenses"), (snapshot: DataSnapshot) => {
    const data = snapshot.val();
    callback(data ? Object.values(data) : []);
  });
};

// Mock NIPR verification
export const mockVerifyLicense = async (
  licenseId: string,
  result: "verified" | "not_verified"
) => {
  await update(ref(db, `licenses/${licenseId}`), {
    verificationResult: result,
    verificationDate: new Date().toISOString(),
  });
};

export type { Producer, License };
