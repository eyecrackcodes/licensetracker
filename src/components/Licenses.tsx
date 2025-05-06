import React, { useState } from "react";
import LicenseForm from "./LicenseForm.tsx";

type License = {
  id: string;
  producerId: string;
  licenseNumber: string;
  state: string;
  linesOfAuthority: string[];
  status: string;
  issueDate: string;
  expirationDate?: string;
  note?: string;
};

const placeholderLicenses: License[] = [
  {
    id: "1",
    producerId: "1",
    licenseNumber: "TX-12345",
    state: "TX",
    linesOfAuthority: ["Life", "Health"],
    status: "Active",
    issueDate: "2022-01-20",
    expirationDate: "2024-01-20",
    note: "X",
  },
  {
    id: "2",
    producerId: "2",
    licenseNumber: "CA-54321",
    state: "CA",
    linesOfAuthority: ["Property"],
    status: "Expired",
    issueDate: "2020-05-10",
    expirationDate: "2022-05-10",
    note: "Z",
  },
];

const Licenses: React.FC = () => {
  const [licenses, setLicenses] = useState<License[]>(placeholderLicenses);
  const [showModal, setShowModal] = useState(false);
  const [editLicense, setEditLicense] = useState<License | null>(null);

  const handleAdd = () => {
    setEditLicense(null);
    setShowModal(true);
  };

  const handleEdit = (license: License) => {
    setEditLicense(license);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    setLicenses((prev) => prev.filter((l) => l.id !== id));
  };

  const handleSave = (data: any) => {
    if (editLicense) {
      setLicenses((prev) =>
        prev.map((l) => (l.id === editLicense.id ? { ...l, ...data } : l))
      );
    } else {
      setLicenses((prev) => [
        ...prev,
        { ...data, id: Math.random().toString(36).slice(2), producerId: "1" },
      ]);
    }
    setShowModal(false);
  };

  return (
    <div>
      <h2>Licenses</h2>
      <button onClick={handleAdd}>Add License</button>
      <table
        style={{ width: "100%", marginTop: 16, borderCollapse: "collapse" }}
      >
        <thead>
          <tr>
            <th>License #</th>
            <th>State</th>
            <th>Lines of Authority</th>
            <th>Status</th>
            <th>Issue Date</th>
            <th>Expiration Date</th>
            <th>Note</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {licenses.map((l) => (
            <tr key={l.id}>
              <td>{l.licenseNumber}</td>
              <td>{l.state}</td>
              <td>{l.linesOfAuthority.join(", ")}</td>
              <td>{l.status}</td>
              <td>{l.issueDate}</td>
              <td>{l.expirationDate || ""}</td>
              <td>{l.note || ""}</td>
              <td>
                <button onClick={() => handleEdit(l)}>Edit</button>
                <button
                  onClick={() => handleDelete(l.id)}
                  style={{ marginLeft: 8 }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 8,
              minWidth: 300,
            }}
          >
            <h3>{editLicense ? "Edit License" : "Add License"}</h3>
            <LicenseForm
              initial={editLicense || undefined}
              onSave={handleSave}
              onCancel={() => setShowModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Licenses;
